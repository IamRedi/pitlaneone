"use client";

import { CarFront, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { createCompanyCustomer } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

export function CompanyCustomerCreateForm({ companyId, initialOpen = false, returnTo }: { companyId: string; initialOpen?: boolean; returnTo?: string }) {
  const t = useTranslations("customers");
  const tForms = useTranslations("forms");
  const tVehicles = useTranslations("vehicles");

  return (
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm" open={initialOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
          <UserPlus className="h-4 w-4 text-brand" aria-hidden="true" />
          {t("register")}
        </span>
        <span className="text-xs font-semibold text-slate-500 group-open:hidden">{tForms("open")}</span>
        <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">{tForms("close")}</span>
      </summary>
      <form data-testid="customer-create-form" action={createCompanyCustomer} className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={companyId} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          {t("firstName")}
          <input name="firstName" required minLength={2} maxLength={80} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          {t("lastName")}
          <input name="lastName" required minLength={2} maxLength={80} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          {t("phone")}
          <input name="phone" required inputMode="tel" minLength={5} maxLength={40} placeholder="e.g. +355 69 000 0000" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>
        <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700">
          <input name="isVip" type="checkbox" className="h-4 w-4 accent-brand" />
          {t("vip")}
        </label>

        <details className="group rounded-lg border border-slate-200 sm:col-span-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800">
            <span>{t("billingAddressAction")}</span>
            <span className="text-xs font-semibold text-slate-500">{tForms("optional")}</span>
          </summary>
          <div className="grid gap-4 border-t border-slate-100 px-4 py-4 sm:grid-cols-2">
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{t("billingAddressHint")}</p>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">{t("streetAddress")}<input name="billingAddress" maxLength={180} placeholder="e.g. Musterstraße 12" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("postalCode")}<input name="billingPostalCode" maxLength={24} placeholder="e.g. 10115" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("city")}<input name="billingCity" maxLength={100} placeholder="e.g. Berlin" /></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">{t("country")}<input name="billingCountry" maxLength={100} placeholder="e.g. Deutschland" /></label>
          </div>
        </details>

        <div className="grid gap-4 border-t border-slate-100 pt-4 sm:col-span-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
              <CarFront className="h-4 w-4 text-brand" aria-hidden="true" />
              {t("firstVehicle")}
              <span className="font-semibold text-slate-500">{tForms("optional")}</span>
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">{t("firstVehicleHint")}</p>
          </div>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">{tVehicles("model")}<input name="vehicleModel" minLength={2} maxLength={120} placeholder="e.g. Volkswagen Golf 7" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">{tVehicles("plate")}<input name="vehiclePlateNumber" minLength={3} maxLength={20} placeholder="e.g. AB123CD" className="rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">VIN <span className="font-medium text-slate-500">({tForms("optional")})</span><input name="vehicleVin" maxLength={32} className="rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">{tVehicles("mileage")} <span className="font-medium text-slate-500">({tForms("optional")})</span><input name="vehicleCurrentKm" type="number" min="0" max="2000000" inputMode="numeric" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        </div>
        <div className="sm:col-span-2"><SubmitButton label={t("saveCustomer")} pendingLabel={tForms("saving")} /></div>
      </form>
    </details>
  );
}
