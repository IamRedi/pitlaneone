import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { AuthRecoveryRedirect } from "@/components/auth-recovery-redirect";
import { AppChrome } from "@/components/app-chrome";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: {
    default: "PitlaneOne",
    template: "%s | PitlaneOne"
  },
  description: "Multilingual workshop management for customers, vehicles, services, invoices and stock.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#A66F36" },
    { media: "(prefers-color-scheme: dark)", color: "#171B1F" }
  ],
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <ServiceWorkerRegister />
          <AuthRecoveryRedirect />
          <AppChrome>{children}</AppChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
