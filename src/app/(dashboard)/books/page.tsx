"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  booksApi,
  computeFinalPrice,
  type CreateBookDto,
  type UpdateBookDto,
} from "@/features/books/books.api";
import {
  bookEmbedApi,
  totalChunks,
  type BookEmbedResult,
} from "@/features/books/book-embed.api";
import {
  uploadAsset,
  type UploadFolder,
} from "@/features/uploads/upload.api";
import type {
  Book,
  BookCategory,
  BookCategoryType,
  DiscountType,
} from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import {
  TranslateButton,
  type TranslateDirection,
} from "@/components/translate-button";
import { useBiLang, useT } from "@/lib/i18n";

const ALL = "all" as const;
const TYPE_ALL = "__all_types__";
const PAGE_SIZE = 12;

const DISCOUNT_LABEL: Record<DiscountType, string> = {
  NONE: "Chegirma yo'q",
  PERCENTAGE: "Foizli chegirma",
  FIXED_PRICE: "Belgilangan narx",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BooksPage() {
  const { t } = useT();
  const bi = useBiLang();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_ALL);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [viewTarget, setViewTarget] = useState<Book | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filterId = filter === ALL ? undefined : Number(filter);
  const categoryType =
    typeFilter === TYPE_ALL ? undefined : (typeFilter as BookCategoryType);

  // Reset to first page whenever any filter or page size changes (otherwise
  // user lands on an out-of-range page after narrowing results).
  useEffect(() => {
    setPage(1);
  }, [filterId, categoryType, debouncedSearch, pageSize]);

  const categoriesQ = useQuery({
    queryKey: ["book-categories"],
    queryFn: booksApi.categories,
  });

  const booksQ = useQuery({
    queryKey: [
      "books",
      {
        categoryId: filterId ?? null,
        search: debouncedSearch,
        categoryType,
        page,
        limit: pageSize,
      },
    ],
    queryFn: () =>
      booksApi.listPaginated({
        categoryId: filterId,
        search: debouncedSearch || undefined,
        categoryType,
        page,
        limit: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const books = booksQ.data?.data ?? [];
  const meta = booksQ.data?.meta ?? null;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? books.length;

  // ── Embedding status (per-book) ─────────────────────────────────────────
  // null = not loaded yet (show "..."), undefined = entry deleted on error.
  const [embedStatus, setEmbedStatus] = useState<
    Record<number, BookEmbedResult | null>
  >({});
  const [embedBusy, setEmbedBusy] = useState<Record<number, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  // Refetch statuses for the currently visible page of books in parallel.
  useEffect(() => {
    if (books.length === 0) return;
    let cancelled = false;
    // Mark all visible rows as loading.
    setEmbedStatus((prev) => {
      const next = { ...prev };
      for (const b of books) if (!(b.id in next)) next[b.id] = null;
      return next;
    });
    void Promise.all(
      books.map((b) =>
        bookEmbedApi
          .getStatus(b.id)
          .then((r) => ({ id: b.id, r }))
          .catch(() => ({ id: b.id, r: null as BookEmbedResult | null }))
      )
    ).then((results) => {
      if (cancelled) return;
      setEmbedStatus((prev) => {
        const next = { ...prev };
        for (const { id, r } of results) next[id] = r;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // Re-run whenever the list of book ids on the current page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books.map((b) => b.id).join(",")]);

  const refreshEmbedStatus = async (bookId: number) => {
    try {
      const r = await bookEmbedApi.getStatus(bookId);
      setEmbedStatus((prev) => ({ ...prev, [bookId]: r }));
    } catch {
      /* ignore */
    }
  };

  const reembedBook = async (bookId: number): Promise<boolean> => {
    setEmbedBusy((prev) => ({ ...prev, [bookId]: true }));
    try {
      const res = await bookEmbedApi.reembed(bookId);
      const uz = res.languages.uz?.chunks ?? 0;
      const ru = res.languages.ru?.chunks ?? 0;
      toast.success(`Embedded — UZ: ${uz}, RU: ${ru} chunk`);
      setEmbedStatus((prev) => ({ ...prev, [bookId]: res }));
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e));
      return false;
    } finally {
      setEmbedBusy((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const handleReembed = async (bookId: number) => {
    const ok = window.confirm(
      "Bu kitobni qaytadan embedding qilish? ~30-90 sek oladi. Eski chunklar o'chiriladi."
    );
    if (!ok) return;
    await reembedBook(bookId);
  };

  const handleBulkReembed = async () => {
    if (books.length === 0) return;
    const ok = window.confirm(
      `Hozirgi sahifadagi ${books.length} ta kitobni navbat bilan embedding qilish? Har biri ~60 sek davom etishi mumkin.`
    );
    if (!ok) return;
    setBulkProgress({ done: 0, total: books.length });
    let success = 0;
    let failed = 0;
    for (let i = 0; i < books.length; i++) {
      const b = books[i];
      // Strict sequential — Gemini free tier ~15 RPM, parallel would 429.
      // eslint-disable-next-line no-await-in-loop
      const okOne = await reembedBook(b.id);
      if (okOne) success++;
      else failed++;
      setBulkProgress({ done: i + 1, total: books.length });
    }
    setBulkProgress(null);
    toast.success(
      `Bulk embedding tugadi — ${success} muvaffaqiyatli, ${failed} xato`
    );
  };

  const hasFilters =
    filterId !== undefined ||
    categoryType !== undefined ||
    debouncedSearch.length > 0;

  const clearFilters = () => {
    setFilter(ALL);
    setTypeFilter(TYPE_ALL);
    setSearch("");
  };

  const categoriesById = useMemo(() => {
    const m = new Map<number, BookCategory>();
    (categoriesQ.data ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [categoriesQ.data]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => booksApi.remove(id),
    onSuccess: () => {
      toast.success("Kitob o'chirildi");
      qc.invalidateQueries({ queryKey: ["books"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("Kitoblar")}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("Kitob va konspektlarni boshqaring, narx va chegirmalarni sozlang")}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("Yangi kitob")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Kitob sarlavhasi bo'yicha izlash...")}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Tozalash"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder={t("Barcha toifalar")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("Barcha toifalar")}</SelectItem>
              {(categoriesQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {bi.primary(c.titleUz, c.titleRu)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder={t("Barcha turlar")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TYPE_ALL}>{t("Barcha turlar")}</SelectItem>
              <SelectItem value="BOOK">{t("Kitob")}</SelectItem>
              <SelectItem value="KONSPEKT">{t("Konspekt")}</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("Tozalash")}
            </Button>
          )}
        </div>
      </div>

      {booksQ.isLoading && !booksQ.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : booksQ.isError ? (
        <div className="p-6 text-sm text-[var(--destructive)]">
          {apiErrorMessage(booksQ.error)}
        </div>
      ) : !books.length ? (
        <EmptyState
          icon={BookOpen}
          title={t("Kitoblar topilmadi")}
          description={
            hasFilters
              ? t("Filtrlarga mos kitob topilmadi. Filtrlarni tozalab ko'ring.")
              : t("Hali hech qanday kitob yaratilmagan.")
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t("Filtrlarni tozalash")}
              </Button>
            ) : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("Yangi kitob")}
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted-foreground)]">
              {bulkProgress
                ? `Embedding ${bulkProgress.done} / ${bulkProgress.total}...`
                : `${books.length} ta kitob ko'rsatilmoqda`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReembed}
              disabled={bulkProgress !== null}
            >
              {bulkProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Barchasini re-embed qilish
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                category={categoriesById.get(b.bookCategoryId) ?? b.bookCategory}
                onView={() => setViewTarget(b)}
                onEdit={() => setEditTarget(b)}
                onDelete={() => setDeleteTarget(b)}
                embedStatus={embedStatus[b.id]}
                embedBusy={!!embedBusy[b.id]}
                onReembed={() => handleReembed(b.id)}
                onRefreshStatus={() => refreshEmbedStatus(b.id)}
              />
            ))}
          </div>

          <Pagination
            page={meta?.page ?? page}
            totalPages={totalPages}
            total={total}
            limit={meta?.limit ?? pageSize}
            onChange={(p) => setPage(p)}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            isFetching={booksQ.isFetching}
          />
        </>
      )}

      <BookDetailDialog
        book={viewTarget}
        category={
          viewTarget
            ? categoriesById.get(viewTarget.bookCategoryId) ??
              viewTarget.bookCategory
            : undefined
        }
        onClose={() => setViewTarget(null)}
        onEdit={(b) => {
          setViewTarget(null);
          setEditTarget(b);
        }}
      />

      <BookFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        categories={categoriesQ.data ?? []}
      />

      <BookFormDialog
        key={editTarget?.id}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        mode="edit"
        categories={categoriesQ.data ?? []}
        book={editTarget ?? undefined}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kitobni o&apos;chirish</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${bi.primary(deleteTarget.titleUz, deleteTarget.titleRu)}" — ${t("Bu amalni bekor qilib bo'lmaydi.")}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() =>
                deleteTarget && deleteMut.mutate(deleteTarget.id)
              }
            >
              {deleteMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              O&apos;chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function BookCard({
  book,
  category,
  onView,
  onEdit,
  onDelete,
  embedStatus,
  embedBusy,
  onReembed,
  onRefreshStatus,
}: {
  book: Book;
  category?: BookCategory;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  embedStatus?: BookEmbedResult | null;
  embedBusy?: boolean;
  onReembed?: () => void;
  onRefreshStatus?: () => void;
}) {
  const { t } = useT();
  const bi = useBiLang();
  const finalPrice = computeFinalPrice(book);
  const hasDiscount = finalPrice !== book.basePrice;

  // null = still loading, undefined = no status loader wired in.
  const embedLoading = embedStatus === null;
  const uzChunks = embedStatus?.languages.uz?.chunks ?? 0;
  const ruChunks = embedStatus?.languages.ru?.chunks ?? 0;
  const hasAnyEmbed = totalChunks(embedStatus ?? undefined) > 0;

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition hover:border-[var(--primary)]/40 hover:shadow-md"
      onClick={onView}
    >
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-[var(--muted)]">
        {book.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={book.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-10 w-10 text-[var(--muted-foreground)]" />
        )}
        {category && (
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 text-[10px] uppercase"
          >
            {t(category.categoryType === "KONSPEKT" ? "Konspekt" : "Kitob")}
          </Badge>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex-1">
          <h3
            className="line-clamp-2 font-semibold"
            title={bi.primary(book.titleUz, book.titleRu)}
          >
            {bi.primary(book.titleUz, book.titleRu)}
          </h3>
          <p
            className="line-clamp-1 text-xs text-[var(--muted-foreground)]"
            title={bi.secondary(book.titleUz, book.titleRu)}
          >
            {bi.secondary(book.titleUz, book.titleRu)}
          </p>
          {category && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {bi.primary(category.titleUz, category.titleRu)}
            </p>
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-1"
          onClick={(e) => e.stopPropagation()}
          title="Embedding statusi"
        >
          {embedLoading ? (
            <Badge variant="outline" className="text-[10px]">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ...
            </Badge>
          ) : hasAnyEmbed ? (
            <>
              {uzChunks > 0 && (
                <Badge className="bg-[oklch(0.72_0.19_145)] text-[10px] text-white">
                  UZ: {uzChunks}
                </Badge>
              )}
              {ruChunks > 0 && (
                <Badge className="bg-[oklch(0.62_0.19_260)] text-[10px] text-white">
                  RU: {ruChunks}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Embed qilinmagan
            </Badge>
          )}
          {onRefreshStatus && !embedLoading && (
            <button
              type="button"
              onClick={onRefreshStatus}
              aria-label="Statusni yangilash"
              className="rounded p-0.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <RefreshCcw className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            {hasDiscount && (
              <p className="text-xs text-[var(--muted-foreground)] line-through">
                {formatCurrency(book.basePrice)}
              </p>
            )}
            <p className="text-base font-semibold">
              {formatCurrency(finalPrice)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            {onReembed && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReembed}
                disabled={embedBusy}
                title="Re-embed (PDF ni AI vector DB ga qayta yuklash)"
              >
                {embedBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Re-embed
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onView}
              aria-label={t("Ko'rish")}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={t("Tahrirlash")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={t("O'chirish")}
            >
              <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog
// ---------------------------------------------------------------------------

function BookDetailDialog({
  book,
  category,
  onClose,
  onEdit,
}: {
  book: Book | null;
  category?: BookCategory;
  onClose: () => void;
  onEdit: (b: Book) => void;
}) {
  const { t } = useT();
  const bi = useBiLang();
  if (!book) return null;

  const finalPrice = computeFinalPrice(book);
  const hasDiscount = finalPrice !== book.basePrice;
  const discountAmount = book.basePrice - finalPrice;
  const discountPct =
    book.basePrice > 0
      ? Math.round((discountAmount / book.basePrice) * 100)
      : 0;

  const discountLabel =
    book.discountType === "PERCENTAGE"
      ? `-${book.discountPercent}%`
      : book.discountType === "FIXED_PRICE"
      ? t("Belgilangan narx")
      : t("Chegirma yo'q");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{bi.primary(book.titleUz, book.titleRu)}</DialogTitle>
          <DialogDescription>
            {bi.secondary(book.titleUz, book.titleRu)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-0 sm:grid-cols-[240px_1fr]">
          <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-[var(--muted)] sm:h-full sm:min-h-[360px]">
            {book.coverImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={book.coverImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <BookOpen className="h-16 w-16 text-[var(--muted-foreground)]" />
            )}
            {hasDiscount && (
              <Badge className="absolute left-3 top-3 bg-[var(--destructive)] text-white">
                -{discountPct}%
              </Badge>
            )}
          </div>

          <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
            <div className="flex flex-col gap-1">
              {category && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {t(
                      category.categoryType === "KONSPEKT"
                        ? "Konspekt"
                        : "Kitob"
                    )}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {bi.primary(category.titleUz, category.titleRu)}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold tracking-tight break-words">
                {bi.primary(book.titleUz, book.titleRu)}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] break-words">
                {bi.secondary(book.titleUz, book.titleRu)}
              </p>
            </div>

            <div className="flex items-baseline gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase text-[var(--muted-foreground)]">
                  {t("Yakuniy narx")}
                </span>
                <span className="text-2xl font-semibold">
                  {formatCurrency(finalPrice)}
                </span>
              </div>
              {hasDiscount && (
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase text-[var(--muted-foreground)]">
                    {t("Asosiy")}
                  </span>
                  <span className="text-sm text-[var(--muted-foreground)] line-through">
                    {formatCurrency(book.basePrice)}
                  </span>
                </div>
              )}
              <Badge variant="outline" className="ml-auto shrink-0">
                {discountLabel}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] uppercase text-[var(--muted-foreground)]">
                  {t("Tavsif (UZ)")}
                </Label>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {book.descriptionUz || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] uppercase text-[var(--muted-foreground)]">
                  {t("Tavsif (RU)")}
                </Label>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {book.descriptionRu || "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={book.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 text-sm transition hover:bg-[var(--accent)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="font-medium">{t("PDF fayl")}</span>
                  <span className="truncate text-xs text-[var(--muted-foreground)]">
                    {book.fileUrl.split("/").pop()}
                  </span>
                </div>
              </a>

              {book.tacticHintImg ? (
                <a
                  href={book.tacticHintImg}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 text-sm transition hover:bg-[var(--accent)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="font-medium">
                      {t("Taktik maslahat rasmi")}
                    </span>
                    <span className="truncate text-xs text-[var(--muted-foreground)]">
                      {book.tacticHintImg.split("/").pop()}
                    </span>
                  </div>
                </a>
              ) : null}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-[var(--muted-foreground)]">
              <span className="font-mono">#{book.id}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  {t("Yopish")}
                </Button>
                <Button size="sm" onClick={() => onEdit(book)}>
                  <Pencil className="h-4 w-4" />
                  {t("Tahrirlash")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit dialog
// ---------------------------------------------------------------------------

const bookSchema = z
  .object({
    bookCategoryId: z.number().int().positive("Toifa kerak"),
    titleUz: z.string().min(2),
    titleRu: z.string().min(2),
    descriptionUz: z.string().min(2),
    descriptionRu: z.string().min(2),
    fileUrl: z.string().url("PDF fayl URL majburiy"),
    fileUrlUz: z.string().url().optional().or(z.literal("")),
    fileUrlRu: z.string().url().optional().or(z.literal("")),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    tacticHintImg: z.string().url().optional().or(z.literal("")),
    basePrice: z.number().nonnegative(),
    discountType: z.enum(["NONE", "PERCENTAGE", "FIXED_PRICE"]),
    discountPercent: z.number().min(0).max(100),
    fixedDiscountPrice: z
      .union([z.number().nonnegative(), z.nan(), z.literal("")])
      .optional(),
  })
  .refine(
    (v) => {
      if (v.discountType !== "FIXED_PRICE") return true;
      const p = v.fixedDiscountPrice;
      return (
        p !== "" &&
        p != null &&
        !(typeof p === "number" && Number.isNaN(p))
      );
    },
    {
      path: ["fixedDiscountPrice"],
      message: "Belgilangan narxni kiriting",
    },
  );
type BookFormValues = z.infer<typeof bookSchema>;

function BookFormDialog({
  open,
  onOpenChange,
  mode,
  categories,
  book,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  categories: BookCategory[];
  book?: Book;
}) {
  const bi = useBiLang();
  const qc = useQueryClient();

  const defaults: BookFormValues =
    mode === "edit" && book
      ? {
          bookCategoryId: book.bookCategoryId,
          titleUz: book.titleUz,
          titleRu: book.titleRu,
          descriptionUz: book.descriptionUz,
          descriptionRu: book.descriptionRu,
          fileUrl: book.fileUrl,
          fileUrlUz: book.fileUrlUz ?? "",
          fileUrlRu: book.fileUrlRu ?? "",
          coverImageUrl: book.coverImageUrl ?? "",
          tacticHintImg: book.tacticHintImg ?? "",
          basePrice: book.basePrice,
          discountType: book.discountType,
          discountPercent: book.discountPercent,
          fixedDiscountPrice: book.fixedDiscountPrice ?? "",
        }
      : {
          bookCategoryId: 0,
          titleUz: "",
          titleRu: "",
          descriptionUz: "",
          descriptionRu: "",
          fileUrl: "",
          fileUrlUz: "",
          fileUrlRu: "",
          coverImageUrl: "",
          tacticHintImg: "",
          basePrice: 0,
          discountType: "NONE",
          discountPercent: 0,
          fixedDiscountPrice: "",
        };

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: defaults,
  });

  const watched = form.watch();

  const preview = useMemo(() => {
    const safe = (n: unknown): number => {
      const v = typeof n === "number" ? n : Number(n);
      return Number.isFinite(v) ? v : 0;
    };
    const fixed = watched.fixedDiscountPrice;
    return computeFinalPrice({
      basePrice: safe(watched.basePrice),
      discountType: watched.discountType,
      discountPercent: safe(watched.discountPercent),
      fixedDiscountPrice:
        fixed === "" ||
        fixed == null ||
        (typeof fixed === "number" && Number.isNaN(fixed))
          ? null
          : safe(fixed),
    });
  }, [
    watched.basePrice,
    watched.discountType,
    watched.discountPercent,
    watched.fixedDiscountPrice,
  ]);

  const createMut = useMutation({
    mutationFn: (body: CreateBookDto) => booksApi.create(body),
    onSuccess: () => {
      toast.success(
        "Saqlandi. Embedding qilish uchun '♻ Re-embed' tugmasini bosing."
      );
      qc.invalidateQueries({ queryKey: ["books"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: UpdateBookDto) => booksApi.update(book!.id, body),
    onSuccess: () => {
      toast.success(
        "Saqlandi. Embedding qilish uchun '♻ Re-embed' tugmasini bosing."
      );
      qc.invalidateQueries({ queryKey: ["books"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pending = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const fixed = values.fixedDiscountPrice;
    const fixedVal =
      values.discountType === "FIXED_PRICE" &&
      fixed !== "" &&
      fixed != null &&
      !(typeof fixed === "number" && Number.isNaN(fixed))
        ? Number(fixed)
        : null;
    const payload: CreateBookDto = {
      bookCategoryId: values.bookCategoryId,
      titleUz: values.titleUz,
      titleRu: values.titleRu,
      descriptionUz: values.descriptionUz,
      descriptionRu: values.descriptionRu,
      fileUrl: values.fileUrl,
      fileUrlUz: values.fileUrlUz || null,
      fileUrlRu: values.fileUrlRu || null,
      coverImageUrl: values.coverImageUrl || null,
      tacticHintImg: values.tacticHintImg || null,
      basePrice: Number(values.basePrice) || 0,
      discountType: values.discountType,
      discountPercent: Number(values.discountPercent) || 0,
      fixedDiscountPrice: fixedVal,
    };
    if (mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Yangi kitob" : "Kitobni tahrirlash"}
          </DialogTitle>
          <DialogDescription>
            Barcha majburiy maydonlarni to&apos;ldiring va fayllarni yuklang.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Category */}
          <div className="flex flex-col gap-2">
            <Label>Toifa</Label>
            <Select
              value={
                watched.bookCategoryId ? String(watched.bookCategoryId) : ""
              }
              onValueChange={(v) =>
                form.setValue("bookCategoryId", Number(v), {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toifani tanlang" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {bi.primary(c.titleUz, c.titleRu)}
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                      ({c.categoryType})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.bookCategoryId && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.bookCategoryId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              id="titleUz"
              label="Sarlavha (UZ)"
              register={form.register("titleUz")}
              error={form.formState.errors.titleUz?.message}
              translate={{
                direction: "ru-uz",
                source: watched.titleRu,
                onTranslated: (v) =>
                  form.setValue("titleUz", v, { shouldDirty: true }),
              }}
            />
            <FieldInput
              id="titleRu"
              label="Sarlavha (RU)"
              register={form.register("titleRu")}
              error={form.formState.errors.titleRu?.message}
              translate={{
                direction: "uz-ru",
                source: watched.titleUz,
                onTranslated: (v) =>
                  form.setValue("titleRu", v, { shouldDirty: true }),
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldTextarea
              id="descriptionUz"
              label="Tavsif (UZ)"
              register={form.register("descriptionUz")}
              error={form.formState.errors.descriptionUz?.message}
              translate={{
                direction: "ru-uz",
                source: watched.descriptionRu,
                onTranslated: (v) =>
                  form.setValue("descriptionUz", v, { shouldDirty: true }),
              }}
            />
            <FieldTextarea
              id="descriptionRu"
              label="Tavsif (RU)"
              register={form.register("descriptionRu")}
              error={form.formState.errors.descriptionRu?.message}
              translate={{
                direction: "uz-ru",
                source: watched.descriptionUz,
                onTranslated: (v) =>
                  form.setValue("descriptionRu", v, { shouldDirty: true }),
              }}
            />
          </div>

          {/* Uploads */}
          <div className="grid gap-4 sm:grid-cols-3">
            <UploadField
              label="Muqova rasmi"
              folder="images"
              accept="image/*"
              value={watched.coverImageUrl ?? ""}
              onChange={(v) =>
                form.setValue("coverImageUrl", v, { shouldValidate: true })
              }
              preview="image"
              icon={<ImagePlus className="h-4 w-4" />}
            />
            <UploadField
              label="PDF fayl *"
              folder="books"
              accept="application/pdf"
              value={watched.fileUrl}
              onChange={(v) =>
                form.setValue("fileUrl", v, { shouldValidate: true })
              }
              preview="file"
              required
              error={form.formState.errors.fileUrl?.message}
              icon={<FileText className="h-4 w-4" />}
            />
            <UploadField
              label="Taktik maslahat rasmi"
              folder="images"
              accept="image/*"
              value={watched.tacticHintImg ?? ""}
              onChange={(v) =>
                form.setValue("tacticHintImg", v, { shouldValidate: true })
              }
              preview="image"
              icon={<ImagePlus className="h-4 w-4" />}
            />
          </div>

          {/* AI / Embedding PDF uploads (per-language, optional) */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              <h4 className="text-sm font-semibold">
                AI suhbat uchun PDF (ixtiyoriy)
              </h4>
            </div>
            <p className="mb-3 text-xs text-[var(--muted-foreground)]">
              Bu fayllar foydalanuvchining kitob bilan AI suhbati uchun
              embedding qilinadi. Saqlagandan keyin kitob kartasidagi{" "}
              <strong>♻ Re-embed</strong> tugmasini bosing. Agar bo&apos;sh
              qoldirilsa, asosiy <code>fileUrl</code> ishlatiladi.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <UploadField
                  label="UZ tilidagi PDF (ixtiyoriy)"
                  folder="books"
                  accept="application/pdf"
                  value={watched.fileUrlUz ?? ""}
                  onChange={(v) =>
                    form.setValue("fileUrlUz", v, { shouldValidate: true })
                  }
                  preview="file"
                  icon={<FileText className="h-4 w-4" />}
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  AI o&apos;zbek tilidagi savollarga shu fayldan javob beradi.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <UploadField
                  label="RU tilidagi PDF (ixtiyoriy)"
                  folder="books"
                  accept="application/pdf"
                  value={watched.fileUrlRu ?? ""}
                  onChange={(v) =>
                    form.setValue("fileUrlRu", v, { shouldValidate: true })
                  }
                  preview="file"
                  icon={<FileText className="h-4 w-4" />}
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  AI rus tilidagi savollarga shu fayldan javob beradi.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-md border border-[var(--border)] p-4">
            <h4 className="text-sm font-semibold">Narx va chegirma</h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FieldInput
                id="basePrice"
                label="Asosiy narx (UZS)"
                type="number"
                register={form.register("basePrice", { valueAsNumber: true })}
                error={form.formState.errors.basePrice?.message}
              />
              <div className="flex flex-col gap-2">
                <Label>Chegirma turi</Label>
                <Select
                  value={watched.discountType}
                  onValueChange={(v) =>
                    form.setValue("discountType", v as DiscountType, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["NONE", "PERCENTAGE", "FIXED_PRICE"] as DiscountType[]
                    ).map((d) => (
                      <SelectItem key={d} value={d}>
                        {DISCOUNT_LABEL[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldInput
                id="discountPercent"
                label="Chegirma foizi"
                type="number"
                register={form.register("discountPercent", {
                  valueAsNumber: true,
                })}
                error={form.formState.errors.discountPercent?.message}
                disabled={watched.discountType !== "PERCENTAGE"}
              />
              <FieldInput
                id="fixedDiscountPrice"
                label="Belgilangan narx (UZS)"
                type="number"
                register={form.register("fixedDiscountPrice", {
                  valueAsNumber: true,
                })}
                error={form.formState.errors.fixedDiscountPrice?.message}
                disabled={watched.discountType !== "FIXED_PRICE"}
              />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--muted)]/60 px-3 py-2">
              <span className="text-xs text-[var(--muted-foreground)]">
                Yakuniy narx:
              </span>
              <span className="text-base font-semibold">
                {formatCurrency(preview)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Yaratish" : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Small field helpers
// ---------------------------------------------------------------------------

type TranslateProp = {
  direction: TranslateDirection;
  source: string | null | undefined;
  onTranslated: (v: string) => void;
};

function FieldLabelRow({
  htmlFor,
  label,
  translate,
}: {
  htmlFor: string;
  label: string;
  translate?: TranslateProp;
}) {
  if (!translate) return <Label htmlFor={htmlFor}>{label}</Label>;
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <TranslateButton
        direction={translate.direction}
        source={translate.source}
        onTranslated={translate.onTranslated}
      />
    </div>
  );
}

function FieldInput({
  id,
  label,
  register,
  error,
  type,
  disabled,
  translate,
}: {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  type?: string;
  disabled?: boolean;
  translate?: TranslateProp;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabelRow htmlFor={id} label={label} translate={translate} />
      <Input id={id} type={type} disabled={disabled} {...register} />
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}

function FieldTextarea({
  id,
  label,
  register,
  error,
  translate,
}: {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  translate?: TranslateProp;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabelRow htmlFor={id} label={label} translate={translate} />
      <Textarea id={id} rows={4} {...register} />
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}

function UploadField({
  label,
  folder,
  accept,
  value,
  onChange,
  preview,
  required,
  error,
  icon,
}: {
  label: string;
  folder: UploadFolder;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  preview: "image" | "file";
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File) => {
    try {
      setUploading(true);
      setPct(0);
      const res = await uploadAsset(file, folder, setPct);
      onChange(res.url);
      toast.success(`${label} yuklandi`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setUploading(false);
      setPct(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>
        {label}
        {required && <span className="text-[var(--destructive)]"> *</span>}
      </Label>
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--border)] p-3">
        {preview === "image" && value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={value}
            alt={label}
            className="h-24 w-full rounded object-cover"
          />
        ) : preview === "file" && value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 truncate text-xs text-[var(--primary)] underline"
          >
            <FileText className="h-3 w-3" />
            {value.split("/").pop()}
          </a>
        ) : (
          <div className="flex h-24 items-center justify-center text-xs text-[var(--muted-foreground)]">
            Yuklanmagan
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            icon ?? <Upload className="h-4 w-4" />
          )}
          {value ? "Almashtirish" : "Yuklash"}
        </Button>
        {pct != null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className={cn("h-full bg-[var(--primary)] transition-all")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="yoki URL qo'lda kiriting"
          className="text-xs"
        />
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48, 96];

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onChange,
  pageSize,
  onPageSizeChange,
  isFetching,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
  pageSize?: number;
  onPageSizeChange?: (n: number) => void;
  isFetching?: boolean;
}) {
  const { t } = useT();
  if (total <= 0) return null;

  const safeTotalPages = Math.max(totalPages, 1);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const pageNumbers = buildPageRange(page, safeTotalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-4 sm:flex-row">
      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
        <span>
          {start}–{end} / {total}
          {isFetching && (
            <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
          )}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>{t("Sahifada")}:</span>
            <Select
              value={String(pageSize ?? limit)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-[72px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label={t("Oldingi")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span
              key={`gap-${i}`}
              className="px-2 text-xs text-[var(--muted-foreground)]"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              onClick={() => onChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(page + 1)}
          disabled={page >= safeTotalPages}
          aria-label={t("Keyingi")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  const window = 1; // pages around current
  const add = (p: number | "...") => pages.push(p);

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - window && i <= current + window)
    ) {
      add(i);
    } else if (pages[pages.length - 1] !== "...") {
      add("...");
    }
  }
  return pages;
}
