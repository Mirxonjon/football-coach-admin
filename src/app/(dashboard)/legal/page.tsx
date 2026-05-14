"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { apiErrorMessage, apiErrorStatus } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { LegalDocument, LegalDocumentType } from "@/lib/api-types";
import {
  legalApi,
  LEGAL_TYPES,
  LEGAL_TYPE_LABEL,
  type CreateLegalDocumentDto,
  type UpdateLegalDocumentDto,
} from "@/features/legal/legal.api";
import { TranslateButton } from "@/components/translate-button";
import { useBiLang, useT } from "@/lib/i18n";

const TYPE_ALL = "__all__";
const STATUS_ALL = "__all__";
const PAGE_SIZE = 12;

const docSchema = z.object({
  type: z.enum([
    "PRIVACY_POLICY",
    "TERMS_OF_SERVICE",
    "OFFER_AGREEMENT",
    "REQUISITES",
  ]),
  titleUz: z.string().min(1, "Sarlavha (UZ) majburiy").max(200, "Maks. 200"),
  titleRu: z.string().min(1, "Sarlavha (RU) majburiy").max(200, "Maks. 200"),
  contentUz: z.string().min(1, "Matn (UZ) majburiy"),
  contentRu: z.string().min(1, "Matn (RU) majburiy"),
  isActive: z.boolean(),
});
type DocFormValues = z.infer<typeof docSchema>;

type DialogMode =
  | { kind: "create"; presetType?: LegalDocumentType }
  | { kind: "edit"; doc: LegalDocument }
  | { kind: "newVersion"; from: LegalDocument };

