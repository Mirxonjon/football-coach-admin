import { apiDelete, apiGet, apiGetPaginated, apiPatch } from "@/lib/api";
import type { User } from "@/lib/api-types";

export type UsersListParams = {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UsersListResponse = {
  data: User[];
  meta: PaginatedMeta | null;
};

export type AdminUpdateUserBody = {
  isActive?: boolean;
  role?: "ADMIN" | "USER";
};

const B = "/admin/users";

export const usersApi = {
  list: async (params?: UsersListParams): Promise<UsersListResponse> => {
    const out = await apiGetPaginated<User[]>(B, {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.isActive !== undefined
          ? { isActive: String(params.isActive) }
          : {}),
        page: String(params?.page ?? 1),
        limit: String(params?.limit ?? 20),
      },
    });
    return { data: out.data, meta: out.meta };
  },
  get: (id: number) => apiGet<User>(`${B}/${id}`),
  update: (id: number, body: AdminUpdateUserBody) =>
    apiPatch<User>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};

export function userDisplayName(u: User): string {
  const first = u.firstName?.trim();
  const last = u.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (u.email) return u.email;
  return u.phone;
}

export function userInitials(u: User): string {
  const first = u.firstName?.trim()?.[0];
  const last = u.lastName?.trim()?.[0];
  const combined = `${first ?? ""}${last ?? ""}`.toUpperCase();
  if (combined) return combined;
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return u.phone.slice(-2);
}
