"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Library, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  bookCategoriesApi,
  type BookCategoryBody,
} from "@/features/book-categories/book-categories.api";
import type { BookCategory, BookCategoryType } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { TranslateButton } from "@/components/translate-button";
import { useBiLang, useT } from "@/lib/i18n";

const schema = z.object({
  titleUz: z.string().min(1, "Majburiy"),
  titleRu: z.string().min(1, "Majburiy"),
  categoryType: z.enum(["BOOK", "KONSPEKT"]),
});
type FormValues = z.infer<typeof schema>;

function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category: BookCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!category;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      titleUz: category?.titleUz ?? "",
      titleRu: category?.titleRu ?? "",
      categoryType: (category?.categoryType ?? "BOOK") as BookCategoryType,
    },
  });

  const mutation = useMutation({
    mutationFn: (body: BookCategoryBody) =>
      isEdit && category
        ? bookCategoriesApi.update(category.id, body)
        : bookCategoriesApi.create(body),
    onSuccess: () => {
      toast.success(isEdit ? "Yangilandi" : "Yaratildi");
      qc.invalidateQueries({ queryKey: ["book-categories"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Kitob toifasini tahrirlash" : "Yangi kitob toifasi"}
          </DialogTitle>
          <DialogDescription>
            Sarlavha va toifa turini kiriting
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="titleUz">Sarlavha (UZ)</Label>
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
                <Label htmlFor="titleRu">Sarlavha (RU)</Label>
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

          <div className="flex flex-col gap-2">
            <Label>Toifa turi</Label>
            <Select
              value={form.watch("categoryType")}
              onValueChange={(v) =>
                form.setValue("categoryType", v as BookCategoryType, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOOK">Kitob</SelectItem>
                <SelectItem value="KONSPEKT">Konspekt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Saqlash" : "Yaratish"}
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
  category: BookCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { t } = useT();
  const bi = useBiLang();
  const mutation = useMutation({
    mutationFn: () => {
      if (!category) throw new Error("No category");
      return bookCategoriesApi.remove(category.id);
    },
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["book-categories"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Toifani o'chirish")}</DialogTitle>
          <DialogDescription>
            {bi.primary(category?.titleUz, category?.titleRu)} — {t("Bu amalni bekor qilib bo'lmaydi.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            O&apos;chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TYPE_ALL = "__all__";

export default function BookCategoriesPage() {
  const { t } = useT();
  const bi = useBiLang();
  const [editing, setEditing] = useState<BookCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BookCategory | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_ALL);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const categoryType =
    typeFilter === TYPE_ALL ? undefined : (typeFilter as BookCategoryType);

  const { data, isLoading } = useQuery({
    queryKey: ["book-categories", { search: debouncedSearch, categoryType }],
    queryFn: () =>
      bookCategoriesApi.list({
        search: debouncedSearch || undefined,
        categoryType,
      }),
  });

  const items = data ?? [];
  const hasFilters = debouncedSearch.length > 0 || categoryType !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Kitob toifalari")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("Kitob va konspekt toifalarini boshqarish")}
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
                  aria-label="Tozalash"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder={t("Barcha turlar")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TYPE_ALL}>{t("Barcha turlar")}</SelectItem>
                <SelectItem value="BOOK">{t("Kitob")}</SelectItem>
                <SelectItem value="KONSPEKT">{t("Konspekt")}</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter(TYPE_ALL);
                }}
              >
                {t("Tozalash")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Library}
              title={t(hasFilters ? "Topilmadi" : "Toifalar mavjud emas")}
              description={
                hasFilters
                  ? t("Filtrlarga mos toifa topilmadi. Filtrlarni tozalab ko'ring.")
                  : t("Birinchi kitob toifasini qo'shing")
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter(TYPE_ALL);
                    }}
                  >
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t("Sarlavha (UZ)")}</TableHead>
                  <TableHead>{t("Sarlavha (RU)")}</TableHead>
                  <TableHead>{t("Tur")}</TableHead>
                  <TableHead>{t("Yaratilgan")}</TableHead>
                  <TableHead className="text-right">{t("Amallar")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {c.id}
                    </TableCell>
                    <TableCell
                      className={
                        bi.locale === "uz"
                          ? "font-semibold text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      }
                    >
                      {c.titleUz}
                    </TableCell>
                    <TableCell
                      className={
                        bi.locale === "ru"
                          ? "font-semibold text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      }
                    >
                      {c.titleRu}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.categoryType === "BOOK" ? "default" : "secondary"
                        }
                      >
                        {t(c.categoryType === "BOOK" ? "Kitob" : "Konspekt")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(c)}
                          aria-label="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(c)}
                          aria-label="O'chirish"
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
