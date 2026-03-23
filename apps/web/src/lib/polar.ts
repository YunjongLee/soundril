import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

export const PLAN_PRODUCT_IDS: Record<string, { monthly: string; yearly: string }> = {
  basic: {
    monthly: process.env.POLAR_BASIC_MONTHLY_PRODUCT_ID!,
    yearly: process.env.POLAR_BASIC_YEARLY_PRODUCT_ID!,
  },
  pro: {
    monthly: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID!,
    yearly: process.env.POLAR_PRO_YEARLY_PRODUCT_ID!,
  },
};

// Product ID → plan name 역매핑
export function getPlanFromProductId(productId: string): string | null {
  for (const [plan, ids] of Object.entries(PLAN_PRODUCT_IDS)) {
    if (ids.monthly === productId || ids.yearly === productId) return plan;
  }
  return null;
}
