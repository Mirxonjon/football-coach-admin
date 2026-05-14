"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  masterclassesApi,
  type CreateMasterclassDto,
  type UpdateMasterclassDto,
} from "@/features/masterclasses/masterclasses.api";
import type { Masterclass, MasterclassCategory } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { TranslateButton } from "@/components/translate-button";
import { useBiLang, useT } from "@/lib/i18n";

const ALL = "all" as const;
const PAGE_SIZE = 12;

const masterclassSchema = z.object({
  masterclassCategoryId: z.number().int().positive("Toifani tanlang"),
  titleUz: z.string().min(2, "Kamida 2 ta belgi"),
  titleRu: z.string().min(2, "Kamida 2 ta belgi"),
});
type FormValues = z.input<typeof masterclassSchema>;

export default function MasterclassesPage() {
  const { t } = useT();
  const bi = useBiLang();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Masterclass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Masterclass | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const filterId = filter === ALL ? undefined : Number(filter);

  useEffect(() => {
    setPage(1);
  }, [filterId, debouncedSearch, pageSize]);

  const categoriesQ = useQuery({
    queryKey: ["masterclass-categories"],
    queryFn: () => masterclassesApi.categories(),
  });

  const listQ = useQuery({
    queryKey: [
      "masterclasses",
      {
        masterclassCategoryId: filterId ?? null,
        search: debouncedSearch,
        page,
        limit: pageSize,
      },
    ],
    queryFn: () =>
      masterclassesApi.listPaginated({
        masterclassCategoryId: filterId,
        search: debouncedSearch || undefined,
        page,
        limit: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const items = listQ.data?.data ?? [];
  const meta = listQ.data?.meta ?? null;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? items.length;

  const categoriesById = useMemo(() => {
    const m = new Map<number, MasterclassCategory>();
    (categoriesQ.data ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [categoriesQ.data]);

  const hasFilters = filterId !== undefined || debouncedSearch.length > 0;
  const clearFilters = () => {
    setFilter(ALL);
    setSearch("");
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => masterclassesApi.remove(id),
    onSuccess: () => {
      toast.success(t("O'chirildi"));
      qc.invalidateQueries({ queryKey: ["masterclasses"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Masterklasslar")}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("Masterklass darslari va videolarini boshqaring")}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("Yangi masterklass")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Masterklass sarlavhasi bo'yicha izlash...")}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("Tozalash")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder={t("Masterklass toifasi")} />
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
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("Tozalash")}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {listQ.isLoading && !listQ.data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : listQ.isError ? (
          <div className="p-6 text-sm text-[var(--destructive)]">
            {apiErrorMessage(listQ.error)}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={Film}
            title={t("Masterklasslar topilmadi")}
            description={
              hasFilters
                ? t(
                    "Filtrlarga mos masterklass topilmadi. Filtrlarni tozalab ko'ring."
                  )
                : t("Hali hech qanday masterklass yaratilmagan.")
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  {t("Filtrlarni tozalash")}
                </Button>
              ) : (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("Yangi masterklass")}
                </Button>
              )
            }
            className="border-0 bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>{t("Sarlavha (UZ)")}</TableHead>
                <TableHead>{t("Sarlavha (RU)")}</TableHead>
                <TableHead>{t("Toifa")}</TableHead>
                <TableHead>{t("Yaratilgan")}</TableHead>
                <TableHead className="text-right">{t("Amallar")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => {
                const cat =
                  m.masterclassCategory ??
                  categoriesById.get(m.masterclassCategoryId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                      #{m.id}
                    </TableCell>
                    <TableCell
                      className={
                        bi.locale === "uz"
                          ? "font-semibold text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      }
                    >
                      {m.titleUz}
                    </TableCell>
                    <TableCell
                      className={
                        bi.locale === "ru"
                          ? "font-semibold text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      }
                    >
                      {m.titleRu}
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <Badge variant="secondary">
                          {bi.primary(cat.titleUz, cat.titleRu)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(m.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={`/masterclasses/${m.id}`}
                            aria-label={`${t("Ko'rinish")} #${m.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditTarget(m)}
                          aria-label={`${t("Tahrirlash")} #${m.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(m)}
                          aria-label={`${t("O'chirish")} #${m.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {items.length > 0 && (
        <Pagination
          page={meta?.page ?? page}
          totalPages={totalPages}
          total={total}
          limit={meta?.limit ?? pageSize}
          onChange={(p) => setPage(p)}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          isFetching={listQ.isFetching}
        />
      )}

      <MasterclassFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        categories={categoriesQ.data ?? []}
      />

      <MasterclassFormDialog
        key={editTarget?.id}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        mode="edit"
        categories={categoriesQ.data ?? []}
        masterclass={editTarget ?? undefined}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Masterklassni o'chirish")}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${bi.primary(deleteTarget.titleUz, deleteTarget.titleRu)}" — ${t(
                    "Bu amalni bekor qilib bo'lmaydi."
                  )}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("Bekor qilish")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("O'chirish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

function MasterclassFormDialog({
  open,
  onOpenChange,
  mode,
  categories,
  masterclass,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  categories: MasterclassCategory[];
  masterclass?: Masterclass;
}) {
  const { t } = useT();
  const bi = useBiLang();
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(masterclassSchema),
    values:
      mode === "edit" && masterclass
        ? {
            masterclassCategoryId: masterclass.masterclassCategoryId,
            titleUz: masterclass.titleUz,
            titleRu: masterclass.titleRu,
          }
        : {
            masterclassCategoryId: 0,
            titleUz: "",
            titleRu: "",
          },
  });

  const selectedCat = form.watch("masterclassCategoryId");

  const createMut = useMutation({
    mutationFn: (body: CreateMasterclassDto) => masterclassesApi.create(body),
    onSuccess: () => {
      toast.success(t("Yaratildi"));
      qc.invalidateQueries({ queryKey: ["masterclasses"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: UpdateMasterclassDto) =>
      masterclassesApi.update(masterclass!.id, body),
    onSuccess: () => {
      toast.success(t("Yangilandi"));
      qc.invalidateQueries({ queryKey: ["masterclasses"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pending = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit((v) => {
    const payload: CreateMasterclassDto = {
      masterclassCategoryId: v.masterclassCategoryId as number,
      titleUz: v.titleUz,
      titleRu: v.titleRu,
    };
    if (mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(mode === "create" ? "Yangi masterklass" : "Masterklassni tahrirlash")}
          </DialogTitle>
          <DialogDescription>
            {t("Toifa va sarlavhani kiriting.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("Masterklass toifasi")}</Label>
            <Select
              value={selectedCat ? String(selectedCat) : ""}
              onValueChange={(v) =>
                form.setValue("masterclassCategoryId", Number(v), {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Toifani tanlang")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {bi.primary(c.titleUz, c.titleRu)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.masterclassCategoryId && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.masterclassCategoryId.message}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="titleUz">{t("Sarlavha (UZ)")}</Label>
                <TranslateButton
                  direction="ru-uz"
                  source={form.watch("titleRu")}
                  onTranslated={(uz) =>
                    form.setValue("titleUz", uz, { shouldDirty: true })
                  }
                />
              </div>
              <Input id="titleUz" {...form.register("titleUz")} />
              {form.formState.errors.titleUz && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.titleUz.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="titleRu">{t("Sarlavha (RU)")}</Label>
                <TranslateButton
                  source={form.watch("titleUz")}
                  onTranslated={(ru) =>
                    form.setValue("titleRu", ru, { shouldDirty: true })
                  }
                />
              </div>
              <Input id="titleRu" {...form.register("titleRu")} />
              {form.formState.errors.titleRu && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.titleRu.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Bekor qilish")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t(mode === "create" ? "Yaratish" : "Saqlash")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const pages = buildPageRange(page, safeTotalPages);

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
        {pages.map((p, i) =>
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
  const window = 1;
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - window && i <= current + window)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return pages;
}
