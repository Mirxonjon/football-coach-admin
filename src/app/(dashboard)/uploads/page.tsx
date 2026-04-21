"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  UploadCloud,
  FileIcon,
  Copy,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Link2,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDateTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api";
import {
  UPLOAD_FOLDERS,
  UploadFolder,
  UploadedObject,
  deleteObjectByKey,
  presignUpload,
  uploadToR2,
} from "@/features/uploads/uploads.api";

// ----------------------------------------------------------------------------
// Session persistence
// ----------------------------------------------------------------------------

const STORAGE_KEY = "fc_admin_uploads";

type SessionEntry = UploadedObject & {
  folder: UploadFolder;
  uploadedAt: string;
};

function loadSession(): SessionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionEntry[]) : [];
  } catch {
    return [];
  }
}

function saveSession(entries: SessionEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function kindFromContentType(ct: string) {
  if (!ct) return "file";
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("video/")) return "video";
  if (ct.startsWith("audio/")) return "audio";
  if (ct === "application/pdf") return "pdf";
  return "file";
}

function TypeIcon({ contentType }: { contentType: string }) {
  const k = kindFromContentType(contentType);
  if (k === "image") return <ImageIcon className="h-4 w-4" />;
  if (k === "video") return <VideoIcon className="h-4 w-4" />;
  if (k === "pdf") return <FileText className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

async function copyText(text: string, label = "Nusxalandi") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Nusxalab bolmadi");
  }
}

// ----------------------------------------------------------------------------
// Item state for upload progress tracking
// ----------------------------------------------------------------------------

type UploadItemState = {
  id: string;
  file: File;
  folder: UploadFolder;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  result?: UploadedObject;
};

// ----------------------------------------------------------------------------
// Presign dialog form
// ----------------------------------------------------------------------------

const presignSchema = z.object({
  folder: z.enum([
    "videos",
    "images",
    "books",
    "konspekts",
    "avatars",
    "ai-chat",
    "misc",
  ]),
  originalName: z.string().min(1, "Fayl nomi kerak"),
  contentType: z.string().min(1, "Content-Type kerak"),
  expiresInSec: z
    .number({ error: "Raqam kiriting" })
    .int()
    .min(30)
    .max(86400),
});

type PresignForm = z.infer<typeof presignSchema>;

function PresignDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ url: string; key: string } | null>(
    null
  );

  const form = useForm<PresignForm>({
    resolver: zodResolver(presignSchema),
    defaultValues: {
      folder: "misc",
      originalName: "",
      contentType: "application/octet-stream",
      expiresInSec: 3600,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PresignForm) => presignUpload(values),
    onSuccess: (res) => {
      setResult({ url: res.url, key: res.key });
      toast.success("Presigned URL tayyorlandi");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          form.reset();
          setResult(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          <Link2 className="h-4 w-4" />
          Presign URL olish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Presigned PUT URL yaratish</DialogTitle>
          <DialogDescription>
            Katta fayllar uchun. Ushbu URL orqali fayl toridan brauzerdan R2 ga
            yuklash mumkin (PUT so&apos;rovi bilan).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Papka</Label>
              <Select
                value={form.watch("folder")}
                onValueChange={(v) =>
                  form.setValue("folder", v as UploadFolder)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPLOAD_FOLDERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Amal muddati (soniya)</Label>
              <Input
                type="number"
                min={30}
                max={86400}
                {...form.register("expiresInSec", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Fayl nomi</Label>
            <Input
              placeholder="masalan: video.mp4"
              {...form.register("originalName")}
            />
            {form.formState.errors.originalName && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.originalName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Content-Type</Label>
            <Input
              placeholder="video/mp4, image/png, application/pdf..."
              {...form.register("contentType")}
            />
            {form.formState.errors.contentType && (
              <p className="text-xs text-[var(--destructive)]">
                {form.formState.errors.contentType.message}
              </p>
            )}
          </div>

          {result && (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
              <div>
                <p className="text-xs font-medium text-[var(--muted-foreground)]">
                  Key
                </p>
                <p className="break-all text-sm font-mono">{result.key}</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    Presigned URL (PUT)
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(result.url, "URL nusxalandi")}
                  >
                    <Copy className="h-3 w-3" />
                    Nusxa olish
                  </Button>
                </div>
                <p className="mt-1 break-all text-xs font-mono">
                  {result.url}
                </p>
              </div>
              <div className="rounded-md bg-[var(--background)] p-2 text-xs text-[var(--muted-foreground)]">
                Yuborish misoli: <br />
                <code className="break-all">
                  curl -X PUT -H &quot;Content-Type:{" "}
                  {form.getValues("contentType")}&quot; --upload-file ./FILE
                  &quot;&lt;URL&gt;&quot;
                </code>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Yopish
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Generatsiya qilish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------------

type TabKey = "upload" | "session";

export default function UploadsPage() {
  const [tab, setTab] = useState<TabKey>("upload");
  const [folder, setFolder] = useState<UploadFolder>("images");
  const [items, setItems] = useState<UploadItemState[]>([]);
  const [session, setSession] = useState<SessionEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    setSession(loadSession());
  }, []);

  const persistSession = useCallback((next: SessionEntry[]) => {
    setSession(next);
    saveSession(next);
  }, []);

  const addToSession = useCallback(
    (entry: SessionEntry) => {
      setSession((prev) => {
        const next = [entry, ...prev.filter((e) => e.key !== entry.key)];
        saveSession(next);
        return next;
      });
    },
    []
  );

  const uploadOne = useCallback(
    async (item: UploadItemState) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i
        )
      );
      try {
        const result = await uploadToR2(item.file, item.folder, (pct) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i))
          );
        });
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "success", progress: 100, result }
              : i
          )
        );
        addToSession({
          ...result,
          folder: item.folder,
          uploadedAt: new Date().toISOString(),
        });
        toast.success(`${result.originalName} yuklandi`);
      } catch (e) {
        const msg = apiErrorMessage(e);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", error: msg } : i
          )
        );
        toast.error(`${item.file.name}: ${msg}`);
      }
    },
    [addToSession]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      const newItems: UploadItemState[] = arr.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`,
        file,
        folder,
        progress: 0,
        status: "pending",
      }));
      setItems((prev) => [...newItems, ...prev]);
      newItems.forEach((i) => void uploadOne(i));
    },
    [folder, uploadOne]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteObjectByKey(key),
    onSuccess: (_data, key) => {
      toast.success("R2 dan ochirildi");
      persistSession(session.filter((s) => s.key !== key));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const retry = useCallback(
    (id: string) => {
      const it = items.find((i) => i.id === id);
      if (!it) return;
      void uploadOne({ ...it, status: "pending", progress: 0, error: undefined });
    },
    [items, uploadOne]
  );

  const activeCount = useMemo(
    () => items.filter((i) => i.status === "uploading" || i.status === "pending").length,
    [items]
  );

  const clearFinished = () => {
    setItems((prev) =>
      prev.filter((i) => i.status === "uploading" || i.status === "pending")
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Fayllar menejeri
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          R2 obyekt xotirasi — fayllarni yuklash, ulashish va o&apos;chirish
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <TabButton
          active={tab === "upload"}
          onClick={() => setTab("upload")}
          icon={<UploadCloud className="h-4 w-4" />}
        >
          Fayl yuklash
        </TabButton>
        <TabButton
          active={tab === "session"}
          onClick={() => setTab("session")}
          icon={<History className="h-4 w-4" />}
          badge={session.length}
        >
          Session tarixi
        </TabButton>
      </div>

      {tab === "upload" ? (
        <div className="flex flex-col gap-6">
          {/* Controls */}
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-1.5 lg:w-72">
                <Label>Papka (folder)</Label>
                <Select
                  value={folder}
                  onValueChange={(v) => setFolder(v as UploadFolder)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UPLOAD_FOLDERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PresignDialog />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFinished}
                  disabled={items.length === 0}
                >
                  Tozalash
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-[var(--card)] p-10 text-center transition-colors",
              dragging
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:border-[var(--primary)]/60"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold">
                Fayllarni shu yerga tashlang
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Yoki bosib, kompyuterdan tanlang — bir nechta faylni birga
                tanlash mumkin
              </p>
            </div>
            <Badge variant="outline" className="mt-2 gap-1">
              Papka: <span className="font-semibold">{folder}</span>
            </Badge>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </div>

          {/* Active uploads + recent results */}
          {items.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Yuklashlar ({items.length})
                </h2>
                {activeCount > 0 && (
                  <Badge variant="secondary">
                    {activeCount} faol yuklanmoqda
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((it) => (
                  <UploadItemCard
                    key={it.id}
                    item={it}
                    onRetry={() => retry(it.id)}
                    onDelete={() => {
                      if (it.result?.key) {
                        deleteMutation.mutate(it.result.key);
                      }
                      setItems((prev) => prev.filter((x) => x.id !== it.id));
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <SessionHistoryTab
          entries={session}
          onDelete={(key) => deleteMutation.mutate(key)}
          onClearAll={() => {
            persistSession([]);
            toast.success("Session tarixi tozalandi (R2 dagi fayllar saqlanadi)");
          }}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-[var(--primary)] text-[var(--foreground)]"
          : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      )}
    >
      {icon}
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className="ml-1 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
          {badge}
        </span>
      )}
    </button>
  );
}

function UploadItemCard({
  item,
  onRetry,
  onDelete,
}: {
  item: UploadItemState;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const ct = item.result?.contentType ?? item.file.type;
  const isImage = kindFromContentType(ct) === "image";

  return (
    <Card className="overflow-hidden">
      <div className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-[var(--muted)]/40">
        {isImage && item.result?.url ? (
          // Using plain <img> to bypass next/image domain config for external R2 URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.result.url}
            alt={item.result.originalName}
            className="h-full w-full object-cover"
          />
        ) : (
          <TypeIcon contentType={ct} />
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={item.status} />
        </div>
      </div>
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {item.result?.originalName ?? item.file.name}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatBytes(item.result?.size ?? item.file.size)} ·{" "}
              {item.folder}
            </p>
          </div>
        </div>

        {item.status === "uploading" && (
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full bg-[var(--primary)] transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <p className="text-right text-[11px] text-[var(--muted-foreground)]">
              {item.progress}%
            </p>
          </div>
        )}

        {item.status === "error" && (
          <p className="break-words text-xs text-[var(--destructive)]">
            {item.error}
          </p>
        )}

        {item.status === "success" && item.result && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 py-1">
              <p className="min-w-0 flex-1 truncate text-[11px] font-mono">
                {item.result.url}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyText(item.result!.url, "URL nusxalandi")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-1.5">
          {item.status === "error" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetry}
            >
              <RefreshCw className="h-3 w-3" />
              Qayta urinish
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-[var(--destructive)]"
          >
            <Trash2 className="h-3 w-3" />
            O&apos;chirish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: UploadItemState["status"] }) {
  if (status === "success")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Tayyor
      </Badge>
    );
  if (status === "error")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Xato
      </Badge>
    );
  if (status === "uploading")
    return (
      <Badge variant="default" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Yuklanmoqda
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      Kutilmoqda
    </Badge>
  );
}

function SessionHistoryTab({
  entries,
  onDelete,
  onClearAll,
  deleting,
}: {
  entries: SessionEntry[];
  onDelete: (key: string) => void;
  onClearAll: () => void;
  deleting: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            Sessiya davomida yuklangan fayllar
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Mahalliy xotirada saqlanadi (fc_admin_uploads). R2 dagi fayllar
            ro&apos;yxatning o&apos;zi emas.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAll}
          disabled={entries.length === 0}
        >
          <Trash2 className="h-3 w-3" />
          Barchasini tozalash
        </Button>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="Hali hech narsa yuklanmagan"
            description="Fayl yuklash tabiga o'ting va birinchi faylingizni yuklang"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Preview</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead>Papka</TableHead>
                <TableHead>Hajmi</TableHead>
                <TableHead>Yuklangan</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => {
                const isImage = kindFromContentType(e.contentType) === "image";
                return (
                  <TableRow key={e.key}>
                    <TableCell>
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-[var(--muted)]/40">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={e.url}
                            alt={e.originalName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <TypeIcon contentType={e.contentType} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-sm font-medium">
                        {e.originalName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {e.contentType}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.folder}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatBytes(e.size)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {formatDateTime(e.uploadedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[260px] items-center gap-1">
                        <code className="min-w-0 flex-1 truncate text-[11px]">
                          {e.url}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyText(e.url, "URL nusxalandi")}
                          title="URL nusxa olish"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={deleting}
                        onClick={() => onDelete(e.key)}
                        className="text-[var(--destructive)]"
                      >
                        <Trash2 className="h-3 w-3" />
                        O&apos;chirish
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
