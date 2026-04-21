import { apiPost } from "@/lib/api";
import type { AuthPayload } from "@/lib/api-types";

export async function loginWithEmail(params: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  return apiPost<AuthPayload>("/auth/email/login", params);
}

export async function logout(): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } catch {
    // ignore — client-side clearing happens regardless
  }
}
