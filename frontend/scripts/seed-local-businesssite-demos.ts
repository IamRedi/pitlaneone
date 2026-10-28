import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { buildBusinessSiteGenerationPlan } from "../lib/business-site-engine";
import { findBusinessSiteSubcategoryPreset } from "../lib/business-site-presets";

config({ path: ".env.local" });

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required local environment variable: ${name}`);
  return value;
}

const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const adminEmail = requiredEnvironment("LOCAL_DEMO_ADMIN_EMAIL");
const adminPassword = requiredEnvironment("LOCAL_DEMO_ADMIN_PASSWORD");

const parsedUrl = new URL(supabaseUrl);
if (!(["localhost", "127.0.0.1"].includes(parsedUrl.hostname))) {
  throw new Error(`Refusing to seed a non-local Supabase host: ${parsedUrl.hostname}`);
}

const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const authenticated = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
const { data: userList, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
let adminUser = userList.users.find((user) => user.email === adminEmail);
if (!adminUser) {
  const { data, error } = await service.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
  if (error) throw error;
  adminUser = data.user;
}
if (!adminUser) throw new Error("Could not create the local demo admin.");

const { error: adminError } = await service.from("admins").upsert({
  id: adminUser.id,
  email: adminEmail,
  full_name: "Local BusinessSite Admin",
  role: "super_admin",
  is_active: true,
});
if (adminError) throw adminError;

const { error: signInError } = await authenticated.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
if (signInError) throw signInError;

const demos = [
  { name: "Studio Aurora Münster", slug: "demo-studio-aurora", categoryKey: "beauty_grooming", subcategoryKey: "hair_salon" },
  { name: "Ruhepunkt Münster", slug: "demo-ruhepunkt", categoryKey: "wellness_therapy", subcategoryKey: "massage" },
  { name: "Klarrecht Münster", slug: "demo-klarrecht", categoryKey: "professional_services", subcategoryKey: "lawyer" },
  { name: "Pfotenzeit Münster", slug: "demo-pfotenzeit", categoryKey: "pet_services", subcategoryKey: "pet_grooming" },
  { name: "Klarraum Münster", slug: "demo-klarraum", categoryKey: "cleaning_services", subcategoryKey: "home_cleaning" },
  { name: "Schlüsselwerk Münster", slug: "demo-schluesselwerk", categoryKey: "trade_services", subcategoryKey: "locksmith" },
  { name: "Stadtbote Münster", slug: "demo-stadtbote", categoryKey: "delivery_transport", subcategoryKey: "local_delivery" },
  { name: "Grünzeit Münster", slug: "demo-gruenzeit", categoryKey: "garden_landscape", subcategoryKey: "garden_maintenance" },
] as const;

for (const demo of demos) {
  const { data: existing, error: existingError } = await service.from("companies").select("id").eq("slug", demo.slug).maybeSingle();
  if (existingError) throw existingError;
  let companyId = existing?.id;
  const plan = buildBusinessSiteGenerationPlan({
    ...demo,
    locale: "de",
    source: "platform_demo",
    phone: "+49 251 000000",
    email: `${demo.slug}@example.test`,
    city: "Münster",
    country: "Germany",
  });

  if (!companyId) {
    const { data, error } = await authenticated.rpc("create_platform_business_site_demo", {
      input_name: demo.name,
      input_slug: demo.slug,
      input_industry_key: plan.categoryKey,
      input_subcategory_key: plan.subcategoryKey,
      input_website_locale: "de",
      input_generation_source: "platform_demo",
      input_generation_payload: plan,
      input_trial_days: 15,
    });
    if (error) throw error;
    companyId = data;
  }
  if (!companyId) throw new Error(`No company id returned for ${demo.slug}`);

  const preset = findBusinessSiteSubcategoryPreset(demo.subcategoryKey);
  const siblingImages = demos
    .filter((candidate) => candidate.categoryKey === demo.categoryKey || candidate.slug === demo.slug)
    .map((candidate) => findBusinessSiteSubcategoryPreset(candidate.subcategoryKey)?.heroImage)
    .filter((image): image is string => Boolean(image));
  const galleryImages = Array.from(new Set([preset?.heroImage, ...siblingImages].filter((image): image is string => Boolean(image))));

  const [{ error: publishError }, { error: galleryError }] = await Promise.all([
    service.from("company_profiles").update({ is_public: true }).eq("company_id", companyId),
    service.from("company_theme_settings").update({
      gallery_one_image_url: galleryImages[0] ?? null,
      gallery_two_image_url: galleryImages[1] ?? galleryImages[0] ?? null,
      gallery_three_image_url: galleryImages[2] ?? galleryImages[0] ?? null,
    }).eq("company_id", companyId),
  ]);
  if (publishError) throw publishError;
  if (galleryError) throw galleryError;

  if (plan.features.products) {
    const { count, error: countError } = await service.from("company_catalog_items").select("id", { count: "exact", head: true }).eq("company_id", companyId);
    if (countError) throw countError;
    if (!count) {
      const { error } = await service.from("company_catalog_items").insert([
        { company_id: companyId, item_type: "product", name: "Ausgewähltes Produkt", description: "Beispielangebot für die lokale Vorschau.", price: 24.9, currency: "EUR", duration_minutes: null, image_url: preset?.heroImage ?? null, created_by: adminUser.id },
        { company_id: companyId, item_type: "service", name: "Saisonangebot", description: "Ein klar dargestelltes Angebot ohne Webshop.", price: 49, currency: "EUR", duration_minutes: 60, image_url: preset?.heroImage ?? null, created_by: adminUser.id },
      ]);
      if (error) throw error;
    }
  }

  console.log(`${existing ? "kept" : "created"}: http://localhost:3011/b/${demo.slug}`);
}

await authenticated.auth.signOut();
console.log(`Local BusinessSite demos ready: ${demos.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
