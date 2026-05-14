import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
} from "@/lib/api";
import type { Masterclass, MasterclassCategory } from "@/lib/api-types";

export type MasterclassCategoryBody = {
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  imageUrl?: string | null;
};

export type MasterclassCategoryUpdateBody = Partial<MasterclassCategoryBody>;

export type MasterclassCategorySortBy = "id" | "createdAt" | "masterclassCount";

export type MasterclassCategoryListParams = {
  search?: string;
  page?: number;
  limit?: number;
  all?: boolean;
  sortBy?: MasterclassCategorySortBy;
  sortOrder?: "asc" | "desc";
  hasMasterclasses?: boolean;
  includeCount?: boolean;
};

export type MasterclassCategoryDetail = MasterclassCategory & {
  masterclasses?: Masterclass[];
};

const LIST = "/masterclass-categories";
const B = "/admin/masterclass-categories";

function clean(params?: MasterclassCategoryListParams) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  if (params.all) out.all = true;
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.sortOrder) out.sortOrder = params.sortOrder;
  if (params.hasMasterclasses != null)
    out.hasMasterclasses = params.hasMasterclasses;
  if (params.includeCount != null) out.includeCount = params.includeCount;
  return Object.keys(out).length ? out : undefined;
}

export const masterclassCategoriesApi = {
  list: (params?: MasterclassCategoryListParams) =>
    apiGet<MasterclassCategory[]>(LIST, { params: clean(params) }),
  listPaginated: (params?: MasterclassCategoryListParams) =>
    apiGetPaginated<MasterclassCategory[]>(LIST, { params: clean(params) }),
  byId: (id: number) =>
    apiGet<MasterclassCategoryDetail>(`${LIST}/${id}`),
  create: (body: MasterclassCategoryBody) =>
    apiPost<MasterclassCategory>(B, body),
  update: (id: number, body: MasterclassCategoryUpdateBody) =>
    apiPatch<MasterclassCategory>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};
