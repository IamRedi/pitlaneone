import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildBusinessSiteGenerationPlan, businessSiteCategories } from "../lib/business-site-engine";
import { businessSiteSubcategoryPresets } from "../lib/business-site-presets";

const locales = ["sq", "en", "de", "it", "tr", "pl"] as const;
const categoryKeys = new Set<string>();
const presetKeys = new Set<string>();
let subcategoryCount = 0;

for (const preset of businessSiteSubcategoryPresets) {
  assert(!presetKeys.has(preset.key), `Duplicate preset: ${preset.key}`);
  presetKeys.add(preset.key);
  assert(existsSync(join(process.cwd(), "public", preset.heroImage)), `Missing hero image: ${preset.heroImage}`);
  for (const locale of locales) assert(preset.copy[locale].heroTitle.trim(), `${preset.key}.${locale} hero title is empty`);
}

for (const category of businessSiteCategories) {
  assert(!categoryKeys.has(category.key), `Duplicate category: ${category.key}`);
  categoryKeys.add(category.key);
  assert(category.subcategories.length > 0, `${category.key} needs at least one subcategory`);

  const subcategoryKeys = new Set<string>();
  for (const locale of locales) assert(category.label[locale].trim(), `${category.key}.${locale} label is empty`);
  for (const subcategory of category.subcategories) {
    assert(!subcategoryKeys.has(subcategory.key), `Duplicate subcategory: ${category.key}.${subcategory.key}`);
    subcategoryKeys.add(subcategory.key);
    subcategoryCount += 1;
    assert(presetKeys.has(subcategory.key), `Missing curated preset: ${category.key}.${subcategory.key}`);
    for (const locale of locales) assert(subcategory.label[locale].trim(), `${category.key}.${subcategory.key}.${locale} label is empty`);
    for (const locale of locales) {
      const preview = buildBusinessSiteGenerationPlan({
        name: `Preview ${subcategory.key}`,
        slug: `preview-${subcategory.key.replaceAll("_", "-")}`,
        categoryKey: category.key,
        subcategoryKey: subcategory.key,
        locale,
        source: "platform_demo",
      });
      assert(preview.profile.heroTitle.trim(), `${subcategory.key}.${locale} generated an empty hero title`);
      assert(preview.profile.serviceOneTitle.trim(), `${subcategory.key}.${locale} generated an empty service`);
      assert(preview.theme.heroImageUrl, `${subcategory.key}.${locale} generated without a hero image`);
    }
  }
}

assert.equal(presetKeys.size, subcategoryCount, "Every preset must map to exactly one configured subcategory");

const commonInput = {
  name: "Elektro Münster",
  slug: "elektro-munster",
  categoryKey: "trade_services",
  subcategoryKey: "electrician",
  locale: "de" as const,
  description: "Elektroservice für Münster und Umgebung.",
  phone: "+49 251 123456",
  services: ["Installation", "Reparatur"],
};

const manualPlan = buildBusinessSiteGenerationPlan({ ...commonInput, source: "manual_wizard" });
const automatedPlan = buildBusinessSiteGenerationPlan({ ...commonInput, source: "automated_engine" });

assert.equal(manualPlan.profile.websiteLocale, "de");
assert.equal(manualPlan.profile.heroEyebrow, "Elektriker");
assert.equal(manualPlan.profile.heroTitle, "Sicherer Strom. Präzise Arbeit.");
assert.equal(manualPlan.profile.serviceThreeTitle, "Prüfungen");
assert(manualPlan.profile.serviceOneDescription.trim(), "Custom service titles still require a persisted description");
assert(manualPlan.profile.serviceTwoDescription.trim(), "Every custom service must remain compatible with non-null profile fields");
assert.equal(manualPlan.features.appointments, true);
assert.equal(manualPlan.templatePreset, "forge");
assert.equal(manualPlan.styleKey, "voltage");
assert.deepEqual({ ...manualPlan, source: automatedPlan.source }, automatedPlan);

const intakePlan = buildBusinessSiteGenerationPlan({
  ...commonInput,
  source: "manual_wizard",
  importPreference: { source: "website", sourceUrl: "https://elektro-muenster.de" },
  domainPreference: { mode: "search", domain: "elektro-muenster.de" },
});
assert.deepEqual(intakePlan.intake.importPreference, { source: "website", sourceUrl: "https://elektro-muenster.de" });
assert.deepEqual(intakePlan.intake.domainPreference, { mode: "search", domain: "elektro-muenster.de" });

const mediaPlan = buildBusinessSiteGenerationPlan({
  ...commonInput,
  source: "automated_engine",
  media: {
    logoUrl: "https://assets.example.test/logo.webp",
    heroImageUrl: "https://assets.example.test/hero.webp",
    heroMobileImageUrl: "https://assets.example.test/hero-mobile.webp",
    galleryImageUrls: ["https://assets.example.test/one.webp", "", "https://assets.example.test/two.webp"],
  },
});
assert.equal(mediaPlan.theme.logoUrl, "https://assets.example.test/logo.webp");
assert.equal(mediaPlan.theme.heroImageUrl, "https://assets.example.test/hero.webp");
assert.equal(mediaPlan.theme.heroMobileImageUrl, "https://assets.example.test/hero-mobile.webp");
assert.equal(mediaPlan.theme.galleryOneImageUrl, "https://assets.example.test/one.webp");
assert.equal(mediaPlan.theme.galleryTwoImageUrl, "https://assets.example.test/two.webp");

