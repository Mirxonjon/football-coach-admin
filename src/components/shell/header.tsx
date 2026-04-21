"use client";
import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth.store";
import { logout } from "@/features/auth/auth.api";
import { Button } from "@/components/ui/button";

export function Header({ onMobileToggle }: { onMobileToggle: () => void }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const doLogout = useAuth((s) => s.logout);

  async function handleLogout() {
    await logout();
    doLogout();
    router.replace("/login");
  }

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || (user?.email?.[0] ?? "A").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 backdrop-blur-md lg:px-8">
      <button
        type="button"
        onClick={onMobileToggle}
        className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1 lg:hidden" />
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
            {initials}
          </div>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {user?.email}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Chiqish</span>
        </Button>
      </div>
    </header>
  );
}
