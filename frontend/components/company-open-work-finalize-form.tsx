"use client";

import { FileCheck2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { finalizeCompanyOpenWork } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

type FinalLine = { id: number; name: string; quantity: string; unit: string; unitPrice: string; laborCost: string };
const newLine = (name = ""): FinalLine => ({ id: Date.now() + Math.floor(Math.random() * 1000), name, quantity: "1", unit: "pcs", unitPrice: "", laborCost: "" });

export function CompanyOpenWorkFinalizeForm({
  companyId,
  customerId,
  vehicleId,
  serviceId,
  notes,
  itemNames,
  isVip,
  currency
}: {
  companyId: string;
  customerId: string;
  vehicleId: string;
  serviceId: string;
  notes: string;
  itemNames: string[];
  isVip: boolean;
  currency: string;
}) {
  const t = useTranslations("openWork");
  const forms = useTranslations("forms");
  const locale = useLocale();
  const [lines, setLines] = useState<FinalLine[]>(itemNames.length ? itemNames.map((name, index) => ({ ...newLine(name), id: Date.now() + index })) : [newLine()]);
  const update = (id: number, field: keyof Omit<FinalLine, "id">, value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) + (Number(line.laborCost) || 0), 0);

  return <details data-testid="open-work-finalize" data-service-id={serviceId} className="group mt-4 overflow-hidden rounded-xl border border-brand/30 bg-slate-50">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950"><FileCheck2 className="h-4 w-4 text-brand" />{t("completeAndInvoice")}</span>
      <span className="text-xs font-bold text-brand group-open:hidden">{t("fillPrices")}</span>
      <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">{forms("close")}</span>
    </summary>
    <form data-testid="open-work-finalize-form" action={finalizeCompanyOpenWork} className="grid gap-4 border-t border-slate-200 bg-white p-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="serviceItemsJson" value={JSON.stringify(lines.map(({ id: _id, ...line }) => line))} />
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-black text-slate-950">{t("finalLinesTitle")}</h4><p className="mt-1 text-xs text-slate-500">{t("finalLinesHint")}</p></div><strong className="rounded-lg bg-slate-950 px-3 py-2 text-sm text-white">{total.toLocaleString(locale, { style: "currency", currency })}</strong></div>
      <div className="grid gap-3">
        {lines.map((line, index) => <div key={line.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(150px,1.3fr)_80px_80px_110px_110px_44px] lg:items-end">
          <label className="grid gap-1 text-xs font-bold text-slate-600">{t("description")}<input data-testid={`final-line-description-${index}`} value={line.name} onChange={(event) => update(line.id, "name", event.target.value)} required minLength={2} maxLength={160} /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">{t("quantity")}<input value={line.quantity} onChange={(event) => update(line.id, "quantity", event.target.value)} required type="number" min="0.001" step="0.001" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">{t("unit")}<input value={line.unit} onChange={(event) => update(line.id, "unit", event.target.value)} maxLength={16} /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">{t("unitPrice")}<input data-testid={`final-line-unit-price-${index}`} value={line.unitPrice} onChange={(event) => update(line.id, "unitPrice", event.target.value)} required type="number" min="0" step="0.01" placeholder="0.00" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">{t("laborPrice")}<input data-testid={`final-line-labor-cost-${index}`} value={line.laborCost} onChange={(event) => update(line.id, "laborCost", event.target.value)} required type="number" min="0" step="0.01" placeholder="0.00" /></label>
          <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.id !== line.id))} disabled={lines.length === 1} className="grid h-11 w-11 place-items-center rounded-lg text-rose-700 hover:bg-rose-50 disabled:text-slate-300" aria-label={t("removeLine")}><X className="h-4 w-4" /></button>
        </div>)}
      </div>
      <button type="button" onClick={() => setLines((current) => [...current, newLine()])} className="inline-flex w-fit items-center gap-2 rounded-lg border border-brand/30 px-3 py-2 text-sm font-bold text-brand"><Plus className="h-4 w-4" />{t("addLine")}</button>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("laborDiscount")}<input name="laborDiscountPercent" required type="number" min="0" max="100" step="0.01" defaultValue={isVip ? "10" : "0"} /></label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("dueDate")}<input name="dueDate" type="date" /></label>
        <p className="self-end rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-semibold leading-5 text-emerald-800">{t("invoiceFinalHint")}</p>
      </div>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("notes")} <span className="font-normal text-slate-500">({forms("optional")})</span><textarea name="notes" rows={3} maxLength={2000} defaultValue={notes} /></label>
      <div><SubmitButton label={t("issueInvoice")} pendingLabel={t("issuingInvoice")} /></div>
    </form>
  </details>;
}
