import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Check,
  Clock3,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
} from "lucide-react";

import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import { publicWebsiteCopy } from "@/lib/public-website-copy";
import { createServerSupabase } from "@/lib/supabase/server";
import { createPublicAppointmentRequest } from "@/app/saas-actions";
import { PublicAppointmentSlotFields } from "@/components/public-appointment-slot-fields";
import { PitlaneOneMark } from "@/components/pitlane-one-brand";
import { BusinessSitePublicWebsite } from "@/components/business-site-public-website";
import { PublicCatalogShowcase } from "@/components/public-catalog-showcase";

export type PublicCompany = {
  company_id: string;
  slug: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_title: string | null;
  about_body: string | null;
  services_title: string | null;
  contact_title: string | null;
  contact_body: string | null;
  service_one_title: string | null;
  service_one_description: string | null;
  service_two_title: string | null;
  service_two_description: string | null;
  service_three_title: string | null;
  service_three_description: string | null;
  gallery_title: string | null;
  gallery_subtitle: string | null;
  legal_notice_url: string | null;
  privacy_policy_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_locale: string | null;
  theme_preset:
    | "steel-copper"
    | "chrome"
    | "light-metal"
    | "crimson"
    | "atelier"
    | "velocity"
    | "studio"
    | "clarity"
    | "forge"
    | null;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  text_color: string | null;
  button_radius: "sharp" | "soft" | "rounded" | null;
  font_style: "modern" | "serif" | null;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_mobile_image_url: string | null;
  service_one_image_url: string | null;
  service_two_image_url: string | null;
  service_three_image_url: string | null;
  gallery_one_image_url: string | null;
  gallery_two_image_url: string | null;
  gallery_three_image_url: string | null;
  product_surface: "workshop" | "business_site" | null;
  industry_key: string | null;
  industry_subcategory_key: string | null;
  has_appointments: boolean;
};

const templateAssets = {
  "steel-copper": {
    hero: "/images/templates/graphite-hero-v1.png",
    heroMobile: "/images/templates/graphite-hero-mobile-v1.png",
    layout: "editorial",
  },
  chrome: {
    hero: "/images/templates/olive-hero-v1.png",
    heroMobile: "/images/templates/olive-hero-mobile-v1.png",
    layout: "heritage",
  },
  "light-metal": {
    hero: "/images/templates/arctic-hero-v1.png",
    heroMobile: "/images/templates/arctic-hero-mobile-v1.png",
    layout: "precision",
  },
  crimson: {
    hero: "/images/templates/midnight-hero-v1.png",
    heroMobile: "/images/templates/midnight-hero-mobile-v1.png",
    layout: "motion",
  },
  atelier: {
    hero: "/images/templates/arctic-hero-v1.png",
    heroMobile: "/images/templates/arctic-hero-mobile-v1.png",
    layout: "atelier",
  },
  velocity: {
    hero: "/images/templates/midnight-hero-v1.png",
    heroMobile: "/images/templates/midnight-hero-mobile-v1.png",
    layout: "velocity",
  },
} as const;

const fallbackImages = {
  serviceOne:
    "https://images.unsplash.com/photo-1504222490345-c075b6008014?auto=format&fit=crop&w=1200&q=80",
  serviceTwo:
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80",
  serviceThree:
    "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=1200&q=80",
  galleryOne:
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
  galleryTwo:
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
  galleryThree:
    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80",
};

function getRadius(value: PublicCompany["button_radius"]) {
  return value === "sharp" ? "6px" : value === "rounded" ? "999px" : "16px";
}
function hasPublicCompany(value: unknown): value is PublicCompany {
  return Boolean(
    value &&
    typeof value === "object" &&
    "slug" in value &&
    "display_name" in value,
  );
}

const getPublicCompany = cache(async (slug: string, previewToken?: string) => {
  const supabase = await createServerSupabase();
  const isPreviewToken = previewToken && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(previewToken);
  const { data, error } = await supabase
    .rpc("get_public_company_by_slug", { input_slug: slug, input_preview_token: isPreviewToken ? previewToken : null })
    .maybeSingle();

  return error || !hasPublicCompany(data) ? null : data;
});

function publicWebsiteUrl(slug: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return null;

  try {
    return new URL(`/b/${slug}`, configuredUrl).toString();
  } catch {
    return null;
  }
}

function publicImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    return new URL(imageUrl).toString();
  } catch {
    return null;
  }
}

