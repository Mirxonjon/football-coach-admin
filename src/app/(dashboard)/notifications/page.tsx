"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  BellRing,
  Send,
  Users,
  User as UserIcon,
  Megaphone,
  Search,
  Check,
  X,
  AlertTriangle,
  Inbox,
  MailOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiErrorMessage } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type { NotificationType, User } from "@/lib/api-types";
import { statsApi } from "@/features/stats/stats.api";
import {
  NOTIFICATION_TYPES,
  notificationTypeLabel,
  notificationsApi,
  type SendResponse,
} from "@/features/notifications/notifications.api";
import {
  userDisplayName,
  userInitials,
  usersApi,
} from "@/features/users/users.api";

// --- schema ---------------------------------------------------------------

const notificationTypeValues: NotificationType[] = [
  "SYSTEM",
  "LESSON",
  "BOOK",
  "SUBSCRIPTION",
  "AI_CHAT",
];

const composerSchema = z.object({
  type: z.enum(notificationTypeValues as [NotificationType, ...NotificationType[]]),
  titleUz: z.string().min(1, "Sarlavha (UZ) majburiy").max(120),
  titleRu: z.string().min(1, "Sarlavha (RU) majburiy").max(120),
  messageUz: z.string().min(1, "Matn (UZ) majburiy").max(2000),
  messageRu: z.string().min(1, "Matn (RU) majburiy").max(2000),
  relatedId: z
    .union([
      z.string().length(0),
      z.coerce.number().int().positive(),
    ])
    .optional(),
});

type ComposerValues = z.input<typeof composerSchema>;
type ComposerOutput = z.output<typeof composerSchema>;

type TabValue = "user" | "many" | "broadcast";

const defaultValues: ComposerValues = {
  type: "SYSTEM",
  titleUz: "",
  titleRu: "",
  messageUz: "",
  messageRu: "",
  relatedId: "",
};

