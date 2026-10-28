"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Boxes,
  CalendarDays,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Palette,
  Plus,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOutForm } from "@/app/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PitlaneOneMark } from "@/components/pitlane-one-brand";
import { ThemeModeSwitcher } from "@/components/theme-mode-switcher";
import type { CompanyCapability, CompanyMembership, CompanyRole } from "@/lib/company";

type CompanyWorkspaceShellProps = {
  activeCompany: CompanyMembership["company"];
  activeRole: CompanyRole;
  capabilities: CompanyCapability[];
  memberships: CompanyMembership[];
  canManage: boolean;
  canOperate: boolean;
  canCreateCompany: boolean;
  isPublicProfile: boolean;
  pendingAppointmentCount: number;
  children: React.ReactNode;
};

export function CompanyWorkspaceShell({
  activeCompany,
  activeRole,
  capabilities,
  memberships,
  canManage,
  canOperate,
  canCreateCompany,
  isPublicProfile,
  pendingAppointmentCount,
  children,
}: CompanyWorkspaceShellProps) {
  const pathname = usePathname();
  const tNavigation = useTranslations("navigation");
  const tSubscription = useTranslations("subscription");
  const tRoles = useTranslations("roles");
  const dashboardHref = `/app/${activeCompany.id}` as Route;
  const brandingHref = `/app/${activeCompany.id}/settings` as Route;
  const hasWorkshopOperations = capabilities.includes("workshop_operations");
  const hasAppointments = capabilities.includes("appointments");
  const hasInventory = capabilities.includes("inventory");
  const hasInvoicing = capabilities.includes("invoicing");
  const navigation = [
    {
      href: dashboardHref,
      label: tNavigation("dashboard"),
      icon: LayoutDashboard,
    },
    ...(hasWorkshopOperations ? [{
      href: `/app/${activeCompany.id}/customers` as Route,
      label: tNavigation("customers"),
      icon: UsersRound,
    }] : []),
    ...(hasInvoicing ? [{
      href: `/app/${activeCompany.id}/invoices` as Route,
      label: tNavigation("invoices"),
      icon: FileText,
    }] : []),
    ...(hasInventory ? [{
      href: `/app/${activeCompany.id}/inventory` as Route,
      label: tNavigation("inventory"),
      icon: Boxes,
    }] : []),
    ...(canOperate && hasAppointments
      ? [
          {
            href: `/app/${activeCompany.id}/appointments` as Route,
            label: tNavigation("appointments"),
            icon: CalendarDays,
            badge: pendingAppointmentCount,
          },
        ]
      : []),
    ...(canManage
      ? [
          { href: brandingHref, label: tNavigation("identity"), icon: Palette },
          {
            href: `/app/${activeCompany.id}/team` as Route,
            label: tNavigation("team"),
            icon: UserRoundCog,
          },
          ...(activeRole === "owner"
            ? [
                {
                  href: `/app/${activeCompany.id}/subscription` as Route,
                  label: tSubscription("title"),
                  icon: CreditCard,
                },
              ]
            : []),
        ]
      : []),
  ];
  const mobileNavigationColumns =
    navigation.length <= 4
      ? "grid-cols-4"
      : navigation.length <= 6
        ? "grid-cols-3 sm:grid-cols-6"
        : "grid-cols-4";

  return (
    <div className={`workspace-theme min-h-screen bg-slate-100/70 ${activeCompany.product_surface === "business_site" ? "workspace-theme--businesssite" : "workspace-theme--pitlane"}`}>
      <header className="workspace-header border-b border-slate-200 bg-slate-950 text-white shadow-sm print:hidden md:sticky md:top-0 md:z-40">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-4 md:max-w-none md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <PitlaneOneMark className="h-9 w-9 shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.22)] sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.04em] text-slate-300">
                Pitlane<span className="text-brand-soft">One</span>
              </p>
              <p className="truncate text-base font-black text-white">
                {activeCompany.name}
              </p>
            </div>
            <span
              data-testid="active-company-role"
              data-active-role={activeRole}
              className="hidden rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 sm:inline-flex"
            >
              {tRoles(activeRole)}
            </span>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:gap-2 md:w-auto md:items-end">
            <nav
              aria-label="Navigimi i kompanise"
              className={`grid w-full ${mobileNavigationColumns} gap-1 rounded-xl border border-white/[0.12] bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl md:hidden`}
            >
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    title={item.label}
                    className={`relative flex h-[3.15rem] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-1 py-1.5 text-[10px] font-bold leading-none transition duration-200 sm:h-[3.35rem] sm:px-2 sm:text-[11px] ${
                      isActive
                        ? "border-brand-soft/35 bg-[linear-gradient(145deg,rgba(192,112,67,0.98),rgba(150,78,42,0.96))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_16px_rgba(0,0,0,0.22)]"
                        : "border-white/[0.06] bg-white/[0.025] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/15 hover:bg-white/[0.09] hover:text-white"
                    }`}
                  >
                    <Icon
                      className="h-[15px] w-[15px] shrink-0 sm:h-4 sm:w-4"
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                    <span className="block w-full truncate px-0.5 text-center">
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-black leading-none text-slate-950 shadow-sm">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {isPublicProfile ? (
                <Link
                  href={`/b/${activeCompany.slug}` as Route}
                  aria-label={tNavigation("publicPage")}
                  title={tNavigation("publicPage")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-slate-200 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {tNavigation("publicPage")}
                  </span>
                </Link>
              ) : canManage ? (
                <Link
                  href={`${brandingHref}#website-publication`}
                  aria-label={tNavigation("publishWebsite")}
                  title={tNavigation("publishWebsite")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-300/35 bg-amber-300/10 text-amber-100 transition hover:bg-amber-300/20 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-bold"
                >
                  <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {tNavigation("publishWebsite")}
                  </span>
                </Link>
              ) : null}

              {canCreateCompany ? (
                <Link
                  href="/onboarding?new=1"
                  aria-label={tNavigation("newCompany")}
                  title={tNavigation("newCompany")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-slate-200 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-bold"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {tNavigation("newCompany")}
                  </span>
                </Link>
              ) : null}

              {activeCompany.product_surface === "business_site" ? <><LanguageSwitcher dark compact /><ThemeModeSwitcher /></> : <div className="flex items-center gap-1.5 md:hidden"><LanguageSwitcher dark compact /><ThemeModeSwitcher /></div>}

              <form action={signOutForm}>
                <button
                  type="submit"
                  aria-label={tNavigation("signOut")}
                  title={tNavigation("signOut")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-slate-200 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-bold"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {tNavigation("signOut")}
                  </span>
                </button>
              </form>

              {memberships.length > 1 ? (
                <details className="relative">
                  <summary
                    aria-label={tNavigation("companies")}
                    title={tNavigation("companies")}
                    className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-white/15 text-slate-200 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-bold"
                  >
                    <span className="sr-only sm:not-sr-only">
                      {tNavigation("companies")}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </summary>
                  <div className="fixed inset-x-4 top-1/2 z-50 mt-0 w-auto -translate-y-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[#171e26] p-2 text-white shadow-[0_28px_90px_rgba(0,0,0,.48)] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-64 md:translate-y-0">
                    {memberships.map((membership) => (
                      <Link
                        key={membership.company.id}
                        href={`/app/${membership.company.id}` as Route}
                        className={`block rounded-md px-3 py-2.5 text-sm transition hover:bg-slate-100 ${
                          membership.company.id === activeCompany.id
                            ? "bg-white/10 font-bold"
                            : "font-medium hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="block truncate">
                          {membership.company.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {tRoles(membership.role)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      <div className="md:grid md:grid-cols-[190px_minmax(0,1fr)] md:items-start">
        <aside className="hidden text-slate-600 md:sticky md:top-[73px] md:flex md:h-[calc(100vh-73px)] md:flex-col md:overflow-y-hidden">
          <nav
            aria-label="Navigimi i kompanise"
            className="grid gap-1 px-3 py-5"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 border-l-2 px-2 py-2.5 text-[15px] font-semibold transition ${
                    isActive
                      ? "border-brand text-brand"
                      : "border-transparent text-slate-500 hover:text-slate-950"
                  }`}
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          {activeCompany.product_surface !== "business_site" ? <div className="mt-auto border-t border-white/10 px-3 py-4">
            <LanguageSwitcher dark sidebar />
            <ThemeModeSwitcher sidebar defaultMode="dark" />
          </div> : null}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
