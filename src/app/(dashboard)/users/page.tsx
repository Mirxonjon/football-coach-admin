"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  usersApi,
  userDisplayName,
  userInitials,
  type AdminUpdateUserBody,
} from "@/features/users/users.api";
import type { User } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const LIMIT = 20;

const editSchema = z.object({
  isActive: z.boolean(),
  role: z.enum(["ADMIN", "USER"]),
});
type EditValues = z.infer<typeof editSchema>;

function Avatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={userDisplayName(user)}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
      {userInitials(user)}
    </span>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      isActive: user?.isActive ?? true,
      role: (user?.role?.name as "ADMIN" | "USER") ?? "USER",
    },
  });

  const mutation = useMutation({
    mutationFn: (body: AdminUpdateUserBody) => {
      if (!user) throw new Error("No user");
      return usersApi.update(user.id, body);
    },
    onSuccess: () => {
      toast.success("Foydalanuvchi yangilandi");
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foydalanuvchini tahrirlash</DialogTitle>
          <DialogDescription>
            {user ? userDisplayName(user) : ""}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>Rol</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(v) =>
                form.setValue("role", v as "ADMIN" | "USER", {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Rolni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Faol</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Hisobni faollashtirish yoki to&apos;xtatish
              </span>
            </div>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(v) =>
                form.setValue("isActive", v, { shouldDirty: true })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted-foreground)]">
            <div>
              <p className="font-medium text-[var(--foreground)]">ID</p>
              <p>{user?.id ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">Telefon</p>
              <p>{user?.phone ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">Email</p>
              <p className="truncate">{user?.email ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">
                Tasdiqlangan
              </p>
              <p>{user?.isVerified ? "Ha" : "Yo'q"}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("No user");
      return usersApi.remove(user.id);
    },
    onSuccess: () => {
      toast.success("Foydalanuvchi o'chirildi");
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Foydalanuvchini o&apos;chirish</DialogTitle>
          <DialogDescription>
            {user ? userDisplayName(user) : ""} — bu amalni bekor qilib
            bo&apos;lmaydi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            O&apos;chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const params = {
    search: search || undefined,
    isActive:
      activeFilter === "all"
        ? undefined
        : activeFilter === "active"
          ? true
          : false,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.list(params),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Foydalanuvchilar")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("Ro'yxatdan o'tgan foydalanuvchilarni boshqarish")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              {t("Hammasi")} {meta ? `(${meta.total})` : ""}
            </CardTitle>
            <CardDescription>
              {t("Qidirish, tahrirlash yoki o'chirish")}
            </CardDescription>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("Ism, email, telefon...")}
                className="pl-9 sm:w-64"
              />
            </div>
            <Select
              value={activeFilter}
              onValueChange={(v) => {
                setPage(1);
                setActiveFilter(v as typeof activeFilter);
              }}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Barchasi")}</SelectItem>
                <SelectItem value="active">{t("Faol")}</SelectItem>
                <SelectItem value="inactive">{t("Nofaol")}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              {t("Qidirish")}
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={t("Foydalanuvchilar topilmadi")}
              description={t("Filtrlarni o'zgartiring yoki qidiruvni bo'shating")}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px]"></TableHead>
                    <TableHead>{t("Ism")}</TableHead>
                    <TableHead>{t("Email")}</TableHead>
                    <TableHead>{t("Telefon")}</TableHead>
                    <TableHead>{t("Rol")}</TableHead>
                    <TableHead>{t("Holat")}</TableHead>
                    <TableHead>{t("Yaratilgan")}</TableHead>
                    <TableHead className="text-right">{t("Amallar")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Avatar user={u} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {userDisplayName(u)}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {u.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.role?.name === "ADMIN" ? "default" : "secondary"
                          }
                        >
                          {u.role?.name ?? "USER"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.isActive ? "success" : "destructive"}
                        >
                          {t(u.isActive ? "Faol" : "Nofaol")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditing(u)}
                            aria-label="Tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleting(u)}
                            aria-label="O'chirish"
                          >
                            <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">
                    {t("Sahifa")} {meta.page} / {meta.totalPages}
                    {isFetching && ` · ${t("yangilanmoqda...")}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" /> {t("Oldingi")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("Keyingi")} <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EditUserDialog
        user={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
      <DeleteUserDialog
        user={deleting}
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      />
    </div>
  );
}
