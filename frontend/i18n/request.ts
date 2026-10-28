import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { appLocaleCookieName, appLocales, isAppLocale, type AppLocale } from "@/i18n/config";

function detectLocale(acceptLanguage: string | null, countryCode: string | null): AppLocale {
  const preferred = (acceptLanguage ?? "").toLowerCase().split(",").map((item) => item.trim().split(";")[0].split("-")[0]);
  const supportedDeviceLocale = preferred.find((item): item is AppLocale => (appLocales as readonly string[]).includes(item));

  if (supportedDeviceLocale) {
    return supportedDeviceLocale;
  }

  return countryCode?.toUpperCase() === "DE" ? "de" : "en";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const savedLocale = cookieStore.get(appLocaleCookieName)?.value;
  const countryCode = headerStore.get("x-vercel-ip-country") ?? headerStore.get("cf-ipcountry");
  const locale = isAppLocale(savedLocale) ? savedLocale : detectLocale(headerStore.get("accept-language"), countryCode);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
