import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
} from "@/lib/api";
import type { TrainingCategory } from "@/lib/api-types";

export type TrainingCategoryBody = {
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  ageCategoriesId: number;
  imageUrl?: string;
};

export type TrainingCategoryUpdateBody = Partial<TrainingCategoryBody>;

export type TrainingCategorySortBy = "id" | "createdAt" | "lessonCount";
export type TrainingCategoryProgress =
  | "not_started"
  | "in_progress"
  | "completed";

export type TrainingCategoryListParams = {
  ageCategoriesId?: number;
  page?: number;
  limit?: number;
  all?: boolean;
  search?: string;
  sortBy?: TrainingCategorySortBy;
  sortOrder?: "asc" | "desc";
  hasLessons?: boolean;
  includeCount?: boolean;
  progressStatus?: TrainingCategoryProgress;
};

function cleanParams(params?: TrainingCategoryListParams) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (params.ageCategoriesId) out.ageCategoriesId = params.ageCategoriesId;
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  if (params.all) out.all = true;
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.sortOrder) out.sortOrder = params.sortOrder;
  if (params.hasLessons != null) out.hasLessons = params.hasLessons;
  if (params.includeCount != null) out.includeCount = params.includeCount;
  if (params.progressStatus) out.progressStatus = params.progressStatus;
  return Object.keys(out).length ? out : undefined;
}

const LIST = "/training-categories";
const B = "/admin/training-categories";

export const trainingCategoriesApi = {
  /** Returns just the data array (no pagination meta). */
  list: (params?: TrainingCategoryListParams) =>
    apiGet<TrainingCategory[]>(LIST, { params: cleanParams(params) }),

  /** Returns { data, meta } for paginated UIs. */
  listPaginated: (params?: TrainingCategoryListParams) =>
    apiGetPaginated<TrainingCategory[]>(LIST, { params: cleanParams(params) }),

  get: (id: number) => apiGet<TrainingCategory>(`${LIST}/${id}`),
  create: (body: TrainingCategoryBody) =>
    apiPost<TrainingCategory>(B, body),
  update: (id: number, body: TrainingCategoryUpdateBody) =>
    apiPatch<TrainingCategory>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};
