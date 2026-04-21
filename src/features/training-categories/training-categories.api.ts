import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
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

const LIST = "/training-categories";
const B = "/admin/training-categories";

export const trainingCategoriesApi = {
  list: (params?: { ageCategoriesId?: number }) =>
    apiGet<TrainingCategory[]>(LIST, {
      params: params?.ageCategoriesId
        ? { ageCategoriesId: params.ageCategoriesId }
        : undefined,
    }),
  get: (id: number) => apiGet<TrainingCategory>(`${LIST}/${id}`),
  create: (body: TrainingCategoryBody) =>
    apiPost<TrainingCategory>(B, body),
  update: (id: number, body: TrainingCategoryUpdateBody) =>
    apiPatch<TrainingCategory>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};
