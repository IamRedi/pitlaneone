import Stripe from "stripe";

export const BILLING_PRODUCTS = ["businesssite", "pitlane"] as const;
export type BillingProduct = (typeof BILLING_PRODUCTS)[number];
export type BillingMarket = "DE" | "AL";
export const BILLING_PLANS = ["start", "booking", "core", "complete"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export function stripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey?.startsWith("sk_")) throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY server-side.");
  return new Stripe(secretKey);
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook is not configured. Add STRIPE_WEBHOOK_SECRET server-side.");
  return secret;
}

export function resolveStripePrice(product: BillingProduct, plan: BillingPlan, market: BillingMarket, priceKey: string) {
  if ((product === "businesssite" && !["start", "booking"].includes(plan)) || (product === "pitlane" && !["core", "complete"].includes(plan))) {
    throw new Error(`Plan ${plan} is not available for ${product}.`);
  }
  const variable = `STRIPE_PRICE_${product.toUpperCase()}_${plan.toUpperCase()}_${market}`;
  const priceId = process.env[variable];
  if (!priceId?.startsWith("price_")) throw new Error(`No Stripe price is configured for ${product}/${plan}/${market}.`);
  return { priceId, priceKey };
}

export function isBillingProduct(value: unknown): value is BillingProduct {
  return typeof value === "string" && BILLING_PRODUCTS.includes(value as BillingProduct);
}

export function isBillingMarket(value: unknown): value is BillingMarket {
  return value === "DE" || value === "AL";
}

export function isBillingPlan(value: unknown): value is BillingPlan {
  return typeof value === "string" && BILLING_PLANS.includes(value as BillingPlan);
}
