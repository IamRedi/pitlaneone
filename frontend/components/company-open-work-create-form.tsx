"use client";

import { ClipboardPlus, Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createCompanyOpenWork } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

type PlannedLine = { id: number; name: string };
const blankLine = (): PlannedLine => ({ id: Date.now() + Math.floor(Math.random() * 1000), name: "" });

export function CompanyOpenWorkCreateForm({
  companyId,
  customerId,
  vehicleId,
  currentKm,
  initialOpen = false
}: {
  companyId: string;
  customerId: string;
  vehicleId: string;
  currentKm: number;
  initialOpen?: boolean;
}) {
  const t = useTranslations("openWork");
  const forms = useTranslations("forms");
  const [lines, setLines] = useState<PlannedLine[]>([blankLine()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

  return <details className="group overflow-hidden rounded-xl border border-brand/25 bg-white shadow-sm" open={initialOpen}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
      <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950"><ClipboardPlus className="h-4 w-4 text-brand" />{t("createTitle")}</span>
      <span className="text-xs font-semibold text-slate-500 group-open:hidden">{forms("open")}</span>
      <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">{forms("close")}</span>
    </summary>
    <form data-testid="open-work-create-form" action={createCompanyOpenWork} className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="plannedItemsJson" value={JSON.stringify(lines.map(({ id: _id, ...line }) => line))} />
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("type")}<select name="type" defaultValue="normal"><option value="normal">{t("normal")}</option><option value="periodic">{t("periodic")}</option></select></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("date")}<input name="date" required type="date" defaultValue={today} /></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:max-w-xs">{t("mileage")}<input name="km" required type="number" min={0} max={2000000} defaultValue={currentKm} /></label>
      <p className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">{t("noPricesHint")}</p>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:col-span-2">
        <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-950">{t("plannedTitle")}</h3><p className="mt-1 text-xs text-slate-500">{t("plannedHint")}</p></div>
        <div className="grid gap-2 p-4">
          {lines.map((line, index) => <div key={line.id} className="flex items-center gap-2">
            <label className="min-w-0 flex-1"><span className="sr-only">{t("plannedLine", { number: index + 1 })}</span><input data-testid={`planned-work-name-${index}`} value={line.name} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, name: event.target.value } : item))} required minLength={2} maxLength={160} placeholder={t("plannedPlaceholder")} /></label>
            <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.id !== line.id))} disabled={lines.length === 1} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300" aria-label={t("removeLine")}><X className="h-4 w-4" /></button>
          </div>)}
          <button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg border border-brand/30 bg-white px-3 py-2 text-sm font-bold text-brand transition hover:border-brand"><Plus className="h-4 w-4" />{t("addLine")}</button>
        </div>
      </section>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">{t("notes")} <span className="font-normal text-slate-500">({forms("optional")})</span><textarea name="notes" rows={3} maxLength={2000} placeholder={t("notesPlaceholder")} /></label>
      <div className="sm:col-span-2"><SubmitButton label={t("openWork")} pendingLabel={t("openingWork")} /></div>
    </form>
  </details>;
}
