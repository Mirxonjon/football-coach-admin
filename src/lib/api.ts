import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4021/v1";

// Admin-specific keys so this app's tokens never collide with the user web/app
// tokens stored under different prefixes in the same browser.
const TOKEN_KEY = "fc_admin_access_token";
const REFRESH_KEY = "fc_admin_refresh_token";
const EXPIRES_AT_KEY = "fc_admin_access_expires_at";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number; // seconds until the access token expires
};

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set access(v: string | null) {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(TOKEN_KEY, v);
    else window.localStorage.removeItem(TOKEN_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set refresh(v: string | null) {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(REFRESH_KEY, v);
    else window.localStorage.removeItem(REFRESH_KEY);
  },
  /** Persist a full token bundle (rotation: every refresh returns a new pair). */
  save(t: AuthTokens) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, t.accessToken);
    window.localStorage.setItem(REFRESH_KEY, t.refreshToken);
    if (typeof t.expiresIn === "number") {
      const expiresAt = Date.now() + t.expiresIn * 1000;
      window.localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(EXPIRES_AT_KEY);
  },
};

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = tokenStore.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// ---------------------------------------------------------------------------
// Refresh-token flow
// ---------------------------------------------------------------------------
// One inflight refresh at a time. Concurrent 401s queue up and resume with the
// same fresh access token once the refresh resolves — preventing N parallel
// refresh calls (each of which would invalidate the previous refresh token via
// rotation and snowball into a logout).
let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  const cbs = queue;
  queue = [];
  cbs.forEach((cb) => cb(token));
}

async function doRefresh(): Promise<string | null> {
  const rt = tokenStore.refresh;
  if (!rt) return null;
  try {
    // Use the bare axios (not `api`) to bypass our own interceptors —
    // otherwise a 401 on /auth/refresh itself would recurse.
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: rt,
    });
    const payload = (data?.data ?? data) as Partial<AuthTokens> | undefined;
    if (!payload?.accessToken || !payload.refreshToken) {
      tokenStore.clear();
      return null;
    }
    tokenStore.save({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
    });
    return payload.accessToken;
  } catch {
    // Invalid / expired / revoked refresh token → wipe and force re-login.
    tokenStore.clear();
    return null;
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.href = "/login";
}

// Endpoints where 401/403 is a legitimate authentication outcome
// (bad credentials, non-admin account, refresh-itself failed, etc.) —
// NOT a "token expired" signal. Refreshing on these would either loop or
// swallow the real error toast.
const AUTH_ENDPOINTS = [
  "/admin/login",
  "/admin/google",
  "/auth/refresh",
  "/auth/login",
  "/auth/register",
];

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((p) => url.includes(p));
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (
      !original ||
      status !== 401 ||
      original._retry ||
      isAuthEndpoint(original.url)
    ) {
      return Promise.reject(error);
    }

    // No refresh token at all → straight to login, no point trying.
    if (!tokenStore.refresh) {
      tokenStore.clear();
      redirectToLogin();
      return Promise.reject(error);
    }

    original._retry = true;

    // Another request is already refreshing — wait for that result instead of
    // firing a parallel refresh (which would invalidate the in-flight one).
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }
          original.headers = {
            ...(original.headers ?? {}),
            Authorization: `Bearer ${newToken}`,
          };
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const fresh = await doRefresh();
      flushQueue(fresh);
      if (!fresh) {
        redirectToLogin();
        return Promise.reject(error);
      }
      original.headers = {
        ...(original.headers ?? {}),
        Authorization: `Bearer ${fresh}`,
      };
      return api(original);
    } catch (e) {
      flushQueue(null);
      tokenStore.clear();
      redirectToLogin();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Manually exchange the current refresh token for a fresh pair. Useful at app
 * mount time if you want to validate the persisted session before showing UI.
 */
export async function refreshTokens(): Promise<AuthTokens | null> {
  const rt = tokenStore.refresh;
  if (!rt) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: rt,
    });
    const payload = (data?.data ?? data) as Partial<AuthTokens> | undefined;
    if (!payload?.accessToken || !payload.refreshToken) {
      tokenStore.clear();
      return null;
    }
    const tokens: AuthTokens = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
    };
    tokenStore.save(tokens);
    return tokens;
  } catch {
    tokenStore.clear();
    return null;
  }
}

// Backend responses are wrapped as `{ status_code, data }` OR raw objects.
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    const inner = (payload as { data: unknown }).data;
    if (inner !== undefined) return inner as T;
  }
  return payload as T;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.get(url, config);
  return unwrap<T>(data);
}

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function apiGetPaginated<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<{ data: T; meta: PaginationMeta | null }> {
  const { data } = await api.get(url, config);
  const inner = unwrap<T>(data);
  const meta =
    data && typeof data === "object" && "meta" in (data as object)
      ? ((data as { meta?: PaginationMeta }).meta ?? null)
      : null;
  return { data: inner, meta };
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
  const { data } = await api.post(url, body, config);
  return unwrap<T>(data);
}
export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
  const { data } = await api.patch(url, body, config);
  return unwrap<T>(data);
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.delete(url, config);
  return unwrap<T>(data);
}

type ApiErrorEnvelope = {
  error?: { code?: string; message?: string; details?: unknown };
  message?: string;
};

export function apiErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiErrorEnvelope | undefined;
    const msg =
      data?.error?.message ??
      data?.message ??
      e.message;
    return msg || "Request failed";
  }
  return (e as Error)?.message || "Unknown error";
}

export function apiErrorCode(e: unknown): string | null {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiErrorEnvelope | undefined;
    return data?.error?.code ?? null;
  }
  return null;
}

export function apiErrorStatus(e: unknown): number | null {
  if (axios.isAxiosError(e)) return e.response?.status ?? null;
  return null;
}
