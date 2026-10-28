export const appLocales = ["sq", "en", "de", "it", "tr", "pl"] as const;

export type AppLocale = (typeof appLocales)[number];

export const defaultAppLocale: AppLocale = "sq";
export const appLocaleCookieName = "PITLANEONE_LOCALE";

export const appLocaleFormats: Record<AppLocale, string> = {
  sq: "sq-AL",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  tr: "tr-TR",
  pl: "pl-PL"
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (appLocales as readonly string[]).includes(value);
}

export function toAppLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : defaultAppLocale;
}
