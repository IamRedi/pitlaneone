import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getStripeWebhookSecret, isBillingPlan, isBillingProduct, stripeServerClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

function subscriptionFromEvent(event: Stripe.Event) {
  if (event.data.object.object === "subscription") return event.data.object as Stripe.Subscription;
  return null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  try {
    const stripe = stripeServerClient();
    const event = stripe.webhooks.constructEvent(await request.text(), signature, getStripeWebhookSecret());
    const subscription = subscriptionFromEvent(event);
    if (!subscription) return NextResponse.json({ received: true, ignored: true });

    const billingAccountId = subscription.metadata.billing_account_id;
    const productKey = subscription.metadata.product_key;
    const planKey = subscription.metadata.plan_key;
    if (!billingAccountId || !isBillingProduct(productKey) || !isBillingPlan(planKey)) throw new Error("Subscription metadata is incomplete.");
    if ((productKey === "businesssite" && !["start", "booking"].includes(planKey)) || (productKey === "pitlane" && !["core", "complete"].includes(planKey))) {
      throw new Error("Subscription plan does not belong to its product.");
    }
    const item = subscription.items.data[0];
    const status = subscription.status;
    const currentPeriodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
    const admin = createAdminSupabase();
    const { error } = await admin.rpc("apply_stripe_subscription_event" as never, {
      input_event_id: event.id,
      input_event_type: event.type,
      input_billing_account_id: billingAccountId,
      input_product_key: productKey,
      input_plan_code: `${planKey}_monthly`,
      input_price_key: subscription.metadata.price_key ?? `${productKey}.${planKey}.monthly`,
      input_stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      input_stripe_subscription_id: subscription.id,
      input_stripe_price_id: item?.price.id ?? null,
      input_status: status,
      input_interval: item?.price.recurring?.interval ?? null,
      input_current_period_ends_at: currentPeriodEnd,
      input_cancel_at_period_end: subscription.cancel_at_period_end,
      input_payload: { id: event.id, type: event.type, created: event.created },
    } as never);
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("STRIPE_WEBHOOK_ERROR", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
