import Link from "next/link";
import type { Route } from "next";
import { CircleDot, ReceiptText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import {
  canManageCompanyFinance,
  requireCompanyContext,
  requireSaasUser,
} from "@/lib/company";

export const dynamic = "force-dynamic";

function dateFilter(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
function berlinDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function CompanyInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { companyId } = await params;
  const { from: rawFrom, to: rawTo } = await searchParams;
  const today = berlinDate();
  const from = dateFilter(rawFrom) ?? today;
  const to = dateFilter(rawTo) ?? today;
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const appLocale = toAppLocale(await getLocale());
  const locale = appLocaleFormats[appLocale];
  const t = await getTranslations("invoices");
  const tStatus = await getTranslations("invoiceActions");
  const tFilter = await getTranslations("invoiceFilters");
  const tWork = await getTranslations("openWork");
  const tArchive = await getTranslations("invoiceArchive");
  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_kind, lifecycle_status, currency, issued_at, created_at, status, total_amount, amount_paid, clients!invoices_client_company_id_fkey(first_name, last_name), services!invoices_service_company_id_fkey(vehicles!services_vehicle_company_id_fkey(model, plate_number))",
    )
    .eq("company_id", context.company.id);
  if (from) query = query.gte("issued_at", from);
  if (to) query = query.lte("issued_at", to);
  const { data: invoices, error } = await query
    .order("issued_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error("Faturat nuk u ngarkuan.");
  const { data: openWorks, error: openWorksError } = await supabase
    .from("services")
    .select(
      "id, date, km, notes, created_at, service_items!service_items_service_company_id_fkey(id, name), vehicles!services_vehicle_company_id_fkey(id, model, plate_number, client_id, clients!vehicles_client_company_id_fkey(id, first_name, last_name))",
    )
    .eq("company_id", context.company.id)
    .eq("work_status", "open")
    .order("created_at", { ascending: false });
  if (openWorksError) throw new Error("Punet e hapura nuk u ngarkuan.");
  const status = (value: string, lifecycle: string, kind: string) =>
    lifecycle === "cancelled"
      ? tArchive("cancelled")
      : kind === "storno"
        ? tArchive("storno")
        : value === "paid"
          ? tStatus("paid")
          : value === "partial"
            ? tStatus("partial")
            : tStatus("issued");
  const statusClass = (value: string, lifecycle: string, kind: string) =>
    lifecycle === "cancelled"
      ? "text-rose-700"
      : kind === "storno"
        ? "text-slate-700"
        : value === "paid"
          ? "text-emerald-700"
          : "text-amber-700";
  const canManageFinance = canManageCompanyFinance(context.role);
  const money = (value: number, currency: string) =>
    value.toLocaleString(locale, { style: "currency", currency });
  const totalsByCurrency = (invoices ?? []).reduce<
    Record<string, { invoiced: number; paid: number }>
  >((groups, invoice) => {
    const currency = invoice.currency || "EUR";
    const group = groups[currency] ?? { invoiced: 0, paid: 0 };
    group.invoiced += Number(invoice.total_amount);
    group.paid += Number(invoice.amount_paid);
    groups[currency] = group;
    return groups;
  }, {});
  const currencyTotals = Object.entries(totalsByCurrency);
  const clearHref = `/app/${companyId}/invoices` as Route;
  const workQueueCopy = {
    sq: { eyebrow: "Për faturim", title: "Punë të hapura për faturim" },
    en: { eyebrow: "Ready to invoice", title: "Open work for invoicing" },
    de: { eyebrow: "Zur Abrechnung", title: "Offene Aufträge zur Abrechnung" },
    it: { eyebrow: "Da fatturare", title: "Lavori aperti da fatturare" },
    pl: {
      eyebrow: "Do fakturowania",
      title: "Otwarte zlecenia do fakturowania",
    },
    tr: {
      eyebrow: "Faturalandırılacak",
      title: "Faturalandırma için açık işler",
    },
  }[appLocale];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t("description")}</p>
        </div>
        <Link
          href={`/app/${companyId}/invoices/new` as Route}
          className="inline-flex w-fit rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"
        >
          {tWork("newWork")}
        </Link>
      </header>
      <section className="mt-6 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-amber-700">
              {workQueueCopy.eyebrow}
            </p>
            <h2 className="mt-1 inline-flex items-center gap-2 text-lg font-black text-slate-950">
              <CircleDot className="h-5 w-5 text-amber-600" />
              {workQueueCopy.title}
            </h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            {openWorks?.length ?? 0}
          </span>
        </div>
        {openWorks?.length ? (
          <ul className="divide-y divide-amber-100">
            {openWorks.map((work) => {
              const vehicle = Array.isArray(work.vehicles)
                ? work.vehicles[0]
                : work.vehicles;
              const customer =
                vehicle &&
                (Array.isArray(vehicle.clients)
                  ? vehicle.clients[0]
                  : vehicle.clients);
              return (
                <li key={work.id}>
                  <Link
                    href={
                      `/app/${companyId}/customers/${vehicle?.client_id}/vehicles/${vehicle?.id}#work-${work.id}` as Route
                    }
                    className="grid gap-3 px-5 py-4 transition hover:bg-amber-50/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-slate-950">
                        {customer
                          ? `${customer.first_name} ${customer.last_name}`
                          : tWork("customerFallback")}
                        {vehicle
                          ? ` · ${vehicle.model} (${vehicle.plate_number})`
                          : ""}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {work.service_items
                          .map((item) => item.name)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-slate-500">
                        {work.date} · {work.km.toLocaleString(locale)} km
                      </p>
                      <p className="mt-1 text-sm font-black text-brand">
                        {tWork("fillAndInvoice")}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm font-semibold text-slate-600">
            {tWork("openEmpty")}
          </p>
        )}
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            {tFilter("title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {tFilter("description")}
          </p>
          <form className="mt-4 flex flex-wrap items-end gap-2.5">
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              {tFilter("from")}
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="w-[10.75rem] !px-3 !py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              {tFilter("to")}
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="w-[10.75rem] !px-3 !py-2 text-sm"
              />
            </label>
            <button className="rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-black text-white transition hover:bg-slate-800">
              {tFilter("apply")}
            </button>
            <Link
              href={clearHref}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-center text-sm font-bold text-slate-700"
            >
              {tFilter("clear")}
            </Link>
          </form>
          {canManageFinance ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/api/companies/${companyId}/invoices/export?from=${from}&to=${to}&format=csv`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"
              >
                {tArchive("exportCsv")}
              </a>
              <a
                href={`/api/companies/${companyId}/invoices/export?from=${from}&to=${to}&format=zip`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"
              >
                {tArchive("exportZip")}
              </a>
            </div>
          ) : null}
        </div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {(["invoiced", "paid", "open"] as const).map((kind) => (
            <div key={kind} className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {tFilter(kind)}
              </p>
              <div
                className={`mt-2 grid gap-1 text-xl font-black ${kind === "paid" ? "text-emerald-700" : kind === "open" ? "text-brand" : "text-slate-950"}`}
              >
                {currencyTotals.length ? (
                  currencyTotals.map(([currency, totals]) => (
                    <p key={currency}>
                      {money(
                        kind === "invoiced"
                          ? totals.invoiced
                          : kind === "paid"
                            ? totals.paid
                            : Math.max(0, totals.invoiced - totals.paid),
                        currency,
                      )}
                    </p>
                  ))
                ) : (
                  <p>{money(0, "EUR")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-sm font-bold text-slate-600">
          {invoices?.length
            ? tFilter("results", { count: invoices.length })
            : tFilter("allTime")}
        </p>
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {invoices?.length ? (
          <ul className="divide-y divide-slate-100">
            {invoices.map((invoice) => {
              const client = Array.isArray(invoice.clients)
                ? invoice.clients[0]
                : invoice.clients;
              const service = Array.isArray(invoice.services)
                ? invoice.services[0]
                : invoice.services;
              const vehicle =
                service &&
                (Array.isArray(service.vehicles)
                  ? service.vehicles[0]
                  : service.vehicles);
              const balance =
                invoice.lifecycle_status === "active" &&
                invoice.invoice_kind !== "storno"
                  ? Math.max(
                      0,
                      Number(invoice.total_amount) -
                        Number(invoice.amount_paid),
                    )
                  : 0;
              return (
                <li key={invoice.id}>
                  <Link
                    href={`/app/${companyId}/invoices/${invoice.id}` as Route}
                    className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-slate-950">
                        {invoice.invoice_number ?? t("unnumbered")}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {client
                          ? `${client.first_name} ${client.last_name}`
                          : t("customer")}
                        {vehicle
                          ? ` · ${vehicle.model} (${vehicle.plate_number})`
                          : ""}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      <p>{invoice.issued_at}</p>
                      <p
                        className={`mt-1 font-bold ${statusClass(invoice.status, invoice.lifecycle_status, invoice.invoice_kind)}`}
                      >
                        {status(
                          invoice.status,
                          invoice.lifecycle_status,
                          invoice.invoice_kind,
                        )}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-black text-slate-950">
                        {money(Number(invoice.total_amount), invoice.currency)}
                      </p>
                      {invoice.lifecycle_status === "active" &&
                      invoice.invoice_kind !== "storno" ? (
                        <p
                          className={`mt-1 text-sm font-bold ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}
                        >
                          {balance > 0
                            ? t("remaining", {
                                amount: money(balance, invoice.currency),
                              })
                            : t("paid")}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-16 text-center">
            <ReceiptText className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 font-bold text-slate-800">{t("empty")}</p>
            <p className="mt-1 text-sm text-slate-600">{t("emptyHint")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
