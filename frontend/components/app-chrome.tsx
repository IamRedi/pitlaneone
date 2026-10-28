"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { SiteNavbar } from "@/components/site-navbar";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublicCompanySite = pathname.startsWith("/b/");
  const isBusinessSiteLanding = pathname.startsWith("/businesssite");
  const isCompanyWorkspace = pathname.startsWith("/app/");
  const isAppointmentResponse = pathname.startsWith("/appointment-response/");
  const isBusinessSiteSignup =
    pathname === "/signup" && searchParams.get("next") === "/businesssite/start";
  const isBusinessSiteLogin =
    pathname === "/admin-login" && searchParams.get("next") === "/businesssite/start";
  const isAuthPage = pathname === "/signup" || pathname === "/admin-login";
  const isPitlaneOnboarding = pathname === "/onboarding";

  if (
    isPublicCompanySite ||
    isCompanyWorkspace ||
    isBusinessSiteLanding ||
    isAppointmentResponse
    || isBusinessSiteSignup
    || isBusinessSiteLogin
    || isAuthPage
    || isPitlaneOnboarding
  ) {
    return <div className="min-h-screen max-w-full overflow-x-hidden">{children}</div>;
  }

  return (
    <>
      <div className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-6">
        <SiteNavbar />
        {children}
      </div>
      {pathname === "/" ? null : <FloatingActionBar />}
    </>
  );
}
