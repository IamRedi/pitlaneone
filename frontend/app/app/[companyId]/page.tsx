import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CalendarClock, Camera, CarFront, Check, CircleDollarSign, CircleDot, ClipboardList, ExternalLink, FilePlus2, Package, Palette, Rocket, ShoppingBasket, UsersRound, Wrench } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import { canManageCompany, hasCompanyCapability, requireCompanyContext, requireSaasUser } from "@/lib/company";
import { businessSiteDashboardCopy } from "@/lib/business-site-dashboard-copy";

export const dynamic = "force-dynamic";

function formatMoney(value: number, currency: string, locale: string) {
  return value.toLocaleString(locale, { style: "currency", currency });
}

function berlinDate() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

type DailySummaryRow = {
  creator_id: string | null;
  currency: string | null;
  services_created: number | string;
  invoices_created: number | string;
  payments_recorded: number | string;
  invoiced_total: number | string;
  paid_total: number | string;
  open_total: number | string;
};

export default async function CompanyWorkspacePage({
  params
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { company, role, capabilities } = await requireCompanyContext((await params).companyId);
  const appLocale = toAppLocale(await getLocale());
  const locale = appLocaleFormats[appLocale];
  const t = await getTranslations("dashboard");
  const tInventory = await getTranslations("inventory");
  const tInvoiceWizard = await getTranslations("invoiceWizard");
  const tAppointments = await getTranslations("appointments");
  const tWork = await getTranslations("openWork");
  const tDaily = await getTranslations("dailyBalance");
  const { supabase } = await requireSaasUser();
  const canManage = canManageCompany(role);

  if (company.product_surface === "business_site") {
    const hasAppointments = hasCompanyCapability({ company, role, capabilities }, "appointments");
    const copy = businessSiteDashboardCopy[appLocale];
    const [
      { data: profile, error: profileError },
      { data: theme, error: themeError },
      { count: catalogCount, error: catalogError },
      { count: appointmentCount, error: appointmentError },
      { count: openHoursCount, error: hoursError },
    ] = await Promise.all([
      supabase.from("company_profiles").select("is_public, description, phone, email, hero_title").eq("company_id", company.id).maybeSingle(),
      supabase.from("company_theme_settings").select("logo_url, hero_image_url").eq("company_id", company.id).maybeSingle(),
      supabase.from("company_catalog_items").select("id", { count: "exact", head: true }).eq("company_id", company.id),
      hasAppointments
        ? supabase.from("company_appointment_requests").select("id", { count: "exact", head: true }).eq("company_id", company.id).in("status", ["requested", "awaiting_customer"])
        : Promise.resolve({ count: 0, error: null }),
      hasAppointments
        ? supabase.from("company_appointment_business_hours").select("weekday", { count: "exact", head: true }).eq("company_id", company.id).eq("is_open", true)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    if (profileError || themeError || catalogError || appointmentError || hoursError || !profile || !theme) {
      console.error("BUSINESS_SITE_DASHBOARD_QUERY_ERROR", { profile: profileError?.code, theme: themeError?.code, catalog: catalogError?.code, appointments: appointmentError?.code, hours: hoursError?.code });
      throw new Error("Paneli i kompanise nuk u ngarkua.");
    }

    const websiteHref = `/app/${company.id}/settings` as Route;
    const appointmentHref = `/app/${company.id}/appointments#appointment-hours` as Route;
    const publicHref = `/b/${company.slug}` as Route;
    const identityReady = Boolean(profile.hero_title && profile.description && (profile.phone || profile.email));
    const photosReady = Boolean(theme.hero_image_url || theme.logo_url);
    const productsReady = Boolean(catalogCount);
    const checklist = [
      { title: copy.identityTitle, body: copy.identityBody, complete: identityReady, href: `${websiteHref}#website-editor-basics` as Route, icon: Palette },
      { title: copy.photosTitle, body: copy.photosBody, complete: photosReady, href: `${websiteHref}#website-editor-photos` as Route, icon: Camera },
      { title: copy.catalogTitle, body: copy.catalogBody, complete: productsReady, href: `${websiteHref}#website-catalog` as Route, icon: Package },
      ...(hasAppointments ? [{ title: copy.bookingTitle, body: copy.bookingBody, complete: Boolean(openHoursCount), href: appointmentHref, icon: CalendarClock }] : []),
      { title: copy.publishTitle, body: copy.publishBody, complete: profile.is_public, href: `${websiteHref}#website-publication` as Route, icon: Rocket },
    ];
    const completedSteps = checklist.filter((item) => item.complete).length;
    const progress = Math.round((completedSteps / checklist.length) * 100);

    return (
      <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 sm:px-6">
        <header className="workspace-dashboard-intro overflow-hidden rounded-2xl border border-white/10 px-5 py-6 text-white shadow-panel sm:px-7 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-soft">{copy.eyebrow}</p>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${profile.is_public ? "bg-emerald-300/15 text-emerald-200" : "bg-amber-300/15 text-amber-100"}`}><span className={`h-2 w-2 rounded-full ${profile.is_public ? "bg-emerald-300" : "bg-amber-300"}`} />{profile.is_public ? copy.live : copy.draft}</span>
          </div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{company.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{copy.intro}</p></div>
            <div className="flex flex-wrap gap-2"><Link href={websiteHref} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"><Palette className="h-4 w-4" aria-hidden="true" />{copy.editWebsite}</Link>{profile.is_public ? <Link href={publicHref} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20">{copy.openWebsite}<ExternalLink className="h-4 w-4" /></Link> : null}</div>
          </div>
          <div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="flex items-center justify-between gap-4 text-xs font-bold"><span>{copy.progress}</span><span>{progress}% {copy.ready}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-soft transition-all" style={{ width: `${progress}%` }} /></div></div><p className="text-xs font-semibold text-slate-300">{checklist.length - completedSteps} {copy.remaining}</p></div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2" aria-label={t("summary")}>
          {hasAppointments ? <Link href={appointmentHref} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><CalendarClock className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" /></div><h2 className="mt-4 text-3xl font-black text-slate-950">{appointmentCount ?? 0}</h2><p className="mt-1 font-black text-slate-900">{copy.requestsTitle}</p><p className="mt-2 text-sm leading-6 text-slate-600">{copy.requestsBody}</p></Link> : null}
          <Link href={`${websiteHref}#website-catalog` as Route} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Package className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" /></div><h2 className="mt-4 text-3xl font-black text-slate-950">{catalogCount ?? 0}</h2><p className="mt-1 font-black text-slate-900">{copy.productsTitle}</p><p className="mt-2 text-sm leading-6 text-slate-600">{copy.productsBody}</p></Link>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-5 sm:px-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">{copy.progress}</p><h2 className="mt-1 text-xl font-black text-slate-950">{copy.setupTitle}</h2><p className="mt-2 text-sm text-slate-600">{copy.setupBody}</p></div><div className="divide-y divide-slate-100">{checklist.map((item) => { const Icon = item.icon; return <Link key={item.title} href={item.href} className="group grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6"><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span><span><span className="block font-black text-slate-950">{item.title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{item.body}</span></span><span className={`inline-flex w-fit items-center gap-2 text-xs font-black ${item.complete ? "text-emerald-700" : "text-brand"}`}>{item.complete ? copy.done : copy.todo}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>; })}</div></section>
      </main>
    );
  }

  const currentDay = berlinDate();
  const [customersResult, vehiclesResult, servicesResult, invoicesResult, recentServicesResult, invoiceSettingsResult, dailyServicesResult, dailyInvoicesResult, membersResult, pendingAppointmentsResult, openWorksResult] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("invoices").select("currency, total_amount, amount_paid").eq("company_id", company.id),
    supabase
      .from("services")
      .select("id, vehicle_id, type, date, km, total_amount")
      .eq("company_id", company.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase.from("company_invoice_settings").select("default_currency").eq("company_id", company.id).maybeSingle(),
    supabase.from("services").select("created_by").eq("company_id", company.id).eq("date", currentDay),
    supabase.from("invoices").select("created_by, currency, total_amount, amount_paid").eq("company_id", company.id).eq("issued_at", currentDay),
    supabase.from("company_users").select("user_id, member_email, role").eq("company_id", company.id).eq("is_active", true),
    supabase.from("company_appointment_requests").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "requested"),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("work_status", "open")
  ]);

  if (
    customersResult.error ||
    vehiclesResult.error ||
    servicesResult.error ||
    invoicesResult.error ||
    recentServicesResult.error ||
    invoiceSettingsResult.error ||
    dailyServicesResult.error ||
    dailyInvoicesResult.error ||
    membersResult.error ||
    pendingAppointmentsResult.error ||
    openWorksResult.error
  ) {
    console.error("COMPANY_DASHBOARD_QUERY_ERROR", {
      customers: customersResult.error?.code,
      vehicles: vehiclesResult.error?.code,
      services: servicesResult.error?.code,
      invoices: invoicesResult.error?.code,
      recentServices: recentServicesResult.error?.code,
      pendingAppointments: pendingAppointmentsResult.error?.code,
      openWorks: openWorksResult.error?.code
    });
    throw new Error("Paneli i kompanise nuk u ngarkua.");
  }

  const recentVehicleIds = [...new Set((recentServicesResult.data ?? []).map((service) => service.vehicle_id))];
  const recentVehiclesResult = recentVehicleIds.length
    ? await supabase
        .from("vehicles")
        .select("id, model, plate_number")
        .eq("company_id", company.id)
        .in("id", recentVehicleIds)
    : { data: [], error: null };

  if (recentVehiclesResult.error) {
    console.error("COMPANY_DASHBOARD_RECENT_VEHICLES_ERROR", { code: recentVehiclesResult.error.code });
    throw new Error("Paneli i kompanise nuk u ngarkua.");
  }

  const recentVehicles = new Map((recentVehiclesResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]));
  const currency = invoiceSettingsResult.data?.default_currency ?? "EUR";
  const memberById = new Map((membersResult.data ?? []).map((member) => [member.user_id, member]));
  const dailyByCreator = new Map<string, DailySummaryRow>();
  for (const service of dailyServicesResult.data ?? []) {
    const key = `${service.created_by ?? "legacy"}:activity`;
    const current = dailyByCreator.get(key) ?? { creator_id: service.created_by, currency: null, services_created: 0, invoices_created: 0, payments_recorded: 0, invoiced_total: 0, paid_total: 0, open_total: 0 };
    current.services_created = Number(current.services_created) + 1;
    dailyByCreator.set(key, current);
  }
  for (const invoice of dailyInvoicesResult.data ?? []) {
    const key = `${invoice.created_by ?? "legacy"}:${invoice.currency ?? currency}`;
    const current = dailyByCreator.get(key) ?? { creator_id: invoice.created_by, currency: invoice.currency, services_created: 0, invoices_created: 0, payments_recorded: 0, invoiced_total: 0, paid_total: 0, open_total: 0 };
    current.invoices_created = Number(current.invoices_created) + 1;
    current.invoiced_total = Number(current.invoiced_total) + Number(invoice.total_amount);
    current.paid_total = Number(current.paid_total) + Number(invoice.amount_paid);
    current.open_total = Number(current.open_total) + Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid));
    dailyByCreator.set(key, current);
  }
  const dailyRows = [...dailyByCreator.values()];
  const groupMoney = (rows: { currency: string | null; total_amount?: number | string; amount_paid?: number | string; invoiced_total?: number | string; paid_total?: number | string; open_total?: number | string }[], kind: "invoiced" | "paid" | "open") => Object.entries(rows.reduce<Record<string, number>>((groups, row) => {
    const key = row.currency ?? currency;
    const value = kind === "invoiced" ? Number(row.total_amount ?? row.invoiced_total ?? 0) : kind === "paid" ? Number(row.amount_paid ?? row.paid_total ?? 0) : Math.max(0, Number(row.total_amount ?? row.open_total ?? 0) - (row.amount_paid === undefined ? 0 : Number(row.amount_paid)));
    groups[key] = (groups[key] ?? 0) + value;
    return groups;
  }, {}));
  const dailyInvoiced = groupMoney(dailyRows, "invoiced");
  const dailyCollected = groupMoney(dailyRows, "paid");
  const dailyOpen = groupMoney(dailyRows, "open");
  const invoiceTotal = groupMoney(invoicesResult.data ?? [], "invoiced");
  const outstandingTotal = groupMoney(invoicesResult.data ?? [], "open");
  const moneyGroups = (groups: [string, number][], className = "") => groups.length ? groups.map(([code, value]) => <span key={code} className={className}>{formatMoney(value, code, locale)}</span>) : <span className={className}>{formatMoney(0, currency, locale)}</span>;
  const customerHref = `/app/${company.id}/customers` as Route;
  const newInvoiceHref = `/app/${company.id}/invoices/new` as Route;
  const counterSaleHref = `/app/${company.id}/inventory/sale` as Route;
  const pendingAppointmentsHref = `/app/${company.id}/appointments?status=requested` as Route;
  const openWorksHref = `/app/${company.id}/invoices` as Route;

  const metrics = [
    { label: t("customers"), value: customersResult.count ?? 0, icon: UsersRound, href: customerHref, accent: "text-brand" },
    { label: t("vehicles"), value: vehiclesResult.count ?? 0, icon: CarFront, href: customerHref, accent: "text-brand" },
    { label: t("services"), value: servicesResult.count ?? 0, icon: Wrench, href: customerHref, accent: "text-brand" },
    { label: tAppointments("requested"), value: pendingAppointmentsResult.count ?? 0, icon: CalendarClock, href: pendingAppointmentsHref, accent: "text-amber-500" },
    { label: tWork("openTitle"), value: openWorksResult.count ?? 0, icon: CircleDot, href: openWorksHref, accent: "text-amber-500" }
  ];

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 sm:px-6">
      <header className="workspace-dashboard-intro border-b border-slate-200 px-2 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-soft">{t("eyebrow")}</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{company.name}</h1>
            <p className="mt-1 text-sm text-slate-300">{t("description")}</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href={newInvoiceHref} className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110">
            {tInvoiceWizard("pageTitle")} <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          </Link><Link href={counterSaleHref} className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20"><ShoppingBasket className="h-4 w-4" aria-hidden="true" />{tInventory("newSale")}</Link></div>
        </div>
      </header>

      <section className="grid gap-x-4 gap-y-1 border-y border-slate-200 py-2 sm:grid-cols-2 lg:grid-cols-5" aria-label={t("summary")}>
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link key={metric.label} href={metric.href} className="group inline-flex min-w-0 items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <Icon className={`h-[18px] w-[18px] shrink-0 ${metric.accent}`} aria-hidden="true" />
                <span className="truncate">{metric.label}</span>
                <span className="ml-auto text-sm font-black text-slate-950">{metric.value}</span>
            </Link>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">{tDaily("eyebrow")}</p><h2 className="mt-1 inline-flex items-center gap-2 text-xl font-black text-slate-950"><CircleDollarSign className="h-5 w-5 text-brand" /> {tDaily("title")}</h2><p className="mt-1 text-sm text-slate-600">{tDaily("description")}</p></div><span className="text-sm font-bold text-slate-500">{currentDay}</span></div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tDaily("invoiced")}</p><div className="mt-2 grid gap-1 text-2xl font-black text-slate-950">{moneyGroups(dailyInvoiced)}</div></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tDaily("collected")}</p><div className="mt-2 grid gap-1 text-2xl font-black text-emerald-700">{moneyGroups(dailyCollected)}</div></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tDaily("open")}</p><div className="mt-2 grid gap-1 text-2xl font-black text-brand">{moneyGroups(dailyOpen)}</div></div></div>
        <div className="border-t border-slate-100"><div className="px-5 py-4"><h3 className="font-black text-slate-950">{tDaily("teamActivity")}</h3></div>{dailyRows.length ? <div className="divide-y divide-slate-100">{dailyRows.map((row, index) => { const member = row.creator_id ? memberById.get(row.creator_id) : null; return <div key={`${row.creator_id ?? "legacy"}-${row.currency ?? "activity"}-${index}`} className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-bold text-slate-950">{member?.member_email ?? tDaily("legacy")}</p><p className="mt-1 text-xs text-slate-500">{member?.role ?? "—"}</p></div><p className="text-slate-600">{Number(row.services_created)} {tDaily("services")}</p><p className="text-slate-600">{Number(row.invoices_created)} {tDaily("invoices")}</p><p className="font-black text-slate-950">{formatMoney(Number(row.paid_total), row.currency ?? currency, locale)}</p></div>; })}</div> : <p className="px-5 py-8 text-center text-sm text-slate-600">{tDaily("noActivity")}</p>}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b metal-divider px-5 py-4">
            <div>
              <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-950"><ClipboardList className="h-5 w-5 text-brand" aria-hidden="true" /> {t("recentServices")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("recentServicesDescription")}</p>
            </div>
            <Link href={customerHref} className="text-sm font-bold text-brand underline underline-offset-4">{t("viewCustomers")}</Link>
          </div>
          {recentServicesResult.data && recentServicesResult.data.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recentServicesResult.data.map((service) => {
                const vehicle = recentVehicles.get(service.vehicle_id);

                return (
                  <li key={service.id} className="grid gap-2 px-5 py-4 transition hover:bg-slate-50/70 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{vehicle?.model ?? t("vehicle")}</p>
                      <p className="mt-1 text-sm text-slate-600">{vehicle?.plate_number ?? "Pa targe"} · {service.type === "periodic" ? "Sherbim periodik" : "Sherbim normal"}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{service.km.toLocaleString("sq-AL")} km · {service.date}</span>
                    <span className="text-sm font-black text-slate-950">{formatMoney(Number(service.total_amount), currency, locale)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <Wrench className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-slate-700">{t("noServices")}</p>
              <Link href={customerHref} className="mt-2 inline-flex text-sm font-bold text-brand underline underline-offset-4">{t("addFirstCustomer")}</Link>
            </div>
          )}
        </article>

        <aside className="workspace-financial-summary rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-panel">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">{t("financialSummary")}</p>
          <div className="mt-3 grid gap-1 text-3xl font-black">{moneyGroups(invoiceTotal)}</div>
          <p className="mt-1 text-sm text-slate-300">{t("invoicesTotal")}</p>
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-sm font-bold text-slate-200">{t("outstanding")}</p>
            <div className="mt-1 grid gap-1 text-xl font-black text-brand-soft">{moneyGroups(outstandingTotal)}</div>
          </div>
          {canManage ? <Link href={`/app/${company.id}/settings` as Route} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand underline underline-offset-4"><Palette className="h-4 w-4" aria-hidden="true" /> {t("companyIdentity")}</Link> : null}
        </aside>
      </section>
    </main>
  );
}
