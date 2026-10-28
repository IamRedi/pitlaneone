import Link from "next/link";
import type { Route } from "next";
import { CarFront, ChevronLeft, Phone, Star, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CompanyVehicleCreateForm } from "@/components/company-vehicle-create-form";
import { SubmitButton } from "@/components/forms";
import { updateCompanyCustomerBillingDetails } from "@/app/saas-actions";
import {
  canManageCompanyOperations,
  requireCompanyContext,
  requireSaasUser,
} from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function CompanyCustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; customerId: string }>;
  searchParams: Promise<{
    error?: string;
    customerSaved?: string;
    vehicleSaved?: string;
    billingSaved?: string;
  }>;
}) {
  const { companyId, customerId } = await params;
  const query = await searchParams;
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const t = await getTranslations("customerProfile");
  const tCustomers = await getTranslations("customers");
  const tForms = await getTranslations("forms");
  const tList = await getTranslations("customerList");
  const { data: customer, error: customerError } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, is_vip, billing_address, billing_postal_code, billing_city, billing_country, billing_name, billing_email, billing_country_code, vat_id, customer_type, electronic_address, buyer_reference, created_at",
    )
    .eq("id", customerId)
    .eq("company_id", context.company.id)
    .maybeSingle();
  if (customerError) throw new Error("Profili i klientit nuk u ngarkua.");
  if (!customer)
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-950">{t("notFound")}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("notFoundDescription")}
          </p>
          <Link
            href={`/app/${context.company.id}/customers` as Route}
            className="mt-5 inline-flex text-sm font-bold text-brand underline underline-offset-4"
          >
            {t("back")}
          </Link>
        </section>
      </main>
    );
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, model, plate_number, created_at")
    .eq("company_id", context.company.id)
    .eq("client_id", customer.id)
    .order("created_at", { ascending: false });
  if (vehiclesError) throw new Error("Automjetet e klientit nuk u ngarkuan.");
  const hasBillingAddress = Boolean(
    customer.billing_address ||
    customer.billing_postal_code ||
    customer.billing_city ||
    customer.billing_country ||
    customer.billing_name,
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <Link
        href={`/app/${context.company.id}/customers` as Route}
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-brand"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {t("back")}
      </Link>
      <header className="rounded-xl border border-slate-200 bg-slate-950 px-6 py-7 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-soft">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-3xl font-black">
                  {customer.first_name} {customer.last_name}
                </h1>
                {customer.is_vip ? (
                  <Star
                    className="h-5 w-5 shrink-0 fill-brand-soft text-brand-soft"
                    aria-label={tList("vipLabel")}
                  />
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                <Phone className="h-4 w-4" />
                {customer.phone}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200">
            {context.company.name}
          </span>
        </div>
      </header>
      {query.customerSaved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {query.vehicleSaved
            ? t("customerAndVehicleSaved")
            : t("customerSaved")}
        </p>
      ) : null}
      {!query.customerSaved && query.vehicleSaved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {t("vehicleSaved")}
        </p>
      ) : null}
      {query.billingSaved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {t("billingSaved")}
        </p>
      ) : null}
      {query.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {decodeURIComponent(query.error)}
        </p>
      ) : null}
      {canManageCompanyOperations(context.role) ? (
        <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <span className="font-black text-slate-950">
              {hasBillingAddress
                ? t("billingAddress")
                : tCustomers("billingAddressAction")}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {hasBillingAddress ? tForms("open") : tForms("optional")}
            </span>
          </summary>
          <form
            action={updateCompanyCustomerBillingDetails}
            className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2"
          >
            <input type="hidden" name="companyId" value={context.company.id} />
            <input type="hidden" name="customerId" value={customer.id} />
            <div className="sm:col-span-2">
              <h2 className="font-black text-slate-950">
                {t("billingAddress")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{t("billingHint")}</p>
            </div>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">
              {tCustomers("streetAddress")}
              <input
                name="billingAddress"
                maxLength={180}
                defaultValue={customer.billing_address ?? ""}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              {tCustomers("postalCode")}
              <input
                name="billingPostalCode"
                maxLength={24}
                defaultValue={customer.billing_postal_code ?? ""}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              {tCustomers("city")}
              <input
                name="billingCity"
                maxLength={100}
                defaultValue={customer.billing_city ?? ""}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">
              {tCustomers("country")}
              <input
                name="billingCountry"
                maxLength={100}
                defaultValue={customer.billing_country ?? ""}
              />
            </label>
            <div className="sm:col-span-2 mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-black text-slate-950">E-Rechnung (Deutschland)</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Für Privatkunden bleibt „Privatkunde“ ausgewählt. Für Unternehmen oder Behörden werden diese Angaben in die XRechnung übernommen.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">Kundentyp<select name="customerType" defaultValue={customer.customer_type ?? "consumer"}><option value="consumer">Privatkunde</option><option value="business">Unternehmen</option><option value="public">Behörde / öffentlicher Auftraggeber</option></select></label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">Ländercode<input name="billingCountryCode" required pattern="[A-Za-z]{2}" maxLength={2} defaultValue={customer.billing_country_code ?? "DE"} /></label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">Rechtlicher Name / Firmenname<input name="billingName" maxLength={160} defaultValue={customer.billing_name ?? ""} /></label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">Rechnungs-E-Mail<input name="billingEmail" type="email" maxLength={254} defaultValue={customer.billing_email ?? ""} /></label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">USt-IdNr. (optional)<input name="vatId" maxLength={40} defaultValue={customer.vat_id ?? ""} /></label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">Elektronische Adresse (optional)<input name="electronicAddress" maxLength={254} defaultValue={customer.electronic_address ?? ""} placeholder="standardmäßig Rechnungs-E-Mail" /></label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-700">Leitweg-ID / Käuferreferenz<input name="buyerReference" maxLength={100} defaultValue={customer.buyer_reference ?? ""} /></label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton
                label={t("saveAddress")}
                pendingLabel={tForms("saving")}
              />
            </div>
          </form>
        </details>
      ) : null}
      {canManageCompanyOperations(context.role) ? (
        <CompanyVehicleCreateForm
          companyId={context.company.id}
          customerId={customer.id}
        />
      ) : null}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-950">
            <CarFront className="h-5 w-5 text-brand" /> {t("vehicles")}
          </h2>
          <span className="text-sm font-bold text-slate-500">
            {vehicles?.length ?? 0}
          </span>
        </div>
        {vehicles?.length ? (
          <ul className="divide-y divide-slate-100">
            {vehicles.map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <Link
                  href={
                    `/app/${context.company.id}/customers/${customer.id}/vehicles/${vehicle.id}` as Route
                  }
                  className="font-bold text-slate-950 underline-offset-4 hover:text-brand hover:underline"
                >
                  {vehicle.model}
                </Link>
                <Link
                  href={
                    `/app/${context.company.id}/customers/${customer.id}/vehicles/${vehicle.id}` as Route
                  }
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  {vehicle.plate_number}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-600">
            {t("emptyVehicles")}
          </p>
        )}
      </section>
    </main>
  );
}
