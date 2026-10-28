"use client";

import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createCompanyService } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

type ServiceLine = { id: number; name: string; quantity: string; unit: string; unitPrice: string; laborCost: string };

const blankLine = (): ServiceLine => ({ id: Date.now() + Math.floor(Math.random() * 1000), name: "", quantity: "1", unit: "pcs", unitPrice: "", laborCost: "" });

export function CompanyServiceCreateForm({ companyId, customerId, vehicleId, currentKm, isVip, canIssueInvoice, invoiceMode = false }: { companyId: string; customerId: string; vehicleId: string; currentKm: number; isVip: boolean; canIssueInvoice: boolean; invoiceMode?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const t = useTranslations("services");
  const tForms = useTranslations("forms");
  const [lines, setLines] = useState<ServiceLine[]>([blankLine()]);
  const updateLine = (id: number, field: keyof Omit<ServiceLine, "id">, value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  const removeLine = (id: number) => setLines((current) => current.length === 1 ? current : current.filter((line) => line.id !== id));
  const totals = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) + (Number(line.laborCost) || 0), 0);

  return (
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm" open={invoiceMode}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950"><Wrench className="h-4 w-4 text-brand" aria-hidden="true" /> {t("register")}</span>
        <span className="text-xs font-semibold text-slate-500 group-open:hidden">{tForms("open")}</span>
        <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">{tForms("close")}</span>
      </summary>
      <form action={createCompanyService} className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="serviceItemsJson" value={JSON.stringify(lines.map(({ id: _id, ...line }) => line))} />
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("type")}<select name="type" defaultValue="normal" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"><option value="normal">{t("normal")}</option><option value="periodic">{t("periodic")}</option></select></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("date")}<input name="date" required type="date" defaultValue={today} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("mileage")}<input name="km" required type="number" min={0} max={2000000} defaultValue={currentKm} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("laborDiscount")}<input name="laborDiscountPercent" required type="number" min={0} max={100} step="0.01" defaultValue={isVip ? "10" : "0"} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-black text-slate-950">{t("serviceLines")}</h3><p className="mt-0.5 text-xs text-slate-500">{t("serviceLinesHint")}</p></div><strong className="text-sm text-slate-800">{t("serviceTotal")}: €{totals.toFixed(2)}</strong></div>
          <div className="grid gap-3 p-4">
            {lines.map((line, index) => <div key={line.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(170px,1.35fr)_90px_88px_120px_120px_auto] lg:items-end">
              <label className="grid gap-1 text-xs font-bold text-slate-600">{index === 0 ? t("materialName") : t("itemName")}<input value={line.name} onChange={(event) => updateLine(line.id, "name", event.target.value)} required maxLength={160} placeholder={t("materialExample")} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">{t("quantity")}<input value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", event.target.value)} required type="number" min="0.001" step="0.001" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">{t("unit")}<input value={line.unit} onChange={(event) => updateLine(line.id, "unit", event.target.value)} maxLength={16} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">{t("unitPrice")}<input value={line.unitPrice} onChange={(event) => updateLine(line.id, "unitPrice", event.target.value)} required type="number" min="0" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">{t("laborGross")}<input value={line.laborCost} onChange={(event) => updateLine(line.id, "laborCost", event.target.value)} required type="number" min="0" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
              <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length === 1} className="rounded-lg px-3 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300">{t("removeMaterial")}</button>
            </div>)}
            <button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className="w-fit rounded-lg border border-brand/30 bg-white px-3 py-2 text-sm font-bold text-brand transition hover:border-brand hover:bg-brand/5">+ {t("addMaterial")}</button>
          </div>
        </section>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">{t("notes")} <span className="font-normal text-slate-500">{tForms("optional")}</span><textarea name="notes" rows={3} maxLength={2000} className="resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
        {canIssueInvoice ? <label className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 px-3 py-3 text-sm font-bold text-slate-800 sm:col-span-2"><input name="issueInvoice" type="checkbox" defaultChecked={invoiceMode} className="h-4 w-4 accent-brand" /> {t("issueAfterSave")}</label> : null}
        <div className="sm:col-span-2"><SubmitButton label={t("saveService")} pendingLabel={tForms("saving")} /></div>
      </form>
    </details>
  );
}
