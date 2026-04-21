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
  Loader2,
  Paperclip,
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
  lessonsApi,
  type CreateBlockDto,
  type LessonDetail,
  type UpdateBlockDto,
} from "@/features/lessons/lessons.api";
import {
  uploadAsset,
  type UploadFolder,
} from "@/features/uploads/upload.api";
import type { BlockType, LessonBlock } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Block-type metadata
// ---------------------------------------------------------------------------

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
  TITLE: {
    label: "Sarlavha",
    icon: Heading1,
    tone: "oklch(0.62 0.19 260)",
  },
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
  HINT: {
    label: "Maslahat",
    icon: HelpCircle,
    tone: "oklch(0.75 0.17 80)",
  },
};

function isMediaBlock(t: BlockType) {
  return t === "VIDEO" || t === "IMAGE" || t === "FILE";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const lessonId = Number(params.id);

  const lessonQ = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => lessonsApi.byId(lessonId),
    enabled: Number.isFinite(lessonId) && lessonId > 0,
  });

  const categoriesQ = useQuery({
    queryKey: ["training-categories"],
    queryFn: lessonsApi.trainingCategories,
  });

  const [editLessonOpen, setEditLessonOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [initialType, setInitialType] = useState<BlockType>("TEXT");
  const [editBlockTarget, setEditBlockTarget] = useState<LessonBlock | null>(
    null,
  );
  const [deleteBlockTarget, setDeleteBlockTarget] =
    useState<LessonBlock | null>(null);

  const sortedBlocks = useMemo(() => {
    const list = lessonQ.data?.lessonBlocks ?? [];
    return [...list].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [lessonQ.data]);

  const nextSequence = useMemo(
    () =>
      sortedBlocks.length
        ? Math.max(...sortedBlocks.map((b) => b.sequenceOrder)) + 1
        : 1,
    [sortedBlocks],
  );

  // ---------- mutations ----------

  const deleteBlockMut = useMutation({
    mutationFn: (id: number) => lessonsApi.removeBlock(id),
    onSuccess: () => {
      toast.success("Blok o'chirildi");
      setDeleteBlockTarget(null);
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  // Reorder via swapping sequenceOrder — optimistic update for snappy UX.
  const reorderMut = useMutation({
    mutationFn: async ({
      a,
      b,
    }: {
      a: LessonBlock;
      b: LessonBlock;
    }) => {
      await Promise.all([
        lessonsApi.updateBlock(a.id, { sequenceOrder: b.sequenceOrder }),
        lessonsApi.updateBlock(b.id, { sequenceOrder: a.sequenceOrder }),
      ]);
    },
    onMutate: async ({ a, b }) => {
      await qc.cancelQueries({ queryKey: ["lesson", lessonId] });
      const previous = qc.getQueryData<LessonDetail>(["lesson", lessonId]);
      if (previous) {
        const next: LessonDetail = {
          ...previous,
          lessonBlocks: previous.lessonBlocks.map((blk) => {
            if (blk.id === a.id) return { ...blk, sequenceOrder: b.sequenceOrder };
            if (blk.id === b.id) return { ...blk, sequenceOrder: a.sequenceOrder };
            return blk;
          }),
        };
        qc.setQueryData<LessonDetail>(["lesson", lessonId], next);
      }
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["lesson", lessonId], ctx.previous);
      toast.error(apiErrorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["lesson", lessonId] }),
  });

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = sortedBlocks[index];
    const swap = sortedBlocks[index + dir];
    if (!target || !swap) return;
    reorderMut.mutate({ a: target, b: swap });
  };

  // ---------- render ----------

  if (!Number.isFinite(lessonId)) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Noto'g'ri dars ID"
        description="Iltimos, darslar ro'yxatiga qayting."
        action={
          <Button asChild variant="outline">
            <Link href="/lessons">
              <ArrowLeft className="h-4 w-4" />
              Darslar
            </Link>
          </Button>
        }
      />
    );
  }

  if (lessonQ.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (lessonQ.isError || !lessonQ.data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Dars topilmadi"
        description={apiErrorMessage(lessonQ.error) || "Qaytadan urinib ko'ring"}
        action={
          <Button asChild variant="outline">
            <Link href="/lessons">
              <ArrowLeft className="h-4 w-4" />
              Darslar
            </Link>
          </Button>
        }
      />
    );
  }

  const lesson = lessonQ.data;
  const catName =
    lesson.trainingCategory?.titleUz ??
    (categoriesQ.data ?? []).find((c) => c.id === lesson.trainingCategoryId)
      ?.titleUz;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={() => router.push("/lessons")}
        >
          <ArrowLeft className="h-4 w-4" />
          Darslar
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {lesson.titleUz}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditLessonOpen(true)}
                aria-label="Sarlavhani tahrirlash"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {lesson.titleRu}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <span className="font-mono">#{lesson.id}</span>
              {catName && <Badge variant="secondary">{catName}</Badge>}
              <span>· {sortedBlocks.length} blok</span>
            </div>
          </div>
        </div>
      </div>

      {sortedBlocks.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Bloklar yo'q"
          description="Darsga birinchi blokni qo'shish uchun pastdagi tugmani bosing."
          action={
            <Button
              onClick={() => {
                setInitialType("TEXT");
                setAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Blok qo&apos;shish
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

      {/* Floating add button */}
      <div className="fixed bottom-6 right-6 z-40">
        <AddBlockMenu
          onPick={(t) => {
            setInitialType(t);
            setAddOpen(true);
          }}
        />
      </div>

      <EditLessonDialog
        open={editLessonOpen}
        onOpenChange={setEditLessonOpen}
        lesson={lesson}
        categories={categoriesQ.data ?? []}
      />

      <BlockFormDialog
        key={`add-${addOpen}-${initialType}`}
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        lessonId={lessonId}
        nextSequence={nextSequence}
        initialType={initialType}
      />

      <BlockFormDialog
        key={`edit-${editBlockTarget?.id ?? "none"}`}
        open={!!editBlockTarget}
        onOpenChange={(v) => !v && setEditBlockTarget(null)}
        mode="edit"
        lessonId={lessonId}
        nextSequence={nextSequence}
        block={editBlockTarget ?? undefined}
      />

      <Dialog
        open={!!deleteBlockTarget}
        onOpenChange={(v) => !v && setDeleteBlockTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Blokni o&apos;chirish</DialogTitle>
            <DialogDescription>
              {deleteBlockTarget
                ? `"${BLOCK_META[deleteBlockTarget.blockType].label}" bloki o'chiriladi. Bu amalni bekor qilib bo'lmaydi.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBlockTarget(null)}
            >
              Bekor qilish
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
              O&apos;chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block card
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
  block: LessonBlock;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  reorderPending: boolean;
}) {
  const meta = BLOCK_META[block.blockType];
  const Icon = meta.icon;
  const media = isMediaBlock(block.blockType);

  return (
    <li
      className="relative flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:flex-row sm:items-start sm:gap-4"
      aria-label={`Blok ${index + 1}: ${meta.label}`}
    >
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
            {meta.label}
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-w-0">
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
            Davomiyligi: {block.duration} soniya
          </p>
        )}
      </div>

      <div className="flex flex-row gap-1 sm:flex-col">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={index === 0 || reorderPending}
          aria-label="Yuqoriga"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={index === total - 1 || reorderPending}
          aria-label="Pastga"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
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
    </li>
  );
}

function MediaPreview({ block }: { block: LessonBlock }) {
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
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Preview"
          className="max-h-48 w-auto rounded-md border border-[var(--border)] object-contain"
        />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-[var(--primary)] underline"
        >
          {url}
        </a>
      </div>
    );
  }

  if (block.blockType === "VIDEO") {
    return (
      <div className="flex flex-col gap-2">
        <video
          controls
          src={url}
          className="max-h-56 w-full rounded-md border border-[var(--border)] bg-black"
        />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-[var(--primary)] underline"
        >
          {url}
        </a>
      </div>
    );
  }

  // FILE
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
// Floating add-menu
// ---------------------------------------------------------------------------

function AddBlockMenu({ onPick }: { onPick: (t: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {open && (
        <div
          className="absolute bottom-14 right-0 flex min-w-[180px] flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--popover)] p-2 shadow-lg"
          role="menu"
        >
          {BLOCK_TYPES.map((t) => {
            const meta = BLOCK_META[t];
            const Icon = meta.icon;
            return (
              <button
                key={t}
                role="menuitem"
                onClick={() => {
                  onPick(t);
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-[var(--accent)]"
              >
                <Icon className="h-4 w-4" style={{ color: meta.tone }} />
                {meta.label}
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
        Blok qo&apos;shish
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit lesson title dialog
// ---------------------------------------------------------------------------

const lessonEditSchema = z.object({
  titleUz: z.string().min(2, "Kamida 2 ta belgi"),
  titleRu: z.string().min(2, "Kamida 2 ta belgi"),
  trainingCategoryId: z.number().int().positive("Toifa kerak"),
});
type LessonEditValues = z.infer<typeof lessonEditSchema>;

function EditLessonDialog({
  open,
  onOpenChange,
  lesson,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lesson: LessonDetail;
  categories: { id: number; titleUz: string }[];
}) {
  const qc = useQueryClient();

  const form = useForm<LessonEditValues>({
    resolver: zodResolver(lessonEditSchema),
    values: {
      titleUz: lesson.titleUz,
      titleRu: lesson.titleRu,
      trainingCategoryId: lesson.trainingCategoryId,
    },
  });

  const mut = useMutation({
    mutationFn: (body: LessonEditValues) => lessonsApi.update(lesson.id, body),
    onSuccess: () => {
      toast.success("Dars yangilandi");
      qc.invalidateQueries({ queryKey: ["lesson", lesson.id] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const selectedCat = form.watch("trainingCategoryId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Darsni tahrirlash</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mut.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>Mashg&apos;ulot toifasi</Label>
            <Select
              value={selectedCat ? String(selectedCat) : ""}
              onValueChange={(v) =>
                form.setValue("trainingCategoryId", Number(v), {
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.trainingCategoryId && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.trainingCategoryId.message}
              </p>
            )}
          </div>
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
            <Label htmlFor="titleRu">Sarlavha (RU)</Label>
            <Input id="titleRu" {...form.register("titleRu")} />
            {form.formState.errors.titleRu && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.titleRu.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Block form dialog (create + edit)
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
  lessonId,
  nextSequence,
  block,
  initialType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  lessonId: number;
  nextSequence: number;
  block?: LessonBlock;
  initialType?: BlockType;
}) {
  const qc = useQueryClient();

  const defaults: BlockFormValues = mode === "edit" && block
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = useMutation({
    mutationFn: (body: CreateBlockDto) => lessonsApi.addBlock(lessonId, body),
    onSuccess: () => {
      toast.success("Blok qo'shildi");
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: UpdateBlockDto) =>
      lessonsApi.updateBlock(block!.id, body),
    onSuccess: () => {
      toast.success("Blok yangilandi");
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pending =
    createMut.isPending || updateMut.isPending || uploading;

  const onSubmit = form.handleSubmit((values) => {
    const d = values.duration;
    const duration =
      d === "" || d == null || (typeof d === "number" && Number.isNaN(d))
        ? null
        : Number(d);
    const payload: CreateBlockDto = {
      blockType: values.blockType,
      contentUz: values.contentUz,
      contentRu: values.contentRu,
      sequenceOrder: values.sequenceOrder,
      duration,
    };
    if (mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  });

  const handleFilePicked = async (file: File) => {
    if (!meta.folder) return;
    try {
      setUploading(true);
      setUploadPercent(0);
      const res = await uploadAsset(file, meta.folder, setUploadPercent);
      form.setValue("contentUz", res.url, { shouldValidate: true });
      form.setValue("contentRu", res.url, { shouldValidate: true });
      toast.success("Fayl yuklandi");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setUploading(false);
      setUploadPercent(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Yangi blok" : "Blokni tahrirlash"}
          </DialogTitle>
          <DialogDescription>
            {meta.label} turidagi blok kontentini kiriting.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Blok turi</Label>
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
                  {BLOCK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {BLOCK_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sequenceOrder">Tartib raqami</Label>
              <Input
                id="sequenceOrder"
                type="number"
                min={1}
                {...form.register("sequenceOrder", { valueAsNumber: true })}
              />
              {form.formState.errors.sequenceOrder && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.sequenceOrder.message}
                </p>
              )}
            </div>
          </div>

          {media && meta.folder && (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--border)] p-3">
              <Label className="text-xs uppercase text-[var(--muted-foreground)]">
                Fayl yuklash ({meta.folder})
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept={meta.accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFilePicked(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Fayl tanlash
                </Button>
                {uploadPercent != null && (
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className={cn(
                          "h-full rounded-full bg-[var(--primary)] transition-all",
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
              <p className="text-xs text-[var(--muted-foreground)]">
                Yoki quyidagi maydonlarga URL manzilini qo&apos;lda joylashtiring.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contentUz">
                {media ? "URL (UZ)" : "Kontent (UZ)"}
              </Label>
              {media ? (
                <Input id="contentUz" {...form.register("contentUz")} />
              ) : (
                <Textarea
                  id="contentUz"
                  rows={5}
                  {...form.register("contentUz")}
                />
              )}
              {form.formState.errors.contentUz && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.contentUz.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contentRu">
                {media ? "URL (RU)" : "Kontent (RU)"}
              </Label>
              {media ? (
                <Input id="contentRu" {...form.register("contentRu")} />
              ) : (
                <Textarea
                  id="contentRu"
                  rows={5}
                  {...form.register("contentRu")}
                />
              )}
              {form.formState.errors.contentRu && (
                <p className="text-xs text-[var(--destructive)]">
                  {form.formState.errors.contentRu.message}
                </p>
              )}
            </div>
          </div>

          {blockType === "VIDEO" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="duration">Davomiyligi (soniya, ixtiyoriy)</Label>
              <Input
                id="duration"
                type="number"
                min={0}
                placeholder="masalan 120"
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
              Bekor qilish
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Qo'shish" : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
