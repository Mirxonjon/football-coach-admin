"use client";
import { Menu } from "lucide-react";

export function Header({ onMobileToggle }: { onMobileToggle: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[var(--border)] bg-[var(--background)]/80 px-4 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onMobileToggle}
        className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  );
}
