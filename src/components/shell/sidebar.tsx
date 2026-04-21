"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, groupLabels, type NavItem } from "./sidebar-nav";

function groupBy(items: NavItem[]) {
  return items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const groups = groupBy(navItems);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[var(--border)] px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Football Coach</span>
              <span className="text-xs text-[var(--muted-foreground)]">Admin panel</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {groupLabels[group as NavItem["group"]]}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
          <p>v1.0 · {new Date().getFullYear()}</p>
        </div>
      </aside>
    </>
  );
}
