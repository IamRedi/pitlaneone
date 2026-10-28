import type { AppLocale } from "@/i18n/config";

export type BusinessSitePresetCopy = {
  description: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutBody: string;
  servicesTitle: string;
  services: readonly [
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
  ];
  galleryTitle: string;
  gallerySubtitle: string;
  contactTitle: string;
  contactBody: string;
};

export type BusinessSiteSubcategoryPreset = {
  key: string;
  layout:
    | "editorial"
    | "noir"
    | "playful"
    | "precision"
    | "ritual"
    | "grounded"
    | "clinical"
    | "human"
    | "fresh"
    | "sanctuary"
    | "counsel"
    | "ledger"
    | "assured"
    | "signal"
    | "atelier"
    | "spritz"
    | "care"
    | "field"
    | "restore"
    | "homelight"
    | "afterhours"
    | "crystal"
    | "system"
    | "rapid"
    | "voltage"
    | "flow"
    | "craft"
    | "sprint"
    | "route"
    | "carry"
    | "meadow"
    | "terrain"
    | "canopy"
    | "waterline"
    | "showroom";
  heroImage: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    buttonRadius: "sharp" | "soft" | "rounded";
    fontStyle: "modern" | "serif";
  };
  copy: Record<AppLocale, BusinessSitePresetCopy>;
};
