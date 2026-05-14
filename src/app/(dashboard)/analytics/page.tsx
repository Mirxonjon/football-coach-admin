"use client";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Wallet,
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  CreditCard,
  TrendingUp,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { statsApi } from "@/features/stats/stats.api";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { useBiLang, useT } from "@/lib/i18n";
import type {
  NotificationType,
  RevenuePoint,
  UsersGrowthPoint,
} from "@/lib/api-types";

// ----------------------------------------------------------------------------
// Palette
// ----------------------------------------------------------------------------

const PALETTE = [
  "var(--primary)",
  "oklch(0.62 0.19 250)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "oklch(0.7 0.17 45)",
  "oklch(0.6 0.2 310)",
];

// ----------------------------------------------------------------------------
// Date range helpers
// ----------------------------------------------------------------------------

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

const PRESETS: { key: string; days: number }[] = [
  { key: "Oxirgi 7 kun", days: 7 },
  { key: "Oxirgi 30 kun", days: 30 },
  { key: "Oxirgi 90 kun", days: 90 },
];

// ----------------------------------------------------------------------------
// Notification type labels (keys — translated at render time)
// ----------------------------------------------------------------------------

const NOTIF_LABEL_KEYS: Record<NotificationType, string> = {
  SYSTEM: "Tizim",
  LESSON: "Darslar",
  BOOK: "Kitoblar",
  SUBSCRIPTION: "Obuna",
  AI_CHAT: "AI chat",
};

