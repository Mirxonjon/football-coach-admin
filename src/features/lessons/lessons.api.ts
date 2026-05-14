import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
} from "@/lib/api";
import type {
  BlockType,
  LessonBlock,
  TrainingCategory,
  TrainingLesson,
} from "@/lib/api-types";

export type LessonDetail = TrainingLesson & { lessonBlocks: LessonBlock[] };

export type CreateLessonDto = {
  trainingCategoryId: number;
  titleUz: string;
  titleRu: string;
  isFree?: boolean;
};

export type UpdateLessonDto = Partial<CreateLessonDto>;

export type CreateBlockDto = {
  blockType: BlockType;
  contentUz: string;
  contentRu: string;
  duration?: number | null;
  sequenceOrder: number;
  isFree?: boolean;
};

export type UpdateBlockDto = Partial<CreateBlockDto>;

export type LessonSortBy = "id" | "createdAt";
export type LessonProgress = "not_started" | "in_progress" | "completed";

export type LessonListParams = {
  trainingCategoryId?: number;
  ageCategoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  all?: boolean;
  isFree?: boolean;
  unlocked?: boolean;
  sortBy?: LessonSortBy;
  sortOrder?: "asc" | "desc";
  progressStatus?: LessonProgress;
  hasVideo?: boolean;
};

function cleanLessonParams(params?: LessonListParams) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (params.trainingCategoryId)
    out.trainingCategoryId = params.trainingCategoryId;
  if (params.ageCategoryId) out.ageCategoryId = params.ageCategoryId;
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  if (params.all) out.all = true;
  if (params.isFree != null) out.isFree = params.isFree;
  if (params.unlocked != null) out.unlocked = params.unlocked;
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.sortOrder) out.sortOrder = params.sortOrder;
  if (params.progressStatus) out.progressStatus = params.progressStatus;
  if (params.hasVideo != null) out.hasVideo = params.hasVideo;
  return Object.keys(out).length ? out : undefined;
}

export const lessonsApi = {
  list: (params?: LessonListParams) =>
    apiGet<TrainingLesson[]>("/lessons", { params: cleanLessonParams(params) }),

  listPaginated: (params?: LessonListParams) =>
    apiGetPaginated<TrainingLesson[]>("/lessons", {
      params: cleanLessonParams(params),
    }),

  byId: (id: number) => apiGet<LessonDetail>(`/lessons/${id}`),

  trainingCategories: () =>
    apiGet<TrainingCategory[]>("/training-categories"),

  create: (body: CreateLessonDto) =>
    apiPost<TrainingLesson>("/admin/lessons", body),

  update: (id: number, body: UpdateLessonDto) =>
    apiPatch<TrainingLesson>(`/admin/lessons/${id}`, body),

  remove: (id: number) => apiDelete<void>(`/admin/lessons/${id}`),

  addBlock: (lessonId: number, body: CreateBlockDto) =>
    apiPost<LessonBlock>(`/admin/lessons/${lessonId}/blocks`, body),

  updateBlock: (blockId: number, body: UpdateBlockDto) =>
    apiPatch<LessonBlock>(`/admin/blocks/${blockId}`, body),

  removeBlock: (blockId: number) =>
    apiDelete<void>(`/admin/blocks/${blockId}`),
};
