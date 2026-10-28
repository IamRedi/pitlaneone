import { redirect } from "next/navigation";
import type { Route } from "next";
import { MailCheck } from "lucide-react";
import { acceptCompanyInvitation } from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";
import { Panel } from "@/components/panel";
import { requireSaasUser } from "@/lib/company";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  searchParams
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const t = await getTranslations("auth");

  if (!invite) {
    redirect(`/onboarding?error=${encodeURIComponent(t("invalidInvitation"))}` as Route);
  }

  await requireSaasUser();

  return (
    <main className="mx-auto max-w-md">
      <Panel className="space-y-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <MailCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-ink">{t("acceptInviteTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate">
            {t("acceptInviteDescription")}
          </p>
        </div>
        <form action={acceptCompanyInvitation}>
          <input type="hidden" name="invitationId" value={invite} />
          <SubmitButton label={t("acceptAndContinue")} pendingLabel={t("accepting")} />
        </form>
      </Panel>
    </main>
  );
}
