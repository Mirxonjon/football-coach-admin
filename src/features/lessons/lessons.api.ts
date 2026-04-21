import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
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
};

export type UpdateLessonDto = Partial<CreateLessonDto>;

export type CreateBlockDto = {
  blockType: BlockType;
  contentUz: string;
  contentRu: string;
  duration?: number | null;
  sequenceOrder: number;
};

export type UpdateBlockDto = Partial<CreateBlockDto>;

export const lessonsApi = {
  list: (trainingCategoryId?: number) =>
    apiGet<TrainingLesson[]>("/lessons", {
      params: trainingCategoryId ? { trainingCategoryId } : undefined,
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