const nailPlan = buildBusinessSiteGenerationPlan({
  name: "Studio Lila",
  slug: "studio-lila",
  categoryKey: "beauty_grooming",
  subcategoryKey: "nail_studio",
  locale: "sq",
  source: "manual_wizard",
});
assert.equal(nailPlan.styleKey, "playful");
assert.equal(nailPlan.profile.heroTitle, "Hapësirë e vogël. Ide e madhe.");
assert.equal(nailPlan.profile.serviceOneTitle, "Manikyr & kujdes");
assert.equal(nailPlan.theme.heroImageUrl, "/images/templates/businesssite-beauty-nails-v1.webp");
assert.equal(nailPlan.theme.buttonRadius, "rounded");

const physioPlan = buildBusinessSiteGenerationPlan({
  name: "Physio Aktiv",
  slug: "physio-aktiv",
  categoryKey: "wellness_therapy",
  subcategoryKey: "physiotherapy",
  locale: "de",
  source: "automated_engine",
});
assert.equal(physioPlan.styleKey, "clinical");
assert.equal(physioPlan.profile.heroTitle, "Verstehen. Bewegen. Weiterkommen.");
assert.equal(physioPlan.profile.serviceOneTitle, "Befund & Beratung");

const architectPlan = buildBusinessSiteGenerationPlan({
  name: "Studio Raum",
  slug: "studio-raum",
  categoryKey: "professional_services",
  subcategoryKey: "architect",
  locale: "de",
  source: "automated_engine",
});
assert.equal(architectPlan.styleKey, "atelier");
assert.equal(architectPlan.profile.heroTitle, "Räume, die sich gut leben lassen.");
assert.equal(architectPlan.profile.serviceOneTitle, "Konzept");
assert.equal(architectPlan.theme.heroImageUrl, "/images/templates/businesssite-professional-architect-v1.webp");

const veterinaryPlan = buildBusinessSiteGenerationPlan({
  name: "Tierpraxis Mitte",
  slug: "tierpraxis-mitte",
  categoryKey: "pet_services",
  subcategoryKey: "veterinary",
  locale: "de",
  source: "manual_wizard",
});
assert.equal(veterinaryPlan.styleKey, "care");
assert.equal(veterinaryPlan.profile.heroTitle, "Gute Fürsorge für Ihren Begleiter.");
assert.equal(veterinaryPlan.profile.serviceOneTitle, "Vorsorge & Check-up");
assert.equal(veterinaryPlan.features.appointments, true);
assert.equal(veterinaryPlan.features.products, true);

const officeCleaningPlan = buildBusinessSiteGenerationPlan({
  name: "Klar Büroservice",
  slug: "klar-bueroservice",
  categoryKey: "cleaning_services",
  subcategoryKey: "office_cleaning",
  locale: "de",
  source: "automated_engine",
});
assert.equal(officeCleaningPlan.styleKey, "afterhours");
assert.equal(officeCleaningPlan.profile.heroTitle, "Bereit, bevor die Arbeit beginnt.");
assert.equal(officeCleaningPlan.profile.serviceOneTitle, "Büros & Meetingräume");
assert.equal(officeCleaningPlan.features.appointments, true);
assert.equal(officeCleaningPlan.features.products, false);

const movingPlan = buildBusinessSiteGenerationPlan({
  name: "Münster Umzug",
  slug: "muenster-umzug",
  categoryKey: "delivery_transport",
  subcategoryKey: "moving_transport",
  locale: "de",
  source: "manual_wizard",
});
assert.equal(movingPlan.styleKey, "carry");
assert.equal(movingPlan.profile.heroTitle, "Ihre Sachen kommen gut an.");
assert.equal(movingPlan.profile.serviceOneTitle, "Wohnungsumzug");
assert.equal(movingPlan.features.appointments, true);
assert.equal(movingPlan.features.products, false);

const landscapingPlan = buildBusinessSiteGenerationPlan({
  name: "Grünraum Münster",
  slug: "gruenraum-muenster",
  categoryKey: "garden_landscape",
  subcategoryKey: "landscaping",
  locale: "de",
  source: "automated_engine",
});
assert.equal(landscapingPlan.styleKey, "terrain");
assert.equal(landscapingPlan.profile.heroTitle, "Vom Grundstück zu einem Ort, an dem Sie bleiben möchten.");
assert.equal(landscapingPlan.profile.serviceOneTitle, "Konzept & Planung");
assert.equal(landscapingPlan.features.appointments, true);
assert.equal(landscapingPlan.features.products, true);

assert.throws(() => buildBusinessSiteGenerationPlan({
  ...commonInput,
  source: "automated_engine",
  subcategoryKey: "office_cleaning",
}), /Unsupported BusinessSite category/);

console.log(`BusinessSite engine OK: ${businessSiteCategories.length} categories validated.`);
