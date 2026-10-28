import Link from "next/link";
import {
  Car,
  CarFront,
  ChevronDown,
  FileText,
  LogOut,
  Plus,
  TabletSmartphone,
  UserPlus,
  Users,
  WalletCards,
  Wrench
} from "lucide-react";
import { addClientForm, addVehicleForm, signOutForm } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { RevenuePrivacy } from "@/components/revenue-privacy";
import { SubmitButton } from "@/components/forms";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function invoiceStatusLabel(status: string) {
  if (status === "paid") {
    return "E paguar";
  }

  if (status === "partial") {
    return "Pjesshme";
  }

  return "Pa paguar";
}

function compareNewestDate(firstDate?: string | null, secondDate?: string | null) {
  return String(secondDate ?? "").localeCompare(String(firstDate ?? ""));
}

function invoiceStatusRank(status: string) {
  if (status === "paid") {
    return 3;
  }

  if (status === "partial") {
    return 2;
  }

  return 1;
}

function invoiceStatusBadgeClass(status: string) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  }

  if (status === "partial") {
    return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  }

  return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
}

function paymentDisplay(status: string, paid: number, total: number) {
  if (status === "partial") {
    return `${formatCurrency(paid)} / ${formatCurrency(total)}`;
  }

  return formatCurrency(paid);
}

type AdminInvoiceRow = {
  id: string;
  issued_at: string;
  due_date: string | null;
  amount_paid?: number | null;
  total_amount: number;
  status: string;
  services?:
    | {
        service_items?: {
          material_cost: number | null;
          labor_cost: number | null;
          fee: number | null;
        }[];
      }
    | {
        service_items?: {
          material_cost: number | null;
          labor_cost: number | null;
          fee: number | null;
        }[];
      }[]
    | null;
};

type AdminClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_vip: boolean;
  client_intake_notes?: {
    id: string;
    note: string;
    status: string;
    created_at: string;
  }[];
  vehicles?: {
    id: string;
    model: string;
    plate_number: string;
    current_km: number;
  }[];
  invoices?: AdminInvoiceRow[];
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getInvoiceTotal(invoice: AdminInvoiceRow) {
  const service = firstRelation(invoice.services);
  const items = service?.service_items ?? [];

  if (items.length === 0) {
    return Number(invoice.total_amount ?? 0);
  }

  return items.reduce((sum, item) => {
    return sum + Number(item.material_cost ?? 0) + Number(item.labor_cost ?? 0) + Number(item.fee ?? 0);
  }, 0);
}

