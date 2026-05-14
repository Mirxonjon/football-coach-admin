"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  FileText,
  Film,
  Heading1,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Loader2,
  Monitor,
  Paperclip,
  Pencil,
  Plus,
  Smartphone,
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
import { Switch } from "@/components/ui/switch";
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
  masterclassesApi,
  type CreateMasterclassBlockDto,
  type MasterclassDetail,
  type UpdateMasterclassBlockDto,
  type UpdateMasterclassDto,
} from "@/features/masterclasses/masterclasses.api";
import { uploadAsset, type UploadFolder } from "@/features/uploads/upload.api";
import type {
  BlockType,
  MasterclassBlock,
  MasterclassCategory,
} from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TranslateButton } from "@/components/translate-button";
import { useBiLang, useT } from "@/lib/i18n";

const BLOCK_TYPES: BlockType[] = [
  "TITLE",
  "TEXT",
  "VIDEO",
  "IMAGE",
  "FILE",
  "HINT",
];

const BLOCK_META: Record<
  BlockType,
  {
    label: string;
    icon: typeof FileText;
    tone: string;
    folder?: UploadFolder;
    accept?: string;
  }
> = {
  TITLE: { label: "Sarlavha bloki", icon: Heading1, tone: "oklch(0.62 0.19 260)" },
  TEXT: { label: "Matn", icon: FileText, tone: "oklch(0.62 0.15 220)" },
  VIDEO: {
    label: "Video",
    icon: Film,
    tone: "oklch(0.62 0.2 25)",
    folder: "videos",
    accept: "video/*",
  },
  IMAGE: {
    label: "Rasm",
    icon: ImageIcon,
    tone: "oklch(0.7 0.18 150)",
    folder: "images",
    accept: "image/*",
  },
  FILE: {
    label: "Fayl",
    icon: Paperclip,
    tone: "oklch(0.62 0.08 260)",
    folder: "books",
    accept: "application/pdf,application/*",
  },
  HINT: { label: "Maslahat", icon: HelpCircle, tone: "oklch(0.75 0.17 80)" },
};

function isMediaBlock(t: BlockType) {
  return t === "VIDEO" || t === "IMAGE" || t === "FILE";
}

