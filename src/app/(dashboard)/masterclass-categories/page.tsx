"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { ImageField } from "@/components/image-field";
import { TranslateButton } from "@/components/translate-button";
import {
  masterclassCategoriesApi,
  type MasterclassCategoryBody,
} from "@/features/masterclass-categories/masterclass-categories.api";
import type { MasterclassCategory } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { useBiLang, useT } from "@/lib/i18n";

const schema = z.object({
  titleUz: z.string().min(1, "Majburiy"),
  titleRu: z.string().min(1, "Majburiy"),
  descriptionUz: z.string().min(1, "Majburiy"),
  descriptionRu: z.string().min(1, "Majburiy"),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});
type FormValues = z.input<typeof schema>;

function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category: MasterclassCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { t } = useT();
  const isEdit = !!category;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      titleUz: category?.titleUz ?? "",
      titleRu: category?.titleRu ?? "",
      descriptionUz: category?.descriptionUz ?? "",
      descriptionRu: category?.descriptionRu ?? "",
      imageUrl: category?.imageUrl ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (body: MasterclassCategoryBody) =>
      isEdit && category
        ? masterclassCategoriesApi.update(category.id, body)
        : masterclassCategoriesApi.create(body),
    onSuccess: () => {
      toast.success(t(isEdit ? "Yangilandi" : "Yaratildi"));
      qc.invalidateQueries({ queryKey: ["masterclass-categories"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? "Masterklass toifasini tahrirlash"
                : "Yangi masterklass toifasi"
            )}
          </DialogTitle>
          <DialogDescription>
            {t("Sarlavha va tavsifni kiriting")}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) =>
            mutation.mutate(v as unknown as MasterclassCategoryBody)
          )}
          className="flex flex-col gap-4"
        >
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="descriptionUz">{t("Tavsif (UZ)")}</Label>
                <TranslateButton
                  direction="ru-uz"
                  source={form.watch("descriptionRu")}
                  onTranslated={(uz) =>
                    form.setValue("descriptionUz", uz, { shouldDirty: true })
                  }
                />
              </div>
              <Textarea
                id="descriptionUz"
                rows={3}
                {...form.register("descriptionUz")}
              />
              {form.formState.errors.descriptionUz && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.descriptionUz.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="descriptionRu">{t("Tavsif (RU)")}</Label>
                <TranslateButton
                  source={form.watch("descriptionUz")}
                  onTranslated={(ru) =>
                    form.setValue("descriptionRu", ru, { shouldDirty: true })
                  }
                />
              </div>
              <Textarea
                id="descriptionRu"
                rows={3}
                {...form.register("descriptionRu")}
              />
              {form.formState.errors.descriptionRu && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.descriptionRu.message}
                </p>
              )}
            </div>
          </div>

          <ImageField
            label={t("Rasm (ixtiyoriy)")}
            folder="images"
            value={form.watch("imageUrl") ?? undefined}
            onChange={(url) =>
              form.setValue("imageUrl", url ?? "", { shouldDirty: true })
            }
          />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Bekor qilish")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t(isEdit ? "Saqlash" : "Yaratish")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  category,
  open,
  onOpenChange,
}: {
  category: MasterclassCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { t } = useT();
  const bi = useBiLang();
  const mutation = useMutation({
    mutationFn: () => {
      if (!category) throw new Error("No category");
      return masterclassCategoriesApi.remove(category.id);
    },
    onSuccess: () => {
      toast.success(t("O'chirildi"));
      qc.invalidateQueries({ queryKey: ["masterclass-categories"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Masterklass toifasini o'chirish")}</DialogTitle>
          <DialogDescription>
            {bi.primary(category?.titleUz, category?.titleRu)} —{" "}
            {t("Bu amalni bekor qilib bo'lmaydi.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Bekor qilish")}
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("O'chirish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PAGE_SIZE = 12;

export default function MasterclassCategoriesPage() {
  const { t } = useT();
  const bi = useBiLang();
  const [editing, setEditing] = useState<MasterclassCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MasterclassCategory | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const listQ = useQuery({
    queryKey: [
      "masterclass-categories",
      { search: debouncedSearch, page, limit: pageSize },
    ],
    queryFn: () =>
      masterclassCategoriesApi.listPaginated({
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
  const isLoading = listQ.isLoading && !listQ.data;
  const hasFilters = debouncedSearch.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Masterklass toifalari")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("Masterklass toifalarini boshqarish")}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("Yangi toifa")}
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">
              {t("Hammasi")} {items.length ? `(${items.length})` : ""}
            </CardTitle>
            <CardDescription>
              {t("Toifani tahrirlash yoki o'chirish")}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Sarlavha bo'yicha izlash...")}
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Crown}
              title={t(hasFilters ? "Topilmadi" : "Toifalar mavjud emas")}
              description={
                hasFilters
                  ? t(
                      "Filtrlarga mos toifa topilmadi. Filtrlarni tozalab ko'ring."
                    )
                  : t("Birinchi masterklass toifasini qo'shing")
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    {t("Filtrlarni tozalash")}
                  </Button>
                ) : (
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" /> {t("Yangi toifa")}
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <Card key={c.id} className="flex flex-col overflow-hidden">
                  <div className="relative h-[280px] w-full shrink-0 overflow-hidden bg-[var(--muted)]">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt={bi.primary(c.titleUz, c.titleRu)}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
                        <Crown className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="truncate text-base">
                      {bi.primary(c.titleUz, c.titleRu)}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {bi.secondary(c.titleUz, c.titleRu)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <p className="line-clamp-3 text-sm text-[var(--muted-foreground)]">
                      {bi.primary(c.descriptionUz, c.descriptionRu)}
                    </p>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(c)}
                        aria-label={t("Tahrirlash")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(c)}
                        aria-label={t("O'chirish")}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

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
        </CardContent>
      </Card>

      <CategoryFormDialog
        category={null}
        open={creating}
        onOpenChange={setCreating}
      />
      <CategoryFormDialog
        category={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
      <DeleteDialog
        category={deleting}
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      />
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
  const pages = buildPageRange(page, safeTotalPages);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-4 sm:flex-row">
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
