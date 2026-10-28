import { getTranslations } from "next-intl/server";
import { clientLoginForm } from "@/app/actions";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  return <main className="mx-auto max-w-md"><Panel className="space-y-5"><div><h1 className="text-2xl font-black text-ink">{t("clientLoginTitle")}</h1><p className="mt-2 text-sm text-slate">{t("clientLoginDescription")}</p></div>{params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}<form action={clientLoginForm} className="space-y-4"><label className="block text-sm font-medium text-slate-700">{t("phone")}<input name="phone" type="tel" placeholder="+355 69 123 4567" required /></label><label className="block text-sm font-medium text-slate-700">{t("pin")}<input name="pin" type="password" inputMode="numeric" placeholder="1234" required /></label><SubmitButton label={t("signInPortal")} pendingLabel={t("verifying")} /></form></Panel></main>;
}
