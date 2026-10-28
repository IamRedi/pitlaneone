import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClientVipForm } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const { user, supabase } = await requireAdmin();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, is_vip")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !client) {
    notFound();
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Klient</p>
          <h1 className="mt-2 text-3xl font-black text-ink">
            {client.first_name} {client.last_name}
          </h1>
          <p className="mt-1 text-sm text-slate">{client.phone}</p>
        </div>
        <Link href="/admin" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          Kthehu te paneli
        </Link>
      </div>

      {messages.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{messages.error}</p> : null}
      {messages.success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages.success}</p> : null}

      <Panel>
        <form action={updateClientVipForm} className="space-y-4">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="flex items-center gap-3 rounded-[22px] bg-slate-50 p-4 text-sm font-semibold text-slate-800">
            <input name="isVip" type="checkbox" defaultChecked={client.is_vip} className="h-4 w-4 rounded border-slate-300 p-0" />
            VIP Client
          </label>
          <SubmitButton label="Ruaj klientin" pendingLabel="Po ruhet..." />
        </form>
      </Panel>
    </main>
  );
}
