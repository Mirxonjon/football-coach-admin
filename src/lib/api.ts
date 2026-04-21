import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4021/v1";

const TOKEN_KEY = "fc_admin_access_token";
const REFRESH_KEY = "fc_admin_refresh_token";

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
  clear() {
    this.access = null;
    this.refresh = null;
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

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const rt = tokenStore.refresh;
  if (!rt) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: rt,
    });
    const payload = data?.data ?? data;
    const access = payload?.accessToken;
    const refresh = payload?.refreshToken;
    if (access) tokenStore.access = access;
    if (refresh) tokenStore.refresh = refresh;
    return access ?? null;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const fresh = await refreshing;
      refreshing = null;
      if (fresh) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${fresh}`,
        };
        return api(original);
      }
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

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

export function apiErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const msg =
      (e.response?.data as { error?: { message?: string }; message?: string })?.error?.message ??
      (e.response?.data as { message?: string })?.message ??
      e.message;
    return msg || "Request failed";
  }
  return (e as Error)?.message || "Unknown error";
}
