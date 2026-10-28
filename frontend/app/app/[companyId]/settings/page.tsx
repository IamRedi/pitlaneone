import { redirect } from "next/navigation";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/forms";
import { WebsiteEditor } from "@/components/website-editor";
import { WebsitePublicationControls } from "@/components/website-publication-controls";
import { WebsitePreviewControls } from "@/components/website-preview-controls";
import {
  CompanyCatalogManager,
  type CompanyCatalogItem,
} from "@/components/company-catalog-manager";
import {
  canManageCompany,
  hasCompanyCapability,
  requireCompanyContext,
  requireSaasUser,
} from "@/lib/company";
import {
  connectCompanyCustomDomain,
  updateCompanyBranding,
  updateCompanyInvoiceSettings,
  verifyCompanyCustomDomain,
} from "@/app/saas-actions";
import { toAppLocale } from "@/i18n/config";
import { findBusinessSiteSubcategoryPreset } from "@/lib/business-site-presets";
import { businessSiteDashboardCopy } from "@/lib/business-site-dashboard-copy";
import { resolveProductEntitlement } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const workshopWebsiteCopy = {
  heroEyebrow: "Autoservis profesional",
  heroTitle: "Mirembajtje e besueshme per automjetin tuaj",
  heroSubtitle: "Pune e kujdesshme dhe komunikim i qarte per cdo automjet.",
  aboutTitle: "Kujdes profesional per cdo kilometer.",
  aboutBody: "Ne fokusohemi te puna e sakte, transparenca dhe nje eksperience e qete per cdo klient.",
  servicesTitle: "Sherbime qe mbajne automjetin ne forme",
  serviceOneTitle: "Diagnostikim i sakte",
  serviceOneDescription: "Kontroll i qarte i gjendjes se automjetit.",
  serviceTwoTitle: "Mirembajtje periodike",
  serviceTwoDescription: "Sherbime te planifikuara per automjetin.",
  serviceThreeTitle: "Riparime profesionale",
  serviceThreeDescription: "Pune e dokumentuar dhe kujdes per detajet.",
  galleryTitle: "Galeria e servisit",
  gallerySubtitle: "Pune te fundit nga ekipi yne.",
  contactTitle: "Na kontaktoni per automjetin tuaj",
  contactBody: "Kontaktoni ekipin per informacion ose planifikim.",
};

const hairSalonWebsiteCopy = {
  heroEyebrow: "Hair & Beauty Studio",
  heroTitle: "Haare, die sich nach Ihnen anfühlen.",
  heroSubtitle: "Individuelle Beratung, sorgfältige Technik und ein Look, der zu Ihnen passt.",
  aboutTitle: "Schönheit mit Blick fürs Detail.",
  aboutBody: "Wir nehmen uns Zeit für ehrliche Beratung, sorgfältige Arbeit und einen entspannten Besuch im Studio.",
  servicesTitle: "Für Ihren persönlichen Look",
  serviceOneTitle: "Schnitt & Styling",
  serviceOneDescription: "Ein Schnitt, der im Alltag funktioniert und zu Ihnen passt.",
  serviceTwoTitle: "Farbe & Highlights",
  serviceTwoDescription: "Dimension, Glanz und eine Farbe mit natürlichem Ausdruck.",
  serviceThreeTitle: "Pflege & Finish",
  serviceThreeDescription: "Pflege, die Ihr Haar stärkt, und ein Finish mit Haltung.",
  galleryTitle: "Aus unserem Studio",
  gallerySubtitle: "Looks, die mit Sorgfalt entstehen.",
  contactTitle: "Ihren Termin anfragen",
  contactBody: "Senden Sie uns Ihren Wunschtermin. Wir bestätigen den passenden Zeitpunkt persönlich.",
};
function TextField({
  name,
  label,
  value,
  rows,
  type = "text",
  maxLength = 500,
}: {
  name: string;
  label: string;
  value: string | number | null | undefined;
  rows?: number;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-800">
      {label}
      {rows ? (
        <textarea
          name={name}
          maxLength={maxLength}
          defaultValue={value ?? ""}
          rows={rows}
          className={`resize-y ${inputClass}`}
        />
      ) : (
        <input
          name={name}
          type={type}
          maxLength={maxLength}
          defaultValue={value ?? ""}
          className={inputClass}
        />
      )}
    </label>
  );
}

