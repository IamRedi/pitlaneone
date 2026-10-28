import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { isBillingMarket, isBillingPlan, isBillingProduct, resolveStripePrice, stripeServerClient } from "@/lib/billing/stripe";
import { resolveProductEntitlement } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { product, plan, market } = await request.json();
    if (!isBillingProduct(product) || !isBillingPlan(plan) || !isBillingMarket(market)) {
      return NextResponse.json({ error: "Invalid billing product or market." }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const entitlement = await resolveProductEntitlement(supabase, product);
    // A trial can be converted to a paid Stripe subscription. Every other
    // active source already provides the requested product and must not be
    // sent to Checkout again.
    if (entitlement.active && entitlement.source !== "trial") {
      return NextResponse.json({
        error: "An active entitlement already exists; Stripe Checkout is not required.",
        entitlement,
      }, { status: 409 });
    }

    const admin = createAdminSupabase();
    const { data: account, error: accountError } = await admin
      .from("billing_accounts")
      .select("id, stripe_customer_id")
      .eq("owner_user_id", user.id)
      .single();
    if (accountError || !account) return NextResponse.json({ error: "Billing account is unavailable. Apply the billing migrations first." }, { status: 409 });

    const { data: catalogRows, error: catalogError } = await admin.rpc("get_active_billing_price" as never, {
      input_product_key: product,
      input_plan_key: plan,
      input_market_country: market,
    } as never) as { data: unknown; error: { message: string } | null };
    if (catalogError) throw new Error(catalogError.message);
    const catalog = Array.isArray(catalogRows) ? catalogRows[0] : null;
    if (!catalog || typeof catalog !== "object" || typeof (catalog as Record<string, unknown>).price_key !== "string") {
      return NextResponse.json({ error: "This plan is not available for the selected market." }, { status: 409 });
    }

    const stripe = stripeServerClient();
    let customerId = account.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { billing_account_id: account.id } });
      customerId = customer.id;
      const { error } = await admin.from("billing_accounts").update({ stripe_customer_id: customerId }).eq("id", account.id);
      if (error) throw error;
    }

    const { priceId, priceKey } = resolveStripePrice(product, plan, market, (catalog as Record<string, string>).price_key);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
      client_reference_id: account.id,
      metadata: { billing_account_id: account.id, product_key: product, plan_key: plan, price_key: priceKey, market },
      subscription_data: { metadata: { billing_account_id: account.id, product_key: product, plan_key: plan, price_key: priceKey, market } },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("BILLING_CHECKOUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 500 });
  }
}