// ----------------------------------------------------------------------------
// Reusable tooltip styling
// ----------------------------------------------------------------------------

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { t } = useT();
  const bi = useBiLang();
  const [from, setFrom] = useState<string>(toDateInput(daysAgo(30)));
  const [to, setTo] = useState<string>(toDateInput(new Date()));

  const applyPreset = (days: number) => {
    setFrom(toDateInput(daysAgo(days)));
    setTo(toDateInput(new Date()));
  };

  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: statsApi.overview,
  });

  const [revenueQ, usersQ, plansQ, notifsQ] = useQueries({
    queries: [
      {
        queryKey: ["analytics", "revenue", from, to],
        queryFn: () => statsApi.revenue({ from, to }),
      },
      {
        queryKey: ["analytics", "users-growth", from, to],
        queryFn: () => statsApi.usersGrowth({ from, to }),
      },
      {
        queryKey: ["analytics", "subs-by-plan"],
        queryFn: statsApi.subscriptionsByPlan,
      },
      {
        queryKey: ["analytics", "notifs-summary"],
        queryFn: statsApi.notificationsSummary,
      },
    ],
  });

  const topLessonsQ = useQuery({
    queryKey: ["analytics", "top-lessons", 20],
    queryFn: () => statsApi.topLessons(20),
  });

  const topBooksQ = useQuery({
    queryKey: ["analytics", "top-books", 20],
    queryFn: () => statsApi.topBooks(20),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Analitika")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("Platformaning chuqur ko'rsatkichlari va taqsimotlar")}
        </p>
      </div>

      {/* Date range filter */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3" />
                {t("Dan")}
              </Label>
              <Input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3" />
                {t("Gacha")}
              </Label>
              <Input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.days}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(p.days)}
              >
                {t(p.key)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue section */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-[var(--primary)]" />
              {t("Daromad trendi")}
            </CardTitle>
            <RevenueBadges points={revenueQ.data} />
          </div>
        </CardHeader>
        <CardContent>
          {revenueQ.isLoading ? (
            <Skeleton className="h-[340px] w-full" />
          ) : revenueQ.data?.length ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={revenueQ.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => {
                    const n = Number(value);
                    return name === t("Daromad")
                      ? [formatCurrency(n), t("Daromad")]
                      : [formatNumber(n), t("Tolovlar soni")];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t("Daromad")}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={t("Tolovlar")}
                  stroke="oklch(0.62 0.19 250)"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={Wallet}
              title={t("Malumot yoq")}
              description={t("Tanlangan oraliqda daromad kirimi topilmadi")}
            />
          )}
        </CardContent>
      </Card>

      {/* Users growth */}
      <UsersGrowthSection points={usersQ.data} loading={usersQ.isLoading} />

      {/* Top tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
              {t("Top darslar (20 ta)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLessonsQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topLessonsQ.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t("Dars")}</TableHead>
                    <TableHead>{t("Kategoriya")}</TableHead>
                    <TableHead className="w-56">{t("Yakunlanganlik")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLessonsQ.data.map((l, i) => {
                    const pct =
                      l.progressCount > 0
                        ? Math.round(
                            (l.completedCount / l.progressCount) * 100
                          )
                        : 0;
                    return (
                      <TableRow key={l.lessonId}>
                        <TableCell className="text-xs text-[var(--muted-foreground)]">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {bi.primary(l.titleUz, l.titleRu)}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {bi.secondary(l.titleUz, l.titleRu)}
                          </p>
                        </TableCell>
                        <TableCell>
                          {l.categoryTitleUz ? (
                            <Badge variant="outline">
                              {bi.primary(l.categoryTitleUz, (l as any).categoryTitleRu ?? l.categoryTitleUz)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>
                                {formatNumber(l.completedCount)} /{" "}
                                {formatNumber(l.progressCount)}
                              </span>
                              <span className="font-medium">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                              <div
                                className="h-full rounded-full bg-[var(--primary)]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title={t("Darslar bo'yicha malumot yo'q")}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-[var(--primary)]" />
              {t("Top kitoblar (20 ta)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBooksQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topBooksQ.data?.length ? (
              <TopBooksList data={topBooksQ.data} />
            ) : (
              <EmptyState
                icon={BookOpen}
                title={t("Kitoblar bo'yicha malumot yo'q")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications + Plans */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-[var(--primary)]" />
                {t("Bildirishnomalar")}
              </CardTitle>
              {notifsQ.data && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {t("Jami")}: {formatNumber(notifsQ.data.total)}
                  </Badge>
                  <Badge variant="warning">
                    {t("O'qilmagan")}: {formatNumber(notifsQ.data.unread)}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {notifsQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : notifsQ.data?.byType?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={notifsQ.data.byType.map((b) => ({
                    type: t(NOTIF_LABEL_KEYS[b.type] ?? b.type),
                    oqilgan: Math.max(0, b.total - b.unread),
                    oqilmagan: b.unread,
                  }))}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    dataKey="type"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    width={90}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="oqilgan"
                    stackId="a"
                    name={t("Oqilgan")}
                    fill="var(--success)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="oqilmagan"
                    stackId="a"
                    name={t("Oqilmagan")}
                    fill="var(--warning)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Bell}
                title={t("Bildirishnomalar yoq")}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-[var(--primary)]" />
              {t("Tariflar bo'yicha daromad")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plansQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : plansQ.data?.length ? (
              <PlansDonut
                data={plansQ.data.map((p) => ({
                  name: bi.primary(p.titleUz, p.titleRu),
                  value: p.revenue,
                  active: p.activeCount,
                  total: p.totalCount,
                }))}
              />
            ) : (
              <EmptyState
                icon={CreditCard}
                title={t("Tarif malumoti yoq")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overview quick strip (bottom, reinforces context) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
            {t("Umumiy ko'rsatkichlar")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : overview.data ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label={t("Yangi (7 kun)")}
                value={formatNumber(overview.data.users.newLast7d)}
                color="var(--primary)"
              />
              <MiniStat
                label={t("Yangi (30 kun)")}
                value={formatNumber(overview.data.users.newLast30d)}
                color="oklch(0.62 0.19 250)"
              />
              <MiniStat
                label={t("Daromad (7 kun)")}
                value={formatCurrency(overview.data.revenue.last7d)}
                color="var(--success)"
              />
              <MiniStat
                label={t("Kutilayotgan")}
                value={formatCurrency(overview.data.revenue.pendingAmount)}
                color="var(--warning)"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Revenue totals
// ----------------------------------------------------------------------------

function RevenueBadges({ points }: { points?: RevenuePoint[] }) {
  const { t } = useT();
  const stats = useMemo(() => {
    if (!points || points.length === 0)
      return { total: 0, avg: 0, count: 0, days: 0 };
    const total = points.reduce((acc, p) => acc + p.total, 0);
    const count = points.reduce((acc, p) => acc + p.count, 0);
    return {
      total,
      avg: total / points.length,
      count,
      days: points.length,
    };
  }, [points]);
  if (!points) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="outline">
        {t("Jami")}: {formatCurrency(stats.total)}
      </Badge>
      <Badge variant="outline">
        {t("Kunlik o'rtacha")}: {formatCurrency(Math.round(stats.avg))}
      </Badge>
      <Badge variant="outline">
        {t("Tolovlar")}: {formatNumber(stats.count)}
      </Badge>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Users growth section with cumulative toggle
// ----------------------------------------------------------------------------

function UsersGrowthSection({
  points,
  loading,
}: {
  points: UsersGrowthPoint[] | undefined;
  loading: boolean;
}) {
  const { t } = useT();
  const [cumulative, setCumulative] = useState(false);

  const data = useMemo(() => {
    if (!points) return [];
    if (!cumulative) return points;
    let run = 0;
    return points.map((p) => {
      run += p.count;
      return { date: p.date, count: run };
    });
  }, [points, cumulative]);

  const total = useMemo(
    () => (points ? points.reduce((a, p) => a + p.count, 0) : 0),
    [points]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-[var(--primary)]" />
            {t("Foydalanuvchilar o'sishi")}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <ArrowUpRight className="h-3 w-3" />
              {t("Jami")}: {formatNumber(total)}
            </Badge>
            <div className="flex items-center gap-1 rounded-md border border-[var(--border)] p-0.5">
              <button
                type="button"
                onClick={() => setCumulative(false)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  !cumulative
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {t("Kunlik")}
              </button>
              <button
                type="button"
                onClick={() => setCumulative(true)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  cumulative
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {t("Kumulyativ")}
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            {cumulative ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={t("Kumulyativ")}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  name={t("Yangi")}
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Users}
            title={t("Tanlangan oraliqda malumot yo'q")}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Top books list
// ----------------------------------------------------------------------------

function TopBooksList({
  data,
}: {
  data: { bookId: number; titleUz: string; titleRu: string; purchaseCount: number }[];
}) {
  const { t } = useT();
  const bi = useBiLang();
  const max = Math.max(1, ...data.map((b) => b.purchaseCount));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>{t("Kitob")}</TableHead>
          <TableHead className="w-64">{t("Sotuvlar")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((b, i) => {
          const pct = Math.round((b.purchaseCount / max) * 100);
          return (
            <TableRow key={b.bookId}>
              <TableCell className="text-xs text-[var(--muted-foreground)]">
                {i + 1}
              </TableCell>
              <TableCell>
                <p className="text-sm font-medium">
                  {bi.primary(b.titleUz, b.titleRu)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {bi.secondary(b.titleUz, b.titleRu)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-medium">
                    {formatNumber(b.purchaseCount)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ----------------------------------------------------------------------------
// Plans donut
// ----------------------------------------------------------------------------

function PlansDonut({
  data,
}: {
  data: { name: string; value: number; active: number; total: number }[];
}) {
  const { t } = useT();
  const totalRevenue = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="h-64 w-full md:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={96}
              paddingAngle={2}
              stroke="var(--background)"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [
                formatCurrency(Number(value)),
                t("Daromad"),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex w-full flex-col gap-2 md:w-56">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
          <p className="text-xs text-[var(--muted-foreground)]">{t("Jami daromad")}</p>
          <p className="text-lg font-semibold">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {data.map((p, i) => {
            const pct =
              totalRevenue > 0
                ? Math.round((p.value / totalRevenue) * 100)
                : 0;
            return (
              <li
                key={p.name}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="truncate font-medium">{p.name}</span>
                </span>
                <span className="text-[var(--muted-foreground)]">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mini stat
// ----------------------------------------------------------------------------

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