export default async function AdminDashboard({
  searchParams
}: {
  searchParams: Promise<{ q?: string; error?: string; success?: string }>;
}) {
  const { adminProfile, user, supabase } = await requireAdmin();
  const params = await searchParams;

  const isSuperAdmin = adminProfile.role === "super_admin";
  const clientsSelectWithPayments =
    "id, first_name, last_name, phone, is_vip, client_intake_notes(id, note, status, created_at), vehicles(id, model, plate_number, current_km), invoices(id, issued_at, due_date, amount_paid, total_amount, status, services(service_items(material_cost, labor_cost, fee)))";
  const clientsSelectLegacy =
    "id, first_name, last_name, phone, is_vip, vehicles(id, model, plate_number, current_km), invoices(id, issued_at, due_date, total_amount, status)";

  const clientsResult = await supabase
    .from("clients")
    .select(clientsSelectWithPayments)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  let clients = clientsResult.data as AdminClientRow[] | null;
  let clientsError = clientsResult.error;

  if (clientsError) {
    console.error("ADMIN CLIENTS QUERY ERROR:", clientsError);
    const fallbackResult = await supabase
      .from("clients")
      .select(clientsSelectLegacy)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    clients = fallbackResult.data as AdminClientRow[] | null;
    clientsError = fallbackResult.error;
  }

  if (clientsError) {
    console.error("ADMIN CLIENTS FALLBACK ERROR:", clientsError);
  }

  const search = (params.q ?? "").toLowerCase();
  const filteredClients = (clients ?? []).filter((client) => {
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    const hasVehicle = client.vehicles?.some((vehicle) => vehicle.plate_number.toLowerCase().includes(search));
    return !search || fullName.includes(search) || Boolean(hasVehicle);
  });

  const revenue = filteredClients.flatMap((client) => client.invoices ?? []).reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const invoiceRows = filteredClients
    .flatMap((client) =>
      (client.invoices ?? []).map((invoice) => ({
        ...invoice,
        clientName: `${client.first_name} ${client.last_name}`,
        phone: client.phone,
        plateNumbers: (client.vehicles ?? []).map((vehicle) => vehicle.plate_number).join(", ")
      }))
    )
    .sort((a, b) => invoiceStatusRank(String(a.status)) - invoiceStatusRank(String(b.status)) || compareNewestDate(a.issued_at, b.issued_at) || String(b.id).localeCompare(String(a.id)));

  return (
    <main className="grid gap-5">
      <Panel className="overflow-hidden rounded-lg p-0">
        <header className="bg-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-soft">Paneli i servisit</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">Puna e dites</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isSuperAdmin ? (
                <>
                  <Link href="/admin/admins" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white">
                    <Users className="h-4 w-4" />
                    Adminet
                  </Link>
                  <Link href="/admin/kiosk" className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white transition hover:brightness-110">
                    <TabletSmartphone className="h-4 w-4" />
                    Kiosk
                  </Link>
                </>
              ) : null}
              <form action={signOutForm}>
                <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white">
                  <LogOut className="h-4 w-4" />
                  Dil
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white"><Users className="h-5 w-5" /></span>
            <div><p className="text-xs font-bold uppercase text-slate">Kliente</p><p className="text-2xl font-black text-ink">{filteredClients.length}</p></div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-brand-dark ring-1 ring-slate-200"><Car className="h-5 w-5" /></span>
            <div><p className="text-xs font-bold uppercase text-slate">Automjete</p><p className="text-2xl font-black text-ink">{filteredClients.reduce((sum, client) => sum + (client.vehicles?.length ?? 0), 0)}</p></div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-dark"><WalletCards className="h-5 w-5" /></span>
            <div><p className="text-xs font-bold uppercase text-slate">Te ardhura</p><RevenuePrivacy value={formatCurrency(revenue)} /></div>
          </div>
        </div>

        <div className="relative border-t border-slate-200 p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <form>
              <label htmlFor="client-search" className="sr-only">Kerko klient ose targe</label>
              <input id="client-search" defaultValue={params.q ?? ""} name="q" placeholder="Kerko klient ose targe" />
            </form>
            <details className="group md:min-w-56">
              <summary className="flex h-full min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white marker:content-none">
                <span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4" />Klient i ri</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:absolute md:left-6 md:right-6 md:z-20">
                <form action={addClientForm} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <input name="firstName" placeholder="Emri" required />
                  <input name="lastName" placeholder="Mbiemri" required />
                  <input name="phone" placeholder="+355..." required />
                  <input name="pin" type="password" placeholder="PIN per klientin" required />
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    <input name="isVip" type="checkbox" className="h-4 w-4 rounded border-slate-300 p-0" /> Klient VIP
                  </label>
                  <div className="xl:col-span-5 xl:text-right"><SubmitButton label="Krijo profilin" pendingLabel="Po ruhet..." /></div>
                </form>
              </div>
            </details>
          </div>

          {params.error ? <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
          {params.success ? <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{params.success}</p> : null}
        </div>
      </Panel>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/90 p-4 shadow-panel marker:content-none sm:p-5">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white"><FileText className="h-5 w-5" /></span>
            <span><span className="block text-lg font-black text-ink">Faturat</span><span className="block text-sm text-slate">{invoiceRows.length} fatura</span></span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-slate transition group-open:rotate-180" />
        </summary>
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white/90 shadow-panel">
          <div className="hidden grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.8fr] bg-slate-950 px-4 py-3 text-xs font-bold uppercase text-white md:grid">
            <span>Klienti</span><span>Data</span><span>Statusi</span><span>Paguar</span><span className="text-right">Mbetur</span>
          </div>
          {invoiceRows.length > 0 ? invoiceRows.map((invoice) => {
            const paid = Number(invoice.amount_paid ?? 0);
            const total = getInvoiceTotal(invoice);
            const remaining = Math.max(total - paid, 0);
            return (
              <Link key={invoice.id} href={`/admin/invoices/${invoice.id}`} className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-200 bg-white px-4 py-4 text-sm transition hover:bg-slate-50 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.8fr] md:items-center md:gap-2">
                <span className="col-span-2 md:col-span-1"><strong className="block text-ink">{invoice.clientName}</strong><span className="text-slate">{invoice.plateNumbers || invoice.phone}</span></span>
                <span><span className="mb-1 block text-xs font-bold uppercase text-slate md:hidden">Data</span><span className="text-slate">{invoice.issued_at}</span></span>
                <span><span className="mb-1 block text-xs font-bold uppercase text-slate md:hidden">Statusi</span><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${invoiceStatusBadgeClass(String(invoice.status))}`}>{invoiceStatusLabel(String(invoice.status))}</span></span>
                <span><span className="mb-1 block text-xs font-bold uppercase text-slate md:hidden">Paguar</span><span className="text-slate">{paymentDisplay(String(invoice.status), paid, total)}</span></span>
                <span className="md:text-right"><span className="mb-1 block text-xs font-bold uppercase text-slate md:hidden">Mbetur</span><strong className="text-brand-dark">{formatCurrency(remaining)}</strong></span>
              </Link>
            );
          }) : <p className="px-4 py-6 text-sm text-slate">Nuk ka fatura per kete kerkim.</p>}
        </div>
      </details>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/90 p-4 shadow-panel marker:content-none sm:p-5">
          <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white"><Users className="h-5 w-5" /></span><span><span className="block text-lg font-black text-ink">Klientet</span><span className="block text-sm text-slate">{filteredClients.length} kliente</span></span></span>
          <ChevronDown className="h-5 w-5 shrink-0 text-slate transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {filteredClients.map((client) => (
            <Panel key={client.id} id={`client-${client.id}`} className="relative rounded-lg p-0">
              <div className="flex flex-col gap-4 p-5 pr-16 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/clients/${client.id}`} className="text-lg font-black text-ink transition hover:text-brand-dark hover:underline">{client.first_name} {client.last_name}</Link>{client.is_vip ? <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-bold text-brand-dark">VIP</span> : null}</div>
                  <p className="mt-1 text-sm text-slate">{client.phone}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 text-center text-sm">
                  <div className="px-3 py-2"><p className="text-xs text-slate">Makina</p><p className="font-black text-ink">{client.vehicles?.length ?? 0}</p></div>
                  <div className="px-3 py-2"><p className="text-xs text-slate">Fatura</p><p className="font-black text-ink">{client.invoices?.length ?? 0}</p></div>
                  <div className="px-3 py-2"><p className="text-xs text-slate">Total</p><p className="font-black text-brand-dark">{formatCurrency((client.invoices ?? []).reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0))}</p></div>
                </div>
              </div>

              <details className="group/car">
                <summary aria-label="Shto makine" className="absolute right-5 top-5 grid h-10 w-10 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 bg-slate-50 text-brand-dark transition hover:bg-brand-soft marker:content-none">
                  <CarFront className="h-5 w-5" />
                  <Plus className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-brand p-0.5 text-white" />
                </summary>
                <form action={addVehicleForm} className="grid gap-2 border-t border-slate-200 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
                  <input type="hidden" name="clientId" value={client.id} /><input name="model" placeholder="Modeli" required /><input name="plateNumber" placeholder="Targa" required /><input name="vin" placeholder="VIN opsionale" /><input name="currentKm" type="number" placeholder="Kilometra" required /><div className="xl:col-span-4"><SubmitButton label="Shto makinen" pendingLabel="Po ruhet..." /></div>
                </form>
              </details>

              {(client.client_intake_notes ?? []).length > 0 ? <div className="border-t border-slate-200 bg-brand-soft px-5 py-3 text-sm font-semibold text-brand-dark">Shenim: {[...(client.client_intake_notes ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]?.note}</div> : null}

              {(client.vehicles ?? []).length > 0 ? <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2">{[...(client.vehicles ?? [])].sort((a, b) => String(a.plate_number).localeCompare(String(b.plate_number))).map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between gap-3 bg-white px-5 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{vehicle.model}</p><p className="text-xs font-semibold text-brand-dark">{vehicle.plate_number} - {vehicle.current_km.toLocaleString("sq-AL")} km</p></div>
                  <Link href={`/admin/services/new?clientId=${client.id}&vehicleId=${vehicle.id}`} title="Regjistro sherbim" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white"><Wrench className="h-4 w-4" /></Link>
                </div>
              ))}</div> : null}
            </Panel>
          ))}
        </div>
      </details>
    </main>
  );
}
