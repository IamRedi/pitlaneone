"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  productKey: z.enum(["businesssite", "pitlane"]),
  entitlementLevel: z.enum(["core", "team", "internal"]),
  source: z.enum(["vip_free", "internal_free", "promo_grant", "founder_grant", "support_grant"]),
  reason: z.string().trim().min(3).max(500),
  expiresAt: z.string().trim().optional(),
});

function grantReturn(error?: string) {
  return `/admin/billing-grants${error ? `?error=${encodeURIComponent(error)}` : "?saved=1"}` as Route;
}

export async function createBillingAccessGrant(formData: FormData) {
  const parsed = grantSchema.safeParse({
    email: formData.get("email"),
    productKey: formData.get("productKey"),
    entitlementLevel: formData.get("entitlementLevel"),
    source: formData.get("source"),
    reason: formData.get("reason"),
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) redirect(grantReturn("Kontrollo email-in, produktin, nivelin dhe arsyen."));
  const expiration = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiration && (!Number.isFinite(expiration.getTime()) || expiration <= new Date())) {
    redirect(grantReturn("Skadimi duhet te jete ne te ardhmen."));
  }
  const { supabase } = await requireSuperAdmin();
  const idempotencyKey = createHash("sha256")
    .update(JSON.stringify({ ...parsed.data, expiresAt: expiration?.toISOString() ?? null }))
    .digest("hex");
  const { error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("upsert_billing_access_grant", {
    input_email: parsed.data.email,
    input_user_id: null,
    input_product_key: parsed.data.productKey,
    input_entitlement_level: parsed.data.entitlementLevel,
    input_source: parsed.data.source,
    input_reason: parsed.data.reason,
    input_starts_at: new Date().toISOString(),
    input_expires_at: expiration?.toISOString() ?? null,
    input_idempotency_key: idempotencyKey,
  });
  if (error) redirect(grantReturn(error.message));
  revalidatePath("/admin/billing-grants");
  redirect(grantReturn());
}

export async function revokeBillingAccessGrant(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("grantId"));
  const reason = z.string().trim().min(3).max(500).safeParse(formData.get("reason"));
  if (!id.success || !reason.success) redirect(grantReturn("Kerkohet identifikues i vlefshem dhe arsye per revokim."));
  const { supabase } = await requireSuperAdmin();
  const { error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("revoke_billing_access_grant", {
    input_grant_id: id.data,
    input_reason: reason.data,
  });
  if (error) redirect(grantReturn(error.message));
  revalidatePath("/admin/billing-grants");
  redirect(grantReturn());
}
