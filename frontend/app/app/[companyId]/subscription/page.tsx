import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, Building2, CalendarClock, UsersRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import { requireCompanyContext, requireSaasUser } from "@/lib/company";
import { entitlementSourceLabel, resolveProductEntitlement } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

export default async function CompanySubscriptionPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await requireCompanyContext(companyId);
  if (context.role !== "owner") redirect(`/app/${companyId}` as Route);

  const [t, locale] = await Promise.all([getTranslations("subscription"), getLocale()]);
  const { supabase } = await requireSaasUser();
  const productKey = context.company.product_surface === "business_site" ? "businesssite" : "pitlane";
  const resolved = await resolveProductEntitlement(supabase, productKey);
  const { data, error } = await supabase.rpc("get_company_billing_summary", { input_company_id: companyId });
  const summary = data?.[0];
  if (error || !summary) throw new Error("Could not load subscription details.");

  const isTrial = resolved.lifecycle === "trialing";
  const isDemo = resolved.lifecycle === "demo";
  const isManual = summary.account_status === "manual" && !resolved.active && !isDemo;
  const expiry = resolved.expiresAt ? new Date(resolved.expiresAt) : summary.trial_ends_at ? new Date(summary.trial_ends_at) : null;
  const daysLeft = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000)) : 0;
  const dateFormat = new Intl.DateTimeFormat(appLocaleFormats[toAppLocale(locale)], { day: "numeric", month: "long", year: "numeric" });
  const productName = productKey === "businesssite" ? "BusinessSite" : "PitlaneOne";
  const title = isDemo
    ? `${productName} — Free Demo`
    : isTrial
      ? `${productName} — 7-day Trial`
      : resolved.active
        ? `${productName} — Active`
        : `${productName} — Inactive`;
  const source = isDemo
    ? "Free Demo · private preview only"
    : isTrial
      ? `7-day Trial · ${daysLeft} days remaining`
      : resolved.active
        ? entitlementSourceLabel(resolved.source)
        : "No active paid plan or access grant";
  const tone = isDemo ? "border-sky-400/35 bg-[#142431]" : resolved.active ? "border-emerald-400/35 bg-[#153326]" : isManual ? "border-slate-400/35 bg-slate-800" : "border-rose-400/35 bg-[#351d24]";
  const iconTone = isDemo ? "bg-sky-400 text-slate-950" : resolved.active ? "bg-emerald-400 text-slate-950" : isManual ? "bg-slate-300 text-slate-950" : "bg-rose-400 text-slate-950";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href={`/app/${companyId}` as Route} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
      <header className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 px-6 py-7 text-white shadow-panel sm:px-8">
        <p className="text-xs font-black tracking-[.08em] text-white">Pitlane<span className="text-brand-soft">One</span></p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("description")}</p>
      </header>

      <section className={`mt-6 rounded-2xl border p-5 shadow-sm sm:p-6 ${tone}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3"><div className={`grid h-11 w-11 place-items-center rounded-xl ${iconTone}`}><CalendarClock className="h-5 w-5" /></div><div><p className="text-sm font-black text-white">{title}</p><p className="mt-1 text-sm leading-6 text-[#cbd5e1]">{source}</p></div></div>
          {expiry ? <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">{isTrial ? t("trialEnds", { date: dateFormat.format(expiry) }) : `Active until ${dateFormat.format(expiry)}`}</p> : null}
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Building2 className="h-5 w-5" /></div><div><p className="text-sm font-black text-slate-950">{t("companies")}</p><p className="mt-0.5 text-sm text-slate-600">{summary.company_count} / {summary.company_limit} {t("included")}</p></div></div><p className="mt-6 text-xl font-black text-slate-950">{productName}</p><p className="mt-2 text-sm text-slate-600">Access and pricing are managed from the product catalog.</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><UsersRound className="h-5 w-5" /></div><div><p className="text-sm font-black text-slate-950">{t("seats")}</p><p className="mt-0.5 text-sm text-slate-600">{t("used", { used: summary.active_seat_count, limit: summary.seat_limit })}</p></div></div><p className="mt-6 text-3xl font-black text-slate-950">{summary.seat_limit}</p><p className="mt-2 text-sm text-slate-600">{t("included")} · {summary.additional_worker_bundles > 0 ? `${summary.additional_worker_bundles} × ${t("extraWorkers")}` : t("extraWorkers")}</p></article>
      </section>
      <p className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600">{t("checkoutSoon")}</p>
    </main>
  );
}
