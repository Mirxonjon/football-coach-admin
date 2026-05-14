import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
} from "@/lib/api";
import type {
  BlockType,
  Masterclass,
  MasterclassBlock,
  MasterclassCategory,
} from "@/lib/api-types";

export type MasterclassDetail = Masterclass & {
  masterclassBlocks: MasterclassBlock[];
};

type MasterclassDetailRaw = Masterclass & {
  masterclassBlocks?: MasterclassBlock[];
  blocks?: MasterclassBlock[];
  MasterclassBlocks?: MasterclassBlock[];
};

function normalizeDetail(raw: MasterclassDetailRaw): MasterclassDetail {
  const blocks =
    raw.masterclassBlocks ??
    raw.blocks ??
    raw.MasterclassBlocks ??
    [];
  return { ...raw, masterclassBlocks: blocks };
}

export type CreateMasterclassDto = {
  masterclassCategoryId: number;
  titleUz: string;
  titleRu: string;
};

export type UpdateMasterclassDto = Partial<CreateMasterclassDto>;

export type MasterclassSortBy = "id" | "createdAt";

export type MasterclassListParams = {
  masterclassCategoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  all?: boolean;
  sortBy?: MasterclassSortBy;
  sortOrder?: "asc" | "desc";
};

export type CreateMasterclassBlockDto = {
  blockType: BlockType;
  contentUz: string;
  contentRu: string;
  duration?: number | null;
  sequenceOrder: number;
};

export type UpdateMasterclassBlockDto = Partial<CreateMasterclassBlockDto>;

function cleanParams(params?: MasterclassListParams) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (params.masterclassCategoryId)
    out.masterclassCategoryId = params.masterclassCategoryId;
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  if (params.all) out.all = true;
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.sortOrder) out.sortOrder = params.sortOrder;
  return Object.keys(out).length ? out : undefined;
}

export const masterclassesApi = {
  list: (params?: MasterclassListParams) =>
    apiGet<Masterclass[]>("/masterclasses", { params: cleanParams(params) }),

  listPaginated: (params?: MasterclassListParams) =>
    apiGetPaginated<Masterclass[]>("/masterclasses", {
      params: cleanParams(params),
    }),

  byId: async (id: number) => {
    const raw = await apiGet<MasterclassDetailRaw>(`/masterclasses/${id}`);
    return normalizeDetail(raw);
  },

  categories: () =>
    apiGet<MasterclassCategory[]>("/masterclass-categories"),

  create: (body: CreateMasterclassDto) =>
    apiPost<Masterclass>("/admin/masterclasses", body),

  update: (id: number, body: UpdateMasterclassDto) =>
    apiPatch<Masterclass>(`/admin/masterclasses/${id}`, body),

  remove: (id: number) => apiDelete<void>(`/admin/masterclasses/${id}`),

  addBlock: (masterclassId: number, body: CreateMasterclassBlockDto) =>
    apiPost<MasterclassBlock>(
      `/admin/masterclasses/${masterclassId}/blocks`,
      body
    ),

  updateBlock: (blockId: number, body: UpdateMasterclassBlockDto) =>
    apiPatch<MasterclassBlock>(`/admin/masterclass-blocks/${blockId}`, body),

  removeBlock: (blockId: number) =>
    apiDelete<void>(`/admin/masterclass-blocks/${blockId}`),
};
