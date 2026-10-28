"use client";

import Link from "next/link";
import type { Route } from "next";
import { Archive, Download, FileCode2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { archiveCompanyInvoice, cancelCompanyInvoice } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

type Document = { document_format: string; sha256: string; size_bytes: number; created_at: string; document_standard: string | null; standard_version: string | null; validation_status: string };

export function InvoiceComplianceActions({
  companyId, invoiceId, invoiceKind, lifecycleStatus, amountPaid, canManage, electronicInvoiceApplicable, documents
}: {
  companyId: string;
  invoiceId: string;
  invoiceKind: string;
  lifecycleStatus: string;
  amountPaid: number;
  canManage: boolean;
  electronicInvoiceApplicable: boolean;
  documents: Document[];
}) {
  const t = useTranslations("invoiceArchive");
  const pdf = documents.find((document) => document.document_format === "pdf");
  const xml = documents.find((document) => document.document_format === "xml");
  const canCancel = canManage && lifecycleStatus === "active" && invoiceKind !== "storno";

  return <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:hidden">
    <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-black text-slate-950">{t("title")}</h2><p className="mt-1 text-sm text-slate-600">{t("description")}</p></div></div>
    </div>
    <div className="grid gap-4 p-5 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2"><Archive className="h-4 w-4 text-brand" /><p className="font-black text-slate-950">PDF</p></div>
        {pdf ? <><p className="mt-2 text-sm font-bold text-emerald-700">{t("archived")}</p><p className="mt-1 break-all font-mono text-[11px] text-slate-500">SHA-256: {pdf.sha256}</p><Link href={`/api/companies/${companyId}/invoices/${invoiceId}/documents/pdf` as Route} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"><Download className="h-4 w-4" />{t("downloadPdf")}</Link></> : <><p className="mt-2 text-sm font-bold text-amber-700">{t("missingPdf")}</p>{canManage ? <form action={archiveCompanyInvoice} className="mt-3"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="invoiceId" value={invoiceId} /><SubmitButton label={t("createArchive")} pendingLabel={t("archiving")} /></form> : null}</>}
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-brand" /><p className="font-black text-slate-950">XRechnung XML</p></div>
        {xml ? <><p className="mt-2 text-sm font-bold text-emerald-700">{xml.document_standard} {xml.standard_version} · {t("xmlArchived")}</p><p className="mt-1 text-xs font-semibold text-amber-700">Preflight bestanden; KoSIT-Prüfbericht noch nicht hinterlegt.</p><p className="mt-1 break-all font-mono text-[11px] text-slate-500">SHA-256: {xml.sha256}</p><Link href={`/api/companies/${companyId}/invoices/${invoiceId}/documents/xml` as Route} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-800"><Download className="h-4 w-4" />{t("downloadXml")}</Link></> : electronicInvoiceApplicable ? <><p className="mt-2 text-sm text-slate-600">{t("xmlPending")}</p>{canManage ? <form action={archiveCompanyInvoice} className="mt-3"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="invoiceId" value={invoiceId} /><SubmitButton label="XRechnung erstellen" pendingLabel={t("archiving")} /></form> : null}</> : <p className="mt-2 text-sm text-slate-600">Für diese Privatkundenrechnung ist keine XRechnung vorgesehen.</p>}
      </div>
    </div>
    <p className="mx-5 mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{t("localWarning")}</p>
    {canCancel ? <details data-testid="invoice-cancel-details" className="border-t border-slate-100 px-5 py-4"><summary className="cursor-pointer text-sm font-black text-rose-700">{t("cancelTitle")}</summary><p className="mt-2 max-w-2xl text-sm text-slate-600">{t("cancelDescription")}</p><form data-testid="invoice-cancel-form" action={cancelCompanyInvoice} className="mt-3 grid max-w-2xl gap-3" onSubmit={(event) => { if (!window.confirm(t("cancelConfirm"))) event.preventDefault(); }}><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="invoiceId" value={invoiceId} /><label className="grid gap-1 text-xs font-bold text-slate-700">{t("reason")}<textarea name="reason" required minLength={5} maxLength={500} rows={3} className="resize-y" /></label>{amountPaid > 0 ? <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-900"><input data-testid="refund-confirmed" type="checkbox" name="refundConfirmed" required className="mt-1" />Ich bestätige, dass {amountPaid.toFixed(2)} bereits an den Kunden zurückgezahlt wurden. PitlaneOne protokolliert die Rückzahlung, führt sie aber nicht über Bank oder Karte aus.</label> : null}<div><SubmitButton label={t("createStorno")} pendingLabel={t("creatingStorno")} /></div></form></details> : null}
  </section>;
}
