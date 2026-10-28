import Link from "next/link";
import { Globe2, ShieldCheck } from "lucide-react";
import { BusinessSiteDemoWizard } from "@/components/business-site-demo-wizard";
import { requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function BusinessSiteStartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSaasUser("/admin-login?next=%2Fbusinesssite%2Fstart");
  const query = await searchParams;

  return (
    <main className="businesssite-onboarding relative isolate mx-auto min-h-screen w-full max-w-4xl overflow-hidden px-4 py-10 sm:px-6">
      <Link href="/businesssite" className="text-sm font-bold text-slate-600 hover:text-slate-950">
        ← Kthehu te BusinessSite
      </Link>
      <header className="mt-5 overflow-hidden rounded-2xl border border-[#25231f]/15 bg-[#fffaf2]/85 px-6 py-7 text-[#25231f] shadow-[0_24px_70px_rgba(69,53,41,.12)] sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">BusinessSite onboarding</p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-black sm:text-4xl">
          <Globe2 className="h-8 w-8 text-brand-soft" /> Krijo website-in tënd
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Zgjidh biznesin, plotëso të dhënat dhe kontrollo pamjen. Website-i nis privat, që ta rregullosh përpara publikimit.
        </p>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          Platforma aktivizon vetëm website-in, terminet online që zgjedh dhe katalogun prezantues — pa webshop dhe pa modulet e servisit.
        </div>
      </header>
      {query.error ? <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{query.error}</p> : null}
      <BusinessSiteDemoWizard mode="self_service" />
    </main>
  );
}
