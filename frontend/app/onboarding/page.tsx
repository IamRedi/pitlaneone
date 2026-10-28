import { redirect } from "next/navigation";
import type { Route } from "next";
import { CheckCircle2, Sparkles } from "lucide-react";
import { createCompany } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";
import { PitlaneOneMark } from "@/components/pitlane-one-brand";
import { listCompanyMemberships } from "@/lib/company";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; new?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("onboarding");
  const memberships = await listCompanyMemberships("/admin-login?next=%2Fonboarding");

  if (memberships[0] && params.new !== "1") {
    redirect(`/app/${memberships[0].company.id}` as Route);
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#171b1f] px-5 py-10 text-white sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(200,115,66,0.18),transparent_66%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:32px_32px]" />

      <section className="relative mx-auto grid w-full max-w-5xl gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
        <div className="py-3 lg:py-10">
          <PitlaneOneMark className="h-12 w-12 drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)]" />
          <p className="mt-6 text-xs font-black tracking-[0.1em] text-white">Pitlane<span className="text-[#e99b64]">One</span></p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Software për autoservise moderne</p>
          <h1 className="mt-8 max-w-md text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">{t("headline")}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">{t("description")}</p>
          <ul className="mt-8 grid gap-3 text-sm font-semibold text-slate-200">
            {[t("benefitOne"), t("benefitTwo"), t("benefitThree")].map((item) => (
              <li key={item} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e99b64]" aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </div>

        <div className="border border-white/10 bg-[#20262e]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="flex items-center gap-2 text-[#e99b64]"><Sparkles className="h-4 w-4" aria-hidden="true" /><p className="text-xs font-black uppercase tracking-[0.16em]">{t("step")}</p></div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{t("createTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{t("createDescription")}</p>

          {params.error ? <p className="mt-5 border border-rose-400/25 bg-rose-950/40 px-4 py-3 text-sm font-medium text-rose-100">{params.error}</p> : null}

          <form action={createCompany} className="mt-7 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-100">
              {t("companyName")}
              <input name="name" required minLength={2} maxLength={80} placeholder={t("companyNamePlaceholder")} className="border border-white/15 bg-[#14191e] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#e99b64] focus:ring-2 focus:ring-[#c87342]/30" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-100">
              {t("addressIdentifier")}
              <input name="slug" required minLength={3} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="auto-redia" className="border border-white/15 bg-[#14191e] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#e99b64] focus:ring-2 focus:ring-[#c87342]/30" />
              <span className="text-xs font-normal text-slate-400">{t("slugHint")}</span>
            </label>
            <SubmitButton label={t("createCompany")} pendingLabel={t("creating")} />
          </form>
        </div>
      </section>
    </main>
  );
}