export default function LegalDocumentsPage() {
  const { t } = useT();
  const bi = useBiLang();
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string>(TYPE_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [deleting, setDeleting] = useState<LegalDocument | null>(null);

  const typeParam =
    typeFilter === TYPE_ALL ? undefined : (typeFilter as LegalDocumentType);
  const isActiveParam =
    statusFilter === STATUS_ALL ? undefined : statusFilter === "active";

  useEffect(() => {
    setPage(1);
  }, [typeParam, isActiveParam, pageSize]);

  const activeQ = useQuery({
    queryKey: ["legal-active"],
    queryFn: legalApi.listActive,
  });

  const listQ = useQuery({
    queryKey: [
      "legal",
      { type: typeParam ?? null, isActive: isActiveParam, page, limit: pageSize },
    ],
    queryFn: () =>
      legalApi.list({
        type: typeParam,
        isActive: isActiveParam,
        page,
        limit: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const items = listQ.data?.data ?? [];
  const meta = listQ.data?.meta ?? null;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? items.length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["legal"] });
    qc.invalidateQueries({ queryKey: ["legal-active"] });
  };

  const removeMut = useMutation({
    mutationFn: (id: number) => legalApi.remove(id),
    onSuccess: () => {
      toast.success(t("Hujjat o'chirildi"));
      setDeleting(null);
      invalidate();
    },
    onError: (e) => {
      if (apiErrorStatus(e) === 409) {
        toast.error(
          t(
            "Faol hujjatni o'chirib bo'lmaydi. Avval uni faolsizlantiring."
          )
        );
      } else {
        toast.error(apiErrorMessage(e));
      }
    },
  });

  const activeByType = new Map<LegalDocumentType, LegalDocument>();
  (activeQ.data ?? []).forEach((d) => activeByType.set(d.type, d));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Huquqiy hujjatlar")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t(
              "Maxfiylik siyosati, foydalanuvchi shartnomasi, oferta va rekvizitlarni boshqaring"
            )}
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create" })}>
          <Plus className="h-4 w-4" />
          {t("Yangi hujjat")}
        </Button>
      </div>

      {/* Active 4-card overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LEGAL_TYPES.map((type) => {
          const doc = activeByType.get(type);
          const label = bi.locale === "ru"
            ? LEGAL_TYPE_LABEL[type].ru
            : LEGAL_TYPE_LABEL[type].uz;
          return (
            <Card key={type} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{label}</CardTitle>
                  {doc ? (
                    <Badge variant="secondary">v{doc.version}</Badge>
                  ) : (
                    <Badge variant="outline">{t("Yo'q")}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                {doc ? (
                  <>
                    <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">
                      {bi.primary(doc.titleUz, doc.titleRu)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialog({ kind: "edit", doc })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("Tahrirlash")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDialog({ kind: "newVersion", from: doc })
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("Yangi versiya")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs italic text-[var(--muted-foreground)]">
                      {t("Faol versiya hali yaratilmagan")}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDialog({ kind: "create", presetType: type })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("Yaratish")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History table */}
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t("Versiyalar tarixi")}</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sm:w-64">
                <SelectValue placeholder={t("Barcha turlar")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TYPE_ALL}>{t("Barcha turlar")}</SelectItem>
                {LEGAL_TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {bi.locale === "ru"
                      ? LEGAL_TYPE_LABEL[tp].ru
                      : LEGAL_TYPE_LABEL[tp].uz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder={t("Barcha statuslar")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STATUS_ALL}>
                  {t("Barcha statuslar")}
                </SelectItem>
                <SelectItem value="active">{t("Faol")}</SelectItem>
                <SelectItem value="inactive">{t("Arxiv")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {listQ.isLoading && !listQ.data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : listQ.isError ? (
            <p className="p-4 text-sm text-[var(--destructive)]">
              {apiErrorMessage(listQ.error)}
            </p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("Hujjatlar topilmadi")}
              description={t("Filtrlarni o'zgartiring yoki yangi hujjat yarating")}
              action={
                <Button onClick={() => setDialog({ kind: "create" })}>
                  <Plus className="h-4 w-4" />
                  {t("Yangi hujjat")}
                </Button>
              }
              className="border-0 bg-transparent"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t("Tur")}</TableHead>
                  <TableHead>{t("Versiya")}</TableHead>
                  <TableHead>{t("Sarlavha")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Nashr qilingan")}</TableHead>
                  <TableHead className="text-right">{t("Amallar")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                      #{d.id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {bi.locale === "ru"
                          ? LEGAL_TYPE_LABEL[d.type].ru
                          : LEGAL_TYPE_LABEL[d.type].uz}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      v{d.version}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="truncate">
                        {bi.primary(d.titleUz, d.titleRu)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {d.isActive ? (
                        <Badge className="bg-[oklch(0.72_0.19_145)] text-white">
                          {t("Faol")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t("Arxiv")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(d.publishedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDialog({ kind: "edit", doc: d })}
                          aria-label={t("Tahrirlash")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setDialog({ kind: "newVersion", from: d })
                          }
                          aria-label={t("Yangi versiya")}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(d)}
                          aria-label={t("O'chirish")}
                          disabled={d.isActive}
                          title={
                            d.isActive
                              ? t(
                                  "Faol hujjatni o'chirib bo'lmaydi. Avval uni faolsizlantiring."
                                )
                              : undefined
                          }
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

          {items.length > 0 && (
            <Pagination
              page={meta?.page ?? page}
              totalPages={totalPages}
              total={total}
              limit={meta?.limit ?? pageSize}
              onChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              isFetching={listQ.isFetching}
            />
          )}
        </CardContent>
      </Card>

      {dialog && (
        <DocFormDialog
          mode={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            invalidate();
            setDialog(null);
          }}
        />
      )}

      <Dialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
              {t("Hujjatni o'chirish")}
            </DialogTitle>
            <DialogDescription>
              {deleting && (
                <>
                  <span className="font-medium text-[var(--foreground)]">
                    {bi.primary(deleting.titleUz, deleting.titleRu)} (v
                    {deleting.version})
                  </span>{" "}
                  — {t("Bu amalni bekor qilib bo'lmaydi.")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={removeMut.isPending}
            >
              {t("Bekor qilish")}
            </Button>
            <Button
              variant="destructive"
              disabled={removeMut.isPending}
              onClick={() => deleting && removeMut.mutate(deleting.id)}
            >
              {removeMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("O'chirish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form dialog (create / edit / new version)
// ---------------------------------------------------------------------------

function DocFormDialog({
  mode,
  onClose,
  onSaved,
}: {
  mode: DialogMode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useT();
  const bi = useBiLang();

  const seed: DocFormValues =
    mode.kind === "edit"
      ? {
          type: mode.doc.type,
          titleUz: mode.doc.titleUz,
          titleRu: mode.doc.titleRu,
          contentUz: mode.doc.contentUz,
          contentRu: mode.doc.contentRu,
          isActive: mode.doc.isActive,
        }
      : mode.kind === "newVersion"
      ? {
          type: mode.from.type,
          titleUz: mode.from.titleUz,
          titleRu: mode.from.titleRu,
          contentUz: mode.from.contentUz,
          contentRu: mode.from.contentRu,
          isActive: true,
        }
      : {
          type: mode.presetType ?? "PRIVACY_POLICY",
          titleUz: "",
          titleRu: "",
          contentUz: "",
          contentRu: "",
          isActive: true,
        };

  const form = useForm<DocFormValues>({
    resolver: zodResolver(docSchema),
    defaultValues: seed,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const type = watch("type");
  const isActive = watch("isActive");
  const isEdit = mode.kind === "edit";
  const isNewVersion = mode.kind === "newVersion";
  const typeLocked = mode.kind !== "create";

  const save = useMutation({
    mutationFn: async (values: DocFormValues) => {
      if (mode.kind === "edit") {
        const body: UpdateLegalDocumentDto = {
          titleUz: values.titleUz,
          titleRu: values.titleRu,
          contentUz: values.contentUz,
          contentRu: values.contentRu,
          isActive: values.isActive,
        };
        return legalApi.update(mode.doc.id, body);
      }
      const body: CreateLegalDocumentDto = {
        type: values.type,
        titleUz: values.titleUz,
        titleRu: values.titleRu,
        contentUz: values.contentUz,
        contentRu: values.contentRu,
        isActive: values.isActive,
      };
      return legalApi.create(body);
    },
    onSuccess: (doc) => {
      if (isEdit) toast.success(t("Hujjat yangilandi"));
      else toast.success(`${t("Yaratildi")} — v${doc.version}`);
      onSaved();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("Hujjatni tahrirlash")
              : isNewVersion
              ? t("Yangi versiya nashr qilish")
              : t("Yangi hujjat")}
          </DialogTitle>
          <DialogDescription>
            {isNewVersion
              ? t(
                  "Eski versiya avtomatik arxivga ko'chiriladi. Foydalanuvchilar yangi versiyaga qaytadan rozilik berishi kerak bo'ladi."
                )
              : t("UZ va RU tilidagi sarlavha + matnni to'ldiring.")}
          </DialogDescription>
        </DialogHeader>

        {isNewVersion && (
          <div className="flex items-start gap-2 rounded-md border border-[oklch(0.8_0.17_80)]/40 bg-[oklch(0.8_0.17_80)]/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.65_0.17_60)]" />
            <p>
              {t(
                "Yangi versiya nashr qilinsa: eski versiya arxivga o'tadi, barcha foydalanuvchilar qaytadan rozilik berishi shart bo'ladi."
              )}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit((v) => save.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>{t("Tur")}</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                setValue("type", v as LegalDocumentType, {
                  shouldValidate: true,
                })
              }
              disabled={typeLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {bi.locale === "ru"
                      ? LEGAL_TYPE_LABEL[tp].ru
                      : LEGAL_TYPE_LABEL[tp].uz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="titleUz">{t("Sarlavha (UZ)")}</Label>
                <TranslateButton
                  direction="ru-uz"
                  source={watch("titleRu")}
                  onTranslated={(v) =>
                    setValue("titleUz", v, { shouldDirty: true })
                  }
                />
              </div>
              <Input
                id="titleUz"
                maxLength={200}
                {...register("titleUz")}
              />
              {errors.titleUz && (
                <p className="text-xs text-[var(--destructive)]">
                  {errors.titleUz.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="titleRu">{t("Sarlavha (RU)")}</Label>
                <TranslateButton
                  direction="uz-ru"
                  source={watch("titleUz")}
                  onTranslated={(v) =>
                    setValue("titleRu", v, { shouldDirty: true })
                  }
                />
              </div>
              <Input
                id="titleRu"
                maxLength={200}
                {...register("titleRu")}
              />
              {errors.titleRu && (
                <p className="text-xs text-[var(--destructive)]">
                  {errors.titleRu.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contentUz">
                  {t("Matn (UZ)")}{" "}
                  <span className="text-[10px] font-normal text-[var(--muted-foreground)]">
                    Markdown
                  </span>
                </Label>
                <TranslateButton
                  direction="ru-uz"
                  source={watch("contentRu")}
                  onTranslated={(v) =>
                    setValue("contentUz", v, { shouldDirty: true })
                  }
                />
              </div>
              <Textarea
                id="contentUz"
                rows={14}
                className="font-mono text-xs leading-relaxed"
                placeholder="# Maxfiylik siyosati..."
                {...register("contentUz")}
              />
              {errors.contentUz && (
                <p className="text-xs text-[var(--destructive)]">
                  {errors.contentUz.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contentRu">
                  {t("Matn (RU)")}{" "}
                  <span className="text-[10px] font-normal text-[var(--muted-foreground)]">
                    Markdown
                  </span>
                </Label>
                <TranslateButton
                  direction="uz-ru"
                  source={watch("contentUz")}
                  onTranslated={(v) =>
                    setValue("contentRu", v, { shouldDirty: true })
                  }
                />
              </div>
              <Textarea
                id="contentRu"
                rows={14}
                className="font-mono text-xs leading-relaxed"
                placeholder="# Политика конфиденциальности..."
                {...register("contentRu")}
              />
              {errors.contentRu && (
                <p className="text-xs text-[var(--destructive)]">
                  {errors.contentRu.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 p-3">
            <div className="flex flex-col">
              <Label htmlFor="legal-active" className="cursor-pointer">
                {t("Faol versiya")}
              </Label>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t(
                  "Yoqilganda foydalanuvchilarga shu versiya ko'rsatiladi. Boshqa faol versiya avtomatik arxivga o'tadi."
                )}
              </p>
            </div>
            <Switch
              id="legal-active"
              checked={isActive}
              onCheckedChange={(v) =>
                setValue("isActive", v, { shouldDirty: true })
              }
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={save.isPending}
            >
              {t("Bekor qilish")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit
                ? t("Saqlash")
                : isNewVersion
                ? t("Yangi versiya nashr qilish")
                : t("Yaratish")}
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
