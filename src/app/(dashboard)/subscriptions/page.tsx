"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Package, Users, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatCurrency, formatNumber } from "@/lib/utils";
import type { SubscriptionByPlan, SubscriptionPlan } from "@/lib/api-types";
import { subscriptionsApi } from "@/features/subscriptions/subscriptions.api";
import { plansApi } from "@/features/plans/plans.api";

function durationLabel(days?: number): string {
  if (!days) return "—";
  if (days % 365 === 0 && days >= 365) return `${days / 365} yil`;
  if (days % 30 === 0 && days >= 30) return `${days / 30} oy`;
  return `${days} kun`;
}

type PlanRow = SubscriptionByPlan & {
  durationDays?: number;
  basePrice?: number;
};

export default function SubscriptionsPage() {
  const byPlan = useQuery({
    queryKey: ["stats", "subs-by-plan"],
    queryFn: subscriptionsApi.byPlan,
  });

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: plansApi.list,
  });

  const planIndex = useMemo(() => {
    const map = new Map<number, SubscriptionPlan>();
    plans.data?.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans.data]);

  const rows: PlanRow[] = useMemo(() => {
    if (!byPlan.data) return [];
    return byPlan.data.map((r) => {
      const p = planIndex.get(r.planId);
      return {
        ...r,
        durationDays: p?.durationDays,
        basePrice: p?.basePrice,
      };
    });
  }, [byPlan.data, planIndex]);

  const totals = useMemo(() => {
    if (!rows.length) {
      return { active: 0, total: 0, revenue: 0, plans: 0 };
    }
    return rows.reduce(
      (acc, r) => {
        acc.active += r.activeCount ?? 0;
        acc.total += r.totalCount ?? 0;
        acc.revenue += r.revenue ?? 0;
        acc.plans += 1;
        return acc;
      },
      { active: 0, total: 0, revenue: 0, plans: 0 }
    );
  }, [rows]);

  const loading = byPlan.isLoading || plans.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Obunalar</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Tariflar bo&apos;yicha obuna ko&apos;rsatkichlari va daromad
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Faol obunachilar"
          value={formatNumber(totals.active)}
          hint={`Jami: ${formatNumber(totals.total)}`}
          accent="var(--primary)"
          loading={loading}
        />
        <SummaryCard
          icon={Wallet}
          label="Umumiy daromad"
          value={formatCurrency(totals.revenue)}
          hint="Barcha tariflardan yig'ilgan"
          accent="var(--success)"
          loading={loading}
        />
        <SummaryCard
          icon={Package}
          label="Tariflar soni"
          value={formatNumber(totals.plans)}
          hint={`${formatNumber(plans.data?.filter((p) => p.isActive).length ?? 0)} faol`}
          accent="oklch(0.62 0.19 250)"
          loading={loading}
        />
        <SummaryCard
          icon={CreditCard}
          label="Jami obunalar (eng ko'p)"
          value={
            rows.length
              ? formatNumber(
                  rows.reduce(
                    (m, r) => (r.totalCount > m.totalCount ? r : m),
                    rows[0]
                  ).totalCount
                )
              : "—"
          }
          hint={
            rows.length
              ? rows.reduce(
                  (m, r) => (r.totalCount > m.totalCount ? r : m),
                  rows[0]
                ).titleUz
              : "Tariflar yo'q"
          }
          accent="var(--warning)"
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-[var(--primary)]" />
            Tariflar bo&apos;yicha taqsimot
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/plans">Tariflarni boshqarish</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarif</TableHead>
                  <TableHead>Davomiylik</TableHead>
                  <TableHead className="text-right">Asosiy narx</TableHead>
                  <TableHead className="text-right">Faol</TableHead>
                  <TableHead className="text-right">Jami</TableHead>
                  <TableHead className="text-right">Daromad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.planId}>
                    <TableCell>
                      <Link
                        href="/plans"
                        className="flex flex-col hover:text-[var(--primary)]"
                      >
                        <span className="font-medium">{r.titleUz}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {r.titleRu}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {durationLabel(r.durationDays)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.basePrice != null
                        ? formatCurrency(r.basePrice)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(r.activeCount)}
                    </TableCell>
                    <TableCell className="text-right text-[var(--muted-foreground)]">
                      {formatNumber(r.totalCount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(r.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="Hozircha obuna ma'lumotlari yo'q"
                description="Tariflar yaratilgandan va foydalanuvchilar obuna bo'lgandan so'ng bu yerda ko'rsatkichlar paydo bo'ladi."
                action={
                  <Button asChild>
                    <Link href="/plans">Tarif yaratish</Link>
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  loading,
}: {
  icon: typeof CreditCard;
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
