import Link from "next/link";
import { notFound } from "next/navigation";
import { updateInvoiceForm } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";
import { formatCurrency } from "@/lib/utils";
import { InvoiceItemsForm } from "./invoice-items-form";

export const dynamic = "force-dynamic";

type InvoiceDetail = {
  id: string;
  issued_at: string;
  due_date: string | null;
  amount_paid: number;
  status: "draft" | "issued" | "partial" | "paid";
  total_amount: number;
  clients:
    | {
        id: string;
        first_name: string;
        last_name: string;
        phone: string;
        is_vip: boolean;
        owner_id: string;
      }
    | {
        id: string;
        first_name: string;
        last_name: string;
        phone: string;
        is_vip: boolean;
        owner_id: string;
      }[];
  services:
    | {
        id: string;
        date: string;
        km: number;
        type: "normal" | "periodic";
        notes: string | null;
        total_amount: number;
        vehicles:
          | {
              id: string;
              model: string;
              plate_number: string;
              current_km: number;
            }
          | {
              id: string;
              model: string;
              plate_number: string;
              current_km: number;
            }[];
        service_items: {
          id: string;
          name: string;
          material_cost: number;
          labor_cost: number;
          labor_discount_percent: number;
          fee: number;
        }[];
      }
    | {
        id: string;
        date: string;
        km: number;
        type: "normal" | "periodic";
        notes: string | null;
        total_amount: number;
        vehicles:
          | {
              id: string;
              model: string;
              plate_number: string;
              current_km: number;
            }
          | {
              id: string;
              model: string;
              plate_number: string;
              current_km: number;
            }[];
        service_items: {
          id: string;
          name: string;
          material_cost: number;
          labor_cost: number;
          labor_discount_percent: number;
          fee: number;
        }[];
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: InvoiceDetail["status"]) {
  if (status === "paid") {
    return "E paguar";
  }

  if (status === "partial") {
    return "Pagese e pjesshme";
  }

  return "Pa paguar";
}

function statusBadgeClass(status: InvoiceDetail["status"]) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  }

  if (status === "partial") {
    return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  }

  return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
}

function getItemsTotal(items: { material_cost: number; labor_cost: number; fee: number }[]) {
  return items.reduce((sum, item) => {
    return sum + Number(item.material_cost ?? 0) + Number(item.labor_cost ?? 0) + Number(item.fee ?? 0);
  }, 0);
}