function websiteStructuredData(company: PublicCompany, url: string | null) {
  const address = [company.address, company.city, company.country].filter(Boolean);
  const image = publicImageUrl(company.hero_image_url);

  return {
    "@context": "https://schema.org",
    "@type": company.product_surface === "workshop" ? "AutoRepair" : "LocalBusiness",
    name: company.display_name,
    ...(company.description ? { description: company.description } : {}),
    ...(url ? { url } : {}),
    ...(image ? { image } : {}),
    ...(company.logo_url ? { logo: company.logo_url } : {}),
    ...(company.phone ? { telephone: company.phone } : {}),
    ...(company.email ? { email: company.email } : {}),
    ...(address.length
      ? {
          address: {
            "@type": "PostalAddress",
            ...(company.address ? { streetAddress: company.address } : {}),
            ...(company.city ? { addressLocality: company.city } : {}),
            ...(company.country ? { addressCountry: company.country } : {}),
          },
        }
      : {}),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getPublicCompany(slug);

  if (!company) return { title: "Business not found" };

  const title = company.hero_title
    ? `${company.display_name} | ${company.hero_title}`
    : company.display_name;
  const description =
    company.description ||
    company.hero_subtitle ||
    `Discover ${company.display_name}, a local business on PitlaneOne.`;
  const url = publicWebsiteUrl(company.slug);
  const image = publicImageUrl(company.hero_image_url);

  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      title,
      description,
      ...(url ? { url } : {}),
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicCompanyWebsite({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ appointment?: string; preview?: string }>;
}) {
  const { slug } = await params;
  const { appointment, preview } = await searchParams;
  const company = await getPublicCompany(slug, preview);
  if (!company) notFound();
  const supabase = await createServerSupabase();
  const structuredData = JSON.stringify(
    websiteStructuredData(company, publicWebsiteUrl(company.slug)),
  ).replace(/</g, "\\u003c");
  const websiteLocale = toAppLocale(company.website_locale);
  const copy = publicWebsiteCopy[websiteLocale];

  if (company.product_surface === "business_site") {
    return <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <BusinessSitePublicWebsite company={company} appointment={appointment} />
    </>;
  }
  const vehicleLabels =
    websiteLocale === "de"
      ? {
          description: "Fahrzeugtyp oder Modell (optional)",
          plate: "Kennzeichen (optional)",
        }
      : websiteLocale === "sq"
        ? {
            description: "Tipi ose modeli i automjetit (opsional)",
            plate: "Targa (opsionale)",
          }
        : websiteLocale === "it"
          ? {
              description: "Tipo o modello del veicolo (facoltativo)",
              plate: "Targa (facoltativa)",
            }
          : {
              description: "Vehicle type or model (optional)",
              plate: "License plate (optional)",
            };
  const template =
    company.theme_preset && company.theme_preset in templateAssets
      ? (company.theme_preset as keyof typeof templateAssets)
      : "steel-copper";
  const templateConfig = templateAssets[template];
  const isOlive = templateConfig.layout === "heritage";
  const isArctic = templateConfig.layout === "precision";
  const isMidnight = templateConfig.layout === "motion";
  const isAtelier = templateConfig.layout === "atelier";
  const isVelocity = templateConfig.layout === "velocity";
  const primary =
    company.primary_color ??
    (isOlive
      ? "#10170F"
      : isArctic
        ? "#0C1721"
        : isMidnight
          ? "#0B132B"
          : isAtelier
            ? "#F7F1E8"
            : isVelocity
              ? "#090A0F"
              : "#090C11");
  const accent =
    company.accent_color ??
    (isOlive
      ? "#B9CF84"
      : isArctic
        ? "#8CC8EE"
        : isMidnight
          ? "#8EA9F5"
          : isAtelier
            ? "#A7532B"
            : isVelocity
              ? "#F05A28"
              : "#C96F3B");
  const background =
    company.background_color ??
    (isOlive
      ? "#0C120C"
      : isArctic
        ? "#091119"
        : isMidnight
          ? "#070C1B"
          : isAtelier
            ? "#F7F1E8"
            : isVelocity
              ? "#090A0F"
              : "#090C11");
  const surface =
    company.surface_color ??
    (isOlive
      ? "#182117"
      : isArctic
        ? "#132432"
        : isMidnight
          ? "#121E38"
          : isAtelier
            ? "#FFFFFF"
            : isVelocity
              ? "#171922"
              : "#141B22");
  const text =
    company.text_color ??
    (isAtelier ? "#20201E" : isVelocity ? "#FFF8F4" : "#F8FAFC");
  const radius = getRadius(company.button_radius);
  const heroImage = company.hero_image_url || templateConfig.hero;
  const usesDefaultHero = !company.hero_image_url;
  const companyInitial =
    company.display_name.trim().slice(0, 1).toLocaleUpperCase() || "M";
  const accentButtonText = "text-slate-950";
  const accentButtonColor = "#071018";
  const headerClass = isAtelier
    ? "border-black/10 bg-[#F7F1E8]/92 text-[#20201E]"
    : isVelocity
      ? "border-white/10 bg-[#090A0F]/88 text-white"
      : "border-white/10 bg-[#090A0C]/86 text-white";
  const navClass = isAtelier
    ? "text-[#57534E] hover:text-[#20201E]"
    : "text-slate-300 hover:text-white";
  const subBrandClass = isAtelier ? "text-[#78716C]" : "text-slate-400";
  const appointmentMutedClass = isAtelier ? "text-[#57534E]" : "text-white/75";
  const appointmentFormClass = isAtelier
    ? "grid gap-4 border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(47,35,26,.10)] backdrop-blur-sm sm:grid-cols-2 sm:p-8"
    : "grid gap-4 border border-white/20 bg-white/5 p-6 backdrop-blur-sm sm:grid-cols-2 sm:p-8";
  const appointmentLabelClass = isAtelier
    ? "grid gap-2 text-sm font-bold text-[#302B27]"
    : "grid gap-2 text-sm font-bold text-white";
  const appointmentInputClass = isAtelier
    ? "h-11 border border-[#D8CEC3] bg-white px-3 text-[#20201E] outline-none transition focus:border-[#A7532B]"
    : "h-11 border border-white/30 bg-[#080b10]/90 px-3 text-white outline-none transition focus:border-white/70";
  const appointmentTextareaClass = isAtelier
    ? "border border-[#D8CEC3] bg-white px-3 py-2 text-[#20201E] outline-none transition focus:border-[#A7532B]"
    : "border border-white/30 bg-[#080b10]/90 px-3 py-2 text-white outline-none transition focus:border-white/70";
  const heroShell = isOlive
    ? "min-h-[590px] bg-[#0C120C]"
    : isArctic
      ? "min-h-[570px] bg-[#091119]"
      : isMidnight
        ? "min-h-[610px] bg-[#070C1B]"
        : isAtelier
          ? "min-h-[640px] bg-[#F7F1E8]"
          : isVelocity
            ? "min-h-[650px] bg-[#090A0F]"
            : "min-h-[640px] bg-[#090C11]";
  const heroOverlay = isOlive
    ? "bg-gradient-to-r from-[#0C120C]/82 via-[#0C120C]/54 to-[#0C120C]/12"
    : isArctic
      ? "bg-gradient-to-r from-[#07131D]/82 via-[#07131D]/54 to-[#07131D]/10"
      : isMidnight
        ? "bg-gradient-to-r from-[#060914]/84 via-[#080E20]/58 to-[#080E20]/10"
        : isAtelier
          ? "bg-gradient-to-r from-[#F7F1E8]/98 via-[#F7F1E8]/88 to-[#F7F1E8]/18"
          : isVelocity
            ? "bg-gradient-to-r from-[#090A0F]/92 via-[#090A0F]/64 to-[#090A0F]/12"
            : "bg-gradient-to-r from-[#090C11]/84 via-[#090C11]/62 to-[#090C11]/10";
  const services = [
    {
      title: company.service_one_title || copy.serviceOneTitle,
      text: company.service_one_description || copy.serviceOneBody,
      image: company.service_one_image_url || fallbackImages.serviceOne,
    },
    {
      title: company.service_two_title || copy.serviceTwoTitle,
      text: company.service_two_description || copy.serviceTwoBody,
      image: company.service_two_image_url || fallbackImages.serviceTwo,
    },
    {
      title: company.service_three_title || copy.serviceThreeTitle,
      text: company.service_three_description || copy.serviceThreeBody,
      image: company.service_three_image_url || fallbackImages.serviceThree,
    },
  ];
  const { data: extraGallery } = await supabase
    .from("gallery_images")
    .select("image_url")
    .eq("company_id", company.company_id)
    .order("created_at", { ascending: false })
    .limit(24);
  const { data: catalogItems } = await supabase
    .from("company_catalog_items")
    .select("id, item_type, name, description, price, currency, image_url, duration_minutes")
    .eq("company_id", company.company_id)
    .order("created_at", { ascending: false });
  const bookableServices = (catalogItems ?? [])
    .filter((item) => item.item_type === "service" && item.name.trim())
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      durationMinutes: item.duration_minutes ?? 60,
      priceLabel: new Intl.NumberFormat(appLocaleFormats[websiteLocale], {
        style: "currency",
        currency: item.currency,
        maximumFractionDigits: 2,
      }).format(Number(item.price)),
    }));
  const availabilityFrom = new Date().toISOString().slice(0, 10);
  const availabilityToDate = new Date();
  availabilityToDate.setDate(availabilityToDate.getDate() + 90);
  const [{ data: bookedSlots }, { data: businessHours }] = await Promise.all([
    supabase.rpc("list_public_appointment_slots", {
      input_company_id: company.company_id,
      input_from: availabilityFrom,
      input_to: availabilityToDate.toISOString().slice(0, 10),
    }),
    supabase.rpc("get_public_appointment_business_hours", {
      input_company_id: company.company_id,
    }),
  ]);
  const gallery = [
    company.gallery_one_image_url || fallbackImages.galleryOne,
    company.gallery_two_image_url || fallbackImages.galleryTwo,
    company.gallery_three_image_url || fallbackImages.galleryThree,
    ...(extraGallery ?? []).map((image) => image.image_url),
  ];
  const phoneHref = company.phone
    ? `tel:${company.phone.replace(/\s/g, "")}`
    : null;
  const emailHref = company.email ? `mailto:${company.email}` : null;
  const whatsappHref = company.whatsapp
    ? `https://wa.me/${company.whatsapp.replace(/[^\d]/g, "")}`
    : null;
  const mapQuery = [company.address, company.city, company.country]
    .filter(Boolean)
    .join(", ");
  const directionsHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
    <main
      className={`public-company-site min-h-screen overflow-x-hidden font-sans ${isAtelier ? "public-atelier" : ""}`}
      style={{
        backgroundColor: background,
        color: text,
        fontFamily:
          company.font_style === "serif" ? "Georgia, serif" : "inherit",
      }}
    >
      <header
        className={`sticky top-0 z-30 border-b shadow-[0_12px_42px_rgba(0,0,0,.14)] backdrop-blur-2xl ${headerClass}`}
      >
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-5 sm:px-8">
          <a
            href="#kryefaqja"
            className="flex min-w-0 items-center gap-3"
            aria-label={`${company.display_name} - ${copy.home}`}
          >
            {company.logo_url ? (
              <span className="flex h-11 w-24 shrink-0 items-center">
                <img
                  src={company.logo_url}
                  alt={`${company.display_name} logo`}
                  className="h-full w-full object-contain object-left"
                />
              </span>
            ) : (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center text-lg font-black shadow-sm"
                style={{
                  backgroundColor: accent,
                  color: accentButtonColor,
                  borderRadius: radius,
                }}
              >
                {companyInitial}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold uppercase tracking-[.14em]">
                {company.display_name}
              </span>
              <span
                className={`mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[.18em] ${subBrandClass}`}
              >
                {copy.automotiveService}
              </span>
            </span>
          </a>
          <nav
            className={`hidden items-center gap-7 text-sm font-bold md:flex ${navClass}`}
            aria-label={copy.openMenu}
          >
            <a className="transition" href="#rreth-nesh">
              {copy.about}
            </a>
            <a className="transition" href="#sherbimet">
              {copy.services}
            </a>
            {catalogItems?.length ? (
              <a className="transition" href="#cmimet">
                {copy.prices}
              </a>
            ) : null}
            <a className="transition" href="#galeria">
              {copy.gallery}
            </a>
          </nav>
          <details className="relative ml-auto md:hidden">
            <summary
              aria-label={copy.openMenu}
              className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border transition ${isAtelier ? "border-black/15 bg-white/70 text-[#20201E] hover:bg-white" : "border-white/20 bg-black/20 text-white hover:bg-white/10"}`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </summary>
            <nav
              className={`absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border p-1.5 text-sm font-bold shadow-2xl backdrop-blur-xl ${isAtelier ? "border-black/10 bg-white/95 text-[#20201E]" : "border-white/15 bg-[#090C11]/95 text-white"}`}
              aria-label={copy.openMenu}
            >
              <a
                className={`block rounded-xl px-3 py-2.5 transition ${isAtelier ? "hover:bg-black/5" : "hover:bg-white/10"}`}
                href="#rreth-nesh"
              >
                {copy.about}
              </a>
              <a
                className={`block rounded-xl px-3 py-2.5 transition ${isAtelier ? "hover:bg-black/5" : "hover:bg-white/10"}`}
                href="#sherbimet"
              >
                {copy.services}
              </a>
              {catalogItems?.length ? (
                <a
                  className={`block rounded-xl px-3 py-2.5 transition ${isAtelier ? "hover:bg-black/5" : "hover:bg-white/10"}`}
                  href="#cmimet"
                >
                  {copy.prices}
                </a>
              ) : null}
              <a
                className={`block rounded-xl px-3 py-2.5 transition ${isAtelier ? "hover:bg-black/5" : "hover:bg-white/10"}`}
                href="#galeria"
              >
                {copy.gallery}
              </a>
              <a
                className={`block rounded-xl px-3 py-2.5 transition ${isAtelier ? "hover:bg-black/5" : "hover:bg-white/10"}`}
                href="#termin"
              >
                {copy.appointmentTitle}
              </a>
              <a
                className="block rounded-xl px-3 py-2.5 transition hover:bg-white/10"
                href="#kontakt"
              >
                {copy.contact}
              </a>
            </nav>
          </details>
          <a
            href="#kontakt"
            aria-label={copy.contact}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 px-0 text-sm font-extrabold shadow-sm transition hover:scale-[1.02] sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 ${accentButtonText}`}
            style={{
              backgroundColor: accent,
              color: accentButtonColor,
              borderRadius: radius,
            }}
          >
            <Phone className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">{copy.contact}</span>
          </a>
        </div>
      </header>

      <section
        id="kryefaqja"
        className={`relative isolate overflow-hidden ${heroShell}`}
      >
        <picture
          className={`absolute -z-20 block ${isAtelier ? "inset-y-0 right-0 w-full sm:w-[57%]" : "inset-0"}`}
        >
          <source
            media="(max-width: 639px)"
            srcSet={
              company.hero_mobile_image_url ||
              (usesDefaultHero ? templateConfig.heroMobile : heroImage)
            }
          />
          <img
            src={heroImage}
            alt=""
            className={`h-full w-full object-cover ${isOlive ? "object-[67%_center]" : isArctic ? "object-[64%_center]" : isMidnight ? "object-[70%_center]" : isAtelier ? "object-[80%_center]" : isVelocity ? "object-[72%_center]" : "object-[68%_center]"}`}
          />
        </picture>
        <div className={`absolute inset-0 -z-10 ${heroOverlay}`} />
        <div
          className={`absolute inset-0 -z-10 ${isAtelier ? "bg-[radial-gradient(circle_at_16%_12%,rgba(167,83,43,.12),transparent_28%)]" : isVelocity ? "bg-[radial-gradient(circle_at_13%_15%,rgba(240,90,40,.32),transparent_25%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,.08),transparent_30%)]" : "bg-[radial-gradient(circle_at_18%_12%,rgba(201,111,59,.26),transparent_28%),radial-gradient(circle_at_80%_85%,rgba(35,73,112,.22),transparent_32%)]"}`}
        />
        <div
          className={`mx-auto flex max-w-7xl px-5 pt-28 sm:px-8 ${isOlive ? "min-h-[590px] items-center pb-10 sm:pb-12" : isArctic ? "min-h-[570px] items-center justify-start pb-8" : isMidnight ? "min-h-[610px] items-end justify-center pb-14 text-center sm:pb-18" : isAtelier ? "min-h-[640px] items-center pb-12" : isVelocity ? "min-h-[650px] items-end pb-14 sm:pb-20" : "min-h-[620px] items-end pb-14 sm:pb-20"}`}
        >
          <div
            className={`${
              isOlive
                ? "max-w-2xl border border-white/15 bg-[#10170F]/28 p-6 shadow-[0_28px_80px_rgba(0,0,0,.2)] backdrop-blur-sm sm:p-9"
                : isArctic
                  ? "max-w-2xl border border-white/15 border-l-2 bg-[#07131D]/28 px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,.18)] backdrop-blur-sm sm:px-9 sm:py-9"
                  : isMidnight
                    ? "max-w-3xl rounded-[28px] border border-white/12 bg-[#070C1B]/28 px-6 py-7 shadow-[0_28px_80px_rgba(0,0,0,.22)] backdrop-blur-sm sm:px-10 sm:py-9"
                    : isAtelier
                      ? "max-w-xl border border-black/10 bg-[#F7F1E8]/88 px-6 py-8 shadow-[0_26px_72px_rgba(47,35,26,.12)] backdrop-blur-sm sm:px-9 sm:py-10"
                      : isVelocity
                        ? "max-w-3xl border border-white/12 bg-[#090A0F]/35 px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-sm sm:px-9 sm:py-9"
                        : "max-w-3xl border border-white/12 bg-[#090C11]/28 px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,.18)] backdrop-blur-sm sm:px-9 sm:py-9"
            }`}
            style={
              isMidnight || isVelocity
                ? { borderRadius: "28px" }
                : isArctic
                  ? { borderRadius: radius, borderLeftColor: accent }
                  : { borderRadius: radius }
            }
          >
            <div
              className={`mb-5 inline-flex items-center gap-2 border px-3 py-2 text-xs font-extrabold uppercase tracking-[.18em] ${isAtelier ? "border-black/10 bg-white/65 text-[#6B422E]" : "border-white/20 bg-black/30 text-white"}`}
              style={{ borderRadius: radius }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accent }}
              />
              {company.hero_eyebrow || copy.heroEyebrow}
            </div>
            <h1
              className={`text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl ${isAtelier ? "text-[#20201E] lg:text-6xl" : "text-white"} ${isOlive ? "lg:text-6xl" : isMidnight ? "lg:text-6xl" : "lg:text-7xl"}`}
            >
              {company.hero_title || copy.heroTitle}
            </h1>
            <p
              className={`mt-5 text-lg leading-8 sm:text-xl ${isAtelier ? "text-[#4A4541]" : "text-slate-200"}`}
            >
              {company.hero_subtitle ||
                company.description ||
                copy.heroSubtitle}
            </p>
            <div
              className={`mt-8 flex flex-wrap gap-3 ${isMidnight ? "justify-center" : ""}`}
            >
              <a
                href="#termin"
                className={`px-5 py-3.5 text-sm font-extrabold shadow-sm transition hover:brightness-110 ${accentButtonText}`}
                style={{
                  backgroundColor: accent,
                  color: accentButtonColor,
                  borderRadius: radius,
                }}
              >
                {copy.contactCta}
              </a>
              <a
                href="#sherbimet"
                className={`border px-5 py-3.5 text-sm font-extrabold transition ${isAtelier ? "border-black/20 text-[#20201E] hover:bg-black/5" : "border-white/30 text-white hover:bg-white/10"}`}
                style={{ borderRadius: radius }}
              >
                {copy.servicesCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b"
        style={{ borderColor: `${text}1A`, backgroundColor: surface }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 px-5 sm:grid-cols-3 sm:px-8">
          {[
            [Check, copy.trustOneTitle, copy.trustOneBody],
            [Clock3, copy.trustTwoTitle, copy.trustTwoBody],
            [Building2, copy.trustThreeTitle, copy.trustThreeBody],
          ].map(([Icon, title, detail], index) => {
            const ItemIcon = Icon as typeof Check;
            return (
              <div
                key={title as string}
                className={`flex gap-3 py-6 sm:px-6 ${index ? "sm:border-l" : ""}`}
                style={index ? { borderColor: `${text}1A` } : undefined}
              >
                <ItemIcon
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: accent }}
                />
                <div>
                  <p className="font-extrabold">{title as string}</p>
                  <p className="mt-1 text-sm leading-6 opacity-70">
                    {detail as string}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="rreth-nesh"
        className={`mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32 ${isMidnight ? "text-center" : "grid gap-10 lg:grid-cols-[.85fr_1.15fr]"}`}
      >
        <div className={isMidnight ? "mx-auto max-w-3xl" : ""}>
          <p
            className="text-xs font-extrabold uppercase tracking-[.18em]"
            style={{ color: accent }}
          >
            {copy.aboutEyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-.04em] sm:text-5xl">
            {company.about_title || copy.aboutTitle}
          </h2>
        </div>
        <div
          className={
            isMidnight ? "mx-auto mt-7 max-w-2xl" : "border-l-2 pl-6 sm:pl-8"
          }
          style={!isMidnight ? { borderColor: accent } : undefined}
        >
          <p className="text-xl leading-8 opacity-80">
            {company.about_body || company.description || copy.aboutBody}
          </p>
          <a
            href="#kontakt"
            className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold underline underline-offset-4"
            style={{ color: accent }}
          >
            {copy.teamCta} <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section
        id="sherbimet"
        className="border-y"
        style={{ backgroundColor: surface, borderColor: `${text}1A` }}
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div
            className={`flex flex-col justify-between gap-5 ${isMidnight ? "text-center sm:items-center" : "sm:flex-row sm:items-end"}`}
          >
            <div>
              <p
                className="text-xs font-extrabold uppercase tracking-[.18em]"
                style={{ color: accent }}
              >
                {copy.servicesEyebrow}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                {company.services_title || copy.servicesTitle}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 opacity-70">
              {copy.servicesBody}
            </p>
          </div>
          <div
            className={`mt-10 grid gap-5 ${isArctic ? "lg:grid-cols-[1.15fr_.85fr_1fr]" : isOlive ? "lg:grid-cols-[.85fr_1.15fr_.85fr]" : "lg:grid-cols-3"}`}
          >
            {services.map((service, index) => (
              <article
                key={service.title}
                className={`group overflow-hidden border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${isArctic ? "rounded-none" : ""}`}
                style={{
                  borderColor: `${text}22`,
                  borderRadius: isArctic ? "0" : isMidnight ? "24px" : radius,
                  backgroundColor: surface,
                  color: text,
                }}
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className={`w-full object-cover transition duration-500 group-hover:scale-105 ${isOlive && index === 1 ? "h-64" : "h-56"}`}
                />
                <div className="p-6">
                  <span
                    className="text-xs font-black"
                    style={{ color: accent }}
                  >
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-2xl font-black tracking-tight">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 opacity-70">
                    {service.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {catalogItems?.length ? (
        <section
          id="cmimet"
          className="border-y"
          style={{ backgroundColor: background, borderColor: `${text}1A` }}
        >
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="max-w-2xl">
              <p
                className="text-xs font-extrabold uppercase tracking-[.18em]"
                style={{ color: accent }}
              >
                {copy.catalogEyebrow}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                {copy.catalogTitle}
              </h2>
              <p className="mt-4 text-sm leading-6 opacity-70">
                {copy.catalogBody}
              </p>
            </div>
            <PublicCatalogShowcase items={catalogItems} locale={appLocaleFormats[websiteLocale]} textColor={text} surfaceColor={surface} accentColor={accent} radius={radius} serviceLabel={copy.service} productLabel={copy.product} />
          </div>
        </section>
      ) : null}

      <section
        id="galeria"
        className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"
      >
        <div
          className={isMidnight ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
        >
          <p
            className="text-xs font-extrabold uppercase tracking-[.18em]"
            style={{ color: accent }}
          >
            {copy.galleryEyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
            {company.gallery_title || copy.galleryTitle}
          </h2>
          {company.gallery_subtitle ? (
            <p className="mt-4 text-sm leading-6 opacity-70">
              {company.gallery_subtitle}
            </p>
          ) : null}
        </div>
        <div
          className={`mt-10 grid gap-4 ${gallery.length > 3 ? "sm:grid-cols-2 lg:grid-cols-3" : isMidnight ? "md:grid-cols-3" : "min-h-[540px] md:grid-cols-2 md:grid-rows-2"}`}
        >
          {gallery.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt={`${copy.galleryAlt} ${company.display_name}`}
              className={`h-64 w-full object-cover ${gallery.length <= 3 && index === 0 && !isMidnight ? "md:row-span-2 md:h-full" : gallery.length <= 3 && isMidnight ? "md:h-96" : ""}`}
              style={{ borderRadius: isMidnight ? "24px" : radius }}
            />
          ))}
        </div>
      </section>

      <section
        id="termin"
        className="border-t"
        style={{
          backgroundColor: primary,
          borderColor: `${text}1A`,
          color: isAtelier ? "#20201E" : "#FFFFFF",
          backgroundImage: `radial-gradient(circle at 80% 10%, ${accent}35, transparent 30%)`,
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:py-28">
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[.18em]"
              style={{ color: accent }}
            >
              {copy.appointmentEyebrow}
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-.04em] sm:text-5xl">
              {copy.appointmentTitle}
            </h2>
            <p
              className={`mt-5 max-w-xl text-lg leading-8 ${appointmentMutedClass}`}
            >
              {copy.appointmentBody}
            </p>
            {appointment === "sent" ? (
              <p
                className={`mt-6 border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold ${isAtelier ? "text-emerald-900" : "text-emerald-50"}`}
                style={{ borderRadius: radius }}
              >
                {copy.appointmentSuccess}
              </p>
            ) : null}
            {appointment === "error" || appointment === "invalid" ? (
              <p
                className={`mt-6 border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold ${isAtelier ? "text-rose-900" : "text-rose-50"}`}
                style={{ borderRadius: radius }}
              >
                {copy.appointmentError}
              </p>
            ) : null}
          </div>
          <form
            action={createPublicAppointmentRequest}
            className={appointmentFormClass}
            style={{
              borderRadius: isArctic ? "0" : isMidnight ? "24px" : radius,
            }}
          >
            <input type="hidden" name="companyId" value={company.company_id} />
            <input type="hidden" name="slug" value={company.slug} />
            <label className={appointmentLabelClass}>
              {copy.appointmentName}
              <input
                required
                name="customerName"
                maxLength={120}
                className={appointmentInputClass}
                style={{ borderRadius: radius }}
              />
            </label>
            <label className={appointmentLabelClass}>
              {copy.appointmentPhone}
              <input
                required
                name="phone"
                inputMode="tel"
                maxLength={40}
                className={appointmentInputClass}
                style={{ borderRadius: radius }}
              />
            </label>
            <label className={appointmentLabelClass}>
              {vehicleLabels.description}
              <input
                name="vehicleDescription"
                maxLength={120}
                className={appointmentInputClass}
                style={{ borderRadius: radius }}
              />
            </label>
            <label className={appointmentLabelClass}>
              {vehicleLabels.plate}
              <input
                name="vehiclePlate"
                maxLength={24}
                className={appointmentInputClass}
                style={{ borderRadius: radius }}
              />
            </label>
            <PublicAppointmentSlotFields
              serviceOptions={bookableServices}
              serviceLabel={copy.appointmentService}
              chooseServiceLabel={copy.appointmentChooseService}
              bookedSlots={
                (bookedSlots ?? []) as {
                  scheduled_date: string;
                  scheduled_time: string;
                  duration_minutes: number;
                }[]
              }
              businessHours={
                (businessHours ?? []) as {
                  weekday: number;
                  is_open: boolean;
                  opens_at: string;
                  closes_at: string;
                  slot_minutes: number;
                }[]
              }
              dateLabel={copy.appointmentDate}
              timeLabel={copy.appointmentTime}
              radius={radius}
              labelClassName={`${appointmentLabelClass} sm:col-span-2`}
              inputClassName={appointmentInputClass}
              dark={!isAtelier}
            />
            <label className={`${appointmentLabelClass} sm:col-span-2`}>
              {copy.appointmentNote}
              <textarea
                name="note"
                maxLength={1000}
                rows={3}
                className={appointmentTextareaClass}
                style={{ borderRadius: radius }}
              />
            </label>
            <button
              className={`w-fit px-5 py-3 text-sm font-extrabold shadow-sm transition hover:brightness-110 ${accentButtonText}`}
              style={{
                backgroundColor: accent,
                color: accentButtonColor,
                borderRadius: radius,
              }}
            >
              {copy.appointmentSubmit}
            </button>
          </form>
        </div>
      </section>

      <section
        id="kontakt"
        className="border-t"
        style={{ backgroundColor: surface, borderColor: `${text}1A` }}
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_.9fr] lg:py-28">
          <div>
            <p
              className="text-xs font-extrabold uppercase tracking-[.18em]"
              style={{ color: accent }}
            >
              {copy.contact}
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-.04em] sm:text-5xl">
              {company.contact_title || copy.contactTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 opacity-75">
              {company.contact_body || copy.contactBody}
            </p>
          </div>
          <div
            className="border p-6 sm:p-8"
            style={{
              borderColor: `${text}33`,
              borderRadius: isArctic ? "0" : isMidnight ? "24px" : radius,
            }}
          >
            <div className="space-y-5">
              {company.phone ? (
                <a
                  href={phoneHref ?? undefined}
                  className="flex items-center gap-3 text-base font-bold transition hover:opacity-70"
                >
                  <Phone className="h-5 w-5" style={{ color: accent }} />
                  {company.phone}
                </a>
              ) : null}
              {company.whatsapp ? (
                <a
                  href={whatsappHref ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-base font-bold transition hover:opacity-70"
                >
                  <MessageCircle
                    className="h-5 w-5"
                    style={{ color: accent }}
                  />
                  {copy.whatsapp}
                </a>
              ) : null}
              {company.email ? (
                <a
                  href={emailHref ?? undefined}
                  className="flex items-center gap-3 text-base font-bold transition hover:opacity-70"
                >
                  <Building2 className="h-5 w-5" style={{ color: accent }} />
                  {company.email}
                </a>
              ) : null}
              {company.address ? (
                <p className="flex items-start gap-3 text-base font-bold">
                  <MapPin
                    className="mt-0.5 h-5 w-5 shrink-0"
                    style={{ color: accent }}
                  />
                  {[company.address, company.city, company.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {!company.phone &&
              !company.whatsapp &&
              !company.email &&
              !company.address ? (
                <p className="text-sm leading-6 opacity-70">
                  {copy.contactPending}
                </p>
              ) : null}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold transition hover:brightness-110"
                  style={{
                    backgroundColor: accent,
                    color: accentButtonColor,
                    borderRadius: radius,
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {copy.whatsapp}
                </a>
              ) : null}
              {directionsHref ? (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border px-4 py-2.5 text-sm font-extrabold transition hover:opacity-70"
                  style={{ borderColor: `${text}55`, borderRadius: radius }}
                >
                  <Navigation className="h-4 w-4" />
                  {copy.directions}
                </a>
              ) : null}
            </div>
            <a
              href="/onboarding"
              className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold underline underline-offset-4"
              style={{ color: accent }}
            >
              {copy.companyPanel} <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
      <footer className="bg-[#050505] text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{company.display_name}</span>
          {company.legal_notice_url || company.privacy_policy_url ? (
            <span className="flex flex-wrap gap-x-4 gap-y-2">
              {company.legal_notice_url ? <a href={company.legal_notice_url} target="_blank" rel="noreferrer" className="hover:text-white">{copy.legalNotice}</a> : null}
              {company.privacy_policy_url ? <a href={company.privacy_policy_url} target="_blank" rel="noreferrer" className="hover:text-white">{copy.privacyPolicy}</a> : null}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <PitlaneOneMark className="h-6 w-6" />
            {copy.poweredBy}
          </span>
        </div>
      </footer>
    </main>
    </>
  );
}