export default function MasterclassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const bi = useBiLang();
  const { t } = useT();
  const masterclassId = Number(params.id);

  const mcQ = useQuery({
    queryKey: ["masterclass", masterclassId],
    queryFn: () => masterclassesApi.byId(masterclassId),
    enabled: Number.isFinite(masterclassId) && masterclassId > 0,
  });

  const categoriesQ = useQuery({
    queryKey: ["masterclass-categories"],
    queryFn: () => masterclassesApi.categories(),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<
    "mobile" | "desktop" | null
  >(null);
  const [initialType, setInitialType] = useState<BlockType>("TEXT");
  const [editBlockTarget, setEditBlockTarget] =
    useState<MasterclassBlock | null>(null);
  const [deleteBlockTarget, setDeleteBlockTarget] =
    useState<MasterclassBlock | null>(null);

  const sortedBlocks = useMemo(() => {
    const list = mcQ.data?.masterclassBlocks ?? [];
    return [...list].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [mcQ.data]);

  const nextSequence = useMemo(
    () =>
      sortedBlocks.length
        ? Math.max(...sortedBlocks.map((b) => b.sequenceOrder)) + 1
        : 1,
    [sortedBlocks]
  );

  const deleteBlockMut = useMutation({
    mutationFn: (id: number) => masterclassesApi.removeBlock(id),
    onSuccess: () => {
      toast.success(t("O'chirildi"));
      setDeleteBlockTarget(null);
      qc.invalidateQueries({ queryKey: ["masterclass", masterclassId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const reorderMut = useMutation({
    mutationFn: async ({
      a,
      b,
    }: {
      a: MasterclassBlock;
      b: MasterclassBlock;
    }) => {
      await Promise.all([
        masterclassesApi.updateBlock(a.id, { sequenceOrder: b.sequenceOrder }),
        masterclassesApi.updateBlock(b.id, { sequenceOrder: a.sequenceOrder }),
      ]);
    },
    onMutate: async ({ a, b }) => {
      await qc.cancelQueries({ queryKey: ["masterclass", masterclassId] });
      const previous = qc.getQueryData<MasterclassDetail>([
        "masterclass",
        masterclassId,
      ]);
      if (previous) {
        const next: MasterclassDetail = {
          ...previous,
          masterclassBlocks: previous.masterclassBlocks.map((blk) => {
            if (blk.id === a.id)
              return { ...blk, sequenceOrder: b.sequenceOrder };
            if (blk.id === b.id)
              return { ...blk, sequenceOrder: a.sequenceOrder };
            return blk;
          }),
        };
        qc.setQueryData<MasterclassDetail>(
          ["masterclass", masterclassId],
          next
        );
      }
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(["masterclass", masterclassId], ctx.previous);
      toast.error(apiErrorMessage(e));
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["masterclass", masterclassId] }),
  });

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = sortedBlocks[index];
    const swap = sortedBlocks[index + dir];
    if (!target || !swap) return;
    reorderMut.mutate({ a: target, b: swap });
  };

  if (!Number.isFinite(masterclassId)) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t("Topilmadi")}
        description={t("Iltimos, masterklasslar ro'yxatiga qayting.")}
        action={
          <Button asChild variant="outline">
            <Link href="/masterclasses">
              <ArrowLeft className="h-4 w-4" />
              {t("Masterklasslar")}
            </Link>
          </Button>
        }
      />
    );
  }

  if (mcQ.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (mcQ.isError || !mcQ.data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t("Topilmadi")}
        description={apiErrorMessage(mcQ.error) || t("Qayta urinib ko'ring")}
        action={
          <Button asChild variant="outline">
            <Link href="/masterclasses">
              <ArrowLeft className="h-4 w-4" />
              {t("Masterklasslar")}
            </Link>
          </Button>
        }
      />
    );
  }

  const mc = mcQ.data;
  const cat =
    mc.masterclassCategory ??
    (categoriesQ.data ?? []).find((c) => c.id === mc.masterclassCategoryId);
  const catName = cat ? bi.primary(cat.titleUz, cat.titleRu) : undefined;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={() => router.push("/masterclasses")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Masterklasslar")}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {bi.primary(mc.titleUz, mc.titleRu)}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditOpen(true)}
                aria-label={t("Tahrirlash")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {bi.secondary(mc.titleUz, mc.titleRu)}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <span className="font-mono">#{mc.id}</span>
              {catName && <Badge variant="secondary">{catName}</Badge>}
              <span>· {sortedBlocks.length} blok</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewDevice("mobile")}
              disabled={sortedBlocks.length === 0}
            >
              <Smartphone className="h-4 w-4" />
              {t("Telefon")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewDevice("desktop")}
              disabled={sortedBlocks.length === 0}
            >
              <Monitor className="h-4 w-4" />
              {t("Desktop")}
            </Button>
          </div>
        </div>
      </div>

      {sortedBlocks.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("Bloklar yo'q")}
          description={t(
            "Masterklassga birinchi blokni qo'shish uchun pastdagi tugmani bosing."
          )}
          action={
            <Button
              onClick={() => {
                setInitialType("TEXT");
                setAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("Blok qo'shish")}
            </Button>
          }
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {sortedBlocks.map((b, i) => (
            <BlockCard
              key={b.id}
              block={b}
              index={i}
              total={sortedBlocks.length}
              onMoveUp={() => handleMove(i, -1)}
              onMoveDown={() => handleMove(i, 1)}
              onEdit={() => setEditBlockTarget(b)}
              onDelete={() => setDeleteBlockTarget(b)}
              reorderPending={reorderMut.isPending}
            />
          ))}
        </ol>
      )}

      <div className="fixed bottom-6 right-6 z-40">
        <AddBlockMenu
          onPick={(t) => {
            setInitialType(t);
            setAddOpen(true);
          }}
        />
      </div>

      <MasterclassPreviewDialog
        device={previewDevice}
        onClose={() => setPreviewDevice(null)}
        masterclass={mc}
        blocks={sortedBlocks}
        categoryName={catName}
      />

      <EditMasterclassDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        masterclass={mc}
        categories={categoriesQ.data ?? []}
      />

      <BlockFormDialog
        key={`add-${addOpen}-${initialType}`}
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        masterclassId={masterclassId}
        nextSequence={nextSequence}
        initialType={initialType}
      />

      <BlockFormDialog
        key={`edit-${editBlockTarget?.id ?? "none"}`}
        open={!!editBlockTarget}
        onOpenChange={(v) => !v && setEditBlockTarget(null)}
        mode="edit"
        masterclassId={masterclassId}
        nextSequence={nextSequence}
        block={editBlockTarget ?? undefined}
      />

      <Dialog
        open={!!deleteBlockTarget}
        onOpenChange={(v) => !v && setDeleteBlockTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Blokni o'chirish")}</DialogTitle>
            <DialogDescription>
              {deleteBlockTarget
                ? `"${t(BLOCK_META[deleteBlockTarget.blockType].label)}" — ${t(
                    "Bu amalni bekor qilib bo'lmaydi."
                  )}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBlockTarget(null)}>
              {t("Bekor qilish")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBlockMut.isPending}
              onClick={() =>
                deleteBlockTarget &&
                deleteBlockMut.mutate(deleteBlockTarget.id)
              }
            >
              {deleteBlockMut.isPending && (
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
// Block card (same pattern as lesson detail)
// ---------------------------------------------------------------------------

function BlockCard({
  block,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  reorderPending,
}: {
  block: MasterclassBlock;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  reorderPending: boolean;
}) {
  const { t } = useT();
  const meta = BLOCK_META[block.blockType];
  const Icon = meta.icon;
  const media = isMediaBlock(block.blockType);

  return (
    <li className="relative flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:flex-row sm:items-start sm:gap-4">
      <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold">
          {block.sequenceOrder}
        </span>
        <div className="flex flex-col items-start gap-1 sm:items-center">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: `color-mix(in oklch, ${meta.tone} 18%, transparent)`,
              color: meta.tone,
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <Badge variant="outline" className="text-[10px]">
            {t(meta.label)}
          </Badge>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {media ? (
          <MediaPreview block={block} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[11px] uppercase text-[var(--muted-foreground)]">
                UZ
              </Label>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {block.contentUz || (
                  <span className="italic text-[var(--muted-foreground)]">
                    —
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-[11px] uppercase text-[var(--muted-foreground)]">
                RU
              </Label>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {block.contentRu || (
                  <span className="italic text-[var(--muted-foreground)]">
                    —
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
        {block.duration != null && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {block.duration} soniya
          </p>
        )}
      </div>

      <div className="flex flex-row gap-1 sm:flex-col">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={index === 0 || reorderPending}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={index === total - 1 || reorderPending}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
        </Button>
      </div>
    </li>
  );
}

function MediaPreview({ block }: { block: MasterclassBlock }) {
  const url = block.contentUz || block.contentRu;
  if (!url) {
    return (
      <p className="text-sm italic text-[var(--muted-foreground)]">
        URL kiritilmagan
      </p>
    );
  }
  if (block.blockType === "IMAGE") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt=""
        className="max-h-48 w-auto rounded-md border border-[var(--border)] object-contain"
      />
    );
  }
  if (block.blockType === "VIDEO") {
    return (
      <video
        controls
        src={url}
        className="max-h-56 w-full rounded-md border border-[var(--border)] bg-black"
      />
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 p-3">
      <Paperclip className="h-4 w-4 shrink-0" />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="truncate text-sm text-[var(--primary)] underline"
      >
        {url}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-block floating menu
// ---------------------------------------------------------------------------

function AddBlockMenu({ onPick }: { onPick: (t: BlockType) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {open && (
        <div
          className="absolute bottom-14 right-0 flex min-w-[180px] flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--popover)] p-2 shadow-lg"
          role="menu"
        >
          {BLOCK_TYPES.map((type) => {
            const meta = BLOCK_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                role="menuitem"
                onClick={() => {
                  onPick(type);
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-[var(--accent)]"
              >
                <Icon className="h-4 w-4" style={{ color: meta.tone }} />
                {t(meta.label)}
              </button>
            );
          })}
        </div>
      )}
      <Button
        size="lg"
        onClick={() => setOpen((v) => !v)}
        className="h-12 rounded-full px-5 shadow-xl"
      >
        <Plus className="h-5 w-5" />
        {t("Blok qo'shish")}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit masterclass dialog
// ---------------------------------------------------------------------------

const editSchema = z.object({
  titleUz: z.string().min(2),
  titleRu: z.string().min(2),
  masterclassCategoryId: z.number().int().positive(),
});
type EditValues = z.infer<typeof editSchema>;

function EditMasterclassDialog({
  open,
  onOpenChange,
  masterclass,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  masterclass: MasterclassDetail;
  categories: MasterclassCategory[];
}) {
  const { t } = useT();
  const bi = useBiLang();
  const qc = useQueryClient();

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      titleUz: masterclass.titleUz,
      titleRu: masterclass.titleRu,
      masterclassCategoryId: masterclass.masterclassCategoryId,
    },
  });

  const mut = useMutation({
    mutationFn: (body: UpdateMasterclassDto) =>
      masterclassesApi.update(masterclass.id, body),
    onSuccess: () => {
      toast.success(t("Yangilandi"));
      qc.invalidateQueries({ queryKey: ["masterclass", masterclass.id] });
      qc.invalidateQueries({ queryKey: ["masterclasses"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const selectedCat = form.watch("masterclassCategoryId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Masterklassni tahrirlash")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) =>
            mut.mutate({
              titleUz: v.titleUz,
              titleRu: v.titleRu,
              masterclassCategoryId: v.masterclassCategoryId,
            })
          )}
          className="flex flex-col gap-4"
        >
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {bi.primary(c.titleUz, c.titleRu)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Saqlash")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Block form dialog
// ---------------------------------------------------------------------------

const blockSchema = z.object({
  blockType: z.enum(["TITLE", "TEXT", "VIDEO", "IMAGE", "FILE", "HINT"]),
  contentUz: z.string().min(1, "Majburiy"),
  contentRu: z.string().min(1, "Majburiy"),
  duration: z
    .union([z.number().int().nonnegative(), z.nan(), z.literal("")])
    .optional(),
  sequenceOrder: z.number().int().positive(),
});
type BlockFormValues = z.infer<typeof blockSchema>;

function BlockFormDialog({
  open,
  onOpenChange,
  mode,
  masterclassId,
  nextSequence,
  block,
  initialType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  masterclassId: number;
  nextSequence: number;
  block?: MasterclassBlock;
  initialType?: BlockType;
}) {
  const { t } = useT();
  const qc = useQueryClient();

  const defaults: BlockFormValues =
    mode === "edit" && block
      ? {
          blockType: block.blockType,
          contentUz: block.contentUz,
          contentRu: block.contentRu,
          duration: block.duration ?? "",
          sequenceOrder: block.sequenceOrder,
        }
      : {
          blockType: initialType ?? "TEXT",
          contentUz: "",
          contentRu: "",
          duration: "",
          sequenceOrder: nextSequence,
        };

  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: defaults,
  });

  const blockType = form.watch("blockType");
  const media = isMediaBlock(blockType);
  const meta = BLOCK_META[blockType];

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<
    "uz" | "ru" | "both" | null
  >(null);
  const fileRefBoth = useRef<HTMLInputElement>(null);
  const fileRefUz = useRef<HTMLInputElement>(null);
  const fileRefRu = useRef<HTMLInputElement>(null);

  const [bilingualMedia, setBilingualMedia] = useState<boolean>(
    mode === "edit" && !!block && block.contentUz !== block.contentRu
  );

  const createMut = useMutation({
    mutationFn: (body: CreateMasterclassBlockDto) =>
      masterclassesApi.addBlock(masterclassId, body),
    onSuccess: () => {
      toast.success(t("Qo'shildi"));
      qc.invalidateQueries({ queryKey: ["masterclass", masterclassId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: UpdateMasterclassBlockDto) =>
      masterclassesApi.updateBlock(block!.id, body),
    onSuccess: () => {
      toast.success(t("Yangilandi"));
      qc.invalidateQueries({ queryKey: ["masterclass", masterclassId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const uploading = uploadingTarget !== null;
  const pending = createMut.isPending || updateMut.isPending || uploading;

  const onSubmit = form.handleSubmit((values) => {
    const d = values.duration;
    const hasDuration =
      d !== "" && d != null && !(typeof d === "number" && Number.isNaN(d));
    const payload: CreateMasterclassBlockDto = {
      blockType: values.blockType,
      contentUz: values.contentUz,
      contentRu: values.contentRu,
      sequenceOrder: values.sequenceOrder,
      ...(hasDuration ? { duration: Number(d) } : {}),
    };
    if (mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  });

  const handleFilePicked = async (
    file: File,
    target: "uz" | "ru" | "both"
  ) => {
    if (!meta.folder) return;
    try {
      setUploadingTarget(target);
      setUploadPercent(0);
      const res = await uploadAsset(file, meta.folder, setUploadPercent);
      if (target === "uz" || target === "both")
        form.setValue("contentUz", res.url, { shouldValidate: true });
      if (target === "ru" || target === "both")
        form.setValue("contentRu", res.url, { shouldValidate: true });
      toast.success(t("Yuklandi"));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setUploadingTarget(null);
      setUploadPercent(null);
      if (fileRefBoth.current) fileRefBoth.current.value = "";
      if (fileRefUz.current) fileRefUz.current.value = "";
      if (fileRefRu.current) fileRefRu.current.value = "";
    }
  };

  const toggleBilingualMedia = (next: boolean) => {
    setBilingualMedia(next);
    if (!next) {
      const uz = form.getValues("contentUz");
      form.setValue("contentRu", uz, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(mode === "create" ? "Yangi blok" : "Blokni tahrirlash")}
          </DialogTitle>
          <DialogDescription>
            {t(meta.label)} {t("turidagi blok kontentini kiriting.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t("Blok turi")}</Label>
              <Select
                value={blockType}
                onValueChange={(v) =>
                  form.setValue("blockType", v as BlockType, {
                    shouldValidate: true,
                  })
                }
                disabled={mode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {t(BLOCK_META[bt].label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sequenceOrder">{t("Tartib raqami")}</Label>
              <Input
                id="sequenceOrder"
                type="number"
                min={1}
                {...form.register("sequenceOrder", { valueAsNumber: true })}
              />
            </div>
          </div>

          {media && meta.folder ? (
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs uppercase text-[var(--muted-foreground)]">
                  {t("Fayl yuklash")} ({meta.folder})
                </Label>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="bilingual-media-toggle"
                    className="cursor-pointer text-xs text-[var(--muted-foreground)]"
                  >
                    {bilingualMedia ? "2 til uchun" : "1 til uchun"}
                  </Label>
                  <Switch
                    id="bilingual-media-toggle"
                    checked={bilingualMedia}
                    onCheckedChange={toggleBilingualMedia}
                  />
                </div>
              </div>

              {!bilingualMedia ? (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRefBoth}
                    type="file"
                    accept={meta.accept}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFilePicked(f, "both");
                    }}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRefBoth.current?.click()}
                      disabled={uploading}
                    >
                      {uploadingTarget === "both" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t("Fayl tanlash")}
                    </Button>
                    {uploadingTarget === "both" && uploadPercent != null && (
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div
                            className={cn(
                              "h-full rounded-full bg-[var(--primary)] transition-all"
                            )}
                            style={{ width: `${uploadPercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {uploadPercent}%
                        </p>
                      </div>
                    )}
                  </div>
                  <Label htmlFor="contentUz" className="text-xs">
                    URL
                  </Label>
                  <Input
                    id="contentUz"
                    {...form.register("contentUz", {
                      onChange: (e) =>
                        form.setValue("contentRu", e.target.value, {
                          shouldValidate: true,
                        }),
                    })}
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      {
                        lang: "uz" as const,
                        label: "URL (UZ)",
                        field: "contentUz" as const,
                        ref: fileRefUz,
                      },
                      {
                        lang: "ru" as const,
                        label: "URL (RU)",
                        field: "contentRu" as const,
                        ref: fileRefRu,
                      },
                    ]
                  ).map(({ lang, label, field, ref }) => (
                    <div key={lang} className="flex flex-col gap-2">
                      <input
                        ref={ref}
                        type="file"
                        accept={meta.accept}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleFilePicked(f, lang);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Label htmlFor={field} className="text-xs">
                          {label}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => ref.current?.click()}
                          disabled={uploading}
                        >
                          {uploadingTarget === lang ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {t("Yuklash")}
                        </Button>
                      </div>
                      <Input id={field} {...form.register(field)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="contentUz">{t("Kontent (UZ)")}</Label>
                  <TranslateButton
                    direction="ru-uz"
                    source={form.watch("contentRu")}
                    onTranslated={(uz) =>
                      form.setValue("contentUz", uz, { shouldDirty: true })
                    }
                  />
                </div>
                <Textarea
                  id="contentUz"
                  rows={5}
                  {...form.register("contentUz")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="contentRu">{t("Kontent (RU)")}</Label>
                  <TranslateButton
                    source={form.watch("contentUz")}
                    onTranslated={(ru) =>
                      form.setValue("contentRu", ru, { shouldDirty: true })
                    }
                  />
                </div>
                <Textarea
                  id="contentRu"
                  rows={5}
                  {...form.register("contentRu")}
                />
              </div>
            </div>
          )}

          {blockType === "VIDEO" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="duration">
                {t("Davomiyligi (soniya, ixtiyoriy)")}
              </Label>
              <Input
                id="duration"
                type="number"
                min={0}
                {...form.register("duration", { valueAsNumber: true })}
              />
            </div>
          )}

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
              {t(mode === "create" ? "Qo'shish" : "Saqlash")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Masterclass preview dialog (user-facing mobile / web simulation)
// ---------------------------------------------------------------------------

type PreviewDevice = "mobile" | "desktop";

function MasterclassPreviewDialog({
  device,
  onClose,
  masterclass,
  blocks,
  categoryName,
}: {
  device: PreviewDevice | null;
  onClose: () => void;
  masterclass: MasterclassDetail;
  blocks: MasterclassBlock[];
  categoryName?: string;
}) {
  const bi = useBiLang();
  const title = bi.primary(masterclass.titleUz, masterclass.titleRu);
  const subtitle = bi.secondary(masterclass.titleUz, masterclass.titleRu);

  if (device === null) return null;
  const isMobile = device === "mobile";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        key={device}
        className="overflow-hidden p-0"
        style={{
          width: isMobile ? 420 : 1100,
          maxWidth: "95vw",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {isMobile ? (
          <MasterclassMobileFrame
            title={title}
            subtitle={subtitle}
            categoryName={categoryName}
            blocks={blocks}
          />
        ) : (
          <MasterclassDesktopFrame
            title={title}
            subtitle={subtitle}
            categoryName={categoryName}
            blocks={blocks}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MasterclassMobileFrame({
  title,
  subtitle,
  categoryName,
  blocks,
}: {
  title: string;
  subtitle: string;
  categoryName?: string;
  blocks: MasterclassBlock[];
}) {
  const { t } = useT();
  return (
    <div className="relative flex w-full min-w-0 max-h-[80vh] flex-col overflow-hidden bg-[var(--background)]">
      <div className="flex items-center justify-between bg-[var(--muted)]/40 px-4 py-2 text-[11px] text-[var(--muted-foreground)]">
        <span>9:41</span>
        <span>●●● 100%</span>
      </div>

      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <ArrowLeft className="h-4 w-4 text-[var(--muted-foreground)]" />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{title}</span>
          {categoryName && (
            <span className="truncate text-[10px] text-[var(--muted-foreground)]">
              {categoryName}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex min-w-0 flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--primary)]">
              {t("Masterklass")}
            </span>
            <h2 className="text-xl font-semibold tracking-tight break-words">
              {title}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] break-words">
              {subtitle}
            </p>
          </div>
          {blocks.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">—</p>
          ) : (
            blocks.map((b) => <MasterclassPreviewBlock key={b.id} block={b} />)
          )}
          <Button className="mt-4 w-full" size="lg" disabled>
            {t("Keyingi masterklass")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MasterclassDesktopFrame({
  title,
  subtitle,
  categoryName,
  blocks,
}: {
  title: string;
  subtitle: string;
  categoryName?: string;
  blocks: MasterclassBlock[];
}) {
  const { t } = useT();
  return (
    <div className="flex w-full min-w-0 max-h-[82vh] flex-col overflow-hidden bg-[var(--background)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--muted)]/30 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.2_25)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.8_0.17_80)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
        </div>
        <div className="flex-1 truncate rounded-md bg-[var(--background)] px-3 py-1 text-[11px] text-[var(--muted-foreground)]">
          https://football-coach.uz/masterclasses/{title}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-8 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
            ⚽
          </span>
          Football Coach
        </div>
        <div className="flex items-center gap-5 text-xs text-[var(--muted-foreground)]">
          <span>{t("Darslar")}</span>
          <span>{t("Masterklasslar")}</span>
          <span>{t("Kitoblar")}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            U
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto grid max-w-5xl min-w-0 gap-8 px-8 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--primary)]">
                {categoryName ?? t("Masterklass")}
              </span>
              <h1 className="text-3xl font-bold tracking-tight break-words">
                {title}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] break-words">
                {subtitle}
              </p>
            </div>
            {blocks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">—</p>
            ) : (
              <div className="flex flex-col gap-5">
                {blocks.map((b) => (
                  <MasterclassPreviewBlock key={b.id} block={b} />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden h-fit flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 lg:flex">
            <h4 className="text-sm font-semibold">{t("Masterklass haqida")}</h4>
            <div className="flex flex-col gap-2 text-xs text-[var(--muted-foreground)]">
              <div className="flex justify-between">
                <span>{t("Bloklar")}</span>
                <span className="font-medium text-[var(--foreground)]">
                  {blocks.length}
                </span>
              </div>
              {categoryName && (
                <div className="flex justify-between">
                  <span>{t("Toifa")}</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {categoryName}
                  </span>
                </div>
              )}
            </div>
            <Button className="mt-2 w-full" disabled>
              {t("Keyingi masterklass")}
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MasterclassPreviewBlock({ block }: { block: MasterclassBlock }) {
  const bi = useBiLang();
  const text = bi.primary(block.contentUz, block.contentRu);

  switch (block.blockType) {
    case "TITLE":
      return (
        <h3 className="mt-2 text-base font-semibold tracking-tight">{text}</h3>
      );

    case "TEXT":
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
          {text}
        </p>
      );

    case "VIDEO": {
      const url = text;
      if (!url)
        return (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
            Video URL —
          </div>
        );
      return (
        <div className="flex min-w-0 flex-col gap-2">
          <video
            controls
            src={url}
            className="aspect-video w-full rounded-lg border border-[var(--border)] bg-black"
          />
          {block.duration != null && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {Math.floor(block.duration / 60)}:
              {String(block.duration % 60).padStart(2, "0")}
            </p>
          )}
        </div>
      );
    }

    case "IMAGE": {
      const url = text;
      if (!url)
        return (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
            —
          </div>
        );
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt=""
          className="w-full rounded-lg border border-[var(--border)] object-cover"
        />
      );
    }

    case "FILE": {
      const url = text;
      if (!url) return null;
      const name = url.split("/").pop() ?? "file";
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3 text-sm hover:bg-[var(--accent)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
            <Paperclip className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-[11px] text-[var(--muted-foreground)]">
              {url}
            </span>
          </div>
        </a>
      );
    }

    case "HINT":
      return (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        </div>
      );

    default:
      return (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-xs text-[var(--muted-foreground)]">
          <Info className="h-4 w-4" />
          {text}
        </div>
      );
  }
}
