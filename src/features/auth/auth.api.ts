import { apiPost, refreshTokens, tokenStore } from "@/lib/api";
import type { AuthPayload } from "@/lib/api-types";

export { refreshTokens };
export type { AuthTokens } from "@/lib/api";

export async function loginWithPhone(params: {
  phone: string;
  password: string;
}): Promise<AuthPayload> {
  return apiPost<AuthPayload>("/admin/login", params);
}

export async function loginWithEmail(params: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  return apiPost<AuthPayload>("/admin/login", params);
}

export async function loginAdmin(params: {
  identifier: string;
  password: string;
}): Promise<AuthPayload> {
  const trimmed = params.identifier.trim();
  const body = trimmed.includes("@")
    ? { email: trimmed, password: params.password }
    : { phone: trimmed, password: params.password };
  return apiPost<AuthPayload>("/admin/login", body);
}

export async function loginWithGoogle(idToken: string): Promise<AuthPayload> {
  return apiPost<AuthPayload>("/admin/google", { idToken });
}

export async function logout(): Promise<void> {
  // Tell the server to revoke the session (Bearer is attached automatically by
  // the axios interceptor). Wrapped in try/catch so a network failure or an
  // already-revoked session doesn't block the client-side cleanup below.
  try {
    await apiPost("/auth/logout");
  } catch {
    // ignore — local tokens are wiped regardless
  }
  tokenStore.clear();
  // Prevent Google One Tap from auto-signing the user back in on next visit.
  if (typeof window !== "undefined") {
    try {
      window.google?.accounts.id.disableAutoSelect();
    } catch {
      /* ignore */
    }
  }
}
