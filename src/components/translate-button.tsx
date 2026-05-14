"use client";
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { translate } from "@/lib/translate";

export type TranslateDirection = "uz-ru" | "ru-uz";

const LABELS: Record<TranslateDirection, { label: string; empty: string; title: string }> = {
  "uz-ru": {
    label: "UZ → RU",
    empty: "Avval UZ matnini yozing",
    title: "UZ matndan avtomatik tarjima",
  },
  "ru-uz": {
    label: "RU → UZ",
    empty: "Avval RU matnini yozing",
    title: "RU matndan avtomatik tarjima",
  },
};

export function TranslateButton({
  source,
  onTranslated,
  className,
  direction = "uz-ru",
  title,
}: {
  source: string | null | undefined;
  onTranslated: (translated: string) => void;
  className?: string;
  direction?: TranslateDirection;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const cfg = LABELS[direction];

  async function handleClick() {
    const text = (source ?? "").trim();
    if (!text) {
      toast.error(cfg.empty);
      return;
    }
    setLoading(true);
    try {
      const [from, to] = direction.split("-") as ["uz" | "ru", "uz" | "ru"];
      const out = await translate(text, from, to);
      onTranslated(out);
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
      title={title ?? cfg.title}
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
      {cfg.label}
    </button>
  );
}
