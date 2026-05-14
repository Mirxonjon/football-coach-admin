import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
} from "@/lib/api";
import type {
  Book,
  BookCategory,
  BookCategoryType,
  DiscountType,
} from "@/lib/api-types";

export type CreateBookDto = {
  bookCategoryId: number;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  fileUrl: string;
  coverImageUrl?: string | null;
  tacticHintImg?: string | null;
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice?: number | null;
};

export type UpdateBookDto = Partial<CreateBookDto>;

export type BookSortBy = "id" | "createdAt" | "basePrice";
export type SortOrder = "asc" | "desc";

export type BookListParams = {
  categoryId?: number;
  search?: string;
  categoryType?: BookCategoryType;
  page?: number;
  limit?: number;
  all?: boolean;
  sortBy?: BookSortBy;
  sortOrder?: SortOrder;
  hasDiscount?: boolean;
  isFree?: boolean;
};

function cleanBookParams(params?: BookListParams) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (params.categoryId) out.categoryId = params.categoryId;
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.categoryType) out.categoryType = params.categoryType;
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  if (params.all) out.all = true;
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.sortOrder) out.sortOrder = params.sortOrder;
  if (params.hasDiscount != null) out.hasDiscount = params.hasDiscount;
  if (params.isFree != null) out.isFree = params.isFree;
  return Object.keys(out).length ? out : undefined;
}

export const booksApi = {
  /** Returns just the data array — for callers that don't need pagination meta. */
  list: (params?: BookListParams) =>
    apiGet<Book[]>("/books", { params: cleanBookParams(params) }),

  /** Returns { data, meta } — use for paginated UIs. */
  listPaginated: (params?: BookListParams) =>
    apiGetPaginated<Book[]>("/books", { params: cleanBookParams(params) }),

  categories: () => apiGet<BookCategory[]>("/book-categories"),

  byId: (id: number) => apiGet<Book>(`/books/${id}`),

  create: (body: CreateBookDto) => apiPost<Book>("/admin/books", body),

  update: (id: number, body: UpdateBookDto) =>
    apiPatch<Book>(`/admin/books/${id}`, body),

  remove: (id: number) => apiDelete<void>(`/admin/books/${id}`),
};

/**
 * Final consumer-facing price after applying discount.
 */
export function computeFinalPrice(b: {
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice?: number | null;
}): number {
  if (b.discountType === "PERCENTAGE") {
    const off = (b.basePrice * (b.discountPercent ?? 0)) / 100;
    return Math.max(0, Math.round(b.basePrice - off));
  }
  if (b.discountType === "FIXED_PRICE" && b.fixedDiscountPrice != null) {
    return Math.max(0, b.fixedDiscountPrice);
  }
  return b.basePrice;
}
