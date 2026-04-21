"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { apiErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { DiscountType, SubscriptionPlan } from "@/lib/api-types";
import {
  computeFinalPrice,
  hasDiscount,
  plansApi,
  type PlanPayload,
} from "@/features/plans/plans.api";

// --- schema ---------------------------------------------------------------

const discountTypes: DiscountType[] = ["NONE", "PERCENTAGE", "FIXED_PRICE"];

const planSchema = z
  .object({
    titleUz: z.string().min(1, "Sarlavha (UZ) majburiy"),
    titleRu: z.string().min(1, "Sarlavha (RU) majburiy"),
    descriptionUz: z.string().min(1, "Ta'rif (UZ) majburiy"),
    descriptionRu: z.string().min(1, "Ta'rif (RU) majburiy"),
    durationDays: z.coerce.number().int().min(1, "Kamida 1 kun"),
    basePrice: z.coerce.number().min(0, "Narx 0 yoki undan katta"),
    discountType: z.enum(discountTypes as [DiscountType, ...DiscountType[]]),
    discountPercent: z.coerce.number().min(0).max(100).default(0),
    fixedDiscountPrice: z.coerce.number().min(0).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "PERCENTAGE" && (v.discountPercent ?? 0) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["discountPercent"],
        message: "Foizli chegirma uchun % > 0 bo'lishi kerak",
      });
    }
    if (v.discountType === "FIXED_PRICE") {
      const fx = v.fixedDiscountPrice ?? 0;
      if (fx <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["fixedDiscountPrice"],
          message: "Qat'iy narx > 0 bo'lishi kerak",
        });
      } else if (fx >= v.basePrice) {
        ctx.addIssue({
          code: "custom",
          path: ["fixedDiscountPrice"],
          message: "Qat'iy narx asosiy narxdan past bo'lishi kerak",
        });
      }
    }
  });

type PlanFormValues = z.input<typeof planSchema>;
type PlanFormOutput = z.output<typeof planSchema>;

const defaultValues: PlanFormValues = {
  titleUz: "",
  titleRu: "",
  descriptionUz: "",
  descriptionRu: "",
  durationDays: 30,
  basePrice: 0,
  discountType: "NONE",
  discountPercent: 0,
  fixedDiscountPrice: null,
  isActive: true,
};

// --- utils ----------------------------------------------------------------

function durationLabel(days: number): string {
  if (days % 365 === 0 && days >= 365) {
    const years = days / 365;
    return `${years} yil`;
  }
  if (days % 30 === 0 && days >= 30) {
    const months = days / 30;
    return `${months} oy`;
  }
  return `${days} kun`;
}

// --- page -----------------------------------------------------------------

