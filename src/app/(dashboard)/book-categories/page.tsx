"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Library, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
              <Label htmlFor="titleUz">Sarlavha (UZ)</Label>
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
          <DialogTitle>Toifani o&apos;chirish</DialogTitle>
          <DialogDescription>
            {category?.titleUz} — bu amalni bekor qilib bo&apos;lmaydi.
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

export default function BookCategoriesPage() {
  const [editing, setEditing] = useState<BookCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BookCategory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["book-categories"],
    queryFn: () => bookCategoriesApi.list(),
  });

  const items = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Kitob toifalari
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Kitob va konspekt toifalarini boshqarish
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Yangi toifa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Hammasi {items.length ? `(${items.length})` : ""}
          </CardTitle>
          <CardDescription>
            Toifani tahrirlash yoki o&apos;chirish
          </CardDescription>
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
              title="Toifalar mavjud emas"
              description="Birinchi kitob toifasini qo'shing"
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Yangi toifa
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Sarlavha (UZ)</TableHead>
                  <TableHead>Sarlavha (RU)</TableHead>
                  <TableHead>Tur</TableHead>
                  <TableHead>Yaratilgan</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {c.id}
                    </TableCell>
                    <TableCell className="font-medium">{c.titleUz}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {c.titleRu}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.categoryType === "BOOK" ? "default" : "secondary"
                        }
                      >
                        {c.categoryType === "BOOK" ? "Kitob" : "Konspekt"}
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
