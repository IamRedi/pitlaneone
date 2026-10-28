"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { findBusinessSiteCategory } from "@/lib/business-site-engine";
import { requireSaasUser } from "@/lib/company";
import {
  createBusinessSiteFromData,
  createSelfServiceBusinessSiteFromData,
} from "@/lib/business-site-generation";
import { readBusinessSiteMedia, uploadBusinessSiteMedia } from "@/lib/business-site-media";

const businessSiteInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  categoryKey: z.string().trim().min(2).max(80),
  subcategoryKey: z.string().trim().min(2).max(80),
  websiteLocale: z.enum(["sq", "en", "de", "it", "tr", "pl"]),
  description: z.string().trim().max(320).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.string().trim().email().max(160)]).optional(),
  address: z.string().trim().max(180).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  services: z.array(z.string().trim().max(120)).max(3),
  appointmentsEnabled: z.boolean(),
  productsEnabled: z.boolean(),
  importSource: z.enum(["manual", "website", "google"]),
  importSourceUrl: z.union([z.literal(""), z.string().trim().url().max(2048)]),
  domainMode: z.enum(["existing", "later", "search"]),
  domainName: z.string().trim().max(253).regex(/^(?:$|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/i),
}).superRefine((value, context) => {
  const category = findBusinessSiteCategory(value.categoryKey);
  if (!category?.subcategories.some((item) => item.key === value.subcategoryKey)) {
    context.addIssue({ code: "custom", path: ["subcategoryKey"], message: "Unsupported category selection." });
  }
});

const businessSiteDemoSchema = businessSiteInputSchema.and(z.object({
  generationSource: z.enum(["manual_wizard", "automated_engine", "platform_demo"]),
  trialDays: z.coerce.number().int().min(1).max(31),
}));

function readBusinessSiteInput(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryKey: formData.get("categoryKey"),
    subcategoryKey: formData.get("subcategoryKey"),
    websiteLocale: formData.get("websiteLocale"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    country: formData.get("country"),
    services: [formData.get("service1"), formData.get("service2"), formData.get("service3")].filter((value): value is string => typeof value === "string" && Boolean(value.trim())),
    appointmentsEnabled: formData.get("appointmentsEnabled") === "on",
    productsEnabled: formData.get("productsEnabled") === "on",
    importSource: formData.get("importSource"),
    importSourceUrl: formData.get("importSourceUrl"),
    domainMode: formData.get("domainMode"),
    domainName: formData.get("domainName"),
  };
}

export async function createBusinessSiteDemo(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const media = readBusinessSiteMedia(formData);
  if (media.invalid) {
    redirect("/admin/businesssite-demo?error=Fotot%20duhet%20te%20jene%20JPG%2C%20PNG%20ose%20WebP%20brenda%20limitit." as Route);
  }

  const parsed = businessSiteDemoSchema.safeParse({
    ...readBusinessSiteInput(formData),
    generationSource: formData.get("generationSource"),
    trialDays: formData.get("trialDays"),
  });

  if (!parsed.success) {
    redirect("/admin/businesssite-demo?error=Kontrollo%20emrin%2C%20identifikuesin%20dhe%20industrine." as Route);
  }

  const { companyId, error } = await createBusinessSiteFromData(supabase, {
    name: parsed.data.name,
    slug: parsed.data.slug,
    categoryKey: parsed.data.categoryKey,
    subcategoryKey: parsed.data.subcategoryKey,
    locale: parsed.data.websiteLocale,
    source: parsed.data.generationSource,
    description: parsed.data.description,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
    city: parsed.data.city,
    country: parsed.data.country,
    services: parsed.data.services,
    appointmentsEnabled: parsed.data.appointmentsEnabled,
    productsEnabled: parsed.data.productsEnabled,
    importPreference: { source: parsed.data.importSource, sourceUrl: parsed.data.importSourceUrl },
    domainPreference: { mode: parsed.data.domainMode, domain: parsed.data.domainName },
    trialDays: parsed.data.trialDays,
  });

  if (error || !companyId) {
    redirect(`/admin/businesssite-demo?error=${encodeURIComponent(error ?? "Demo nuk u krijua.")}` as Route);
  }

  const mediaError = await uploadBusinessSiteMedia(supabase, companyId, media);
  if (mediaError) redirect(`/app/${companyId}/settings?error=${encodeURIComponent(mediaError)}` as Route);

  redirect(`/app/${companyId}` as Route);
}

export async function createBusinessSiteSelfService(formData: FormData) {
  const { supabase } = await requireSaasUser(
    "/admin-login?next=%2Fbusinesssite%2Fstart",
  );
  const media = readBusinessSiteMedia(formData);
  if (media.invalid) {
    redirect("/businesssite/start?error=Fotot%20duhet%20te%20jene%20JPG%2C%20PNG%20ose%20WebP%20brenda%20limitit." as Route);
  }

  const parsed = businessSiteInputSchema.safeParse(readBusinessSiteInput(formData));
  if (!parsed.success) {
    redirect("/businesssite/start?error=Kontrollo%20emrin%2C%20identifikuesin%20dhe%20industrine." as Route);
  }

  const { companyId, error } = await createSelfServiceBusinessSiteFromData(supabase, {
    name: parsed.data.name,
    slug: parsed.data.slug,
    categoryKey: parsed.data.categoryKey,
    subcategoryKey: parsed.data.subcategoryKey,
    locale: parsed.data.websiteLocale,
    description: parsed.data.description,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
    city: parsed.data.city,
    country: parsed.data.country,
    services: parsed.data.services,
    appointmentsEnabled: parsed.data.appointmentsEnabled,
    productsEnabled: parsed.data.productsEnabled,
    importPreference: { source: parsed.data.importSource, sourceUrl: parsed.data.importSourceUrl },
    domainPreference: { mode: parsed.data.domainMode, domain: parsed.data.domainName },
  });

  if (error || !companyId) {
    const message = error?.includes("already includes one BusinessSite")
      ? "Plani yt përfshin një biznes. Aktivizo paketën për një biznes tjetër."
      : error?.includes("10-day trial has ended")
        ? "Prova 10-ditore ka përfunduar. Zgjidh një paketë për të vazhduar."
        : "BusinessSite-i nuk u krijua.";
    redirect(`/businesssite/start?error=${encodeURIComponent(message)}` as Route);
  }

  const mediaError = await uploadBusinessSiteMedia(supabase, companyId, media);
  if (mediaError) redirect(`/app/${companyId}/settings?error=${encodeURIComponent(mediaError)}` as Route);
  redirect(`/app/${companyId}` as Route);
}
