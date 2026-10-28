import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/panel";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const isInvitation = params.next?.startsWith("/accept-invitation?invite=");
  return <main className="mx-auto max-w-md"><Panel className="space-y-5"><div><h1 className="text-2xl font-black text-ink">{t("resetTitle")}</h1><p className="mt-2 text-sm text-slate">{isInvitation ? t("resetInviteDescription") : t("resetDescription")}</p></div><ResetPasswordForm /></Panel></main>;
}
