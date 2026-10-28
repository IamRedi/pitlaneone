import Link from "next/link";
import type { Route } from "next";
import { CarFront, ChevronLeft, CircleDot, Gauge, Wrench } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { CompanyOpenWorkCreateForm } from "@/components/company-open-work-create-form";
import { CompanyOpenWorkFinalizeForm } from "@/components/company-open-work-finalize-form";
import { CompanyInvoiceActions } from "@/components/company-invoice-actions";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import { canManageCompanyFinance, canManageCompanyOperations, requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

type SearchQuery = {
  error?: string;
  workOpened?: string;
  invoiceSaved?: string;
  paymentSaved?: string;
  fromInvoice?: string;
};

export default async function CompanyVehiclePage({ params, searchParams }: {
  params: Promise<{ companyId: string; customerId: string; vehicleId: string }>;
  searchParams: Promise<SearchQuery>;
}) {
  const { companyId, customerId, vehicleId } = await params;
  const query = await searchParams;
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const locale = appLocaleFormats[toAppLocale(await getLocale())];
  const t = await getTranslations("vehicleDetail");
  const tServices = await getTranslations("services");
  const tWork = await getTranslations("openWork");

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, model, plate_number, vin, current_km, client_id")
    .eq("id", vehicleId)
    .eq("client_id", customerId)
    .eq("company_id", context.company.id)
    .maybeSingle();

  if (vehicleError) throw new Error("Automjeti nuk u ngarkua.");
  if (!vehicle) return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-black text-slate-950">{t("notFound")}</h1><Link href={`/app/${context.company.id}/customers/${customerId}` as Route} className="mt-5 inline-flex text-sm font-bold text-brand underline underline-offset-4">{t("backToCustomer")}</Link></section></main>;

  const [{ data: services, error: servicesError }, { data: invoiceSettings, error: invoiceSettingsError }, { data: customer }] = await Promise.all([
    supabase
      .from("services")
      .select("id, type, date, km, total_amount, notes, work_status, created_at, completed_at, service_items!service_items_service_company_id_fkey(id, name, quantity, unit_price, unit_label, material_cost, labor_cost, fee, labor_discount_percent), invoices!invoices_service_company_id_fkey(id, invoice_number, currency, status, total_amount, amount_paid, due_date)")
      .eq("vehicle_id", vehicle.id)
      .eq("company_id", context.company.id)
      .order("created_at", { ascending: false }),
    supabase.from("company_invoice_settings").select("registration_country").eq("company_id", context.company.id).maybeSingle(),
    supabase.from("clients").select("is_vip").eq("id", customerId).eq("company_id", context.company.id).maybeSingle()
  ]);

  if (servicesError || invoiceSettingsError) throw new Error("Sherbimet nuk u ngarkuan.");

  const openWorks = (services ?? []).filter((service) => service.work_status === "open");
  const completedServices = (services ?? []).filter((service) => service.work_status !== "open");
  const totalSpent = completedServices.reduce((sum, service) => sum + Number(service.total_amount), 0);
  const serviceCurrency = invoiceSettings?.registration_country === "AL" ? "ALL" : "EUR";
  const money = (value: number) => value.toLocaleString(locale, { style: "currency", currency: serviceCurrency });
  const customerHref = `/app/${context.company.id}/customers/${customerId}` as Route;
  const canOperate = canManageCompanyOperations(context.role);
  const canFinance = canManageCompanyFinance(context.role);

  return <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
    <Link href={customerHref} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-brand"><ChevronLeft className="h-4 w-4" />{t("back")}</Link>
    <header className="rounded-xl border border-slate-200 bg-slate-950 px-6 py-7 text-white shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-brand-soft"><CarFront className="h-6 w-6" /></span><div><h1 className="text-3xl font-black">{vehicle.model}</h1><p className="mt-1 text-sm text-slate-300">{vehicle.plate_number}{vehicle.vin ? ` · VIN ${vehicle.vin}` : ""}</p></div></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200"><Gauge className="h-4 w-4" />{vehicle.current_km.toLocaleString(locale)} km</span></div></header>

    {query.workOpened ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{tWork("openedSuccess")}</p> : null}
    {query.invoiceSaved ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{t("invoiceSaved")}</p> : null}
    {query.paymentSaved ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{t("paymentSaved")}</p> : null}
    {query.error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{decodeURIComponent(query.error)}</p> : null}

    {canOperate ? <CompanyOpenWorkCreateForm companyId={context.company.id} customerId={customerId} vehicleId={vehicle.id} currentKm={vehicle.current_km} initialOpen={query.fromInvoice === "1"} /> : null}

    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-amber-700">{tWork("openEyebrow")}</p><h2 className="mt-1 inline-flex items-center gap-2 text-lg font-black text-slate-950"><CircleDot className="h-5 w-5 text-amber-600" />{tWork("openTitle")}</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{openWorks.length}</span></div>
      {openWorks.length ? <ul className="divide-y divide-amber-100">{openWorks.map((service) => <li id={`work-${service.id}`} key={service.id} className="scroll-mt-28 px-5 py-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">{tWork("openStatus")}</span><span className="text-xs font-semibold text-slate-500">{service.date} · {service.km.toLocaleString(locale)} km</span></div>{service.notes ? <p className="mt-3 text-sm text-slate-600">{service.notes}</p> : null}<ul className="mt-3 grid gap-1.5 border-l-2 border-amber-300 pl-3 text-sm font-semibold text-slate-800">{service.service_items.map((item) => <li key={item.id}>{item.name}</li>)}</ul></div><p className="shrink-0 text-xs font-bold text-slate-500">{tWork("noPriceYet")}</p></div>
        {canFinance ? <CompanyOpenWorkFinalizeForm companyId={context.company.id} customerId={customerId} vehicleId={vehicle.id} serviceId={service.id} notes={service.notes ?? ""} itemNames={service.service_items.map((item) => item.name)} isVip={Boolean(customer?.is_vip)} currency={serviceCurrency} /> : <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{tWork("financeOnlyHint")}</p>}
      </li>)}</ul> : <div className="px-6 py-10 text-center"><CircleDot className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">{tWork("openEmpty")}</p></div>}
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-950"><Wrench className="h-5 w-5 text-brand" />{t("history")}</h2><span className="text-sm font-bold text-slate-600">{t("servicesAndTotal", { count: completedServices.length, total: money(totalSpent) })}</span></div>
      {completedServices.length ? <ul className="divide-y divide-slate-100">{completedServices.map((service) => <li key={service.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-bold text-slate-950">{service.type === "periodic" ? tServices("periodic") : tServices("normal")}</p>{service.notes ? <p className="mt-1 text-sm text-slate-600">{service.notes}</p> : null}{service.service_items.length ? <ul className="mt-3 grid gap-1 border-l-2 border-brand/25 pl-3 text-sm text-slate-600">{service.service_items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2"><span>{item.name}</span><span className="font-semibold text-slate-800">{money(Number(item.material_cost) + Number(item.fee) + Number(item.labor_cost) * (1 - Number(item.labor_discount_percent) / 100))}</span></li>)}</ul> : null}{canFinance ? <CompanyInvoiceActions companyId={context.company.id} customerId={customerId} vehicleId={vehicle.id} serviceId={service.id} invoice={service.invoices[0] ?? null} currency={serviceCurrency} /> : null}</div><div className="text-right"><span className="block text-sm font-semibold text-slate-600">{service.km.toLocaleString(locale)} km — {service.date}</span><span className="mt-1 block text-sm font-black text-slate-950">{money(Number(service.total_amount))}</span></div></li>)}</ul> : <p className="px-5 py-12 text-center text-sm text-slate-600">{t("empty")}</p>}
    </section>
  </main>;
}
