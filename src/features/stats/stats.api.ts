import { apiGet } from "@/lib/api";
import type {
  StatsOverview,
  RevenuePoint,
  UsersGrowthPoint,
  TopLesson,
  TopBook,
  SubscriptionByPlan,
  NotificationsSummary,
} from "@/lib/api-types";

const B = "/admin/stats";

export const statsApi = {
  overview: () => apiGet<StatsOverview>(`${B}/overview`),
  revenue: (params?: { from?: string; to?: string }) =>
    apiGet<RevenuePoint[]>(`${B}/revenue`, { params }),
  usersGrowth: (params?: { from?: string; to?: string }) =>
    apiGet<UsersGrowthPoint[]>(`${B}/users-growth`, { params }),
  topLessons: (limit = 10) =>
    apiGet<TopLesson[]>(`${B}/top-lessons`, { params: { limit } }),
  topBooks: (limit = 10) =>
    apiGet<TopBook[]>(`${B}/top-books`, { params: { limit } }),
  subscriptionsByPlan: () =>
    apiGet<SubscriptionByPlan[]>(`${B}/subscriptions-by-plan`),
  notificationsSummary: () =>
    apiGet<NotificationsSummary>(`${B}/notifications-summary`),
};
