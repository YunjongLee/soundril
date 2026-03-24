/**
 * Product ID → plan 정보 매핑 (클라이언트 + 서버 공용)
 */

const PRODUCT_PLAN_MAP: Record<string, { plan: "basic" | "pro"; period: "monthly" | "yearly" }> = {
  [process.env.NEXT_PUBLIC_POLAR_BASIC_MONTHLY_PRODUCT_ID ?? ""]: { plan: "basic", period: "monthly" },
  [process.env.NEXT_PUBLIC_POLAR_BASIC_YEARLY_PRODUCT_ID ?? ""]: { plan: "basic", period: "yearly" },
  [process.env.NEXT_PUBLIC_POLAR_PRO_MONTHLY_PRODUCT_ID ?? ""]: { plan: "pro", period: "monthly" },
  [process.env.NEXT_PUBLIC_POLAR_PRO_YEARLY_PRODUCT_ID ?? ""]: { plan: "pro", period: "yearly" },
};

export type PlanName = "free" | "basic" | "pro";

export function getPlanName(productId: string | null | undefined): PlanName {
  if (!productId) return "free";
  return PRODUCT_PLAN_MAP[productId]?.plan ?? "free";
}

export function isPaidPlan(productId: string | null | undefined): boolean {
  if (productId === "admin") return true;
  return getPlanName(productId) !== "free";
}

export function getMaxFileSize(productId: string | null | undefined): number {
  return isPaidPlan(productId) ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
}

export function getPlanDisplayName(productId: string | null | undefined): string {
  const plan = getPlanName(productId);
  if (plan === "basic") return "Basic";
  if (plan === "pro") return "Pro";
  return "Starter";
}
