import Link from "next/link";
import { addKioskClientForm } from "@/app/actions";
import { requireSuperAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

type MechanicRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin";
};

export default async function KioskPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase } = await requireSuperAdmin();
  const params = await searchParams;
  const { data: mechanics, error } = await supabase
    .from("admins")
    .select("id, email, full_name, role")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("KIOSK ADMINS QUERY ERROR:", error);
  }

  const rows = ((mechanics ?? []) as MechanicRow[]).filter((admin) => admin.role === "admin");

  return (
    <main className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Kiosk Mode</p>
          <h1 className="mt-2 text-3xl font-black text-ink">Regjistrim klienti</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Faqe per monitor touch ne servis. Klienti ploteson te dhenat, zgjedh mekanikun dhe le shenim per defektin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/admins" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
            Adminet
          </Link>
          <Link href="/admin" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
            Paneli
          </Link>
        </div>
      </div>

      {params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
      {params.success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{params.success}</p> : null}

      <Panel>
        <form action={addKioskClientForm} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-base font-bold text-slate-700">
              Emri
              <input name="firstName" className="mt-2 text-lg" placeholder="Emri" required />
            </label>
            <label className="block text-base font-bold text-slate-700">
              Mbiemri
              <input name="lastName" className="mt-2 text-lg" placeholder="Mbiemri" required />
            </label>
            <label className="block text-base font-bold text-slate-700">
              Telefoni
              <input name="phone" className="mt-2 text-lg" placeholder="+355..." required />
            </label>
            <label className="block text-base font-bold text-slate-700">
              PIN per portalin
              <input name="pin" type="password" minLength={4} maxLength={12} className="mt-2 text-lg" placeholder="4-12 shifra/karaktere" required />
            </label>
          </div>

          <label className="block text-base font-bold text-slate-700">
            Mekaniku
            <select name="mechanicAdminId" className="mt-2 text-lg" required defaultValue="">
              <option value="" disabled>
                Zgjidh mekanikun
              </option>
              {rows.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name ?? admin.email}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
            <label className="block text-base font-bold text-slate-700">
              Modeli makines
              <input name="vehicleModel" className="mt-2 text-lg" placeholder="p.sh. Golf 7" />
            </label>
            <label className="block text-base font-bold text-slate-700">
              Targa
              <input name="plateNumber" className="mt-2 text-lg" placeholder="AB123CD" />
            </label>
            <label className="block text-base font-bold text-slate-700">
              Km aktuale
              <input name="currentKm" type="number" min="0" className="mt-2 text-lg" placeholder="145000" />
            </label>
          </div>

          <label className="block text-base font-bold text-slate-700">
            Shenim / defekti
            <textarea
              name="note"
              rows={5}
              className="mt-2 text-lg"
              placeholder="Pershkruaj problemin, zhurmen, defektin ose kerkesen..."
              required
            />
          </label>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-300">Pas regjistrimit</p>
              <p className="mt-1 font-semibold">Klienti lidhet me mekanikun e zgjedhur dhe mund te hyje me telefon + PIN.</p>
            </div>
            <SubmitButton label="Regjistro klientin" pendingLabel="Po regjistrohet..." />
          </div>
        </form>
      </Panel>
    </main>
  );
}
