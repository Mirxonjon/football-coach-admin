import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { BookCategory, BookCategoryType } from "@/lib/api-types";

export type BookCategoryBody = {
  titleUz: string;
  titleRu: string;
  categoryType: BookCategoryType;
};

export type BookCategoryUpdateBody = Partial<BookCategoryBody>;

export type BookCategoryListParams = {
  search?: string;
  categoryType?: BookCategoryType;
};

const LIST = "/book-categories";
const B = "/admin/book-categories";

function clean(params?: BookCategoryListParams) {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.categoryType) out.categoryType = params.categoryType;
  return Object.keys(out).length ? out : undefined;
}

export const bookCategoriesApi = {
  list: (params?: BookCategoryListParams) =>
    apiGet<BookCategory[]>(LIST, { params: clean(params) }),
  create: (body: BookCategoryBody) => apiPost<BookCategory>(B, body),
  update: (id: number, body: BookCategoryUpdateBody) =>
    apiPatch<BookCategory>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};
