"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CarFront, FilePlus2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Customer = { id: string; name: string; phone: string; vehicles: Array<{ id: string; model: string; plate: string }> };

export function CompanyInvoiceStartWizard({ companyId, customers, selectedCustomerId, selectedVehicleId }: { companyId: string; customers: Customer[]; selectedCustomerId?: string; selectedVehicleId?: string }) {
  const t = useTranslations("invoiceWizard");
  const [customerId, setCustomerId] = useState(selectedCustomerId ?? "");
  const customer = customers.find((entry) => entry.id === customerId);
  const [vehicleId, setVehicleId] = useState(selectedVehicleId ?? "");
  const vehicle = customer?.vehicles.find((entry) => entry.id === vehicleId);
  const customerChanged = (value: string) => { setCustomerId(value); setVehicleId(""); };
  const startHref = customer && vehicle ? `/app/${companyId}/customers/${customer.id}/vehicles/${vehicle.id}?fromInvoice=1` as Route : null;
  const createCustomerHref = `/app/${companyId}/customers?create=1&returnTo=${encodeURIComponent(`/app/${companyId}/invoices/new`)}` as Route;

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">{t("eyebrow")}</p><h2 className="mt-1 text-xl font-black text-slate-950">{t("title")}</h2><p className="mt-1 text-sm text-slate-600">{t("description")}</p></div>
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("customer")}<select data-testid="invoice-customer" value={customerId} onChange={(event) => customerChanged(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"><option value="">{t("chooseCustomer")}</option>{customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.phone}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">{t("vehicle")}<select data-testid="invoice-vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} disabled={!customer} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-100">{!customer ? <option>{t("chooseCustomerFirst")}</option> : <><option value="">{t("chooseVehicle")}</option>{customer.vehicles.map((entry) => <option key={entry.id} value={entry.id}>{entry.model} · {entry.plate}</option>)}</>}</select></label>
      {startHref ? <Link data-testid="invoice-customer-continue" href={startHref} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-110">{t("continue")} <ArrowRight className="h-4 w-4" /></Link> : <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-400">{t("continue")} <ArrowRight className="h-4 w-4" /></span>}
    </div>
    <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-2"><div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"><CarFront className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><div><p className="font-bold text-slate-950">{t("existingTitle")}</p><p className="mt-1 text-sm text-slate-600">{t("existingHint")}</p></div></div><Link href={createCustomerHref} className="group flex items-start gap-3 rounded-lg border border-brand/25 bg-white p-4 transition hover:border-brand hover:bg-brand/5"><UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><div className="min-w-0"><p className="inline-flex items-center gap-2 font-bold text-slate-950">{t("newTitle")} <FilePlus2 className="h-4 w-4 text-brand transition group-hover:translate-x-0.5" /></p><p className="mt-1 text-sm text-slate-600">{t("newHint")}</p></div></Link></div>
  </section>;
}
