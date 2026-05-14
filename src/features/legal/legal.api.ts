import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
} from "@/lib/api";
import type { LegalDocument, LegalDocumentType } from "@/lib/api-types";

export type CreateLegalDocumentDto = {
  type: LegalDocumentType;
  titleUz: string;
  titleRu: string;
  contentUz: string;
  contentRu: string;
  isActive?: boolean;
};

export type UpdateLegalDocumentDto = Partial<CreateLegalDocumentDto>;

export type LegalListParams = {
  type?: LegalDocumentType;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

function clean(params?: LegalListParams) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (params.type) out.type = params.type;
  if (params.isActive != null) out.isActive = params.isActive;
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  return Object.keys(out).length ? out : undefined;
}

const LIST_PUBLIC = "/legal/documents";
const ADMIN_BASE = "/admin/legal/documents";

export const legalApi = {
  /** Public — current 4 active docs (one per type). */
  listActive: () => apiGet<LegalDocument[]>(LIST_PUBLIC),

  /** Public — full text by type. */
  getByType: (type: LegalDocumentType) =>
    apiGet<LegalDocument>(`${LIST_PUBLIC}/${type}`),

  /** Admin — full version history with pagination. */
  list: (params?: LegalListParams) =>
    apiGetPaginated<LegalDocument[]>(ADMIN_BASE, { params: clean(params) }),

  /**
   * Admin — publish a new version. With isActive=true (default) the previous
   * active version of the same type is automatically deactivated and version
   * is incremented server-side.
   */
  create: (body: CreateLegalDocumentDto) =>
    apiPost<LegalDocument>(ADMIN_BASE, body),

  /** Admin — edit an existing version (does NOT bump version). */
  update: (id: number, body: UpdateLegalDocumentDto) =>
    apiPatch<LegalDocument>(`${ADMIN_BASE}/${id}`, body),

  /** Admin — only allowed when isActive=false; otherwise backend returns 409. */
  remove: (id: number) =>
    apiDelete<{ success: true }>(`${ADMIN_BASE}/${id}`),
};

export const LEGAL_TYPES: LegalDocumentType[] = [
  "PRIVACY_POLICY",
  "TERMS_OF_SERVICE",
  "OFFER_AGREEMENT",
  "REQUISITES",
];

export const LEGAL_TYPE_LABEL: Record<
  LegalDocumentType,
  { uz: string; ru: string }
> = {
  PRIVACY_POLICY: {
    uz: "Maxfiylik siyosati",
    ru: "Политика конфиденциальности",
  },
  TERMS_OF_SERVICE: {
    uz: "Foydalanuvchi shartnomasi",
    ru: "Пользовательское соглашение",
  },
  OFFER_AGREEMENT: { uz: "Ommaviy oferta", ru: "Договор оферты" },
  REQUISITES: { uz: "Rekvizitlar", ru: "Реквизиты" },
};
