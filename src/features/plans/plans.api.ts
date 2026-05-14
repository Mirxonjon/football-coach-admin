import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  DiscountType,
  PlanFeature,
  SubscriptionPlan,
} from "@/lib/api-types";

export type PlanPayload = {
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  durationDays: number;
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice?: number | null;
  isActive?: boolean;
  features?: PlanFeature[];
};

export const plansApi = {
  list: () => apiGet<SubscriptionPlan[]>("/plans"),
  create: (body: PlanPayload) => apiPost<SubscriptionPlan>("/admin/plans", body),
  update: (id: number, body: Partial<PlanPayload>) =>
    apiPatch<SubscriptionPlan>(`/admin/plans/${id}`, body),
  remove: (id: number) => apiDelete<{ id: number }>(`/admin/plans/${id}`),
};

/**
 * Compute the final price after applying discount according to plan rules.
 */
export function computeFinalPrice(params: {
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  fixedDiscountPrice?: number | null;
}): number {
  const { basePrice, discountType, discountPercent, fixedDiscountPrice } = params;
  if (!basePrice || basePrice < 0) return 0;
  if (discountType === "PERCENTAGE") {
    const pct = Math.max(0, Math.min(100, discountPercent || 0));
    return Math.round(basePrice * (1 - pct / 100));
  }
  if (discountType === "FIXED_PRICE") {
    const fx = fixedDiscountPrice ?? 0;
    if (fx > 0 && fx < basePrice) return fx;
    return basePrice;
  }
  return basePrice;
}

export function hasDiscount(plan: Pick<SubscriptionPlan, "discountType" | "discountPercent" | "fixedDiscountPrice" | "basePrice">): boolean {
  if (plan.discountType === "PERCENTAGE") return (plan.discountPercent ?? 0) > 0;
  if (plan.discountType === "FIXED_PRICE") {
    const fx = plan.fixedDiscountPrice ?? 0;
    return fx > 0 && fx < plan.basePrice;
  }
  return false;
}
