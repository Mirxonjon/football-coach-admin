"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CreditCard,
  Wallet,
  GraduationCap,
  Sparkles,
  BookOpen,
  TrendingUp,
  Activity,
} from "lucide-react";
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { statsApi } from "@/features/stats/stats.api";
import { formatCurrency, formatNumber } from "@/lib/utils";

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  loading,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  loading?: boolean;
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

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof TrendingUp;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-[var(--primary)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const overview = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: statsApi.overview,
  });
  const revenue = useQuery({
    queryKey: ["stats", "revenue"],
    queryFn: () => statsApi.revenue(),
  });
  const users = useQuery({
    queryKey: ["stats", "users-growth"],
    queryFn: () => statsApi.usersGrowth(),
  });
  const topLessons = useQuery({
    queryKey: ["stats", "top-lessons"],
    queryFn: () => statsApi.topLessons(5),
  });
  const plans = useQuery({
    queryKey: ["stats", "subs-by-plan"],
    queryFn: statsApi.subscriptionsByPlan,
  });

  const o = overview.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Platforma ko&apos;rsatkichlari va trendlar
        </p>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Foydalanuvchilar"
          value={formatNumber(o?.users.total ?? 0)}
          hint={`+${o?.users.newLast7d ?? 0} oxirgi 7 kunda`}
          loading={overview.isLoading}
          accent="var(--primary)"
        />
        <KpiCard
          icon={CreditCard}
          label="Faol obunalar"
          value={formatNumber(o?.subscriptions.active ?? 0)}
          hint={`Jami: ${formatNumber(o?.subscriptions.totalEver ?? 0)}`}
          loading={overview.isLoading}
          accent="oklch(0.62 0.19 250)"
        />
        <KpiCard
          icon={Wallet}
          label="Daromad (30 kun)"
          value={formatCurrency(o?.revenue.last30d ?? 0)}
          hint={`Jami: ${formatCurrency(o?.revenue.totalSuccess ?? 0)}`}
          loading={overview.isLoading}
          accent="var(--success)"
        />
        <KpiCard
          icon={Activity}
          label="Dars progressi"
          value={formatNumber(o?.engagement.totalLessonProgress ?? 0)}
          hint={`Yakunlangan: ${formatNumber(o?.engagement.completedLessons ?? 0)}`}
          loading={overview.isLoading}
          accent="var(--warning)"
        />
      </div>

      {/* Content stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={GraduationCap}
          label="Darslar"
          value={formatNumber(o?.content.lessons ?? 0)}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={BookOpen}
          label="Kitoblar"
          value={formatNumber(o?.content.books ?? 0)}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={Sparkles}
          label="AI suhbatlari"
          value={formatNumber(o?.engagement.aiChatsTotal ?? 0)}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Kutilayotgan tolovlar"
          value={formatCurrency(o?.revenue.pendingAmount ?? 0)}
          loading={overview.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Daromad (oxirgi 30 kun)" icon={Wallet}>
          {revenue.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Yangi foydalanuvchilar (oxirgi 30 kun)" icon={Users}>
          {users.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={users.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Eng faol darslar" icon={GraduationCap}>
          {topLessons.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : topLessons.data?.length ? (
            <ul className="flex flex-col">
              {topLessons.data.map((l, i) => (
                <li
                  key={l.lessonId}
                  className="flex items-center justify-between border-b border-[var(--border)] py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-medium text-[var(--primary)]">
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{l.titleUz}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {l.categoryTitleUz}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-medium">
                      {formatNumber(l.progressCount)} progress
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      {formatNumber(l.completedCount)} yakunlangan
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Hozircha darslar ustida faoliyat yo&apos;q
            </p>
          )}
        </SectionCard>

        <SectionCard title="Tarif bo‘yicha obunalar" icon={CreditCard}>
          {plans.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : plans.data?.length ? (
            <ul className="flex flex-col">
              {plans.data.map((p) => (
                <li
                  key={p.planId}
                  className="flex items-center justify-between border-b border-[var(--border)] py-2.5 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.titleUz}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Faol: {formatNumber(p.activeCount)} · Jami: {formatNumber(p.totalCount)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Tariflar mavjud emas
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
