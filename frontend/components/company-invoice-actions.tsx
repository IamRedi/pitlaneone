"use client";

import Link from "next/link";
import type { Route } from "next";
import { ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createCompanyInvoiceFromService, recordCompanyInvoicePayment } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";

type Invoice = { id: string; invoice_number?: string | null; currency?: string | null; status: "draft" | "issued" | "partial" | "paid"; total_amount: number | string; amount_paid: number | string; due_date: string | null };

export function CompanyInvoiceActions({ companyId, customerId, vehicleId, serviceId, invoice, currency }: { companyId: string; customerId: string; vehicleId: string; serviceId: string; invoice: Invoice | null; currency: string }) {
  const locale = appLocaleFormats[toAppLocale(useLocale())];
  const t = useTranslations("invoiceActions");
  const tForms = useTranslations("forms");
  const input = <><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="vehicleId" value={vehicleId} /></>;
  if (!invoice) return <form action={createCompanyInvoiceFromService} className="mt-3 flex flex-wrap items-end gap-2">{input}<input type="hidden" name="serviceId" value={serviceId} /><label className="grid gap-1 text-xs font-bold text-slate-600">{t("dueDate")}<input name="dueDate" type="date" className="rounded-md border border-slate-300 px-2 py-1.5" /></label><SubmitButton label={t("issue")} pendingLabel={t("issuing")} /></form>;
  const total = Number(invoice.total_amount); const paid = Number(invoice.amount_paid); const remaining = total - paid; const invoiceCurrency = invoice.currency ?? currency;
  const money = (value: number) => value.toLocaleString(locale, { style: "currency", currency: invoiceCurrency });
  const status = invoice.status === "paid" ? t("paid") : invoice.status === "partial" ? t("partial") : t("issued");
  return <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="inline-flex items-center gap-1.5 font-bold text-slate-950"><ReceiptText className="h-4 w-4 text-brand" /> {invoice.invoice_number ?? t("invoice")} {status}</span><span className="font-bold text-slate-700">{t("remaining", { amount: money(remaining) })}</span></div><p className="mt-1 text-xs text-slate-600">{t("summary", { total: money(total), paid: money(paid) })}</p><Link href={`/app/${companyId}/invoices/${invoice.id}` as Route} className="mt-2 inline-flex text-xs font-bold text-brand underline underline-offset-4">{t("open")}</Link>{remaining > 0 ? <form action={recordCompanyInvoicePayment} className="mt-3 flex flex-wrap items-end gap-2">{input}<input type="hidden" name="invoiceId" value={invoice.id} /><label className="grid gap-1 text-xs font-bold text-slate-600">{t("recordPayment")}<input name="amount" required min="0.01" max={remaining} step="0.01" type="number" className="w-32 rounded-md border border-slate-300 px-2 py-1.5" /></label><SubmitButton label={t("savePayment")} pendingLabel={tForms("saving")} /></form> : null}</div>;
}
