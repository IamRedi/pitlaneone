import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, FileText } from "lucide-react";
import { PrintInvoiceButton } from "@/components/print-invoice-button";
import { requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

const documentCopy = {
  DE: {
    title: "KASSENBELEG",
    back: "Lager",
    date: "Verkaufsdatum",
    customer: "Kunde",
    description: "Artikel",
    quantity: "Menge",
    price: "Stückpreis",
    total: "Gesamt",
    gross: "Gesamtbetrag",
    paid: "Bezahlt",
    open: "Offen",
    status: "Status",
    paidStatus: "Bezahlt",
    partialStatus: "Teilbezahlt",
    openStatus: "Offen",
  },
  AL: {
    title: "KUPON SHITJE",
    back: "Magazina",
    date: "Data e shitjes",
    customer: "Klienti",
    description: "Artikulli",
    quantity: "Sasia",
    price: "Çmimi për njësi",
    total: "Gjithsej",
    gross: "Totali për pagesë",
    paid: "Paguar",
    open: "Mbetur",
    status: "Statusi",
    paidStatus: "E paguar",
    partialStatus: "Pjesërisht e paguar",
    openStatus: "E hapur",
  },
  IT: {
    title: "RICEVUTA DI VENDITA",
    back: "Magazzino",
    date: "Data vendita",
    customer: "Cliente",
    description: "Articolo",
    quantity: "Quantità",
    price: "Prezzo unitario",
    total: "Totale",
    gross: "Totale da pagare",
    paid: "Pagato",
    open: "Da pagare",
    status: "Stato",
    paidStatus: "Pagata",
    partialStatus: "Parzialmente pagata",
    openStatus: "Aperta",
  },
} as const;

export default async function CounterSaleDocumentPage({
  params,
}: {
  params: Promise<{ companyId: string; saleId: string }>;
}) {
  const { companyId, saleId } = await params;
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const [
    { data: sale, error },
    { data: lines },
    { data: profile },
    { data: theme },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("company_counter_sales")
      .select(
        "id, client_id, receipt_number, currency, status, total_amount, amount_paid, created_at",
      )
      .eq("id", saleId)
      .eq("company_id", context.company.id)
      .maybeSingle(),
    supabase
      .from("company_counter_sale_lines")
      .select("id, item_name, sku, quantity, unit_price, tax_rate, line_total")
      .eq("sale_id", saleId)
      .eq("company_id", context.company.id)
      .order("id"),
    supabase
      .from("company_profiles")
      .select("display_name, phone, email, address, city, country")
      .eq("company_id", context.company.id)
      .maybeSingle(),
    supabase
      .from("company_theme_settings")
      .select("logo_url")
      .eq("company_id", context.company.id)
      .maybeSingle(),
    supabase
      .from("company_invoice_settings")
      .select(
        "legal_name, tax_id, registration_number, invoice_footer, registration_country",
      )
      .eq("company_id", context.company.id)
      .maybeSingle(),
  ]);
  if (error) throw new Error("Counter sale could not be loaded.");
  if (!sale)
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <p className="rounded-xl border border-slate-200 bg-white p-6 font-bold">
          Shitja nuk u gjet.
        </p>
      </main>
    );

  const { data: client } = sale.client_id
    ? await supabase
        .from("clients")
        .select(
          "first_name, last_name, phone, billing_address, billing_postal_code, billing_city, billing_country",
        )
        .eq("id", sale.client_id)
        .eq("company_id", context.company.id)
        .maybeSingle()
    : { data: null };
  const country = settings?.registration_country;
  const copy =
    documentCopy[country === "AL" ? "AL" : country === "IT" ? "IT" : "DE"];
  const locale =
    country === "AL" ? "sq-AL" : country === "IT" ? "it-IT" : "de-DE";
  const money = (value: number) =>
    value.toLocaleString(locale, {
      style: "currency",
      currency: sale.currency,
    });
  const remaining = Math.max(
    0,
    Number(sale.total_amount) - Number(sale.amount_paid),
  );
  const status =
    sale.status === "paid"
      ? copy.paidStatus
      : sale.status === "partial"
        ? copy.partialStatus
        : copy.openStatus;
  const clientAddress = client
    ? [
        client.billing_address,
        [client.billing_postal_code, client.billing_city]
          .filter(Boolean)
          .join(" "),
        client.billing_country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/app/${companyId}/inventory` as Route}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand"
        >
          <ChevronLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <PrintInvoiceButton />
      </div>
      <article
        data-testid="counter-sale-document"
        className="invoice-document rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
      >
        <header className="flex flex-col gap-6 border-b-2 border-slate-900 pb-7 sm:flex-row sm:justify-between">
          <div className="flex items-start gap-4">
            {theme?.logo_url ? (
              <img
                src={theme.logo_url}
                alt="Company logo"
                className="h-16 w-32 object-contain"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-brand-soft">
                <FileText className="h-6 w-6" />
              </span>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-950">
                {settings?.legal_name ??
                  profile?.display_name ??
                  context.company.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {[profile?.address, profile?.city, profile?.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-sm text-slate-600">
                {[profile?.phone, profile?.email].filter(Boolean).join(" / ")}
              </p>
              {settings?.tax_id ? (
                <p className="mt-2 text-xs font-bold text-slate-700">
                  {settings.tax_id}
                </p>
              ) : null}
              {settings?.registration_number ? (
                <p className="text-xs font-bold text-slate-700">
                  {settings.registration_number}
                </p>
              ) : null}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">
              {copy.title}
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {sale.receipt_number}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {copy.date}:{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(sale.created_at))}
            </p>
          </div>
        </header>
        {client ? (
          <section className="border-b border-slate-200 py-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">
              {copy.customer}
            </p>
            <p className="mt-1 font-black text-slate-950">
              {`${client.first_name} ${client.last_name}`.trim()}
            </p>
            {clientAddress ? (
              <p className="text-sm text-slate-600">{clientAddress}</p>
            ) : null}
            {client.phone ? (
              <p className="text-sm text-slate-600">{client.phone}</p>
            ) : null}
          </section>
        ) : null}
        <section className="py-7">
          <div className="grid grid-cols-[minmax(0,1fr)_72px_110px_110px] gap-3 border-b border-slate-900 pb-3 text-right text-xs font-bold uppercase tracking-[.08em] text-slate-500">
            <span className="text-left">{copy.description}</span>
            <span>{copy.quantity}</span>
            <span>{copy.price}</span>
            <span>{copy.total}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {lines?.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[minmax(0,1fr)_72px_110px_110px] gap-3 py-4 text-right text-sm"
              >
                <span className="text-left font-semibold text-slate-800">
                  {line.item_name}
                  <small className="mt-1 block font-medium text-slate-500">
                    {line.sku}
                  </small>
                </span>
                <span>{Number(line.quantity)}</span>
                <span>{money(Number(line.unit_price))}</span>
                <strong>{money(Number(line.line_total))}</strong>
              </div>
            ))}
          </div>
        </section>
        <footer className="ml-auto grid max-w-xs gap-2 border-t border-slate-200 pt-5 text-sm">
          <div className="flex justify-between border-b-2 border-slate-900 pb-3 text-lg">
            <span className="font-black">{copy.gross}</span>
            <strong>{money(Number(sale.total_amount))}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{copy.paid}</span>
            <strong>{money(Number(sale.amount_paid))}</strong>
          </div>
          <div className="flex justify-between">
            <span className="font-black">{copy.open}</span>
            <strong>{money(remaining)}</strong>
          </div>
          <p className="pt-2 text-right text-xs font-bold uppercase tracking-[.13em] text-slate-500">
            {copy.status}: {status}
          </p>
          {settings?.invoice_footer ? (
            <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
              {settings.invoice_footer}
            </p>
          ) : null}
        </footer>
      </article>
    </main>
  );
}