type InvoiceSettings = {
  all_per_eur_rate: number;
  default_currency: string;
  registration_country: string;
  legal_name: string | null;
  tax_id: string | null;
  registration_number: string | null;
  bank_name: string | null;
  bank_iban: string | null;
  default_tax_rate: number;
  invoice_footer: string | null;
  seller_street: string | null;
  seller_postal_code: string | null;
  seller_city: string | null;
  seller_country_code: string;
  contact_email: string | null;
  payment_terms: string;
  vat_exemption_reason: string | null;
} | null;

async function InvoiceSettingsForm({
  companyId,
  settings,
}: {
  companyId: string;
  settings: InvoiceSettings;
}) {
  const t = await getTranslations("settings");

  return (
    <details
      id="invoice-settings"
      className="mt-6 overflow-hidden rounded-xl border-2 border-brand/40 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            {t("billingEyebrow")}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {t("billingTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("billingDescription")}
          </p>
        </div>
        <span className="text-lg font-black text-slate-400">+</span>
      </summary>
      <form
        action={updateCompanyInvoiceSettings}
        className="grid gap-5 border-t border-slate-200 p-5 sm:p-6"
      >
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            {t("registrationCountry")}
            <select
              name="registrationCountry"
              required
              defaultValue={settings?.registration_country ?? "DE"}
              className={inputClass}
            >
              <option value="DE">{t("germany")}</option>
              <option value="AL">{t("albania")}</option>
              <option value="IT">{t("italy")}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            {t("defaultTaxRate")}
            <input
              name="defaultTaxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={settings?.default_tax_rate ?? 0}
              className={inputClass}
            />
          </label>
          <div className="rounded-lg border border-brand/20 bg-brand/5 p-4 sm:col-span-2">
            <p className="text-sm font-black text-slate-950">
              {t("currencyTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-600">{t("currencyHint")}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-800">
                {t("invoiceCurrency")}
                <select
                  name="defaultCurrency"
                  defaultValue={
                    settings?.default_currency ??
                    (settings?.registration_country === "AL" ? "ALL" : "EUR")
                  }
                  className={inputClass}
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="ALL">ALL (Lek)</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-800">
                {t("eurAllRate")}
                <input
                  name="allPerEurRate"
                  type="number"
                  min="0.0001"
                  max="1000000"
                  step="0.0001"
                  required
                  defaultValue={settings?.all_per_eur_rate ?? 100}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {t("currencySnapshot")}
            </p>
          </div>
          <div className="sm:col-span-2">
            <TextField
              name="legalName"
              label={t("legalName")}
              value={settings?.legal_name}
              maxLength={160}
            />
          </div>
          <TextField
            name="taxId"
            label={t("taxId")}
            value={settings?.tax_id}
            maxLength={80}
          />
          <TextField
            name="registrationNumber"
            label={t("registrationNumber")}
            value={settings?.registration_number}
            maxLength={80}
          />
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-black text-slate-950">
              Deutschland · XRechnung 3.0.2
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Diese Angaben werden beim Ausstellen unveränderlich in die
              Rechnung übernommen. Ohne vollständige Pflichtangaben wird kein
              XML als XRechnung archiviert.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField
                  name="sellerStreet"
                  label="Straße und Hausnummer"
                  value={settings?.seller_street}
                  maxLength={180}
                />
              </div>
              <TextField
                name="sellerPostalCode"
                label="Postleitzahl"
                value={settings?.seller_postal_code}
                maxLength={24}
              />
              <TextField
                name="sellerCity"
                label="Ort"
                value={settings?.seller_city}
                maxLength={100}
              />
              <TextField
                name="sellerCountryCode"
                label="Ländercode (ISO)"
                value={settings?.seller_country_code ?? "DE"}
                maxLength={2}
              />
              <TextField
                name="contactEmail"
                label="E-Mail für E-Rechnung"
                value={settings?.contact_email}
                type="email"
                maxLength={254}
              />
              <div className="sm:col-span-2">
                <TextField
                  name="paymentTerms"
                  label="Zahlungsbedingungen"
                  value={
                    settings?.payment_terms ?? "Zahlbar sofort ohne Abzug."
                  }
                  maxLength={500}
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  name="vatExemptionReason"
                  label="Steuerbefreiungsgrund (nur bei 0 % USt.)"
                  value={settings?.vat_exemption_reason}
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>
          </div>
          <TextField
            name="bankName"
            label={t("bankName")}
            value={settings?.bank_name}
            maxLength={120}
          />
          <TextField
            name="bankIban"
            label={t("iban")}
            value={settings?.bank_iban}
            maxLength={80}
          />
          <div className="sm:col-span-2">
            <TextField
              name="invoiceFooter"
              label={t("invoiceFooter")}
              value={settings?.invoice_footer}
              rows={3}
              maxLength={600}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <SubmitButton label={t("saveInvoice")} pendingLabel={t("saving")} />
        </div>
      </form>
    </details>
  );
}

export default async function CompanySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    asset?: string;
    invoiceSaved?: string;
    domainAdded?: string;
    domainChecked?: string;
    catalogSaved?: string;
    catalogUpdated?: string;
    catalogDeleted?: string;
  }>;
}) {
  const { companyId } = await params;
  const context = await requireCompanyContext(companyId);
  const t = await getTranslations("settings");
  const d = await getTranslations("domains");
  const c = await getTranslations("catalog");
  const businessCopy = businessSiteDashboardCopy[toAppLocale(await getLocale())];
  const query = await searchParams;
  if (!canManageCompany(context.role)) redirect(`/app/${companyId}` as Route);
  const canManageInvoicing = hasCompanyCapability(context, "invoicing");

  const { supabase } = await requireSaasUser();
  const productKey = context.company.product_surface === "business_site" ? "businesssite" : "pitlane";
  const productEntitlement = await resolveProductEntitlement(supabase, productKey);
  const [
    { data: profile, error: profileError },
    { data: theme, error: themeError },
    { data: invoiceSettings, error: invoiceSettingsError },
    { data: domains, error: domainsError },
    { data: extraGallery, error: extraGalleryError },
    { data: catalogItems, error: catalogItemsError },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select(
        "display_name, description, phone, whatsapp, email, address, city, country, preview_token, legal_notice_url, privacy_policy_url, instagram_url, facebook_url, tiktok_url, website_locale, is_public, hero_eyebrow, hero_title, hero_subtitle, about_title, about_body, services_title, service_one_title, service_one_description, service_two_title, service_two_description, service_three_title, service_three_description, gallery_title, gallery_subtitle, contact_title, contact_body",
      )
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("company_theme_settings")
      .select(
        "theme_preset, primary_color, accent_color, background_color, surface_color, text_color, logo_url, hero_image_url, hero_mobile_image_url, service_one_image_url, service_two_image_url, service_three_image_url, gallery_one_image_url, gallery_two_image_url, gallery_three_image_url",
      )
      .eq("company_id", companyId)
      .single(),
    canManageInvoicing
      ? supabase
          .from("company_invoice_settings")
          .select(
            "registration_country, default_currency, all_per_eur_rate, legal_name, tax_id, registration_number, bank_name, bank_iban, default_tax_rate, tax_rate_configured, invoice_footer, seller_street, seller_postal_code, seller_city, seller_country_code, contact_email, payment_terms, vat_exemption_reason",
          )
          .eq("company_id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("company_domains")
      .select("hostname, domain_type, is_primary, is_verified")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("gallery_images")
      .select("image_url")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_catalog_items")
      .select("id, item_type, name, description, price, original_price, is_featured, currency, image_url, duration_minutes")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);
  if (
    profileError ||
    themeError ||
    invoiceSettingsError ||
    domainsError ||
    extraGalleryError ||
    catalogItemsError ||
    !profile ||
    !theme
  )
    throw new Error("Could not load company branding settings.");

  const presetCopy = findBusinessSiteSubcategoryPreset(
    context.company.industry_subcategory_key,
  )?.copy[toAppLocale(profile.website_locale)];
  const websiteCopy = presetCopy
    ? {
        heroEyebrow: presetCopy.heroEyebrow,
        heroTitle: presetCopy.heroTitle,
        heroSubtitle: presetCopy.heroSubtitle,
        aboutTitle: presetCopy.aboutTitle,
        aboutBody: presetCopy.aboutBody,
        servicesTitle: presetCopy.servicesTitle,
        serviceOneTitle: presetCopy.services[0].title,
        serviceOneDescription: presetCopy.services[0].description,
        serviceTwoTitle: presetCopy.services[1].title,
        serviceTwoDescription: presetCopy.services[1].description,
        serviceThreeTitle: presetCopy.services[2].title,
        serviceThreeDescription: presetCopy.services[2].description,
        galleryTitle: presetCopy.galleryTitle,
        gallerySubtitle: presetCopy.gallerySubtitle,
        contactTitle: presetCopy.contactTitle,
        contactBody: presetCopy.contactBody,
      }
    : context.company.product_surface === "business_site" &&
        context.company.industry_key === "hair_beauty"
      ? hairSalonWebsiteCopy
      : workshopWebsiteCopy;
  const defaultThemePreset =
    context.company.product_surface === "business_site" ? "studio" : "steel-copper";

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden px-4 py-8 sm:px-6">
      <a
        href={`/app/${companyId}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </a>
      <header className="mt-5 border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
          {context.company.product_surface === "business_site" ? businessCopy.editorEyebrow : t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          {context.company.product_surface === "business_site" ? businessCopy.editorTitle : t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {context.company.product_surface === "business_site" ? businessCopy.editorDescription : t("description")}
        </p>
      </header>

      <WebsitePublicationControls
        companyId={companyId}
        websitePath={`/b/${context.company.slug}` as Route}
        isPublic={profile.is_public}
        publishLabel={t("publishProfile")}
        publishedLabel={t("websitePublished")}
        publicDescription={t("websitePublicDescription")}
        privateDescription={t("websitePrivateDescription")}
        openLabel={t("openWebsite")}
        savedLabel={t("changesSaved")}
        canPublish={Boolean(profile.description && profile.hero_title && (profile.phone || profile.email)) && productEntitlement.mayPublish}
        blockedLabel={Boolean(profile.description && profile.hero_title && (profile.phone || profile.email)) ? "Publikimi kërkon një plan aktiv, trial ose grant të aprovuar." : t("publicProfileHint")}
      />
      <WebsitePreviewControls companyId={companyId} initialUrl={`${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3011"}/b/${context.company.slug}?preview=${profile.preview_token}`} />
      {query.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {t("changesSaved")}
        </p>
      ) : null}
      {query.asset ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {t("imageSaved")}
        </p>
      ) : null}
      {query.invoiceSaved && canManageInvoicing ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {t("invoiceSettingsSaved")}
        </p>
      ) : null}
      {query.catalogSaved || query.catalogUpdated || query.catalogDeleted ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {query.catalogDeleted ? c("deleted") : c("saved")}
        </p>
      ) : null}
      {query.error ? (
        <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {query.error}
        </p>
      ) : null}

      {canManageInvoicing ? <InvoiceSettingsForm companyId={companyId} settings={invoiceSettings} /> : null}

      <CompanyCatalogManager
        companyId={companyId}
        items={(catalogItems ?? []) as CompanyCatalogItem[]}
      />

      <details className="mt-6 overflow-hidden rounded-xl border-2 border-brand/30 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 sm:px-6">
          <span>
            <span className="block text-xs font-bold uppercase tracking-[.18em] text-brand">
              {d("eyebrow")}
            </span>
            <span className="mt-1 block text-xl font-black text-slate-950">
              {d("title")}
            </span>
          </span>
          <span className="text-lg font-black text-slate-400">+</span>
        </summary>
        <section className="grid gap-5 border-t border-brand/20 bg-white p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">
              {d("eyebrow")}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {d("title")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{d("description")}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <strong>{d("freeAddress")}</strong> {context.company.slug}
            .pitlaneone.com
          </div>
          {domains
            ?.filter((domain) => domain.domain_type === "custom")
            .map((domain) => (
              <div
                key={domain.hostname}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
              >
                <div>
                  <p className="font-bold text-slate-950">{domain.hostname}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {domain.is_verified ? d("active") : d("dnsPending")}
                  </p>
                </div>
                {!domain.is_verified ? (
                  <form action={verifyCompanyCustomDomain}>
                    <input type="hidden" name="companyId" value={companyId} />
                    <input
                      type="hidden"
                      name="hostname"
                      value={domain.hostname}
                    />
                    <SubmitButton
                      label={d("checkDns")}
                      pendingLabel={d("checking")}
                    />
                  </form>
                ) : null}
              </div>
            ))}
          <form
            action={connectCompanyCustomDomain}
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <input type="hidden" name="companyId" value={companyId} />
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              {d("domainLabel")}
              <input
                name="hostname"
                required
                placeholder="autoservisi-yt.de"
                className={inputClass}
              />
            </label>
            <SubmitButton label={d("connect")} pendingLabel={d("connecting")} />
          </form>
          {query.domainAdded ? (
            <p className="text-sm font-bold text-emerald-700">{d("added")}</p>
          ) : null}
          {query.domainChecked ? (
            <p className="text-sm font-bold text-slate-700">{d("checked")}</p>
          ) : null}
        </section>
      </details>

      <form id="website-editor" action={updateCompanyBranding} className="mt-6 grid scroll-mt-28 gap-6">
        <input type="hidden" name="companyId" value={companyId} />
        <WebsiteEditor
          companyId={companyId}
          productSurface={context.company.product_surface}
          initial={{
            displayName: profile.display_name,
            description: profile.description ?? "",
            phone: profile.phone ?? "",
            whatsapp: profile.whatsapp ?? "",
            email: profile.email ?? "",
            address: profile.address ?? "",
            city: profile.city ?? "",
            country: profile.country ?? "",
            instagramUrl: profile.instagram_url ?? "",
            facebookUrl: profile.facebook_url ?? "",
            tiktokUrl: profile.tiktok_url ?? "",
            legalNoticeUrl: profile.legal_notice_url ?? "",
            privacyPolicyUrl: profile.privacy_policy_url ?? "",
            websiteLocale: (["sq", "en", "de", "it", "tr", "pl"].includes(
              profile.website_locale,
            )
              ? profile.website_locale
              : context.company.product_surface === "business_site"
                ? "de"
                : "sq") as "sq" | "en" | "de" | "it" | "tr" | "pl",
            heroEyebrow: profile.hero_eyebrow ?? websiteCopy.heroEyebrow,
            heroTitle: profile.hero_title ?? websiteCopy.heroTitle,
            heroSubtitle: profile.hero_subtitle ?? websiteCopy.heroSubtitle,
            aboutTitle: profile.about_title ?? websiteCopy.aboutTitle,
            aboutBody: profile.about_body ?? websiteCopy.aboutBody,
            servicesTitle: profile.services_title ?? websiteCopy.servicesTitle,
            serviceOneTitle: profile.service_one_title ?? websiteCopy.serviceOneTitle,
            serviceOneDescription:
              profile.service_one_description ?? websiteCopy.serviceOneDescription,
            serviceTwoTitle: profile.service_two_title ?? websiteCopy.serviceTwoTitle,
            serviceTwoDescription:
              profile.service_two_description ?? websiteCopy.serviceTwoDescription,
            serviceThreeTitle:
              profile.service_three_title ?? websiteCopy.serviceThreeTitle,
            serviceThreeDescription:
              profile.service_three_description ?? websiteCopy.serviceThreeDescription,
            galleryTitle: profile.gallery_title ?? websiteCopy.galleryTitle,
            gallerySubtitle: profile.gallery_subtitle ?? websiteCopy.gallerySubtitle,
            contactTitle: profile.contact_title ?? websiteCopy.contactTitle,
            contactBody: profile.contact_body ?? websiteCopy.contactBody,
            isPublic: profile.is_public,
            themePreset: ([
              "steel-copper",
              "chrome",
              "light-metal",
              "crimson",
              "atelier",
              "velocity",
              "studio",
              "clarity",
              "forge",
            ].includes(theme.theme_preset)
              ? theme.theme_preset
              : defaultThemePreset) as
              | "steel-copper"
              | "chrome"
              | "light-metal"
              | "crimson"
              | "atelier"
              | "velocity"
              | "studio"
              | "clarity"
              | "forge",
            primaryColor:
              theme.primary_color ??
              (defaultThemePreset === "studio" ? "#31231F" : "#090C11"),
            accentColor:
              theme.accent_color ??
              (defaultThemePreset === "studio" ? "#C66A43" : "#C96F3B"),
            backgroundColor:
              theme.background_color ??
              (defaultThemePreset === "studio" ? "#FBF7F2" : "#090C11"),
            surfaceColor:
              theme.surface_color ??
              (defaultThemePreset === "studio" ? "#FFFDFC" : "#141B22"),
            textColor:
              theme.text_color ??
              (defaultThemePreset === "studio" ? "#201916" : "#F8FAFC"),
          }}
          images={{
            logo: theme.logo_url,
            hero: theme.hero_image_url,
            heroMobile: theme.hero_mobile_image_url,
            serviceOne: theme.service_one_image_url,
            serviceTwo: theme.service_two_image_url,
            serviceThree: theme.service_three_image_url,
            galleryOne: theme.gallery_one_image_url,
            galleryTwo: theme.gallery_two_image_url,
            galleryThree: theme.gallery_three_image_url,
          }}
          extraGallery={(extraGallery ?? []).map((image) => image.image_url)}
        />
        <div className="flex justify-end">
          <SubmitButton label={t("saveChanges")} pendingLabel={t("saving")} />
        </div>
      </form>
    </main>
  );
}
