"use client";
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { translateUzToRu } from "@/lib/translate";

export function TranslateButton({
  source,
  onTranslated,
  className,
  title = "UZ matndan avtomatik tarjima",
}: {
  source: string | null | undefined;
  onTranslated: (ru: string) => void;
  className?: string;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const text = (source ?? "").trim();
    if (!text) {
      toast.error("Avval UZ matnini yozing");
      return;
    }
    setLoading(true);
    try {
      const ru = await translateUzToRu(text);
      onTranslated(ru);
      toast.success("Tarjima qo'shildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tarjima xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:opacity-50",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Languages className="h-3 w-3" />
      )}
      UZ → RU
    </button>
  );
}
