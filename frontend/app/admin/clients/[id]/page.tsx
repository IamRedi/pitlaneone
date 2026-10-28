import Link from "next/link";
import { notFound } from "next/navigation";
import { addVehicleForm, updateClientVipForm } from "@/app/actions";
import { SubmitButton } from "@/components/forms";
import { Panel } from "@/components/panel";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ClientInvoice = {
  id: string;
  issued_at: string;
  due_date: string | null;
  amount_paid?: number | null;
  total_amount: number;
  status: string;
  services?:
    | {
        id: string;
        date: string;
        km: number;
        notes: string | null;
        vehicles?:
          | {
              id: string;
              model: string;
              plate_number: string;
            }
          | {
              id: string;
              model: string;
              plate_number: string;
            }[]
          | null;
        service_items?: {
          name: string;
          material_cost: number | null;
          labor_cost: number | null;
          fee: number | null;
        }[];
      }
    | {
        id: string;
        date: string;
        km: number;
        notes: string | null;
        vehicles?:
          | {
              id: string;
              model: string;
              plate_number: string;
            }
          | {
              id: string;
              model: string;
              plate_number: string;
            }[]
          | null;
        service_items?: {
          name: string;
          material_cost: number | null;
          labor_cost: number | null;
          fee: number | null;
        }[];
      }[]
    | null;
};

type ClientProfile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_vip: boolean;
  vehicles?: {
    id: string;
    model: string;
    plate_number: string;
    vin: string | null;
    current_km: number;
  }[];
  invoices?: ClientInvoice[];
  client_intake_notes?: {
    id: string;
    note: string;
    status: string;
    created_at: string;
  }[];
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function invoiceStatusLabel(status: string) {
  if (status === "paid") {
    return "E paguar";
  }

  if (status === "partial") {
    return "Pjesshme";
  }

  return "Pa paguar";
}

function invoiceStatusClass(status: string) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  }

  if (status === "partial") {
    return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  }

  return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
}

function getInvoiceTotal(invoice: ClientInvoice) {
  const service = firstRelation(invoice.services);
  const items = service?.service_items ?? [];

  if (items.length === 0) {
    return Number(invoice.total_amount ?? 0);
  }

  return items.reduce((sum, item) => {
    return sum + Number(item.material_cost ?? 0) + Number(item.labor_cost ?? 0) + Number(item.fee ?? 0);
  }, 0);
}

function compareNewestDate(firstDate?: string | null, secondDate?: string | null) {
  return String(secondDate ?? "").localeCompare(String(firstDate ?? ""));
}

