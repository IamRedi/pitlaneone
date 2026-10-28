import type { BillingProduct } from "@/lib/billing/stripe";

export type ResolvedProductEntitlement = {
  active: boolean;
  productKey: BillingProduct;
  entitlementLevel: string | null;
  source: "vip_free" | "internal_free" | "promo_grant" | "founder_grant" | "support_grant" | "stripe_subscription" | "trial" | "manual" | "none";
  expiresAt: string | null;
  lifecycle: "demo" | "trialing" | "active" | "inactive";
  mayPublish: boolean;
};

type BillingRpcClient = {
  rpc: (functionName: string, args: Record<string, unknown>) => unknown;
};

export async function resolveProductEntitlement(client: BillingRpcClient, productKey: BillingProduct): Promise<ResolvedProductEntitlement> {
  const { data, error } = await client.rpc("resolve_product_entitlement", { input_product_key: productKey }) as { data: unknown; error: { message: string } | null };
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== "object") return { active: false, productKey, entitlementLevel: null, source: "none", expiresAt: null, lifecycle: "inactive", mayPublish: false };
  const value = row as Record<string, unknown>;
  return {
    active: value.is_active === true,
    productKey,
    entitlementLevel: typeof value.entitlement_level === "string" ? value.entitlement_level : null,
    source: typeof value.source === "string" ? value.source as ResolvedProductEntitlement["source"] : "none",
    expiresAt: typeof value.expires_at === "string" ? value.expires_at : null,
    lifecycle: value.lifecycle === "demo" || value.lifecycle === "trialing" || value.lifecycle === "active" ? value.lifecycle : "inactive",
    mayPublish: value.may_publish === true,
  };
}

export function entitlementSourceLabel(source: ResolvedProductEntitlement["source"]) {
  switch (source) {
    case "vip_free": return "VIP Free";
    case "internal_free": return "Internal Free";
    case "promo_grant": return "Promo Grant";
    case "founder_grant": return "Founder Grant";
    case "support_grant": return "Support Grant";
    case "stripe_subscription": return "Stripe Subscription";
    case "trial": return "7-day Trial";
    case "manual": return "Internal Access";
    default: return "No active entitlement";
  }
}
