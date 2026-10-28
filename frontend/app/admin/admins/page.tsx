import Link from "next/link";
import type { Route } from "next";
import { createAdminForm, updateAdminForm } from "@/app/actions";
import { requireSuperAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin";
  is_active: boolean;
  created_at: string;
};

export default async function AdminManagementPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user } = await requireSuperAdmin();
  const params = await searchParams;
  const { data: admins, error } = await supabase
    .from("admins")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("ADMIN MANAGEMENT QUERY ERROR:", error);
  }

  const rows = (admins ?? []) as AdminRow[];

  return (
    <main className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Super Admin</p>
          <h1 className="mt-2 text-3xl font-black text-ink">Adminet dhe mekaniket</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Ketu krijohen llogarite e mekanikeve. Super admin nuk merr akses ne faturat e tyre; secili admin sheh punen e vet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href={"/admin/billing-grants" as Route} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Billing grants</Link><Link href="/admin" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Kthehu te paneli</Link></div>
      </div>

      {params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
      {params.success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{params.success}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-ink">Shto admin</h2>
            <p className="mt-1 text-sm text-slate">Krijon Supabase Auth user dhe profilin ne `public.admins`.</p>
          </div>

          <form action={createAdminForm} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Emri
              <input name="fullName" placeholder="p.sh. Mekanik 1" required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input name="email" type="email" placeholder="mekanik@servis.com" required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password fillestar
              <input name="password" type="password" minLength={8} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Roli
              <select name="role" defaultValue="admin" required>
                <option value="admin">Admin / mekanik</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
            <SubmitButton label="Krijo admin" pendingLabel="Po krijohet..." />
          </form>
        </Panel>

        <Panel className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-ink">Lista e admineve</h2>
            <p className="mt-1 text-sm text-slate">{rows.length} llogari admini</p>
          </div>

          <div className="grid gap-3">
            {rows.map((admin) => (
              <form key={admin.id} action={updateAdminForm} className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <input type="hidden" name="adminId" value={admin.id} />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-ink">{admin.full_name ?? "Pa emer"}</p>
                    <p className="text-sm text-slate">{admin.email}</p>
                  </div>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">
                    {admin.id === user.id ? "Ti" : admin.is_active ? "Aktiv" : "Jo aktiv"}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <label className="block text-sm font-medium text-slate-700">
                    Roli
                    <select name="role" defaultValue={admin.role} required>
                      <option value="admin">Admin / mekanik</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-800">
                    <input name="isActive" type="checkbox" defaultChecked={admin.is_active} className="h-4 w-4 rounded border-slate-300 p-0" />
                    Aktiv
                  </label>
                  <SubmitButton label="Ruaj" pendingLabel="Po ruhet..." />
                </div>
              </form>
            ))}

            {rows.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate">Nuk ka admin te regjistruar.</p> : null}
          </div>
        </Panel>
      </section>
    </main>
  );
}