// --- page -----------------------------------------------------------------

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabValue>("user");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedMany, setSelectedMany] = useState<User[]>([]);

  const summary = useQuery({
    queryKey: ["stats", "notifications-summary"],
    queryFn: statsApi.notificationsSummary,
  });

  const usersQuery = useQuery({
    queryKey: ["users", "picker", { limit: 100 }],
    queryFn: () => usersApi.list({ limit: 100, page: 1 }),
  });
  const users = usersQuery.data?.data ?? [];

  const form = useForm<ComposerValues, unknown, ComposerOutput>({
    resolver: zodResolver(composerSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;
  const type = watch("type");

  const resetAll = () => {
    reset(defaultValues);
    setSelectedUser(null);
    setSelectedMany([]);
  };

  const send = useMutation({
    mutationFn: async (values: ComposerOutput) => {
      const base = {
        type: values.type,
        titleUz: values.titleUz,
        titleRu: values.titleRu,
        messageUz: values.messageUz,
        messageRu: values.messageRu,
        relatedId:
          typeof values.relatedId === "number" ? values.relatedId : undefined,
      };
      if (tab === "user") {
        if (!selectedUser)
          throw new Error("Foydalanuvchi tanlanmagan");
        return notificationsApi.sendUser({
          ...base,
          userId: selectedUser.id,
        });
      }
      if (tab === "many") {
        if (selectedMany.length === 0)
          throw new Error("Hech qanday foydalanuvchi tanlanmagan");
        return notificationsApi.sendMany({
          ...base,
          userIds: selectedMany.map((u) => u.id),
        });
      }
      return notificationsApi.broadcast(base);
    },
    onSuccess: (res: SendResponse) => {
      const count =
        res?.recipients ?? res?.sent ?? res?.created ?? undefined;
      toast.success(
        count != null
          ? `Xabar yuborildi — ${formatNumber(count)} ta qabul qiluvchi`
          : "Xabar yuborildi"
      );
      resetAll();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const isReadyToSend =
    (tab === "user" && selectedUser !== null) ||
    (tab === "many" && selectedMany.length > 0) ||
    tab === "broadcast";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Xabarnomalar</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Foydalanuvchilarga push-xabar yuborish va statistika
        </p>
      </div>

      <SummarySection
        loading={summary.isLoading}
        data={summary.data}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-[var(--primary)]" />
            Yangi xabar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TabsPrimitive.Root
            value={tab}
            onValueChange={(v) => {
              setTab(v as TabValue);
            }}
            className="flex flex-col gap-6"
          >
            <TabsPrimitive.List
              className={cn(
                "inline-flex w-full max-w-xl gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-1"
              )}
            >
              <TabTrigger value="user" icon={UserIcon} label="Bir foydalanuvchi" />
              <TabTrigger value="many" icon={Users} label="Bir nechta" />
              <TabTrigger
                value="broadcast"
                icon={Megaphone}
                label="Hammaga yuborish"
              />
            </TabsPrimitive.List>

            <TabsPrimitive.Content value="user" className="flex flex-col gap-2">
              <Label>Qabul qiluvchi</Label>
              <UserPicker
                users={users}
                loading={usersQuery.isLoading}
                value={selectedUser}
                onChange={setSelectedUser}
              />
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="many" className="flex flex-col gap-2">
              <Label>
                Qabul qiluvchilar{" "}
                {selectedMany.length > 0 && (
                  <span className="text-[var(--muted-foreground)]">
                    ({selectedMany.length} tanlangan)
                  </span>
                )}
              </Label>
              <UserMultiPicker
                users={users}
                loading={usersQuery.isLoading}
                selected={selectedMany}
                onChange={setSelectedMany}
              />
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="broadcast">
              <div className="flex items-start gap-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
                <div className="text-sm">
                  <p className="font-medium">
                    Barcha aktiv foydalanuvchilarga yuboriladi
                  </p>
                  <p className="mt-1 text-[var(--muted-foreground)]">
                    Bu xabar platformadagi barcha aktiv foydalanuvchilarga bir
                    vaqtning o&apos;zida yetkaziladi. Yuborishdan oldin matnni
                    tekshiring.
                  </p>
                </div>
              </div>
            </TabsPrimitive.Content>

            <form
              onSubmit={handleSubmit((v) => send.mutate(v))}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tur" error={errors.type?.message}>
                  <Select
                    value={type}
                    onValueChange={(v) =>
                      setValue("type", v as NotificationType, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Bog'liq ID (ixtiyoriy)"
                  error={errors.relatedId?.message as string | undefined}
                  hint="Dars / kitob / obuna kabi obyektga havola"
                >
                  <Input
                    type="number"
                    min={1}
                    placeholder="Masalan, 42"
                    {...register("relatedId")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sarlavha (UZ)" error={errors.titleUz?.message}>
                  <Input
                    placeholder="Yangi dars qo'shildi"
                    {...register("titleUz")}
                  />
                </Field>
                <Field label="Sarlavha (RU)" error={errors.titleRu?.message}>
                  <Input
                    placeholder="Добавлен новый урок"
                    {...register("titleRu")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Matn (UZ)" error={errors.messageUz?.message}>
                  <Textarea
                    rows={4}
                    placeholder="Xabar matnini kiriting..."
                    {...register("messageUz")}
                  />
                </Field>
                <Field label="Matn (RU)" error={errors.messageRu?.message}>
                  <Textarea
                    rows={4}
                    placeholder="Введите текст сообщения..."
                    {...register("messageRu")}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
                <div className="text-xs text-[var(--muted-foreground)]">
                  {tab === "user" && selectedUser && (
                    <span>
                      Qabul qiluvchi:{" "}
                      <span className="font-medium text-[var(--foreground)]">
                        {userDisplayName(selectedUser)}
                      </span>
                    </span>
                  )}
                  {tab === "many" && (
                    <span>
                      Tanlangan: {formatNumber(selectedMany.length)} ta
                      foydalanuvchi
                    </span>
                  )}
                  {tab === "broadcast" && (
                    <span>Barcha aktiv foydalanuvchilarga</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAll}
                    disabled={send.isPending}
                  >
                    Tozalash
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isReadyToSend || send.isPending}
                  >
                    <Send className="h-4 w-4" />
                    {send.isPending ? "Yuborilmoqda..." : "Yuborish"}
                  </Button>
                </div>
              </div>
            </form>
          </TabsPrimitive.Root>
        </CardContent>
      </Card>
    </div>
  );
}

// --- summary --------------------------------------------------------------

function SummarySection({
  loading,
  data,
}: {
  loading: boolean;
  data?: {
    total: number;
    unread: number;
    byType: { type: NotificationType; total: number; unread: number }[];
  };
}) {
  const byTypeMax = useMemo(() => {
    if (!data?.byType?.length) return 0;
    return Math.max(...data.byType.map((t) => t.total));
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <SummaryStat
        icon={BellRing}
        label="Jami xabarlar"
        value={formatNumber(data?.total ?? 0)}
        loading={loading}
        accent="var(--primary)"
      />
      <SummaryStat
        icon={Inbox}
        label="O'qilmagan"
        value={formatNumber(data?.unread ?? 0)}
        loading={loading}
        accent="var(--warning)"
        hint={
          data?.total
            ? `${Math.round(((data.unread ?? 0) / data.total) * 100)}% barchadan`
            : undefined
        }
      />
      <SummaryStat
        icon={MailOpen}
        label="O'qilgan"
        value={formatNumber((data?.total ?? 0) - (data?.unread ?? 0))}
        loading={loading}
        accent="var(--success)"
      />
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
            Turlar bo&apos;yicha
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </>
          ) : data?.byType?.length ? (
            data.byType.map((t) => {
              const pct = byTypeMax ? (t.total / byTypeMax) * 100 : 0;
              return (
                <div key={t.type} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {notificationTypeLabel(t.type)}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {formatNumber(t.total)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              Ma&apos;lumot yo&apos;q
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  accent,
}: {
  icon: typeof BellRing;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent ?? "var(--primary)" }}
      />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
            {label}
          </CardTitle>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background: `color-mix(in oklch, ${accent ?? "var(--primary)"} 15%, transparent)`,
              color: accent ?? "var(--primary)",
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        )}
        {hint && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- tabs -----------------------------------------------------------------

function TabTrigger({
  value,
  icon: Icon,
  label,
}: {
  value: TabValue;
  icon: typeof Users;
  label: string;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        "data-[state=active]:bg-[var(--background)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </TabsPrimitive.Trigger>
  );
}

// --- user picker (single) -------------------------------------------------

function useFilteredUsers(users: User[], q: string): User[] {
  return useMemo(() => {
    const norm = q.trim().toLowerCase();
    if (!norm) return users;
    return users.filter((u) => {
      const name = userDisplayName(u).toLowerCase();
      return (
        name.includes(norm) ||
        (u.phone ?? "").toLowerCase().includes(norm) ||
        (u.email ?? "").toLowerCase().includes(norm)
      );
    });
  }, [users, q]);
}

function UserPicker({
  users,
  loading,
  value,
  onChange,
}: {
  users: User[];
  loading: boolean;
  value: User | null;
  onChange: (u: User | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useFilteredUsers(users, query);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-left text-sm shadow-sm",
            "hover:bg-[var(--accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          )}
        >
          {value ? (
            <UserRowLine user={value} />
          ) : (
            <span className="text-[var(--muted-foreground)]">
              Foydalanuvchini tanlang...
            </span>
          )}
          {value ? (
            <span
              role="button"
              aria-label="Tozalash"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="ml-2 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <X className="h-4 w-4" />
            </span>
          ) : (
            <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
          )}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-[--radix-popover-trigger-width] rounded-md border border-[var(--border)] bg-[var(--popover)] p-0 text-[var(--popover-foreground)] shadow-md",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0"
          )}
          style={{ minWidth: 320 }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ism, telefon yoki email bo'yicha izlash..."
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length ? (
              filtered.map((u) => {
                const selected = value?.id === u.id;
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => {
                      onChange(u);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      "hover:bg-[var(--accent)]",
                      selected && "bg-[var(--accent)]"
                    )}
                  >
                    <UserRowLine user={u} />
                    {selected && (
                      <Check className="ml-auto h-4 w-4 text-[var(--primary)]" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Foydalanuvchilar topilmadi
              </p>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// --- user multi-picker ---------------------------------------------------

function UserMultiPicker({
  users,
  loading,
  selected,
  onChange,
}: {
  users: User[];
  loading: boolean;
  selected: User[];
  onChange: (users: User[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useFilteredUsers(users, query);
  const selectedIds = useMemo(
    () => new Set(selected.map((u) => u.id)),
    [selected]
  );

  const toggle = (u: User) => {
    if (selectedIds.has(u.id)) {
      onChange(selected.filter((s) => s.id !== u.id));
    } else {
      onChange([...selected, u]);
    }
  };

  const selectAllVisible = () => {
    const map = new Map(selected.map((u) => [u.id, u]));
    filtered.forEach((u) => map.set(u.id, u));
    onChange(Array.from(map.values()));
  };

  const clearAll = () => onChange([]);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ism, telefon yoki email bo'yicha izlash..."
          className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAllVisible}
            disabled={filtered.length === 0}
          >
            Hammasini tanlash
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={selected.length === 0}
          >
            Tozalash
          </Button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {selected.map((u) => (
            <Badge
              key={u.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {userDisplayName(u)}
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((s) => s.id !== u.id))
                }
                className="rounded-full p-0.5 hover:bg-[var(--muted)]"
                aria-label="O'chirish"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="max-h-72 overflow-y-auto p-1">
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length ? (
          filtered.map((u) => {
            const checked = selectedIds.has(u.id);
            return (
              <label
                key={u.id}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:bg-[var(--accent)]",
                  checked && "bg-[var(--accent)]"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(u)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <UserRowLine user={u} />
              </label>
            );
          })
        ) : (
          <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
            Foydalanuvchilar topilmadi
          </p>
        )}
      </div>
    </div>
  );
}

// --- user row line --------------------------------------------------------

function UserRowLine({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-medium text-[var(--primary)]">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          userInitials(user)
        )}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">
          {userDisplayName(user)}
        </span>
        <span className="truncate text-xs text-[var(--muted-foreground)]">
          {user.phone}
          {user.email ? ` · ${user.email}` : ""}
        </span>
      </span>
    </div>
  );
}

// --- helpers --------------------------------------------------------------

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--destructive)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
