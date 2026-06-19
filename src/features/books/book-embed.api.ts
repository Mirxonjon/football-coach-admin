import { api, apiDelete, apiGet, unwrap } from "@/lib/api";

export type BookEmbedLanguage = "uz" | "ru";

/** POST /admin/books/:id/embed result — one PDF, auto-detected language. */
export type BookReembedResult = {
  bookId: number;
  language: BookEmbedLanguage;
  chunks: number;
  tokens: number;
  pages: number;
};

/** GET /admin/books/:id/embed/status — null language = not embedded yet. */
export type BookEmbedStatus = {
  bookId: number;
  language: BookEmbedLanguage | null;
  chunks: number;
  latest: string | null;
  total: number;
  /** Legacy fallback when old 2-language data is still in the index. */
  breakdown?: Record<string, { chunks: number; latest: string | null }>;
};

export type BookEmbedDeleteResult = {
  bookId: number;
  deleted: number;
};

// Embedding generation can take 30–90s for a 200-page book — well above the
// global axios default. Bumped only for the reembed call itself.
const REEMBED_TIMEOUT_MS = 120_000;

export const bookEmbedApi = {
  reembed: async (bookId: number): Promise<BookReembedResult> => {
    const { data } = await api.post(
      `/admin/books/${bookId}/embed`,
      undefined,
      { timeout: REEMBED_TIMEOUT_MS }
    );
    return unwrap<BookReembedResult>(data);
  },

  getStatus: (bookId: number) =>
    apiGet<BookEmbedStatus>(`/admin/books/${bookId}/embed/status`),

  remove: (bookId: number) =>
    apiDelete<BookEmbedDeleteResult>(`/admin/books/${bookId}/embed`),
};

/** Total chunks across legacy breakdown or the new flat shape. */
export function totalChunks(r: BookEmbedStatus | undefined | null): number {
  if (!r) return 0;
  if (typeof r.total === "number" && r.total > 0) return r.total;
  if (r.breakdown) {
    return Object.values(r.breakdown).reduce(
      (sum, b) => sum + (b?.chunks ?? 0),
      0
    );
  }
  return r.chunks ?? 0;
}
