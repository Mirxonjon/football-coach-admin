import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { BookCategory, BookCategoryType } from "@/lib/api-types";

export type BookCategoryBody = {
  titleUz: string;
  titleRu: string;
  categoryType: BookCategoryType;
};

export type BookCategoryUpdateBody = Partial<BookCategoryBody>;

const LIST = "/book-categories";
const B = "/admin/book-categories";

export const bookCategoriesApi = {
  list: () => apiGet<BookCategory[]>(LIST),
  create: (body: BookCategoryBody) => apiPost<BookCategory>(B, body),
  update: (id: number, body: BookCategoryUpdateBody) =>
    apiPatch<BookCategory>(`${B}/${id}`, body),
  remove: (id: number) => apiDelete<void>(`${B}/${id}`),
};
