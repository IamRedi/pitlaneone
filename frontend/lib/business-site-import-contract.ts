import "server-only";

import { z } from "zod";

/**
 * Stable contract for the external research engine. It can use a Google
 * listing, an existing website, or both, but it must return only normalised
 * draft data. Creation remains inside this SaaS after customer review.
 */
export const businessSiteImportRequestSchema = z.object({
  sourceUrl: z.string().trim().url().max(2048).optional(),
  googlePlaceUrl: z.string().trim().url().max(2048).optional(),
  preferredLocale: z.enum(["sq", "en", "de", "it", "tr", "pl"]).default("de"),
}).refine((value) => Boolean(value.sourceUrl || value.googlePlaceUrl), {
  message: "Provide an existing website or Google business URL.",
});

export const businessSiteImportedDraftSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(320).default(""),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().max(160).default(""),
  address: z.string().trim().max(180).default(""),
  city: z.string().trim().max(100).default(""),
  country: z.string().trim().max(100).default(""),
  logoUrl: z.string().url().max(2048).optional(),
  imageUrls: z.array(z.string().url().max(2048)).max(12).default([]),
  categoryHint: z.string().trim().max(80).optional(),
  subcategoryHint: z.string().trim().max(80).optional(),
  services: z.array(z.string().trim().min(1).max(120)).max(3).default([]),
  confidence: z.number().min(0).max(1).default(0),
  sources: z.array(z.string().url().max(2048)).min(1).max(4),
});

export type BusinessSiteImportRequest = z.infer<typeof businessSiteImportRequestSchema>;
export type BusinessSiteImportedDraft = z.infer<typeof businessSiteImportedDraftSchema>;

export async function requestBusinessSiteImport(input: BusinessSiteImportRequest) {
  const request = businessSiteImportRequestSchema.parse(input);
  const endpoint = process.env.BUSINESS_SITE_IMPORT_ENDPOINT;
  const token = process.env.BUSINESS_SITE_IMPORT_TOKEN;
  if (!endpoint || !token) {
    return { ok: false as const, reason: "not_configured" as const };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { ok: false as const, reason: "upstream_error" as const };

  return { ok: true as const, draft: businessSiteImportedDraftSchema.parse(await response.json()) };
}
