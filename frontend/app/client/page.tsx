import { redirect } from "next/navigation";
import { signOutForm } from "@/app/actions";
import { requireClient } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PortalServiceItem = {
  material_cost: number | null;
  labor_cost: number | null;
  fee: number | null;
};

type PortalServiceRelation =
  | {
      id?: string | null;
      vehicle_id?: string | null;
      service_items?: PortalServiceItem[] | null;
    }
  | {
      id?: string | null;
      vehicle_id?: string | null;
      service_items?: PortalServiceItem[] | null;
    }[]
  | null;

function invoiceStatusLabel(status: string) {
  if (status === "paid") {
    return "E paguar";
  }

  if (status === "partial") {
    return "Pagese e pjesshme";
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

function invoiceRowClass(status: string) {
  if (status === "paid") {
    return "bg-emerald-50/55";
  }

  if (status === "partial") {
    return "bg-amber-50/60";
  }

  return "bg-rose-50/50";
}

function paymentDisplay(status: string, paid: number, total: number) {
  if (status === "partial") {
    return `${formatCurrency(paid)} / ${formatCurrency(total)}`;
  }

  return formatCurrency(paid);
}

function compareSoonestDate(firstDate?: string | null, secondDate?: string | null) {
  return String(firstDate ?? "9999-12-31").localeCompare(String(secondDate ?? "9999-12-31"));
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getItemsTotal(items: PortalServiceItem[] | null | undefined) {
  return (items ?? []).reduce((sum, item) => {
    return sum + Number(item.material_cost ?? 0) + Number(item.labor_cost ?? 0) + Number(item.fee ?? 0);
  }, 0);
}

function getItemsBackedTotal(storedTotal: number | null | undefined, items: PortalServiceItem[] | null | undefined) {
  return items && items.length > 0 ? getItemsTotal(items) : Number(storedTotal ?? 0);
}

export default async function ClientPortal() {
  const { user, supabase } = await requireClient();

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, vehicles(id, model, plate_number, current_km, services(id, date, km, total_amount, type, notes, service_items(*)), reminders(*)), invoices(id, service_id, issued_at, due_date, amount_paid, status, total_amount, services(id, vehicle_id, service_items(*)))"
    )
    .eq("auth_user_id", user.id)
    .single();

  if (!client) {
    redirect("/client-login?error=Profili%20i%20klientit%20nuk%20u%20gjet.");
  }

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, model, plate_number, current_km, services(id, date, km, total_amount, type, notes, service_items(*)), reminders(*)")
    .eq("client_id", client.id);

  const vehicleRows = [...(vehicles ?? client.vehicles ?? [])].sort((a, b) => String(a.plate_number).localeCompare(String(b.plate_number)));
  const invoiceRows = [...(client.invoices ?? [])].sort(
    (a, b) => invoiceStatusRank(String(a.status)) - invoiceStatusRank(String(b.status)) || compareNewestDate(a.issued_at, b.issued_at) || String(b.id).localeCompare(String(a.id))
  );

  return (
    <main className="grid gap-6">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Portal Klienti</p>
            <h1 className="mt-2 text-3xl font-black text-ink">
              {client.first_name} {client.last_name}
            </h1>
            <p className="mt-2 text-sm text-slate">{client.phone}</p>
          </div>
          <form action={signOutForm}>
            <SubmitButton label="Dil" pendingLabel="Duke dale..." />
          </form>
        </div>
      </Panel>

      <section className="grid gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink">Automjetet</h2>
          <p className="mt-1 text-sm text-slate">Hap nje automjet per te pare sherbimet, faturat dhe kujtesat.</p>
        </div>

        {vehicleRows.length === 0 ? (
          <Panel>
            <p className="text-sm font-semibold text-slate">Nuk ka ende automjete te regjistruara ne profilin tend.</p>
          </Panel>
        ) : null}

        {vehicleRows.map((vehicle) => {
          const vehicleInvoices = invoiceRows.filter((invoice) => {
            const invoiceService = firstRelation((invoice as typeof invoice & { services?: PortalServiceRelation }).services);
            return invoiceService?.vehicle_id === vehicle.id;
          });
          const vehicleSpentTotal = vehicleInvoices.reduce((sum, invoice) => {
            const invoiceService = firstRelation((invoice as typeof invoice & { services?: PortalServiceRelation }).services);
            return sum + getItemsBackedTotal(invoice.total_amount, invoiceService?.service_items ?? []);
          }, 0);
          const vehicleServices = [...(vehicle.services ?? [])].sort((a, b) => compareNewestDate(a.date, b.date) || String(b.id).localeCompare(String(a.id)));
          const vehicleReminders = [...(vehicle.reminders ?? [])].sort(
            (a, b) => compareSoonestDate(a.next_date, b.next_date) || Number(a.next_km ?? 0) - Number(b.next_km ?? 0)
          );

          return (
            <details key={vehicle.id} className="group rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-ink">{vehicle.model}</h3>
                  <p className="mt-1 text-sm text-slate">Targa: {vehicle.plate_number}</p>
                  <p className="mt-1 text-sm text-slate">Kilometra aktuale: {vehicle.current_km.toLocaleString("sq-AL")}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Fatura</p>
                    <p className="mt-1 text-xl font-black text-ink">{vehicleInvoices.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Totali</p>
                    <p className="mt-1 text-xl font-black text-ink">{formatCurrency(vehicleSpentTotal)}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-soft px-4 py-3 text-brand-dark">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">Kujtesa</p>
                    <p className="mt-1 text-xl font-black">{vehicleReminders.length}</p>
                  </div>
                </div>
              </summary>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-ink">Historiku i sherbimeve</h3>
                  {vehicleServices.length === 0 ? (
                    <p className="rounded-[24px] bg-slate-50 p-4 text-sm font-semibold text-slate">Ky automjet nuk ka ende sherbime te regjistruara.</p>
                  ) : null}
                  {vehicleServices.map((service) => (
                    <div key={service.id} className="rounded-[24px] bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-ink">{service.type === "periodic" ? "Sherbim periodik" : "Sherbim normal"}</p>
                          <p className="text-sm text-slate">
                            {service.date} - {service.km.toLocaleString("sq-AL")} km
                          </p>
                        </div>
                        <span className="text-sm font-bold text-brand-dark">{formatCurrency(getItemsBackedTotal(service.total_amount, service.service_items ?? []))}</span>
                      </div>
                      {service.notes ? <p className="mt-3 text-sm text-slate">{service.notes}</p> : null}
                      <div className="mt-3 space-y-2">
                        {(service.service_items ?? []).map((item) => (
                          <div key={item.id} className="rounded-2xl bg-white/70 p-3 text-sm text-slate">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-ink">{item.name}</span>
                              <span className="font-bold text-ink">{formatCurrency(Number(item.material_cost) + Number(item.labor_cost) + Number(item.fee))}</span>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <span>Materiale: {formatCurrency(Number(item.material_cost) + Number(item.fee))}</span>
                              <span>
                                Haku punes: {formatCurrency(Number(item.labor_cost))}
                                {Number(item.labor_discount_percent ?? 0) > 0 ? (
                                  <span className="ml-1 font-semibold text-brand-dark">VIP -{Number(item.labor_discount_percent)}%</span>
                                ) : null}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-ink">Faturat e automjetit</h3>
                  {vehicleInvoices.length === 0 ? (
                    <p className="rounded-[24px] bg-slate-50 p-4 text-sm font-semibold text-slate">Nuk ka ende fatura per kete automjet.</p>
                  ) : null}
                  {vehicleInvoices.map((invoice) => {
                    const invoiceService = firstRelation((invoice as typeof invoice & { services?: PortalServiceRelation }).services);
                    const invoiceTotal = getItemsBackedTotal(invoice.total_amount, invoiceService?.service_items ?? []);
                    const paidAmount = Number(invoice.amount_paid ?? 0);

                    return (
                      <div key={invoice.id} className={`rounded-[24px] p-4 text-sm text-slate ${invoiceRowClass(String(invoice.status))}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-ink">Leshuar: {invoice.issued_at}</p>
                            <p>Afati: {invoice.due_date ?? "Pa afat"}</p>
                            <p className="mt-2">Paguar: {paymentDisplay(String(invoice.status), paidAmount, invoiceTotal)}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${invoiceStatusBadgeClass(String(invoice.status))}`}>
                            {invoiceStatusLabel(String(invoice.status))}
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-black text-ink">{formatCurrency(Math.max(invoiceTotal - paidAmount, 0))}</p>
                      </div>
                    );
                  })}

                  <h3 className="pt-2 text-lg font-bold text-ink">Mirembajtja e ardhshme</h3>
                  {vehicleReminders.length === 0 ? (
                    <p className="rounded-[24px] bg-slate-50 p-4 text-sm font-semibold text-slate">Nuk ka kujtesa aktive per kete automjet.</p>
                  ) : null}
                  {vehicleReminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate">
                      <p className="font-semibold text-ink">{reminder.type}</p>
                      <p className="mt-2">Km i ardhshem: {reminder.next_km ? reminder.next_km.toLocaleString("sq-AL") : "N/A"}</p>
                      <p>Data e ardhshme: {reminder.next_date ?? "N/A"}</p>
                      <p>Statusi: {reminder.notified ? "Njoftuar" : "Ne pritje"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </section>

      <Panel>
        <h2 className="text-2xl font-black text-ink">Faturat</h2>
        <div className="mt-4 grid gap-3">
          {invoiceRows.length === 0 ? (
            <p className="rounded-[24px] bg-slate-50 p-4 text-sm font-semibold text-slate">Nuk ka ende fatura per profilin tend.</p>
          ) : null}
          {invoiceRows.map((invoice) => {
            const service = firstRelation((invoice as typeof invoice & { services?: PortalServiceRelation }).services);
            const invoiceTotal = getItemsBackedTotal(invoice.total_amount, service?.service_items ?? []);
            const paidAmount = Number(invoice.amount_paid ?? 0);

            return (
              <div key={invoice.id} className={`flex flex-col gap-2 rounded-[24px] p-4 sm:flex-row sm:items-center sm:justify-between ${invoiceRowClass(String(invoice.status))}`}>
                <div className="text-sm text-slate">
                  <p className="font-semibold text-ink">Leshuar: {invoice.issued_at}</p>
                  <p>Afati: {invoice.due_date ?? "Pa afat"}</p>
                  <p className="mt-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${invoiceStatusBadgeClass(String(invoice.status))}`}>
                      {invoiceStatusLabel(String(invoice.status))}
                    </span>
                  </p>
                  <p className="mt-2">Paguar: {paymentDisplay(String(invoice.status), paidAmount, invoiceTotal)}</p>
                </div>
                <div className="text-lg font-black text-ink">{formatCurrency(Math.max(invoiceTotal - paidAmount, 0))}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </main>
  );
}