export default async function ClientProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const { user, supabase } = await requireAdmin();
  const clientSelect =
    "id, first_name, last_name, phone, is_vip, vehicles(id, model, plate_number, vin, current_km), client_intake_notes(id, note, status, created_at), invoices(id, issued_at, due_date, amount_paid, total_amount, status, services(id, date, km, notes, vehicles(id, model, plate_number), service_items(name, material_cost, labor_cost, fee)))";
  const clientSelectLegacy =
    "id, first_name, last_name, phone, is_vip, vehicles(id, model, plate_number, vin, current_km), invoices(id, issued_at, due_date, amount_paid, total_amount, status, services(id, date, km, notes, vehicles(id, model, plate_number), service_items(name, material_cost, labor_cost, fee)))";

  const clientResult = await supabase.from("clients").select(clientSelect).eq("id", id).eq("owner_id", user.id).single();
  let data: unknown = clientResult.data;
  let error = clientResult.error;

  if (error) {
    const fallbackResult = await supabase.from("clients").select(clientSelectLegacy).eq("id", id).eq("owner_id", user.id).single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error || !data) {
    notFound();
  }

  const client = data as unknown as ClientProfile;
  const vehicles = [...(client.vehicles ?? [])].sort((a, b) => String(a.plate_number).localeCompare(String(b.plate_number)));
  const invoices = [...(client.invoices ?? [])].sort((a, b) => compareNewestDate(a.issued_at, b.issued_at));
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_paid ?? 0), 0);
  const totalRemaining = Math.max(totalInvoiced - totalPaid, 0);

  return (
    <main className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Profili i klientit</p>
          <h1 className="mt-2 text-3xl font-black text-white">
            {client.first_name} {client.last_name}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{client.phone}</p>
        </div>
        <Link href="/admin" className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
          Kthehu te paneli
        </Link>
      </div>

      {messages.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{messages.error}</p> : null}
      {messages.success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-[22px] bg-slate-950 p-4 text-white">
              <p className="text-sm text-slate-300">Makina</p>
              <p className="mt-2 text-3xl font-black">{vehicles.length}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm text-slate">Fatura</p>
              <p className="mt-2 text-3xl font-black text-ink">{invoices.length}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm text-slate">Paguar</p>
              <p className="mt-2 text-2xl font-black text-ink">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="rounded-[22px] bg-brand p-4 text-white">
              <p className="text-sm text-white/80">Mbetur</p>
              <p className="mt-2 text-2xl font-black">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-ink">Makinat</h2>
                <p className="mt-1 text-sm text-slate">Zgjidh makinen dhe regjistro sherbimin direkt.</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-ink">{vehicle.model}</h3>
                        <p className="mt-1 text-sm font-bold text-brand-dark">{vehicle.plate_number}</p>
                        <p className="mt-1 text-sm text-slate">Km: {vehicle.current_km.toLocaleString("sq-AL")}</p>
                        {vehicle.vin ? <p className="mt-1 text-xs text-slate">VIN: {vehicle.vin}</p> : null}
                      </div>
                      <Link
                        href={`/admin/services/new?clientId=${client.id}&vehicleId=${vehicle.id}`}
                        className="rounded-full bg-brand px-3 py-2 text-xs font-bold text-white"
                      >
                        Sherbim
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate">Ky klient nuk ka ende makine.</p>
              )}
            </div>
          </div>

          <details className="rounded-[24px] border border-slate-200 bg-white/70 p-4">
            <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-brand-dark">
              Shto makine
            </summary>
            <form action={addVehicleForm} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="clientId" value={client.id} />
              <input name="model" placeholder="Volkswagen Golf 7" required />
              <input name="plateNumber" placeholder="AB123CD" required />
              <input name="vin" placeholder="VIN opsionale" />
              <input name="currentKm" type="number" placeholder="145000" required />
              <div className="md:col-span-2">
                <SubmitButton label="Shto makinen" pendingLabel="Po ruhet..." />
              </div>
            </form>
          </details>
        </Panel>

        <Panel className="space-y-5">
          <div>
            <h2 className="text-xl font-black text-ink">Te dhenat e profilit</h2>
            <p className="mt-1 text-sm text-slate">Konfigurime te shpejta per klientin.</p>
          </div>

          <form action={updateClientVipForm} className="space-y-4">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="flex items-center gap-3 rounded-[22px] bg-slate-50 p-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
              <input name="isVip" type="checkbox" defaultChecked={client.is_vip} className="h-4 w-4 rounded border-slate-300 p-0" />
              Klient VIP
            </label>
            <SubmitButton label="Ruaj profilin" pendingLabel="Po ruhet..." />
          </form>

          {(client.client_intake_notes ?? []).length > 0 ? (
            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-brand-dark">Shenime nga kiosk</h3>
              <div className="mt-3 grid gap-2">
                {[...(client.client_intake_notes ?? [])]
                  .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
                  .map((note) => (
                    <p key={note.id} className="rounded-2xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">
                      {note.note}
                    </p>
                  ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </section>

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">Faturat dhe sherbimet</h2>
            <p className="mt-1 text-sm text-slate">Historiku financiar dhe puna e bere per kete klient.</p>
          </div>
          <p className="text-sm font-semibold text-slate">Totali {formatCurrency(totalInvoiced)}</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="hidden grid-cols-[0.8fr_1.1fr_0.9fr_0.9fr_0.8fr] bg-slate-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white md:grid">
            <span>Data</span>
            <span>Makina</span>
            <span>Statusi</span>
            <span>Totali</span>
            <span className="text-right">Mbetur</span>
          </div>
          {invoices.length > 0 ? (
            invoices.map((invoice) => {
              const service = firstRelation(invoice.services);
              const vehicle = firstRelation(service?.vehicles);
              const total = getInvoiceTotal(invoice);
              const paid = Number(invoice.amount_paid ?? 0);
              const remaining = Math.max(total - paid, 0);

              return (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="grid gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm transition hover:bg-slate-50 md:grid-cols-[0.8fr_1.1fr_0.9fr_0.9fr_0.8fr] md:items-center"
                >
                  <span className="font-semibold text-ink">{invoice.issued_at}</span>
                  <span className="text-slate">
                    {vehicle ? `${vehicle.model} - ${vehicle.plate_number}` : "Pa makine"}
                    {service?.km ? <span className="block text-xs">Km: {service.km.toLocaleString("sq-AL")}</span> : null}
                  </span>
                  <span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${invoiceStatusClass(String(invoice.status))}`}>
                      {invoiceStatusLabel(String(invoice.status))}
                    </span>
                  </span>
                  <span className="font-semibold text-slate">{formatCurrency(total)}</span>
                  <span className="font-black text-brand-dark md:text-right">{formatCurrency(remaining)}</span>
                </Link>
              );
            })
          ) : (
            <p className="px-4 py-5 text-sm text-slate">Ende nuk ka fatura per kete klient.</p>
          )}
        </div>
      </Panel>
    </main>
  );
}
