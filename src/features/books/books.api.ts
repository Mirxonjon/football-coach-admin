import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Book, BookCategory, DiscountType } from "@/lib/api-types";

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

export const booksApi = {
  list: (bookCategoryId?: number) =>
    apiGet<Book[]>("/books", {
      params: bookCategoryId ? { bookCategoryId } : undefined,
    }),

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
