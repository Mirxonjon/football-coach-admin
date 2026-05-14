"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Baby, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { ImageField } from "@/components/image-field";
import { TranslateButton } from "@/components/translate-button";
import {
  ageCategoriesApi,
  type AgeCategoryBody,
} from "@/features/age-categories/age-categories.api";
import type { AgeCategory } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { useBiLang, useT } from "@/lib/i18n";

const schema = z
  .object({
    titleUz: z.string().min(1, "Majburiy"),
    titleRu: z.string().min(1, "Majburiy"),
    minAge: z.coerce.number().int().min(0).max(100),
    maxAge: z.coerce.number().int().min(0).max(100),
    iconUrl: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .refine((v) => v.maxAge >= v.minAge, {
    message: "Maksimal yosh minimal yoshdan katta bo'lishi kerak",
    path: ["maxAge"],
  });
type FormValues = z.input<typeof schema>;

function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category: AgeCategory | null;
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
      minAge: category?.minAge ?? 6,
      maxAge: category?.maxAge ?? 10,
      iconUrl: category?.iconUrl ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (body: AgeCategoryBody) =>
      isEdit && category
        ? ageCategoriesApi.update(category.id, body)
        : ageCategoriesApi.create(body),
    onSuccess: () => {
      toast.success(isEdit ? "Yangilandi" : "Yaratildi");
      qc.invalidateQueries({ queryKey: ["age-categories"] });
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
            {isEdit ? "Yosh toifasini tahrirlash" : "Yangi yosh toifasi"}
          </DialogTitle>
          <DialogDescription>
            Uzbek va rus tillaridagi sarlavha hamda yosh oralig&apos;i
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) =>
            mutation.mutate(v as unknown as AgeCategoryBody)
          )}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="minAge">Minimal yosh</Label>
              <Input
                id="minAge"
                type="number"
                min={0}
                {...form.register("minAge")}
              />
              {form.formState.errors.minAge && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.minAge.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxAge">Maksimal yosh</Label>
              <Input
                id="maxAge"
                type="number"
                min={0}
                {...form.register("maxAge")}
              />
              {form.formState.errors.maxAge && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.maxAge.message}
                </p>
              )}
            </div>
          </div>

          <ImageField
            label="Ikon (ixtiyoriy)"
            folder="images"
            aspectClass="aspect-square max-w-[160px]"
            value={form.watch("iconUrl") ?? undefined}
            onChange={(url) =>
              form.setValue("iconUrl", url ?? "", {
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
  category: AgeCategory | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!category) throw new Error("No category");
      return ageCategoriesApi.remove(category.id);
    },
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["age-categories"] });
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

export default function AgeCategoriesPage() {
  const { t } = useT();
  const bi = useBiLang();
  const [editing, setEditing] = useState<AgeCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AgeCategory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["age-categories"],
    queryFn: () => ageCategoriesApi.list(),
  });

  const items = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Yosh toifalari")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("Trenerlik toifalari uchun yosh diapazonlari")}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("Yangi toifa")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Baby}
          title={t("Toifalar mavjud emas")}
          description={t("Birinchi yosh toifasini qo'shing")}
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("Yangi toifa")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div
                className="h-1 w-full"
                style={{ background: "var(--primary)" }}
              />
              <CardHeader className="flex flex-row items-start gap-3">
                {c.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.iconUrl}
                    alt={bi.primary(c.titleUz, c.titleRu)}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Baby className="h-5 w-5" />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <CardTitle className="truncate text-base">
                    {bi.primary(c.titleUz, c.titleRu)}
                  </CardTitle>
                  <CardDescription className="truncate">
                    {bi.secondary(c.titleUz, c.titleRu)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {t("Yosh oralig'i")}
                  </span>
                  <span className="text-sm font-semibold">
                    {c.minAge} – {c.maxAge}
                  </span>
                </div>
                <div className="flex gap-1">
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