export default function PlansPage() {
  const qc = useQueryClient();
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(
    null
  );

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: plansApi.list,
  });

  const invalidatePlans = () => {
    qc.invalidateQueries({ queryKey: ["plans"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      plansApi.update(id, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.isActive ? "Tarif yoqildi" : "Tarif o'chirildi (faoliyatdan)"
      );
      invalidatePlans();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const removePlan = useMutation({
    mutationFn: (id: number) => plansApi.remove(id),
    onSuccess: () => {
      toast.success("Tarif o'chirildi");
      setDeletingPlan(null);
      invalidatePlans();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const openCreate = () => {
    setEditingPlan(null);
    setDialogMode("create");
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingPlan(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tariflar</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Obuna tariflari va chegirmalarni boshqarish
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Yangi tarif
        </Button>
      </div>

      {plans.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : plans.data && plans.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.data.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeletingPlan(p)}
              onToggle={(v) =>
                toggleActive.mutate({ id: p.id, isActive: v })
              }
              toggleLoading={
                toggleActive.isPending &&
                toggleActive.variables?.id === p.id
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="Tariflar mavjud emas"
          description="Birinchi obuna tarifini yarating"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Yangi tarif
            </Button>
          }
        />
      )}

      {dialogMode !== null && (
        <PlanFormDialog
          mode={dialogMode}
          plan={editingPlan}
          onClose={closeDialog}
          onSaved={() => {
            invalidatePlans();
            closeDialog();
          }}
        />
      )}

      <Dialog
        open={deletingPlan !== null}
        onOpenChange={(o) => !o && setDeletingPlan(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
              Tarifni o&apos;chirish
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-[var(--foreground)]">
                {deletingPlan?.titleUz}
              </span>{" "}
              tarifini butunlay o&apos;chirmoqchimisiz? Bu amalni bekor qilib
              bo&apos;lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingPlan(null)}
              disabled={removePlan.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingPlan && removePlan.mutate(deletingPlan.id)
              }
              disabled={removePlan.isPending}
            >
              {removePlan.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- plan card ------------------------------------------------------------

function PlanCard({
  plan,
  onEdit,
  onDelete,
  onToggle,
  toggleLoading,
}: {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
  toggleLoading?: boolean;
}) {
  const finalPrice = computeFinalPrice(plan);
  const discounted = hasDiscount(plan);

  return (
    <Card className="relative flex flex-col overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: plan.isActive
            ? "var(--primary)"
            : "var(--muted-foreground)",
        }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{plan.titleUz}</CardTitle>
            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
              {plan.titleRu}
            </p>
          </div>
          <Badge
            variant={plan.isActive ? "success" : "outline"}
            className="shrink-0"
          >
            {durationLabel(plan.durationDays)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
          {plan.descriptionUz}
        </p>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">
            {formatCurrency(finalPrice)}
          </span>
          {discounted && (
            <span className="text-sm text-[var(--muted-foreground)] line-through">
              {formatCurrency(plan.basePrice)}
            </span>
          )}
          {discounted && plan.discountType === "PERCENTAGE" && (
            <Badge variant="warning" className="ml-auto">
              -{plan.discountPercent}%
            </Badge>
          )}
          {discounted && plan.discountType === "FIXED_PRICE" && (
            <Badge variant="warning" className="ml-auto">
              <Sparkles className="mr-1 h-3 w-3" />
              Aksiya
            </Badge>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={plan.isActive}
              onCheckedChange={onToggle}
              disabled={toggleLoading}
              id={`plan-active-${plan.id}`}
            />
            <Label
              htmlFor={`plan-active-${plan.id}`}
              className="cursor-pointer text-xs text-[var(--muted-foreground)]"
            >
              {plan.isActive ? "Faol" : "Nofaol"}
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              aria-label="Tahrirlash"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              aria-label="O'chirish"
              className="text-[var(--destructive)] hover:text-[var(--destructive)]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- form dialog ----------------------------------------------------------

function PlanFormDialog({
  mode,
  plan,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<PlanFormValues, unknown, PlanFormOutput>({
    resolver: zodResolver(planSchema),
    defaultValues:
      mode === "edit" && plan
        ? {
            titleUz: plan.titleUz,
            titleRu: plan.titleRu,
            descriptionUz: plan.descriptionUz,
            descriptionRu: plan.descriptionRu,
            durationDays: plan.durationDays,
            basePrice: plan.basePrice,
            discountType: plan.discountType,
            discountPercent: plan.discountPercent ?? 0,
            fixedDiscountPrice: plan.fixedDiscountPrice ?? null,
            isActive: plan.isActive,
          }
        : defaultValues,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const discountType = watch("discountType");
  const basePrice = watch("basePrice");
  const discountPercent = watch("discountPercent");
  const fixedDiscountPrice = watch("fixedDiscountPrice");
  const isActive = watch("isActive");

  const finalPricePreview = useMemo(
    () =>
      computeFinalPrice({
        basePrice: Number(basePrice) || 0,
        discountType,
        discountPercent: Number(discountPercent) || 0,
        fixedDiscountPrice:
          fixedDiscountPrice != null ? Number(fixedDiscountPrice) : null,
      }),
    [basePrice, discountType, discountPercent, fixedDiscountPrice]
  );

  const save = useMutation({
    mutationFn: async (values: PlanFormOutput) => {
      const payload: PlanPayload = {
        titleUz: values.titleUz,
        titleRu: values.titleRu,
        descriptionUz: values.descriptionUz,
        descriptionRu: values.descriptionRu,
        durationDays: values.durationDays,
        basePrice: values.basePrice,
        discountType: values.discountType,
        discountPercent:
          values.discountType === "PERCENTAGE" ? values.discountPercent : 0,
        fixedDiscountPrice:
          values.discountType === "FIXED_PRICE"
            ? values.fixedDiscountPrice ?? null
            : null,
        isActive: values.isActive,
      };
      if (mode === "edit" && plan) {
        return plansApi.update(plan.id, payload);
      }
      return plansApi.create(payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Tarif yangilandi" : "Tarif yaratildi");
      onSaved();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const savedDiscount = Math.max(0, (Number(basePrice) || 0) - finalPricePreview);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Tarifni tahrirlash" : "Yangi tarif"}
          </DialogTitle>
          <DialogDescription>
            Barcha majburiy maydonlarni to&apos;ldiring. Chegirma turi tanlanganda
            tegishli maydonlar ochiladi.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => save.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sarlavha (UZ)" error={errors.titleUz?.message}>
              <Input placeholder="1 oylik" {...register("titleUz")} />
            </Field>
            <Field label="Sarlavha (RU)" error={errors.titleRu?.message}>
              <Input placeholder="1 месяц" {...register("titleRu")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ta'rif (UZ)"
              error={errors.descriptionUz?.message}
            >
              <Textarea
                rows={3}
                placeholder="Tarif haqida qisqacha..."
                {...register("descriptionUz")}
              />
            </Field>
            <Field
              label="Ta'rif (RU)"
              error={errors.descriptionRu?.message}
            >
              <Textarea
                rows={3}
                placeholder="Краткое описание..."
                {...register("descriptionRu")}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Davomiylik (kun)"
              error={errors.durationDays?.message}
            >
              <Input
                type="number"
                min={1}
                placeholder="30"
                {...register("durationDays")}
              />
            </Field>
            <Field label="Asosiy narx (UZS)" error={errors.basePrice?.message}>
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="100000"
                {...register("basePrice")}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chegirma turi">
              <Select
                value={discountType}
                onValueChange={(v) =>
                  setValue("discountType", v as DiscountType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Chegirmasiz</SelectItem>
                  <SelectItem value="PERCENTAGE">Foizli (%)</SelectItem>
                  <SelectItem value="FIXED_PRICE">Qat&apos;iy narx</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {discountType === "PERCENTAGE" && (
              <Field
                label="Chegirma foizi (%)"
                error={errors.discountPercent?.message}
              >
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="15"
                  {...register("discountPercent")}
                />
              </Field>
            )}
            {discountType === "FIXED_PRICE" && (
              <Field
                label="Aksiya narxi (UZS)"
                error={errors.fixedDiscountPrice?.message}
              >
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="79000"
                  {...register("fixedDiscountPrice")}
                />
              </Field>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
            <div className="flex items-center gap-2">
              <Switch
                id="plan-active-toggle"
                checked={isActive}
                onCheckedChange={(v) =>
                  setValue("isActive", v, { shouldDirty: true })
                }
              />
              <Label htmlFor="plan-active-toggle" className="cursor-pointer">
                Faol tarif
              </Label>
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">
              Foydalanuvchilar faqat faol tariflarni ko&apos;radi
            </span>
          </div>

          <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Yakuniy narx
              </span>
              {savedDiscount > 0 && (
                <Badge variant="warning">
                  -{formatCurrency(savedDiscount)}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-[var(--primary)]">
                {formatCurrency(finalPricePreview)}
              </span>
              {savedDiscount > 0 && (
                <span className="text-sm text-[var(--muted-foreground)] line-through">
                  {formatCurrency(Number(basePrice) || 0)}
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || save.isPending}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {save.isPending
                ? "Saqlanmoqda..."
                : mode === "edit"
                  ? "Saqlash"
                  : "Yaratish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
