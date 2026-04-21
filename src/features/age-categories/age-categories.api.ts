import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AgeCategory } from "@/lib/api-types";

export type AgeCategoryBody = {
  titleUz: string;
  titleRu: string;
  minAge: number;
  maxAge: number;
  iconUrl?: string;
};

export type AgeCategoryUpdateBody = Partial<AgeCategoryBody>;

const LIST = "/age-categories";
const B = "/admin/age-categories";

export const ageCategoriesApi = {
  list: () => apiGet<AgeCategory[]>(LIST),
  get: (id: number) => apiGet<AgeCategory>(`${LIST}/${id}`),
  create: (body: AgeCategoryBody) => apiPost<AgeCategory>(B, body),
  update: (id: number, body: AgeCategoryUpdateBody) =>
    apiPatch<AgeCategory>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};
