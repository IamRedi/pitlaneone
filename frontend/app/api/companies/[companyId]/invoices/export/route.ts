import JSZip from "jszip";
import { NextResponse } from "next/server";
import { canManageCompanyFinance, requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function csv(value: unknown) {
  let rendered = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(rendered)) rendered = `'${rendered}`;
  return `"${rendered.replace(/"/g, '""')}"`;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await requireCompanyContext(companyId);
  if (!canManageCompanyFinance(context.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { supabase } = await requireSaasUser();
  const url = new URL(request.url);
  const from = validDate(url.searchParams.get("from"));
  const to = validDate(url.searchParams.get("to"));
  const format = url.searchParams.get("format") === "zip" ? "zip" : "csv";
  if (!from || !to || from > to) return NextResponse.json({ error: "A valid date range is required." }, { status: 400 });

  const query = supabase.from("invoices")
    .select("id, invoice_number, invoice_kind, lifecycle_status, related_invoice_id, issued_at, finalized_at, currency, status, material_total, labor_total, net_amount, tax_rate, tax_amount, total_amount, amount_paid, invoice_snapshot, clients!invoices_client_company_id_fkey(first_name, last_name)")
    .eq("company_id", companyId).gte("issued_at", from).lte("issued_at", to)
    .order("issued_at", { ascending: true }).order("invoice_number", { ascending: true });
  const { data: invoices, error } = await query;
  if (error) return NextResponse.json({ error: "Invoices could not be exported." }, { status: 500 });
  const invoiceIds = (invoices ?? []).map((invoice) => invoice.id);
  const { data: documents, error: documentError } = invoiceIds.length
    ? await supabase.from("invoice_documents")
      .select("invoice_id, document_format, storage_path, original_filename, sha256, size_bytes, document_standard, standard_version, validation_status")
      .eq("company_id", companyId).in("invoice_id", invoiceIds)
    : { data: [], error: null };
  if (documentError) return NextResponse.json({ error: "Archive metadata could not be exported." }, { status: 500 });

  const documentsByInvoice = new Map<string, typeof documents>();
  for (const document of documents ?? []) {
    const group = documentsByInvoice.get(document.invoice_id) ?? [];
    group.push(document);
    documentsByInvoice.set(document.invoice_id, group);
  }
  const headers = ["invoice_number", "kind", "lifecycle", "related_invoice_id", "issued_at", "finalized_at", "customer", "customer_type", "customer_vat_id", "buyer_reference", "currency", "payment_status", "material_total", "labor_total", "net_amount", "tax_rate", "tax_amount", "total_amount", "amount_paid", "pdf_sha256", "xml_sha256", "xml_standard", "xml_version", "xml_validation_status"];
  const lines = [headers.map(csv).join(",")];
  for (const invoice of invoices ?? []) {
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
    const docs = documentsByInvoice.get(invoice.id) ?? [];
    const pdf = docs.find((document) => document.document_format === "pdf");
    const xml = docs.find((document) => document.document_format === "xml");
    const snapshot = jsonObject(invoice.invoice_snapshot);
    const buyer = jsonObject(jsonObject(snapshot.accounting).buyer);
    lines.push([
      invoice.invoice_number, invoice.invoice_kind, invoice.lifecycle_status, invoice.related_invoice_id,
      invoice.issued_at, invoice.finalized_at,
      buyer.name || (client ? `${client.first_name} ${client.last_name}` : ""), buyer.customer_type, buyer.vat_id, buyer.buyer_reference, invoice.currency, invoice.status,
      invoice.material_total, invoice.labor_total, invoice.net_amount, invoice.tax_rate,
      invoice.tax_amount, invoice.total_amount, invoice.amount_paid, pdf?.sha256, xml?.sha256,
      xml?.document_standard, xml?.standard_version, xml?.validation_status
    ].map(csv).join(","));
  }
  const manifest = `\uFEFF${lines.join("\r\n")}\r\n`;
  const baseName = `pitlaneone-invoices-${from}-${to}`;
  if (format === "csv") {
    return new NextResponse(manifest, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      "Cache-Control": "private, no-store"
    }});
  }

  const zip = new JSZip();
  zip.file("manifest.csv", manifest);
  const { data: payments, error: paymentError } = await supabase.from("company_invoice_payments")
    .select("id, invoice_id, amount, payment_method, paid_at, entry_type, reason, recorded_by")
    .eq("company_id", companyId)
    .gte("paid_at", `${from}T00:00:00.000Z`)
    .lte("paid_at", `${to}T23:59:59.999Z`)
    .order("paid_at", { ascending: true });
  if (paymentError) return NextResponse.json({ error: "Payment ledger could not be exported." }, { status: 500 });
  const invoiceNumberById = new Map((invoices ?? []).map((invoice) => [invoice.id, invoice.invoice_number]));
  const paymentLines = [["entry_id", "invoice_id", "invoice_number", "entry_type", "signed_amount", "payment_method", "paid_at", "reason", "recorded_by"].map(csv).join(",")];
  for (const payment of payments ?? []) paymentLines.push([
    payment.id, payment.invoice_id, invoiceNumberById.get(payment.invoice_id), payment.entry_type,
    payment.entry_type === "refund" ? -Number(payment.amount) : payment.amount,
    payment.payment_method, payment.paid_at, payment.reason, payment.recorded_by
  ].map(csv).join(","));
  zip.file("payments-and-refunds.csv", `\uFEFF${paymentLines.join("\r\n")}\r\n`);
  zip.file("README.txt", "PitlaneOne accountant export\r\nPDF/ contains immutable visual copies.\r\nXML/ contains structured XRechnung files when applicable.\r\nmanifest.csv contains invoice totals and SHA-256 hashes.\r\npayments-and-refunds.csv is an append-only signed payment ledger; refunds are negative.\r\nXML rows marked preflight_passed were generated by a KoSIT-tested generator, but no per-document KoSIT report is archived yet.\r\n");
  const missing: string[] = [];
  for (const invoice of invoices ?? []) {
    const docs = documentsByInvoice.get(invoice.id) ?? [];
    if (!docs.length) missing.push(invoice.invoice_number ?? invoice.id);
    for (const document of docs) {
      const { data: file, error: downloadError } = await supabase.storage.from("invoice-archive").download(document.storage_path);
      if (downloadError || !file) { missing.push(`${invoice.invoice_number ?? invoice.id}: ${document.document_format}`); continue; }
      zip.file(`${document.document_format.toUpperCase()}/${document.original_filename}`, await file.arrayBuffer());
    }
  }
  if (missing.length) zip.file("MISSING_ARCHIVE.txt", `The following invoice archives were unavailable:\r\n${missing.join("\r\n")}\r\n`);
  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const archiveBody = new ArrayBuffer(archive.byteLength);
  new Uint8Array(archiveBody).set(archive);
  return new NextResponse(archiveBody, { headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${baseName}.zip"`,
    "Cache-Control": "private, no-store"
  }});
}
