"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api";
import { uploadAsset, type UploadFolder } from "@/features/uploads/upload.api";

export function ImageField({
  value,
  onChange,
  folder = "images",
  label = "Rasm",
  aspectClass = "aspect-video",
  className,
  acceptedTypes = "image/*",
}: {
  value?: string | null;
  onChange: (url: string | undefined) => void;
  folder?: UploadFolder;
  label?: string;
  aspectClass?: string;
  className?: string;
  acceptedTypes?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value ?? "");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setProgress(0);
    try {
      const result = await uploadAsset(file, folder, (p) => setProgress(p));
      onChange(result.url);
      toast.success("Rasm yuklandi");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Link2 className="h-3 w-3" />
          {showUrlInput ? "Yashirish" : "URL orqali"}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://..."
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onChange(urlDraft.trim() || undefined);
              setShowUrlInput(false);
            }}
          >
            Qo&apos;llash
          </Button>
        </div>
      )}

      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)] transition-colors hover:border-[var(--primary)]",
          aspectClass
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-[var(--primary)]");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("border-[var(--primary)]");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-[var(--primary)]");
          handleFiles(e.dataTransfer.files);
        }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus className="h-4 w-4" /> Almashtirish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onChange(undefined)}
                disabled={uploading}
              >
                <X className="h-4 w-4" /> Olib tashlash
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]"
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Yuklanmoqda {progress ?? 0}%</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs">
                  Rasm tanlang yoki shu yerga tashlang
                </span>
              </>
            )}
          </button>
        )}

        {uploading && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--border)]">
            <div
              className="h-full bg-[var(--primary)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
