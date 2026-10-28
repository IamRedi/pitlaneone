import Link from "next/link";
import { createBillingAccessGrant, revokeBillingAccessGrant } from "@/app/billing-admin-actions";
import { requireSuperAdmin } from "@/lib/auth";
import { Panel } from "@/components/panel";
import { SubmitButton } from "@/components/forms";

type GrantRow = { id: string; email: string | null; user_id: string | null; product_key: string; entitlement_level: string; source: string; reason: string; starts_at: string; expires_at: string | null; revoked_at: string | null; revocation_reason: string | null; created_at: string };

export const dynamic = "force-dynamic";

export default async function BillingGrantsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { supabase } = await requireSuperAdmin();
  const params = await searchParams;
  const result = await (supabase.rpc as unknown as (name: string) => Promise<{ data: unknown; error: { message: string } | null }>)("list_billing_access_grants");
  const rows = Array.isArray(result.data) ? result.data as GrantRow[] : [];

  return <main className="mx-auto grid max-w-5xl gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.22em] text-brand-dark">Platform billing</p><h1 className="mt-2 text-3xl font-black text-ink">Free access grants</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Central, auditable access for VIP, internal, founder and promotional users. A grant is always limited to one product.</p></div><Link href="/admin" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Kthehu te paneli</Link></div>
    {params.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}
    {params.saved ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Grant-i u ruajt.</p> : null}
    <Panel><form action={createBillingAccessGrant} className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Email i aprovuar<input name="email" type="email" required placeholder="tester@example.com" /></label><label className="text-sm font-semibold text-slate-700">Produkt<select name="productKey" defaultValue="businesssite"><option value="businesssite">BusinessSite</option><option value="pitlane">PitlaneOne</option></select></label><label className="text-sm font-semibold text-slate-700">Niveli<select name="entitlementLevel" defaultValue="core"><option value="core">Core</option><option value="team">Team</option><option value="internal">Internal</option></select></label><label className="text-sm font-semibold text-slate-700">Burimi<select name="source" defaultValue="vip_free"><option value="vip_free">VIP Free</option><option value="internal_free">Internal Free</option><option value="promo_grant">Promo Grant</option><option value="founder_grant">Founder Grant</option><option value="support_grant">Support Grant</option></select></label><label className="text-sm font-semibold text-slate-700">Skadon (opsionale)<input name="expiresAt" type="datetime-local" /></label><label className="text-sm font-semibold text-slate-700 md:col-span-2">Arsye<textarea name="reason" required minLength={3} maxLength={500} placeholder="P.sh. Pilot feedback customer — approved by owner" /></label><div className="md:col-span-2"><SubmitButton label="Jep akses" pendingLabel="Po ruhet..." /></div></form></Panel>
    <Panel><h2 className="text-xl font-black text-ink">Grants te regjistruara</h2><div className="mt-4 grid gap-3">{rows.map((grant) => <div key={grant.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold text-ink">{grant.email ?? grant.user_id}</p><p className="mt-1 text-sm text-slate">{grant.product_key} · {grant.entitlement_level} · {grant.source}</p><p className="mt-1 text-xs text-slate">{grant.reason}{grant.revocation_reason ? ` · Revoked: ${grant.revocation_reason}` : ""}</p></div><span className="text-xs font-bold text-slate">{grant.revoked_at ? "Revoked" : grant.expires_at ? `Expires ${new Date(grant.expires_at).toLocaleString()}` : "Permanent"}</span></div>{!grant.revoked_at ? <form action={revokeBillingAccessGrant} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="grantId" value={grant.id} /><input className="max-w-sm" name="reason" required minLength={3} placeholder="Arsye per revokim" /><SubmitButton label="Revoko" pendingLabel="Po revokohet..." /></form> : null}</div>)}{rows.length === 0 ? <p className="text-sm text-slate">Nuk ka grants ende.</p> : null}</div></Panel>
  </main>;
}
