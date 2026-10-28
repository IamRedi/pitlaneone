"use client";

import { CarFront } from "lucide-react";
import { useTranslations } from "next-intl";
import { createCompanyVehicle } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

export function CompanyVehicleCreateForm({ companyId, customerId }: { companyId: string; customerId: string }) {
  const t = useTranslations("vehicles");
  const tForms = useTranslations("forms");

  return (
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950"><CarFront className="h-4 w-4 text-brand" aria-hidden="true" />{t("add")}</span>
        <span className="text-xs font-semibold text-slate-500 group-open:hidden">{tForms("open")}</span>
        <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">{tForms("close")}</span>
      </summary>
      <form action={createCompanyVehicle} className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="customerId" value={customerId} />
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("model")}<input name="model" required minLength={2} maxLength={120} placeholder="e.g. Volkswagen Golf 7" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("plate")}<input name="plateNumber" required minLength={3} maxLength={20} autoCapitalize="characters" placeholder="e.g. AB123CD" className="rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("currentMileage")}<input name="currentKm" required type="number" min={0} max={2000000} defaultValue={0} inputMode="numeric" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">VIN <span className="font-normal text-slate-500">{tForms("optional")}</span><input name="vin" maxLength={32} autoCapitalize="characters" className="rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <div className="sm:col-span-2"><SubmitButton label={t("saveVehicle")} pendingLabel={tForms("saving")} /></div>
      </form>
    </details>
  );
}
