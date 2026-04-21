"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  lessonsApi,
  type CreateLessonDto,
  type UpdateLessonDto,
} from "@/features/lessons/lessons.api";
import type { TrainingCategory, TrainingLesson } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ALL = "all" as const;

const lessonSchema = z.object({
  trainingCategoryId: z.number().int().positive("Toifani tanlang"),
  titleUz: z.string().min(2, "Kamida 2 ta belgi"),
  titleRu: z.string().min(2, "Kamida 2 ta belgi"),
});
type LessonFormValues = z.infer<typeof lessonSchema>;

export default function LessonsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainingLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingLesson | null>(null);

  const filterId = filter === ALL ? undefined : Number(filter);

  const categoriesQ = useQuery({
    queryKey: ["training-categories"],
    queryFn: lessonsApi.trainingCategories,
  });

  const lessonsQ = useQuery({
    queryKey: ["lessons", { trainingCategoryId: filterId ?? null }],
    queryFn: () => lessonsApi.list(filterId),
  });

  const categoriesById = useMemo(() => {
    const map = new Map<number, TrainingCategory>();
    (categoriesQ.data ?? []).forEach((c) => map.set(c.id, c));
    return map;
  }, [categoriesQ.data]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => lessonsApi.remove(id),
    onSuccess: () => {
      toast.success("Dars o'chirildi");
      qc.invalidateQueries({ queryKey: ["lessons"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Darslar</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Mashg&apos;ulot darslarini boshqaring va kontent bloklarini tahrirlang
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-[var(--muted-foreground)]">
              Mashg&apos;ulot toifasi
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
          <Button
            onClick={() => setCreateOpen(true)}
            className="sm:self-end"
          >
            <Plus className="h-4 w-4" />
            Yangi dars
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {lessonsQ.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : lessonsQ.isError ? (
          <div className="p-6 text-sm text-[var(--destructive)]">
            {apiErrorMessage(lessonsQ.error)}
          </div>
        ) : !lessonsQ.data?.length ? (
          <EmptyState
            icon={GraduationCap}
            title="Darslar topilmadi"
            description={
              filterId
                ? "Ushbu toifaga darslar qo'shilmagan. Yangi dars yarating."
                : "Hali hech qanday dars yaratilmagan. Boshlash uchun yangi dars qo'shing."
            }
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Yangi dars
              </Button>
            }
            className="border-0 bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Sarlavha (UZ)</TableHead>
                <TableHead>Sarlavha (RU)</TableHead>
                <TableHead>Toifa</TableHead>
                <TableHead>Yaratilgan</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessonsQ.data.map((l) => {
                const cat =
                  l.trainingCategory ??
                  categoriesById.get(l.trainingCategoryId);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                      #{l.id}
                    </TableCell>
                    <TableCell className="font-medium">{l.titleUz}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {l.titleRu}
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <Badge variant="secondary">{cat.titleUz}</Badge>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(l.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={`/lessons/${l.id}`}
                            aria-label={`Darsni ochish #${l.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditTarget(l)}
                          aria-label={`Darsni tahrirlash #${l.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(l)}
                          aria-label={`Darsni o'chirish #${l.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <LessonFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        categories={categoriesQ.data ?? []}
        defaultCategoryId={filterId}
      />

      <LessonFormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        mode="edit"
        categories={categoriesQ.data ?? []}
        lesson={editTarget ?? undefined}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Darsni o&apos;chirish</DialogTitle>
            <DialogDescription>
              {deleteTarget?.titleUz
                ? `"${deleteTarget.titleUz}" darsi va uning barcha bloklari o'chiriladi. Bu amalni bekor qilib bo'lmaydi.`
                : "Bu amalni bekor qilib bo'lmaydi."}
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

function LessonFormDialog({
  open,
  onOpenChange,
  mode,
  categories,
  lesson,
  defaultCategoryId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  categories: TrainingCategory[];
  lesson?: TrainingLesson;
  defaultCategoryId?: number;
}) {
  const qc = useQueryClient();

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    values:
      mode === "edit" && lesson
        ? {
            trainingCategoryId: lesson.trainingCategoryId,
            titleUz: lesson.titleUz,
            titleRu: lesson.titleRu,
          }
        : {
            trainingCategoryId: defaultCategoryId ?? 0,
            titleUz: "",
            titleRu: "",
          },
  });

  const createMut = useMutation({
    mutationFn: (body: CreateLessonDto) => lessonsApi.create(body),
    onSuccess: () => {
      toast.success("Dars yaratildi");
      qc.invalidateQueries({ queryKey: ["lessons"] });
      form.reset({
        trainingCategoryId: defaultCategoryId ?? 0,
        titleUz: "",
        titleRu: "",
      });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: UpdateLessonDto) =>
      lessonsApi.update(lesson!.id, body),
    onSuccess: () => {
      toast.success("Dars yangilandi");
      qc.invalidateQueries({ queryKey: ["lessons"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pending = createMut.isPending || updateMut.isPending;

  const onSubmit = form.handleSubmit((values) => {
    if (mode === "create") createMut.mutate(values);
    else updateMut.mutate(values);
  });

  const selectedCat = form.watch("trainingCategoryId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Yangi dars" : "Darsni tahrirlash"}
          </DialogTitle>
          <DialogDescription>
            UZ va RU tilidagi sarlavhani va tegishli mashg&apos;ulot toifasini
            kiriting.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
