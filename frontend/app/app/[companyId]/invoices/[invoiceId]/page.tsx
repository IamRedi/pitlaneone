import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, CircleDollarSign, Clock3, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { recordInvoicePagePayment } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";
import { InvoiceComplianceActions } from "@/components/invoice-compliance-actions";
import { PrintInvoiceButton } from "@/components/print-invoice-button";
import { canManageCompanyFinance, requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

const paymentStatusLabel = (status: unknown) => ({ draft: "Draft", issued: "E lëshuar", partial: "Pjesërisht e paguar", paid: "E paguar" }[String(status)] ?? "Faturë");
const invoiceCopy = {
  DE: { locale: "de-DE", title: "RECHNUNG", issued: "Rechnungsdatum", due: "Zahlungsziel", recipient: "Rechnungsempfänger", customer: "Kunde", vehicle: "Fahrzeug und Leistung", vehicleFallback: "Fahrzeug", serviceDate: "Leistungsdatum", description: "Beschreibung", quantity: "Menge", unitPrice: "Stückpreis", material: "Material (brutto)", labor: "Arbeit (brutto)", fee: "Zuschlag", lineTotal: "Gesamt", laborDiscount: "Arbeitsrabatt", service: "Leistung", periodic: "Inspektion", normal: "Allgemeiner Service", notes: "Hinweise", bank: "Bankverbindung", materials: "Materialien (brutto)", laborTotal: "Arbeitsleistung (brutto)", extraFees: "Zusätzliche Gebühren", net: "Netto", tax: "enthaltene Umsatzsteuer", gross: "Gesamtbetrag", paid: "Bezahlt", remaining: "Offen", status: "Status", issuedStatus: "Ausgestellt", partialStatus: "Teilbezahlt", paidStatus: "Bezahlt", taxId: "USt-IdNr.", registrationNumber: "Steuernummer" },
  AL: { locale: "sq-AL", title: "FATURË", issued: "Data e lëshimit", due: "Afati i pagesës", recipient: "Marrësi", customer: "Klient", vehicle: "Automjeti dhe shërbimi", vehicleFallback: "Automjet", serviceDate: "Data e shërbimit", description: "Përshkrimi", quantity: "Sasia", unitPrice: "Çmimi / njësi", material: "Material (bruto)", labor: "Punë (bruto)", fee: "Tarifë", lineTotal: "Gjithsej", laborDiscount: "Zbritje pune", service: "Shërbimi", periodic: "Shërbim periodik", normal: "Shërbim normal", notes: "Shënime", bank: "Të dhënat bankare", materials: "Materiale (bruto)", laborTotal: "Punë (bruto)", extraFees: "Tarifa shtesë", net: "Neto", tax: "TVSH e përfshirë", gross: "Totali për pagesë", paid: "Paguar", remaining: "Mbetur", status: "Statusi", issuedStatus: "E lëshuar", partialStatus: "Pjesërisht e paguar", paidStatus: "E paguar", taxId: "NIPT", registrationNumber: "Nr. regjistrimi" },
  IT: { locale: "it-IT", title: "FATTURA", issued: "Data fattura", due: "Scadenza pagamento", recipient: "Destinatario", customer: "Cliente", vehicle: "Veicolo e prestazione", vehicleFallback: "Veicolo", serviceDate: "Data prestazione", description: "Descrizione", quantity: "Quantità", unitPrice: "Prezzo unitario", material: "Materiali (lordo)", labor: "Manodopera (lordo)", fee: "Supplemento", lineTotal: "Totale", laborDiscount: "Sconto manodopera", service: "Prestazione", periodic: "Manutenzione periodica", normal: "Servizio ordinario", notes: "Note", bank: "Coordinate bancarie", materials: "Materiali (lordo)", laborTotal: "Manodopera (lordo)", extraFees: "Supplementi", net: "Imponibile", tax: "IVA inclusa", gross: "Totale da pagare", paid: "Pagato", remaining: "Da pagare", status: "Stato", issuedStatus: "Emessa", partialStatus: "Parzialmente pagata", paidStatus: "Pagata", taxId: "Partita IVA", registrationNumber: "Codice fiscale / REA" }
} as const;
type SnapshotClient = { first_name?: string; last_name?: string; phone?: string; billing_address?: string; billing_postal_code?: string; billing_city?: string; billing_country?: string };
type SnapshotIssuer = { company_name?: string; legal_name?: string; display_name?: string; tax_id?: string; registration_number?: string; bank_name?: string; bank_iban?: string; invoice_footer?: string; address?: string; city?: string; country?: string; phone?: string; email?: string };
type SnapshotVehicle = { model?: string; plate_number?: string; vin?: string };
type SnapshotService = { date?: string; km?: number; type?: string; notes?: string };
type SnapshotItem = { id?: string; name?: string; quantity?: number; unit_label?: string; unit_price?: number; material_cost?: number; labor_cost?: number; fee?: number; labor_discount_percent?: number };

export default async function CompanyInvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ companyId: string; invoiceId: string }>;
  searchParams: Promise<{ error?: string; paymentSaved?: string; archiveSaved?: string; archiveError?: string; stornoCreated?: string }>;
}) {
  const { companyId, invoiceId } = await params;
  const query = await searchParams;
  const tUi = await getTranslations("invoiceDetailUi");
  const tArchive = await getTranslations("invoiceArchive");
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const [{ data: invoice, error }, { data: profile }, { data: theme }, { data: invoiceSettings }, { data: documents }, { data: events }] = await Promise.all([
    supabase.from("invoices").select("id, invoice_number, invoice_snapshot, invoice_kind, lifecycle_status, finalized_at, related_invoice_id, cancelled_by_invoice_id, cancel_reason, registration_country, currency, issued_at, due_date, status, material_total, labor_total, fee_total, net_amount, tax_rate, tax_amount, total_amount, amount_paid, clients!invoices_client_company_id_fkey(first_name, last_name, phone, billing_address, billing_postal_code, billing_city, billing_country), services!invoices_service_company_id_fkey(date, km, type, notes, vehicles!services_vehicle_company_id_fkey(model, plate_number, vin), service_items!service_items_service_company_id_fkey(id, name, quantity, unit_label, unit_price, material_cost, labor_cost, fee, labor_discount_percent))").eq("id", invoiceId).eq("company_id", context.company.id).maybeSingle(),
    supabase.from("company_profiles").select("display_name, phone, email, address, city, country").eq("company_id", context.company.id).maybeSingle(),
    supabase.from("company_theme_settings").select("logo_url").eq("company_id", context.company.id).maybeSingle(),
    supabase.from("company_invoice_settings").select("legal_name, tax_id, registration_number, bank_name, bank_iban, invoice_footer").eq("company_id", context.company.id).maybeSingle(),
    supabase.from("invoice_documents").select("document_format, sha256, size_bytes, created_at, document_standard, standard_version, validation_status").eq("company_id", context.company.id).eq("invoice_id", invoiceId).order("created_at", { ascending: true }),
    supabase.from("invoice_events").select("id, event_type, event_data, created_at").eq("company_id", context.company.id).eq("invoice_id", invoiceId).order("created_at", { ascending: true }).order("id", { ascending: true })
  ]);

  if (error) throw new Error("Fatura nuk u ngarkua.");
  if (!invoice) return <main className="mx-auto w-full max-w-4xl px-4 py-8"><p className="rounded-xl border border-slate-200 bg-white p-6 font-bold">Fatura nuk u gjet.</p></main>;

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
  const snapshot = invoice.invoice_snapshot && typeof invoice.invoice_snapshot === "object" && !Array.isArray(invoice.invoice_snapshot) ? invoice.invoice_snapshot : null;
  const snapshotClient = snapshot && typeof snapshot.client === "object" && snapshot.client && !Array.isArray(snapshot.client) ? snapshot.client as SnapshotClient : null;
  const billedClient = snapshotClient ?? client;
  const relationalService = Array.isArray(invoice.services) ? invoice.services[0] : invoice.services;
  const relationalVehicle = relationalService && (Array.isArray(relationalService.vehicles) ? relationalService.vehicles[0] : relationalService.vehicles);
  const snapshotIssuer = snapshot && typeof snapshot.issuer === "object" && snapshot.issuer && !Array.isArray(snapshot.issuer) ? snapshot.issuer as SnapshotIssuer : null;
  const snapshotService = snapshot && typeof snapshot.service === "object" && snapshot.service && !Array.isArray(snapshot.service) ? snapshot.service as SnapshotService : null;
  const snapshotVehicle = snapshot && typeof snapshot.vehicle === "object" && snapshot.vehicle && !Array.isArray(snapshot.vehicle) ? snapshot.vehicle as SnapshotVehicle : null;
  const rawSnapshotItems = snapshot && Array.isArray(snapshot.items) ? snapshot.items as unknown[] : null;
  const accountingBuyer = snapshot && typeof snapshot.accounting === "object" && snapshot.accounting && !Array.isArray(snapshot.accounting) && typeof (snapshot.accounting as Record<string, unknown>).buyer === "object" ? (snapshot.accounting as { buyer?: { customer_type?: string } }).buyer : null;
  const snapshotItems = rawSnapshotItems ? rawSnapshotItems.filter((item): item is SnapshotItem => Boolean(item && typeof item === "object" && !Array.isArray(item))) : null;
  const issuer = snapshotIssuer ?? { legal_name: invoiceSettings?.legal_name ?? undefined, display_name: profile?.display_name ?? undefined, company_name: context.company.name, tax_id: invoiceSettings?.tax_id ?? undefined, registration_number: invoiceSettings?.registration_number ?? undefined, bank_name: invoiceSettings?.bank_name ?? undefined, bank_iban: invoiceSettings?.bank_iban ?? undefined, invoice_footer: invoiceSettings?.invoice_footer ?? undefined, address: profile?.address ?? undefined, city: profile?.city ?? undefined, country: profile?.country ?? undefined, phone: profile?.phone ?? undefined, email: profile?.email ?? undefined };
  const service = snapshotService ?? relationalService;
  const vehicle = snapshotVehicle ?? relationalVehicle;
  const invoiceItems: SnapshotItem[] = snapshotItems ?? (relationalService?.service_items as SnapshotItem[] | undefined) ?? [];
  const invoiceTotal = Number(invoice.total_amount);
  const paidAmount = Number(invoice.amount_paid);
  const remaining = Math.max(0, invoiceTotal - paidAmount);
  const canManageFinance = canManageCompanyFinance(context.role);
  const canRecordPayment = canManageFinance && invoice.lifecycle_status === "active" && invoice.invoice_kind !== "storno" && remaining > 0;
  const copy = invoiceCopy[invoice.registration_country === "AL" ? "AL" : invoice.registration_country === "IT" ? "IT" : "DE"];
  const formatMoney = (value: number) => value.toLocaleString(copy.locale, { style: "currency", currency: invoice.currency });
  const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat(copy.locale).format(new Date(`${value}T00:00:00`)) : "—";
  const printStatus = invoice.lifecycle_status === "cancelled" ? tArchive("cancelled") : invoice.invoice_kind === "storno" ? tArchive("storno") : invoice.status === "paid" ? copy.paidStatus : invoice.status === "partial" ? copy.partialStatus : copy.issuedStatus;

  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href={`/app/${companyId}/invoices` as Route} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand"><ChevronLeft className="h-4 w-4" /> {tUi("back")}</Link>
      <PrintInvoiceButton />
    </div>

    {query.paymentSaved ? <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 print:hidden">Pagesa u regjistrua dhe statusi i faturës u përditësua.</p> : null}
    {query.archiveSaved ? <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 print:hidden">{tArchive("archiveSaved")}</p> : null}
    {query.stornoCreated ? <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 print:hidden">{tArchive("stornoCreated")}</p> : null}
    {query.archiveError ? <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 print:hidden">{query.archiveError === "1" ? tArchive("archiveError") : decodeURIComponent(query.archiveError)}</p> : null}
    {query.error ? <p className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 print:hidden">{decodeURIComponent(query.error)}</p> : null}
    {invoice.related_invoice_id ? <Link data-testid="original-invoice-link" href={`/app/${companyId}/invoices/${invoice.related_invoice_id}` as Route} className="mb-5 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-brand print:hidden">Hap faturën origjinale</Link> : null}
    {invoice.cancelled_by_invoice_id ? <Link href={`/app/${companyId}/invoices/${invoice.cancelled_by_invoice_id}` as Route} className="mb-5 inline-flex rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700 print:hidden">Hap dokumentin Storno</Link> : null}

    <InvoiceComplianceActions companyId={companyId} invoiceId={invoice.id} invoiceKind={invoice.invoice_kind} lifecycleStatus={invoice.lifecycle_status} amountPaid={paidAmount} canManage={canManageFinance} electronicInvoiceApplicable={invoice.registration_country === "DE" && (accountingBuyer?.customer_type === "business" || accountingBuyer?.customer_type === "public")} documents={documents ?? []} />

    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 font-black text-slate-950"><CircleDollarSign className="h-5 w-5 text-brand" /> {tUi("paymentAndStatus")}</p>
          <p className="mt-2 text-sm text-slate-600">Statusi ndryshon automatikisht: pagesë më e vogël se mbetja bëhet “Pjesërisht e paguar”; pagesa e plotë bëhet “E paguar”.</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm"><span><span className="text-slate-500">Statusi:</span> <strong>{printStatus || paymentStatusLabel(invoice.status)}</strong></span><span><span className="text-slate-500">Paguar:</span> <strong>{formatMoney(paidAmount)}</strong></span><span><span className="text-slate-500">Mbetur:</span> <strong className="text-brand">{formatMoney(remaining)}</strong></span></div>
        </div>
        {canRecordPayment ? <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form data-testid="partial-payment-form" action={recordInvoicePagePayment} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="grid gap-1 text-xs font-bold text-slate-700">Pagesë e pjesshme<input name="amount" required min="0.01" max={remaining} step="0.01" type="number" className="w-40" /></label>
            <SubmitButton label="Regjistro pagesën" pendingLabel="Duke ruajtur..." />
          </form>
          <form action={recordInvoicePagePayment}>
            <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="invoiceId" value={invoice.id} /><input type="hidden" name="amount" value={remaining} />
            <SubmitButton label="Shëno të paguar" pendingLabel="Duke ruajtur..." />
          </form>
        </div> : invoice.lifecycle_status === "active" && invoice.invoice_kind !== "storno" && remaining <= 0 ? <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">Fatura është paguar</span> : null}
      </div>
    </section>

    <article data-testid="invoice-document" className="invoice-document rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <header className="flex flex-col gap-6 border-b-2 border-slate-900 pb-7 sm:flex-row sm:justify-between">
        <div className="flex items-start gap-4">
          {theme?.logo_url ? <img src={theme.logo_url} alt="Logo e kompanisë" className="h-16 w-32 object-contain" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-brand-soft"><FileText className="h-6 w-6" /></span>}
          <div>
            <h1 className="text-xl font-black text-slate-950">{issuer.legal_name ?? issuer.display_name ?? issuer.company_name ?? context.company.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{[issuer.address, issuer.city, issuer.country].filter(Boolean).join(", ")}</p>
            <p className="text-sm text-slate-600">{[issuer.phone, issuer.email].filter(Boolean).join(" / ")}</p>
            {issuer.tax_id ? <p className="mt-2 text-xs font-bold text-slate-700">{copy.taxId}: {issuer.tax_id}</p> : null}
            {issuer.registration_number ? <p className="text-xs font-bold text-slate-700">{copy.registrationNumber}: {issuer.registration_number}</p> : null}
          </div>
        </div>
        <div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{invoice.invoice_kind === "storno" ? tArchive("storno") : copy.title}</p><p className="mt-1 text-2xl font-black text-slate-950">{invoice.invoice_number ?? invoice.id.slice(0, 8)}</p><p className="mt-2 text-sm text-slate-600">{copy.issued}: {formatDate(invoice.issued_at)}</p>{invoice.due_date ? <p className="text-sm text-slate-600">{copy.due}: {formatDate(invoice.due_date)}</p> : null}</div>
      </header>

      <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.recipient}</p><p className="mt-2 font-black text-slate-950">{billedClient ? `${billedClient.first_name ?? ""} ${billedClient.last_name ?? ""}`.trim() : copy.customer}</p>{billedClient?.billing_address ? <p className="mt-1 text-sm text-slate-600">{billedClient.billing_address}</p> : null}{billedClient?.billing_postal_code || billedClient?.billing_city ? <p className="text-sm text-slate-600">{[billedClient.billing_postal_code, billedClient.billing_city].filter(Boolean).join(" ")}</p> : null}{billedClient?.billing_country ? <p className="text-sm text-slate-600">{billedClient.billing_country}</p> : null}<p className="mt-1 text-sm text-slate-600">{billedClient?.phone ?? ""}</p></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.vehicle}</p><p className="mt-2 font-black text-slate-950">{vehicle?.model ?? copy.vehicleFallback}{vehicle?.plate_number ? ` / ${vehicle.plate_number}` : ""}</p><p className="mt-1 text-sm text-slate-600">VIN: {vehicle?.vin ?? "—"}</p><p className="text-sm text-slate-600">{copy.serviceDate}: {formatDate(service?.date)} · {service?.km?.toLocaleString(copy.locale)} km</p></div>
      </section>

      <section className="py-7">
        <div className="invoice-items-header grid grid-cols-[minmax(0,1fr)_64px_repeat(4,92px)] gap-3 border-b border-slate-900 pb-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-slate-500"><span className="text-left">{copy.description}</span><span>{copy.quantity}</span><span>{copy.unitPrice}</span><span>{copy.material}</span><span>{copy.labor}</span><span>{copy.lineTotal}</span></div>
        <div className="divide-y divide-slate-100">{invoiceItems.map((item, index) => {
          const quantity = Number(item.quantity ?? 1);
          const unitPrice = Number(item.unit_price ?? 0) || (quantity ? Number(item.material_cost) / quantity : 0);
          const material = Number(item.material_cost) + Number(item.fee);
          const labor = Number(item.labor_cost) * (1 - Number(item.labor_discount_percent) / 100);
          return <div key={item.id ?? `${item.name}-${index}`} className="invoice-item-row grid grid-cols-[minmax(0,1fr)_64px_repeat(4,92px)] gap-3 py-4 text-right text-sm"><span className="text-left font-semibold text-slate-800">{item.name}{Number(item.labor_discount_percent) > 0 ? <small className="mt-1 block font-medium text-slate-500">{copy.laborDiscount}: {Number(item.labor_discount_percent)}%</small> : null}</span><span>{quantity.toLocaleString(copy.locale)} {item.unit_label ?? ""}</span><span>{formatMoney(unitPrice)}</span><span>{formatMoney(material)}</span><span>{formatMoney(labor)}</span><strong>{formatMoney(material + labor)}</strong></div>;
        })}</div>
      </section>

      <section className="grid gap-8 border-t border-slate-200 pt-6 sm:grid-cols-[1fr_320px]">
        <div className="text-xs leading-5 text-slate-600"><p><strong>{copy.service}:</strong> {service?.type === "periodic" ? copy.periodic : copy.normal}</p>{service?.notes ? <p><strong>{copy.notes}:</strong> {service.notes}</p> : null}{issuer.bank_name || issuer.bank_iban ? <div className="mt-4"><p className="font-bold text-slate-800">{copy.bank}</p>{issuer.bank_name ? <p>{issuer.bank_name}</p> : null}{issuer.bank_iban ? <p className="font-mono">IBAN: {issuer.bank_iban}</p> : null}</div> : null}{issuer.invoice_footer ? <p className="mt-4 border-t border-slate-200 pt-3">{issuer.invoice_footer}</p> : null}</div>
        <footer className="grid gap-2 text-sm"><div className="flex justify-between"><span className="text-slate-600">{copy.materials}</span><strong>{formatMoney(Number(invoice.material_total) + Number(invoice.fee_total))}</strong></div><div className="flex justify-between"><span className="text-slate-600">{copy.laborTotal}</span><strong>{formatMoney(Number(invoice.labor_total))}</strong></div><div className="mt-2 flex justify-between border-t border-slate-200 pt-3"><span>{copy.net}</span><strong>{formatMoney(Number(invoice.net_amount))}</strong></div><div className="flex justify-between"><span>{copy.tax} ({Number(invoice.tax_rate).toLocaleString(copy.locale)}%)</span><strong>{formatMoney(Number(invoice.tax_amount))}</strong></div><div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg"><span className="font-black">{copy.gross}</span><strong>{formatMoney(invoiceTotal)}</strong></div><div className="flex justify-between pt-2"><span className="text-slate-600">{copy.paid}</span><strong>{formatMoney(paidAmount)}</strong></div><div className="flex justify-between"><span className="font-black">{copy.remaining}</span><strong>{formatMoney(remaining)}</strong></div><p className="pt-2 text-right text-xs font-bold uppercase tracking-[0.13em] text-slate-500">{copy.status}: {printStatus}</p></footer>
      </section>
    </article>
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"><h2 className="inline-flex items-center gap-2 font-black text-slate-950"><Clock3 className="h-5 w-5 text-brand" />{tArchive("history")}</h2>{events?.length ? <ol className="mt-4 border-l border-slate-200 pl-5">{events.map((event) => <li key={event.id} className="relative pb-4 last:pb-0"><span className="absolute -left-[1.47rem] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-white" /><p className="text-sm font-black text-slate-900">{event.event_type.replaceAll("_", " ")}</p><p className="mt-0.5 text-xs text-slate-500">{new Intl.DateTimeFormat(copy.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-600">{tArchive("noHistory")}</p>}</section>
  </main>;
}
