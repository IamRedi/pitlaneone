import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, ReceiptText, Wrench } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import { requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function berlinDate() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function TeamMemberProfile({ params, searchParams }: { params: Promise<{ companyId: string; userId: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const { companyId, userId } = await params;
  const { from: rawFrom, to: rawTo } = await searchParams;
  const today = berlinDate();
  const from = validDate(rawFrom) ?? today; const to = validDate(rawTo) ?? today;
  const context = await requireCompanyContext(companyId);
  const { supabase, user } = await requireSaasUser();
  if (!(context.role === "owner" || context.role === "manager") && user.id !== userId) redirect(`/app/${companyId}` as Route);
  const t = await getTranslations("team");
  const locale = appLocaleFormats[toAppLocale(await getLocale())];
  let invoiceQuery = supabase.from("invoices").select("id, invoice_number, currency, issued_at, status, total_amount, amount_paid").eq("company_id", context.company.id).eq("created_by", userId);
  if (from) invoiceQuery = invoiceQuery.gte("issued_at", from);
  if (to) invoiceQuery = invoiceQuery.lte("issued_at", to);
  const [{ data: member }, { data: invoices, error: invoicesError }, servicesResult] = await Promise.all([
    supabase.from("company_users").select("user_id, member_email, role, is_active").eq("company_id", context.company.id).eq("user_id", userId).maybeSingle(),
    invoiceQuery.order("issued_at", { ascending: false }).limit(100),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("company_id", context.company.id).eq("created_by", userId).gte("date", from ?? "0001-01-01").lte("date", to ?? "9999-12-31")
  ]);
  if (!member || invoicesError || servicesResult.error) throw new Error("Could not load team member profile.");
  const money = (value: number, currency: string) => value.toLocaleString(locale, { style: "currency", currency });
  const totals = (invoices ?? []).reduce<Record<string, { invoiced: number; paid: number }>>((all, invoice) => { const item = all[invoice.currency] ?? { invoiced: 0, paid: 0 }; item.invoiced += Number(invoice.total_amount); item.paid += Number(invoice.amount_paid); all[invoice.currency] = item; return all; }, {});
  const totalList = Object.entries(totals);
  const values = (kind: "invoiced" | "paid" | "open", className: string) => <div className={`mt-2 grid gap-1 text-2xl font-black ${className}`}>{totalList.length ? totalList.map(([currency, item]) => <p key={currency}>{money(kind === "invoiced" ? item.invoiced : kind === "paid" ? item.paid : Math.max(0, item.invoiced - item.paid), currency)}</p>) : <p>{money(0, "EUR")}</p>}</div>;
  const clearHref = `/app/${companyId}/team/${userId}` as Route;
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6"><Link href={`/app/${companyId}/team` as Route} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ChevronLeft className="h-4 w-4" /> {t("back")}</Link><header className="mt-5 rounded-xl border border-slate-200 bg-slate-950 px-6 py-7 text-white"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">{t("profile")}</p><h1 className="mt-2 text-3xl font-black">{member.member_email ?? t("existingAccount")}</h1><p className="mt-2 text-sm text-slate-300">{t("role")}: {member.role} · {member.is_active ? t("activeAccess") : t("disabledAccess")}</p></header><section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">{t("periodClose")}</p><h2 className="mt-1 text-xl font-black text-slate-950">{t("periodTitle")}</h2><form className="mt-4 flex flex-wrap items-end gap-2.5"><label className="grid gap-1 text-xs font-bold text-slate-600">{t("from")}<input type="date" name="from" defaultValue={from} className="w-[10.75rem] !px-3 !py-2 text-sm" /></label><label className="grid gap-1 text-xs font-bold text-slate-600">{t("to")}<input type="date" name="to" defaultValue={to} className="w-[10.75rem] !px-3 !py-2 text-sm" /></label><button className="rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-black text-white">{t("applyPeriod")}</button><Link href={clearHref} className="rounded-lg border border-slate-300 px-3.5 py-2 text-center text-sm font-bold text-slate-700">{t("clearPeriod")}</Link></form></div><div className="grid divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0"><article className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("servicesCompleted")}</p><p className="mt-2 text-2xl font-black text-slate-950">{servicesResult.count ?? 0}</p></article><article className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("invoicesIssued")}</p>{values("invoiced", "text-slate-950")}</article><article className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("collected")}</p>{values("paid", "text-emerald-700")}</article><article className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("openBalance")}</p>{values("open", "text-amber-700")}</article></div></section><section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><ReceiptText className="h-5 w-5 text-brand" /><h2 className="font-black text-slate-950">{t("memberInvoices")}</h2></div>{invoices?.length ? <ul className="divide-y divide-slate-100">{invoices.map((invoice) => <li key={invoice.id}><Link href={`/app/${companyId}/invoices/${invoice.id}` as Route} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"><div><p className="font-bold text-slate-950">{invoice.invoice_number ?? t("invoicesIssued")}</p><p className="mt-1 text-sm text-slate-600">{invoice.issued_at}</p></div><div className="text-right"><p className="font-black text-slate-950">{money(Number(invoice.total_amount), invoice.currency)}</p><p className={`mt-1 text-xs font-bold ${invoice.status === "paid" ? "text-emerald-700" : "text-amber-700"}`}>{invoice.status}</p></div></Link></li>)}</ul> : <div className="px-5 py-12 text-center text-sm font-semibold text-slate-600"><Wrench className="mx-auto mb-3 h-5 w-5 text-slate-400" />{t("noMemberInvoices")}</div>}</section></main>;
}