export default async function InvoiceDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const { user, supabase } = await requireAdmin();
  const invoiceSelectWithDiscount =
    "id, issued_at, due_date, amount_paid, status, total_amount, clients(id, first_name, last_name, phone, is_vip, owner_id), services(id, date, km, type, notes, total_amount, vehicles(id, model, plate_number, current_km), service_items(id, name, material_cost, labor_cost, labor_discount_percent, fee))";
  const invoiceSelectLegacy =
    "id, issued_at, due_date, amount_paid, status, total_amount, clients(id, first_name, last_name, phone, is_vip, owner_id), services(id, date, km, type, notes, total_amount, vehicles(id, model, plate_number, current_km), service_items(id, name, material_cost, labor_cost, fee))";

  let { data, error } = await supabase
    .from("invoices")
    .select(invoiceSelectWithDiscount)
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error) {
    console.error("INVOICE DETAIL QUERY ERROR:", error);
    const fallbackResult = await supabase.from("invoices").select(invoiceSelectLegacy).eq("id", id).eq("owner_id", user.id).single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error || !data) {
    console.error("INVOICE DETAIL FALLBACK ERROR:", error);
    notFound();
  }

  const invoice = data as unknown as InvoiceDetail;
  const client = firstRelation(invoice.clients);
  const service = firstRelation(invoice.services);
  const vehicle = firstRelation(service?.vehicles);
  const serviceItems = service?.service_items ?? [];

  if (!client || client.owner_id !== user.id) {
    notFound();
  }

  const materialsTotal = serviceItems.reduce((sum, item) => sum + Number(item.material_cost ?? 0) + Number(item.fee ?? 0), 0);
  const laborTotal = serviceItems.reduce((sum, item) => sum + Number(item.labor_cost ?? 0), 0);
  const discountRows = serviceItems.filter((item) => Number(item.labor_discount_percent ?? 0) > 0).length;
  const itemsTotal = getItemsTotal(serviceItems);
  const invoiceTotal = serviceItems.length > 0 ? itemsTotal : Number(invoice.total_amount ?? 0);
  const paidAmount = Number(invoice.amount_paid ?? 0);
  const remainingAmount = Math.max(invoiceTotal - paidAmount, 0);
  const invoiceNumber = invoice.id.slice(0, 8).toUpperCase();
  const isPaid = invoice.status === "paid";

  return (
    <main className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Fature Servisi</p>
          <h1 className="mt-2 text-3xl font-black text-ink">Fatura #{invoiceNumber}</h1>
        </div>
        <Link href="/admin" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          Kthehu te paneli
        </Link>
      </div>

      {messages.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{messages.error}</p> : null}
      {messages.success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel className="space-y-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate">Klienti</p>
              <h2 className="mt-1 text-2xl font-black text-ink">
                {client.first_name} {client.last_name}
              </h2>
              <p className="mt-1 text-sm text-slate">{client.phone}</p>
              {client.is_vip ? <span className="mt-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">VIP</span> : null}
            </div>

            <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
              <p className="text-sm text-slate-300">Totali</p>
              <p className="mt-1 text-3xl font-black">{formatCurrency(invoiceTotal)}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(invoice.status)}`}>{statusLabel(invoice.status)}</span>
                <span>Mbetur {formatCurrency(remainingAmount)}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Leshuar</p>
              <p className="mt-2 font-semibold text-ink">{invoice.issued_at}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Afati</p>
              <p className="mt-2 font-semibold text-ink">{invoice.due_date ?? "Pa afat"}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Paguar</p>
              <p className="mt-2 font-semibold text-ink">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Automjeti</p>
              <p className="mt-2 font-semibold text-ink">{vehicle ? `${vehicle.model} - ${vehicle.plate_number}` : "Pa automjet"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-ink">Sherbimi</h3>
            {service ? (
              <div className="mt-3 rounded-[24px] bg-slate-50 p-4 text-sm text-slate">
                <p className="font-semibold text-ink">{service.type === "periodic" ? "Sherbim periodik" : "Sherbim normal"}</p>
                <p className="mt-1">
                  {service.date} - {service.km.toLocaleString("sq-AL")} km
                </p>
                {service.notes ? <p className="mt-3">{service.notes}</p> : null}
              </div>
            ) : (
              <p className="mt-3 rounded-[24px] bg-slate-50 p-4 text-sm text-slate">Kjo fature nuk ka sherbim te lidhur.</p>
            )}
          </div>

          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-ink">Materiale dhe pune</h3>
                <p className="mt-1 text-sm text-slate">
                  {isPaid ? "Fatura eshte paguar dhe rreshtat jane mbyllur." : "Mund te shtosh ose ndryshosh defekte derisa fatura nuk eshte e paguar."}
                </p>
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-[24px] border border-slate-200">
              <div className="grid grid-cols-[1.5fr_1fr] bg-slate-950 px-4 py-3 text-sm font-bold text-white sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
                <span>Pershkrimi</span>
                <span className="hidden sm:block">Materiale</span>
                <span className="hidden sm:block">Haku punes</span>
                <span className="text-right">Totali</span>
              </div>
              {serviceItems.map((item) => {
                const lineTotal = Number(item.material_cost) + Number(item.labor_cost) + Number(item.fee);
                const materialWithRisk = Number(item.material_cost) + Number(item.fee);
                const discountPercent = Number(item.labor_discount_percent ?? 0);
                const laborCost = Number(item.labor_cost);
                const originalLaborCost = discountPercent > 0 ? laborCost / (1 - discountPercent / 100) : laborCost;
                const laborDiscountAmount = originalLaborCost - laborCost;

                return (
                  <div key={item.id} className="grid grid-cols-[1.5fr_1fr] gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
                    <span className="font-semibold text-ink">{item.name}</span>
                    <span className="hidden sm:block">{formatCurrency(materialWithRisk)}</span>
                    <span className="hidden sm:block">
                      {discountPercent > 0 ? (
                        <span className="grid gap-1">
                          <span>
                            <span className="text-slate line-through">{formatCurrency(originalLaborCost)}</span>
                            <span className="mx-1 text-slate">-&gt;</span>
                            <span className="font-semibold text-ink">{formatCurrency(laborCost)}</span>
                            <span className="ml-1 text-xs font-semibold text-brand-dark">VIP -{discountPercent}%</span>
                          </span>
                          <span className="text-xs text-slate">Zbritje: -{formatCurrency(laborDiscountAmount)}</span>
                        </span>
                      ) : (
                        formatCurrency(laborCost)
                      )}
                    </span>
                    <span className="text-right font-bold text-ink">{formatCurrency(lineTotal)}</span>
                  </div>
                );
              })}
            </div>
            {service && !isPaid ? (
              <InvoiceItemsForm
                invoiceId={invoice.id}
                serviceId={service.id}
                isVip={client.is_vip}
                items={serviceItems.map((item) => ({
                  name: item.name,
                  materialCost: Number(item.material_cost),
                  laborBaseCost:
                    Number(item.labor_discount_percent ?? 0) > 0
                      ? Number(item.labor_cost) / (1 - Number(item.labor_discount_percent) / 100)
                      : Number(item.labor_cost),
                  laborCost: Number(item.labor_cost),
                  laborDiscountPercent: Number(item.labor_discount_percent ?? 0),
                  fee: Number(item.fee)
                }))}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm text-slate">Materiale + risk</p>
              <p className="mt-1 text-xl font-black text-ink">{formatCurrency(materialsTotal)}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm text-slate">Haku punes</p>
              <p className="mt-1 text-xl font-black text-ink">{formatCurrency(laborTotal)}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm text-slate">Zbritje VIP</p>
              <p className="mt-1 text-xl font-black text-ink">{discountRows > 0 ? `${discountRows} rreshta` : "Jo"}</p>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Edito Faturen</p>
            <h2 className="mt-2 text-xl font-black text-ink">Statusi dhe afatet</h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              Regjistro pagesa te pjesshme dhe mbaj faturen te hapur deri ne pagesen finale.
            </p>
          </div>

          {isPaid ? (
            <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate">
              <p className="font-semibold text-ink">Fatura eshte paguar dhe nuk mund te editohet.</p>
              <p className="mt-1">Kjo e mban dokumentin final te qendrueshem per historik dhe raportim.</p>
            </div>
          ) : (
            <form action={updateInvoiceForm} className="space-y-3">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <label className="block text-sm font-medium text-slate-700">
                Data e leshimit
                <input name="issuedAt" type="date" required defaultValue={invoice.issued_at} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Afati i pageses
                <input name="dueDate" type="date" defaultValue={invoice.due_date ?? ""} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Shuma e paguar
                <input name="amountPaid" type="number" min="0" max={invoiceTotal} step="0.01" required defaultValue={paidAmount} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Statusi
                <select name="status" required defaultValue={invoice.status}>
                  <option value="draft">Draft / parapergatitje</option>
                  <option value="issued">E hapur / pa paguar</option>
                  <option value="partial">Pagese e pjesshme</option>
                  <option value="paid">E paguar</option>
                </select>
              </label>
              <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate">
                <p className="font-semibold text-ink">Mbetur per pagese: {formatCurrency(remainingAmount)}</p>
                <p className="mt-1">Ky eshte vendi ku me vone lidhet kujtesa automatike WhatsApp para afatit.</p>
              </div>
              <SubmitButton label="Ruaj ndryshimet" pendingLabel="Po ruhet..." />
            </form>
          )}
        </Panel>
      </section>
    </main>
  );
}
