"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronDown,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth.store";
import { logout } from "@/features/auth/auth.api";
import {
  LOCALES,
  LOCALE_LABELS,
  useLocaleStore,
  useT,
  type Locale,
} from "@/lib/i18n";
import { useThemeStore, type Theme } from "@/stores/theme.store";
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
  const router = useRouter();
  const groups = groupBy(navItems);
  const user = useAuth((s) => s.user);
  const doLogout = useAuth((s) => s.logout);
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const THEME_OPTIONS: { value: Theme; labelKey: string; Icon: typeof Sun }[] = [
    { value: "light", labelKey: "Yorug'", Icon: Sun },
    { value: "dark", labelKey: "Qorong'u", Icon: Moon },
    { value: "system", labelKey: "Avtomatik", Icon: Monitor },
  ];
  const ThemeIcon =
    THEME_OPTIONS.find((o) => o.value === theme)?.Icon ?? Monitor;

  async function handleLogout() {
    await logout();
    doLogout();
    router.replace("/login");
  }

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || (user?.email?.[0] ?? "A").toUpperCase();
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin";

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
        <div className="flex h-16 items-center gap-1 border-b border-[var(--border)] px-3">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="group flex flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                aria-label="Account menu"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
                  <Trophy className="h-5 w-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold">
                    Football Coach
                  </span>
                  <span className="truncate text-xs text-[var(--muted-foreground)]">
                    {t("Admin panel")}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className={cn(
                  "z-[60] w-60 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-lg",
                  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                )}
              >
                <div className="flex items-center gap-2.5 px-2 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                    {initials}
                  </div>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">
                      {fullName}
                    </span>
                    <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                      {user?.email ?? user?.phone ?? ""}
                    </span>
                  </div>
                </div>

                <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                      "hover:bg-[var(--accent)] focus:bg-[var(--accent)] data-[state=open]:bg-[var(--accent)]"
                    )}
                  >
                    <ThemeIcon className="h-4 w-4" />
                    <span className="flex-1">{t("Mavzu")}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t(
                        THEME_OPTIONS.find((o) => o.value === theme)
                          ?.labelKey ?? "Avtomatik"
                      )}
                    </span>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={6}
                      className={cn(
                        "z-[60] w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-lg",
                        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                      )}
                    >
                      {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
                        <DropdownMenu.Item
                          key={value}
                          onSelect={(e) => {
                            e.preventDefault();
                            setTheme(value);
                          }}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                            "hover:bg-[var(--accent)] focus:bg-[var(--accent)]"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{t(labelKey)}</span>
                          {theme === value && (
                            <Check className="h-4 w-4 text-[var(--primary)]" />
                          )}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                      "hover:bg-[var(--accent)] focus:bg-[var(--accent)] data-[state=open]:bg-[var(--accent)]"
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="flex-1">{t("Til")}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {LOCALE_LABELS[locale]}
                    </span>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={6}
                      className={cn(
                        "z-[60] w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-lg",
                        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                      )}
                    >
                      {LOCALES.map((l) => (
                        <DropdownMenu.Item
                          key={l}
                          onSelect={(e) => {
                            e.preventDefault();
                            setLocale(l as Locale);
                          }}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                            "hover:bg-[var(--accent)] focus:bg-[var(--accent)]"
                          )}
                        >
                          <span className="flex-1">{LOCALE_LABELS[l]}</span>
                          {locale === l && (
                            <Check className="h-4 w-4 text-[var(--primary)]" />
                          )}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>

                <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleLogout();
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                    "text-[var(--destructive)] hover:bg-[var(--destructive)]/10 focus:bg-[var(--destructive)]/10"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  {t("Chiqish")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

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
                {t(groupLabels[group as NavItem["group"]])}
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
                        <span className="truncate">{t(item.label)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
