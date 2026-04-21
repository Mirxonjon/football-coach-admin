"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dumbbell, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
  trainingCategoriesApi,
  type TrainingCategoryBody,
} from "@/features/training-categories/training-categories.api";
import { ageCategoriesApi } from "@/features/age-categories/age-categories.api";
import type { TrainingCategory } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";

const ALL = "__all__";

const schema = z.object({
  titleUz: z.string().min(1, "Majburiy"),
  titleRu: z.string().min(1, "Majburiy"),
  descriptionUz: z.string().min(1, "Majburiy"),
  descriptionRu: z.string().min(1, "Majburiy"),
  ageCategoriesId: z.coerce.number().int().positive("Toifani tanlang"),
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
  category: TrainingCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!category;

  const ageQuery = useQuery({
    queryKey: ["age-categories"],
    queryFn: () => ageCategoriesApi.list(),
  });
  const ages = ageQuery.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      titleUz: category?.titleUz ?? "",
      titleRu: category?.titleRu ?? "",
      descriptionUz: category?.descriptionUz ?? "",
      descriptionRu: category?.descriptionRu ?? "",
      ageCategoriesId: category?.ageCategoriesId ?? 0,
      imageUrl: category?.imageUrl ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (body: TrainingCategoryBody) =>
      isEdit && category
        ? trainingCategoriesApi.update(category.id, body)
        : trainingCategoriesApi.create(body),
    onSuccess: () => {
      toast.success(isEdit ? "Yangilandi" : "Yaratildi");
      qc.invalidateQueries({ queryKey: ["training-categories"] });
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
            {isEdit
              ? "Mashg'ulot toifasini tahrirlash"
              : "Yangi mashg'ulot toifasi"}
          </DialogTitle>
          <DialogDescription>
            Yosh toifasi, sarlavha va tavsiflar
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) =>
            mutation.mutate(v as unknown as TrainingCategoryBody)
          )}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>Yosh toifasi</Label>
            <Select
              value={
                form.watch("ageCategoriesId")
                  ? String(form.watch("ageCategoriesId"))
                  : ""
              }
              onValueChange={(v) =>
                form.setValue("ageCategoriesId", Number(v), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Yosh toifasini tanlang" />
              </SelectTrigger>
              <SelectContent>
                {ages.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.titleUz} ({a.minAge}–{a.maxAge})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.ageCategoriesId && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.ageCategoriesId.message}
              </p>
            )}
          </div>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="descriptionUz">Tavsif (UZ)</Label>
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
                <Label htmlFor="descriptionRu">Tavsif (RU)</Label>
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
            label="Rasm (ixtiyoriy)"
            folder="images"
            value={form.watch("imageUrl") ?? undefined}
            onChange={(url) =>
              form.setValue("imageUrl", url ?? "", {
                shouldDirty: true,
              })
            }
          />

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
  category: TrainingCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!category) throw new Error("No category");
      return trainingCategoriesApi.remove(category.id);
    },
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["training-categories"] });
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

export default function TrainingCategoriesPage() {
  const [ageFilter, setAgeFilter] = useState<string>(ALL);
  const [editing, setEditing] = useState<TrainingCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TrainingCategory | null>(null);

  const ageQuery = useQuery({
    queryKey: ["age-categories"],
    queryFn: () => ageCategoriesApi.list(),
  });

  const ageId = ageFilter === ALL ? undefined : Number(ageFilter);
  const { data, isLoading } = useQuery({
    queryKey: ["training-categories", ageId ?? null],
    queryFn: () =>
      trainingCategoriesApi.list(
        ageId ? { ageCategoriesId: ageId } : undefined
      ),
  });

  const items = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mashg&apos;ulot toifalari
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Yosh toifasi bo&apos;yicha mashg&apos;ulot turlarini boshqarish
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Yosh toifasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barcha yosh toifalari</SelectItem>
              {(ageQuery.data ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.titleUz} ({a.minAge}–{a.maxAge})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Yangi toifa
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Toifalar topilmadi"
          description="Filtrlarni o'zgartiring yoki yangi toifa qo'shing"
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Yangi toifa
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="flex flex-col overflow-hidden">
              <div className="relative aspect-video w-full bg-[var(--muted)]">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt={c.titleUz}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
                    <Dumbbell className="h-10 w-10" />
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {c.titleUz}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {c.titleRu}
                    </CardDescription>
                  </div>
                  {c.ageCategory && (
                    <Badge variant="secondary">
                      {c.ageCategory.titleUz}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                <p className="line-clamp-3 text-sm text-[var(--muted-foreground)]">
                  {c.descriptionUz}
                </p>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
