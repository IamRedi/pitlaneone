import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBusinessSiteGenerationPlan, type BusinessSiteGenerationInput } from "@/lib/business-site-engine";
import type { Database } from "@/lib/supabase/types";

export type BusinessSiteCreationInput = BusinessSiteGenerationInput & {
  trialDays: number;
};

export type SelfServiceBusinessSiteCreationInput = Omit<
  BusinessSiteGenerationInput,
  "source"
>;

/** Shared creation path for the manual wizard and trusted automated sources. */
export async function createBusinessSiteFromData(
  supabase: SupabaseClient<Database>,
  input: BusinessSiteCreationInput,
) {
  const plan = buildBusinessSiteGenerationPlan(input);
  const { data: companyId, error } = await supabase.rpc("create_platform_business_site_demo", {
    input_name: input.name,
    input_slug: input.slug,
    input_industry_key: plan.categoryKey,
    input_subcategory_key: plan.subcategoryKey,
    input_website_locale: input.locale,
    input_generation_source: input.source,
    input_generation_payload: plan,
    input_trial_days: input.trialDays,
  });

  if (error || !companyId) {
    return {
      companyId,
      error: error?.message ?? "BusinessSite could not be created.",
      plan,
    };
  }

  const mediaUpdate: Database["public"]["Tables"]["company_theme_settings"]["Update"] = {};
  if (plan.theme.logoUrl) mediaUpdate.logo_url = plan.theme.logoUrl;
  if (plan.theme.heroImageUrl) mediaUpdate.hero_image_url = plan.theme.heroImageUrl;
  if (plan.theme.heroMobileImageUrl) mediaUpdate.hero_mobile_image_url = plan.theme.heroMobileImageUrl;
  if (plan.theme.galleryOneImageUrl) mediaUpdate.gallery_one_image_url = plan.theme.galleryOneImageUrl;
  if (plan.theme.galleryTwoImageUrl) mediaUpdate.gallery_two_image_url = plan.theme.galleryTwoImageUrl;
  if (plan.theme.galleryThreeImageUrl) mediaUpdate.gallery_three_image_url = plan.theme.galleryThreeImageUrl;

  if (Object.keys(mediaUpdate).length) {
    const { error: mediaError } = await supabase
      .from("company_theme_settings")
      .update(mediaUpdate)
      .eq("company_id", companyId);
    if (mediaError) {
      return { companyId, error: mediaError.message, plan };
    }
  }

  return {
    companyId,
    error: null,
    plan,
  };
}

/** Customer onboarding path. Billing, lifecycle, source and modules are fixed by the RPC. */
export async function createSelfServiceBusinessSiteFromData(
  supabase: SupabaseClient<Database>,
  input: SelfServiceBusinessSiteCreationInput,
) {
  const plan = buildBusinessSiteGenerationPlan({
    ...input,
    source: "manual_wizard",
  });
  const { data: companyId, error } = await supabase.rpc(
    "create_self_service_business_site",
    {
      input_name: input.name,
      input_slug: input.slug,
      input_industry_key: plan.categoryKey,
      input_subcategory_key: plan.subcategoryKey,
      input_website_locale: input.locale,
      input_generation_payload: plan,
    },
  );

  return {
    companyId,
    error: error?.message ?? null,
    plan,
  };
}
