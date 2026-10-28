import Link from "next/link";
import { Globe2 } from "lucide-react";
import { BusinessSiteDemoWizard } from "@/components/business-site-demo-wizard";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BusinessSiteDemoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;

  return <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"><Link href="/admin" className="text-sm font-bold text-slate-600 hover:text-slate-950">← Kthehu te admini</Link><header className="mt-5 rounded-2xl bg-slate-950 px-6 py-7 text-white"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">BusinessSite Engine</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-black"><Globe2 className="h-7 w-7 text-brand-soft" /> Gjenero website</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">I njëjti generation plan përdoret nga ky wizard dhe nga automatizimi. Website-i nis privat dhe mbetet plotësisht i editueshëm.</p></header>{query.error ? <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{query.error}</p> : null}<BusinessSiteDemoWizard /></main>;
}
