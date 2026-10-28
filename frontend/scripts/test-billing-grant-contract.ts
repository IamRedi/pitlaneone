import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("../supabase/migrations/20261017_add_product_access_grants_and_resolver.sql", "utf8");
const commercialMigration = readFileSync("../supabase/migrations/20261018_finalize_product_pricing_demo_and_trials.sql", "utf8");
for (const required of ["billing_grant_subjects", "billing_access_grants", "resolve_product_entitlement", "upsert_billing_access_grant", "revoke_billing_access_grant", "public.is_super_admin(auth.uid())", "idempotency_key", "product_key in ('businesssite', 'pitlane')"]) {
  assert.ok(migration.includes(required), `Missing billing safety contract: ${required}`);
}

for (const required of [
  "g.revoked_at is null and g.starts_at <= now()",
  "(g.expires_at is null or g.expires_at > now())",
  "g.product_key = input_product_key",
  "grant_match union all select * from stripe_match",
  "order by priority asc limit 1",
]) assert.ok(migration.includes(required), `Resolver behavior missing: ${required}`);
assert.ok(!migration.includes("input_user_id uuid default auth.uid()"), "Browser callers must not choose a different entitlement subject");

for (const required of [
  "billing_price_catalog",
  "get_active_billing_price",
  "('businesssite.start.monthly.de', 'businesssite', 'start', 'DE', 'EUR', 2990, 'month', true",
  "('businesssite.start.monthly.al', 'businesssite', 'start', 'AL', 'ALL', 210000, 'month', true",
  "('businesssite.booking.monthly.de', 'businesssite', 'booking', 'DE', 'EUR', 3990, 'month', true",
  "('businesssite.booking.monthly.al', 'businesssite', 'booking', 'AL', 'ALL', 280000, 'month', true",
  "('pitlane.core.monthly.de', 'pitlane', 'core', 'DE', 'EUR', 3990, 'month', true",
  "('pitlane.core.monthly.al', 'pitlane', 'core', 'AL', 'ALL', 280000, 'month', true",
  "('pitlane.complete.monthly.de', 'pitlane', 'complete', 'DE', 'EUR', 6990, 'month', true",
  "('pitlane.complete.monthly.al', 'pitlane', 'complete', 'AL', 'ALL', 490000, 'month', true",
  "'founder_12m', 12",
  "['multilingual','private_preview','public_website']".replaceAll("'", "\""),
  "billing_product_trials",
  "primary key (billing_account_id, product_key)",
  "ends_at = starts_at + interval '7 days'",
  "create_pitlane_trial_company",
  "create_self_service_business_site_pre_commercial_lifecycle",
  "lifecycle_status = 'conversion_pending'",
  "is_public = false",
  "enforce_public_profile_entitlement",
  "may_publish boolean",
  "input_product_key = 'businesssite'",
  "revoke all on function public.create_trial_company(text, text) from authenticated",
]) assert.ok(commercialMigration.includes(required), `Missing commercial lifecycle contract: ${required}`);

assert.ok(!commercialMigration.includes("current_setting('app.user_email'"), "Commercial access must not hardcode email access.");
console.log("Billing grant and commercial lifecycle contracts passed.");
