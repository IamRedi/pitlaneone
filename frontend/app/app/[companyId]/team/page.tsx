import { redirect } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft, MailPlus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import { SubmitButton } from "@/components/forms";
import { canManageCompany, type CompanyRole, requireCompanyContext, requireSaasUser } from "@/lib/company";
import { addCompanyMember, createCompanyInvitation, revokeCompanyInvitation, updateCompanyMemberAccess } from "@/app/saas-actions";

function selectableRoles(actorRole: CompanyRole): Exclude<CompanyRole, "owner">[] {
  return actorRole === "owner"
    ? ["admin", "manager", "staff", "accounting", "viewer"]
    : ["manager", "staff", "accounting", "viewer"];
}

export const dynamic = "force-dynamic";

export default async function CompanyTeamPage({
  params,
  searchParams
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ saved?: string; inviteSent?: string; error?: string }>;
}) {
  const { companyId } = await params;
  const query = await searchParams;
  const t = await getTranslations("team");
  const tRoles = await getTranslations("roles");
  const locale = appLocaleFormats[toAppLocale(await getLocale())];
  const roleLabel = (role: CompanyRole) => tRoles(role);
  const context = await requireCompanyContext(companyId);

  if (!canManageCompany(context.role)) {
    redirect(`/app/${companyId}` as Route);
  }

  const { supabase, user } = await requireSaasUser();
  const { data: members, error } = await supabase
    .from("company_users")
    .select("user_id, role, is_active, member_email, created_at")
    .eq("company_id", context.company.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load company team.");
  }

  const { data: invitations, error: invitationsError } = await supabase
    .from("company_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .eq("company_id", context.company.id)
    .order("created_at", { ascending: false });

  if (invitationsError) {
    throw new Error("Could not load company invitations.");
  }

  const allowedRoles = selectableRoles(context.role);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <a href={`/app/${companyId}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950">
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </a>

      <header className="mt-5 border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("description")}</p>
      </header>

      {query.saved ? <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{t("saved")}</p> : null}
      {query.inviteSent ? <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{t("inviteSent")}</p> : null}
      {query.error ? <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{query.error}</p> : null}

      <details className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand"><UserPlus className="h-4 w-4" /></span><span><span className="block text-sm font-black text-slate-950">{t("addMember")}</span><span className="mt-0.5 block text-xs text-slate-600">{t("addMemberHint")}</span></span></span><span className="text-lg font-black text-slate-400">+</span></summary><form action={addCompanyMember} className="grid gap-4 border-t border-slate-200 p-5 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end sm:p-6">
          <input type="hidden" name="companyId" value={companyId} />
          <label className="grid gap-2 text-sm font-bold text-slate-800">{t("memberEmail")}<input name="email" required type="email" maxLength={254} placeholder="emri@kompania.com" className="rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">{t("role")}<select name="role" defaultValue={allowedRoles[0]} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">{allowedRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
          <SubmitButton label={t("addToTeam")} pendingLabel={t("adding")} />
        </form></details>

      <details className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand"><MailPlus className="h-4 w-4" /></span><span><span className="block text-sm font-black text-slate-950">{t("sendInvitation")}</span><span className="mt-0.5 block text-xs text-slate-600">{t("sendInvitationHint")}</span></span></span><span className="text-lg font-black text-slate-400">+</span></summary><div className="border-t border-slate-200 p-5 sm:p-6"><form action={createCompanyInvitation} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end">
          <input type="hidden" name="companyId" value={companyId} />
          <label className="grid gap-2 text-sm font-bold text-slate-800">{t("inviteEmail")}<input name="email" required type="email" maxLength={254} placeholder="emri@kompania.com" className="rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">{t("role")}<select name="role" defaultValue={allowedRoles[0]} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">{allowedRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
          <SubmitButton label={t("sendInvitation")} pendingLabel={t("sending")} />
        </form>

        {(invitations ?? []).length > 0 ? <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
          {(invitations ?? []).map((invitation) => {
            const expired = invitation.status === "pending" && new Date(invitation.expires_at) <= new Date();
            const label = invitation.status === "accepted" ? t("accepted") : invitation.status === "revoked" ? t("revoked") : expired ? t("expired") : t("pending");
            return <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-bold text-slate-900">{invitation.email}</p><p className="mt-0.5 text-slate-500">{roleLabel(invitation.role as CompanyRole)} - {new Date(invitation.expires_at).toLocaleDateString(locale)}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{label}</span>{invitation.status === "pending" && !expired ? <form action={revokeCompanyInvitation}><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="invitationId" value={invitation.id} /><button type="submit" className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-50">{t("cancel")}</button></form> : null}</div></div>;
          })}
        </div> : null}
      </div></details>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6"><UsersRound className="h-5 w-5 text-brand" /><div><p className="text-sm font-black text-slate-950">{t("members")}</p><p className="mt-0.5 text-sm text-slate-600">{t("memberCount", { count: members?.length ?? 0 })}</p></div></div>
        <div className="divide-y divide-slate-100">
          {(members ?? []).map((member) => {
            const memberRole = member.role as CompanyRole;
            const isOwner = memberRole === "owner";
            const canEditMember = !isOwner && member.user_id !== user.id && !(context.role === "admin" && memberRole === "admin");
            const permittedRoleOptions = context.role === "owner" ? ["admin", "manager", "staff", "accounting", "viewer"] : ["manager", "staff", "accounting", "viewer"];

            return <div key={member.user_id} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_13rem_auto] lg:items-center">
              <div className="min-w-0">{(context.role === "owner" || context.role === "manager" || member.user_id === user.id) ? <Link href={`/app/${companyId}/team/${member.user_id}` as Route} className="block rounded-lg -m-2 p-2 transition hover:bg-slate-50"><p className="truncate text-sm font-bold text-slate-950">{member.member_email ?? t("existingAccount")}</p><p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">{isOwner ? <ShieldCheck className="h-3.5 w-3.5 text-brand" /> : null}{isOwner ? t("owner") : member.is_active ? t("activeAccess") : t("disabledAccess")}</p></Link> : <><p className="truncate text-sm font-bold text-slate-950">{member.member_email ?? t("existingAccount")}</p><p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">{isOwner ? <ShieldCheck className="h-3.5 w-3.5 text-brand" /> : null}{isOwner ? t("owner") : member.is_active ? t("activeAccess") : t("disabledAccess")}</p></>}</div>
              {canEditMember ? <form action={updateCompanyMemberAccess} className="contents"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="userId" value={member.user_id} /><label className="sr-only">{t("role")}</label><select name="role" defaultValue={memberRole} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">{permittedRoleOptions.map((role) => <option key={role} value={role}>{roleLabel(role as CompanyRole)}</option>)}</select><div className="flex items-center gap-3"><label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked={member.is_active} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" /> {t("active")}</label><SubmitButton label={t("save")} pendingLabel="..." /></div></form> : <div className="lg:col-span-2"><span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">{roleLabel(memberRole)}</span></div>}
            </div>;
          })}
        </div>
      </section>
    </main>
  );
}
