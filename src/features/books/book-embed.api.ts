import { api, apiDelete, apiGet, unwrap } from "@/lib/api";

export type BookEmbedLanguage = "uz" | "ru";

export type BookEmbedLangStat = {
  chunks: number;
  tokens?: number;
  latest?: string;
};

export type BookEmbedResult = {
  bookId: number;
  languages: Partial<Record<BookEmbedLanguage, BookEmbedLangStat>>;
  total?: { chunks: number; tokens: number };
};

export type BookEmbedDeleteResult = {
  bookId: number;
  deleted: number;
};

// Embedding generation can take 30–90s for a 200-page book — well above the
// global axios default. Bumped only for the reembed call itself.
const REEMBED_TIMEOUT_MS = 120_000;

export const bookEmbedApi = {
  reembed: async (bookId: number): Promise<BookEmbedResult> => {
    const { data } = await api.post(
      `/admin/books/${bookId}/embed`,
      undefined,
      { timeout: REEMBED_TIMEOUT_MS }
    );
    return unwrap<BookEmbedResult>(data);
  },

  getStatus: (bookId: number) =>
    apiGet<BookEmbedResult>(`/admin/books/${bookId}/embed/status`),

  remove: (bookId: number) =>
    apiDelete<BookEmbedDeleteResult>(`/admin/books/${bookId}/embed`),
};

export function totalChunks(r: BookEmbedResult | undefined): number {
  if (!r) return 0;
  if (r.total?.chunks != null) return r.total.chunks;
  return (
    (r.languages.uz?.chunks ?? 0) + (r.languages.ru?.chunks ?? 0)
  );
}
