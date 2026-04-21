import { apiGet } from "@/lib/api";
import type { SubscriptionByPlan } from "@/lib/api-types";

export const subscriptionsApi = {
  byPlan: () =>
    apiGet<SubscriptionByPlan[]>("/admin/stats/subscriptions-by-plan"),
};
