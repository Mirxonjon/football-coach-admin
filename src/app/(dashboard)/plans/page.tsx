"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Package,
  Plus,
  Pencil,
  Star,
  Trash2,
  AlertTriangle,
  Sparkles,
  X,
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
import type {
  DiscountType,
  PlanFeature,
  SubscriptionPlan,
} from "@/lib/api-types";
import {
  computeFinalPrice,
  hasDiscount,
  plansApi,
  type PlanPayload,
} from "@/features/plans/plans.api";
import {
  TranslateButton,
  type TranslateDirection,
} from "@/components/translate-button";
import { translateUzToRu, translateRuToUz } from "@/lib/translate";
import { useBiLang, useT } from "@/lib/i18n";

// --- schema ---------------------------------------------------------------

const discountTypes: DiscountType[] = ["NONE", "PERCENTAGE", "FIXED_PRICE"];

const featureSchema = z.object({
  uz: z.string().trim().max(200, "Maksimal 200 belgi").default(""),
  ru: z.string().trim().max(200, "Maksimal 200 belgi").default(""),
  highlight: z.boolean().default(false),
});

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
    features: z.array(featureSchema).max(20, "Maksimal 20 ta").default([]),
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
  features: [],
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
  const { t } = useT();
  const bi = useBiLang();
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("Tariflar")}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("Obuna tariflari va chegirmalarni boshqarish")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("Yangi tarif")}
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
          title={t("Tariflar mavjud emas")}
          description={t("Birinchi obuna tarifini yarating")}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("Yangi tarif")}
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
                {bi.primary(deletingPlan?.titleUz, deletingPlan?.titleRu)}
              </span>{" "}
              — {t("Bu amalni bekor qilib bo'lmaydi.")}
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
  const { t } = useT();
  const bi = useBiLang();
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
            <CardTitle className="truncate text-lg">
              {bi.primary(plan.titleUz, plan.titleRu)}
            </CardTitle>
            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
              {bi.secondary(plan.titleUz, plan.titleRu)}
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
          {bi.primary(plan.descriptionUz, plan.descriptionRu)}
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

        {plan.features && plan.features.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-sm">
            {plan.features.slice(0, 5).map((f, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 ${
                  f.highlight
                    ? "font-semibold text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                <Check
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    f.highlight
                      ? "text-[var(--primary)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                />
                <span className="line-clamp-1">
                  {bi.primary(f.uz, f.ru)}
                </span>
              </li>
            ))}
            {plan.features.length > 5 && (
              <li className="text-xs text-[var(--muted-foreground)]">
                + {plan.features.length - 5} {t("yana")}
              </li>
            )}
          </ul>
        )}

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
              {t(plan.isActive ? "Faol" : "Nofaol")}
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
            features: (plan.features ?? []).map((f) => ({
              uz: f.uz ?? "",
              ru: f.ru ?? "",
              highlight: !!f.highlight,
            })),
          }
        : defaultValues,
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const featuresField = useFieldArray({ control, name: "features" });

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
      const cleanedFeatures: PlanFeature[] = (values.features ?? [])
        .map((f) => ({
          uz: (f.uz ?? "").trim(),
          ru: (f.ru ?? "").trim(),
          highlight: !!f.highlight,
        }))
        .filter((f) => f.uz.length > 0 || f.ru.length > 0);

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
        features: cleanedFeatures,
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
            <Field
              label="Sarlavha (UZ)"
              error={errors.titleUz?.message}
              translate={{
                direction: "ru-uz",
                source: watch("titleRu"),
                onTranslated: (v) =>
                  setValue("titleUz", v, { shouldDirty: true }),
              }}
            >
              <Input placeholder="1 oylik" {...register("titleUz")} />
            </Field>
            <Field
              label="Sarlavha (RU)"
              error={errors.titleRu?.message}
              translate={{
                direction: "uz-ru",
                source: watch("titleUz"),
                onTranslated: (v) =>
                  setValue("titleRu", v, { shouldDirty: true }),
              }}
            >
              <Input placeholder="1 месяц" {...register("titleRu")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ta'rif (UZ)"
              error={errors.descriptionUz?.message}
              translate={{
                direction: "ru-uz",
                source: watch("descriptionRu"),
                onTranslated: (v) =>
                  setValue("descriptionUz", v, { shouldDirty: true }),
              }}
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
              translate={{
                direction: "uz-ru",
                source: watch("descriptionUz"),
                onTranslated: (v) =>
                  setValue("descriptionRu", v, { shouldDirty: true }),
              }}
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

          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <Label className="text-sm font-semibold">
                  Ustunliklar (UZ + RU)
                </Label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Tarif kartasida ro&apos;yxat sifatida chiqadi. Maks. 20 ta,
                  har bir matn 200 belgi.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {featuresField.fields.length} / 20
              </Badge>
            </div>

            {featuresField.fields.length === 0 ? (
              <p className="rounded border border-dashed border-[var(--border)] py-3 text-center text-xs text-[var(--muted-foreground)]">
                Hali ustunlik qo&apos;shilmagan
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {featuresField.fields.map((field, idx) => (
                  <li
                    key={field.id}
                    className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 p-2 sm:flex-row sm:items-start"
                  >
                    <div className="flex items-center gap-1 sm:flex-col sm:gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => idx > 0 && featuresField.move(idx, idx - 1)}
                        disabled={idx === 0}
                        aria-label="Yuqoriga"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                        {idx + 1}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() =>
                          idx < featuresField.fields.length - 1 &&
                          featuresField.move(idx, idx + 1)
                        }
                        disabled={idx === featuresField.fields.length - 1}
                        aria-label="Pastga"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-[10px] uppercase text-[var(--muted-foreground)]">
                            UZ
                          </Label>
                          <button
                            type="button"
                            className="text-[10px] text-[var(--primary)] hover:underline disabled:opacity-50"
                            disabled={!watch(`features.${idx}.ru`)?.trim()}
                            onClick={async () => {
                              const src = getValues(`features.${idx}.ru`) ?? "";
                              if (!src.trim()) return;
                              try {
                                const out = await translateRuToUz(src);
                                setValue(`features.${idx}.uz`, out, {
                                  shouldDirty: true,
                                });
                              } catch (e) {
                                toast.error(apiErrorMessage(e));
                              }
                            }}
                          >
                            RU → UZ
                          </button>
                        </div>
                        <Input
                          maxLength={200}
                          placeholder="Masalan: Barcha pullik darslar"
                          {...register(`features.${idx}.uz` as const)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-[10px] uppercase text-[var(--muted-foreground)]">
                            RU
                          </Label>
                          <button
                            type="button"
                            className="text-[10px] text-[var(--primary)] hover:underline disabled:opacity-50"
                            disabled={!watch(`features.${idx}.uz`)?.trim()}
                            onClick={async () => {
                              const src = getValues(`features.${idx}.uz`) ?? "";
                              if (!src.trim()) return;
                              try {
                                const out = await translateUzToRu(src);
                                setValue(`features.${idx}.ru`, out, {
                                  shouldDirty: true,
                                });
                              } catch (e) {
                                toast.error(apiErrorMessage(e));
                              }
                            }}
                          >
                            UZ → RU
                          </button>
                        </div>
                        <Input
                          maxLength={200}
                          placeholder="Например: Все платные уроки"
                          {...register(`features.${idx}.ru` as const)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:flex-col sm:items-end">
                      <label className="flex cursor-pointer items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-[var(--primary)]"
                          {...register(`features.${idx}.highlight` as const)}
                        />
                        <Star className="h-3 w-3" /> Bold
                      </label>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[var(--destructive)] hover:text-[var(--destructive)]"
                        onClick={() => featuresField.remove(idx)}
                        aria-label="O'chirish"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                featuresField.append({ uz: "", ru: "", highlight: false })
              }
              disabled={featuresField.fields.length >= 20}
            >
              <Plus className="h-4 w-4" /> Ustunlik qo&apos;shish
            </Button>
            {errors.features?.message && (
              <p className="text-xs text-[var(--destructive)]">
                {errors.features.message}
              </p>
            )}
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
  translate,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  translate?: {
    direction: TranslateDirection;
    source: string | null | undefined;
    onTranslated: (v: string) => void;
  };
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {translate ? (
        <div className="flex items-center justify-between gap-2">
          <Label>{label}</Label>
          <TranslateButton
            direction={translate.direction}
            source={translate.source}
            onTranslated={translate.onTranslated}
          />
        </div>
      ) : (
        <Label>{label}</Label>
      )}
      {children}
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
