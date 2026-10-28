import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { stripeServerClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const admin = createAdminSupabase();
    const { data: account } = await admin.from("billing_accounts").select("stripe_customer_id").eq("owner_user_id", user.id).single();
    if (!account?.stripe_customer_id) return NextResponse.json({ error: "No Stripe billing profile exists yet." }, { status: 409 });
    const session = await stripeServerClient().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: new URL(request.url).origin,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("BILLING_PORTAL_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open billing portal." }, { status: 500 });
  }
}
