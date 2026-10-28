import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { ServiceForm } from "./service-form";

export const dynamic = "force-dynamic";

export default async function NewServicePage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string; vehicleId?: string; error?: string }>;
}) {
  const { user, supabase } = await requireAdmin();
  const params = await searchParams;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, is_vip, vehicles(id, model, plate_number)")
    .eq("owner_id", user.id)
    .order("first_name");

  const clientOptions =
    clients?.map((client) => ({
      id: client.id,
      label: `${client.first_name} ${client.last_name}`,
      isVip: client.is_vip,
      vehicles: (client.vehicles ?? []).map((vehicle) => ({
        id: vehicle.id,
        label: `${vehicle.model} • ${vehicle.plate_number}`
      }))
    })) ?? [];

  return (
    <main className="mx-auto max-w-4xl">
      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Service Form</p>
            <h1 className="mt-2 text-3xl font-black text-ink">Regjistro sherbim te ri</h1>
          </div>
          <Link href="/admin" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Kthehu
          </Link>
        </div>

        {params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}

        <ServiceForm clients={clientOptions} initialClientId={params.clientId} initialVehicleId={params.vehicleId} />
      </Panel>
    </main>
  );
}
