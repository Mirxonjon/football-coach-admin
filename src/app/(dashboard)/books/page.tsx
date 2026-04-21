"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BookOpen,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
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
  uploadAsset,
  type UploadFolder,
} from "@/features/uploads/upload.api";
import type { Book, BookCategory, DiscountType } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

const ALL = "all" as const;

const DISCOUNT_LABEL: Record<DiscountType, string> = {
  NONE: "Chegirma yo'q",
  PERCENTAGE: "Foizli chegirma",
  FIXED_PRICE: "Belgilangan narx",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BooksPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);

  const filterId = filter === ALL ? undefined : Number(filter);

  const categoriesQ = useQuery({
    queryKey: ["book-categories"],
    queryFn: booksApi.categories,
  });

  const booksQ = useQuery({
    queryKey: ["books", { bookCategoryId: filterId ?? null }],
    queryFn: () => booksApi.list(filterId),
  });

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kitoblar</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Kitob va konspektlarni boshqaring, narx va chegirmalarni sozlang
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-[var(--muted-foreground)]">
              Toifa
            </Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="min-w-[220px]">
                <SelectValue placeholder="Barcha toifalar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Barcha toifalar</SelectItem>
                {(categoriesQ.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.titleUz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="sm:self-end">
            <Plus className="h-4 w-4" />
            Yangi kitob
          </Button>
        </div>
      </div>

      {booksQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : booksQ.isError ? (
        <div className="p-6 text-sm text-[var(--destructive)]">
          {apiErrorMessage(booksQ.error)}
        </div>
      ) : !booksQ.data?.length ? (
        <EmptyState
          icon={BookOpen}
          title="Kitoblar topilmadi"
          description={
            filterId
              ? "Ushbu toifada kitoblar mavjud emas. Yangi kitob qo'shing."
              : "Hali hech qanday kitob yaratilmagan."
          }
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Yangi kitob
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {booksQ.data.map((b) => (
            <BookCard
              key={b.id}
              book={b}
              category={categoriesById.get(b.bookCategoryId) ?? b.bookCategory}
              onEdit={() => setEditTarget(b)}
              onDelete={() => setDeleteTarget(b)}
            />
          ))}
        </div>
      )}

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
                ? `"${deleteTarget.titleUz}" kitobi o'chiriladi. Bu amalni bekor qilib bo'lmaydi.`
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
  onEdit,
  onDelete,
}: {
  book: Book;
  category?: BookCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const finalPrice = computeFinalPrice(book);
  const hasDiscount = finalPrice !== book.basePrice;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative flex h-44 w-full items-center justify-center bg-[var(--muted)]">
        {book.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={book.coverImageUrl}
            alt={book.titleUz}
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-10 w-10 text-[var(--muted-foreground)]" />
        )}
        {category && (
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 text-[10px] uppercase"
          >
            {category.categoryType === "KONSPEKT" ? "Konspekt" : "Kitob"}
          </Badge>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex-1">
          <h3 className="line-clamp-2 font-semibold" title={book.titleUz}>
            {book.titleUz}
          </h3>
          <p
            className="line-clamp-1 text-xs text-[var(--muted-foreground)]"
            title={book.titleRu}
          >
            {book.titleRu}
          </p>
          {category && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {category.titleUz}
            </p>
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label="Tahrirlash"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="O'chirish"
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
      toast.success("Kitob yaratildi");
      qc.invalidateQueries({ queryKey: ["books"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: UpdateBookDto) => booksApi.update(book!.id, body),
    onSuccess: () => {
      toast.success("Kitob yangilandi");
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
                    {c.titleUz}
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
            />
            <FieldInput
              id="titleRu"
              label="Sarlavha (RU)"
              register={form.register("titleRu")}
              error={form.formState.errors.titleRu?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldTextarea
              id="descriptionUz"
              label="Tavsif (UZ)"
              register={form.register("descriptionUz")}
              error={form.formState.errors.descriptionUz?.message}
            />
            <FieldTextarea
              id="descriptionRu"
              label="Tavsif (RU)"
              register={form.register("descriptionRu")}
              error={form.formState.errors.descriptionRu?.message}
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

function FieldInput({
  id,
  label,
  register,
  error,
  type,
  disabled,
}: {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
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
}: {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
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
