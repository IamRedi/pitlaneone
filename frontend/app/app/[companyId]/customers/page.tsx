import Link from "next/link";
import type { Route } from "next";
import { Search, Star, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CompanyCustomerCreateForm } from "@/components/company-customer-create-form";
import { canManageCompanyOperations, requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

function messageFromSearchParams(value: string | undefined) {
  return value ? decodeURIComponent(value) : null;
}

export default async function CompanyCustomersPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ error?: string; saved?: string; q?: string; create?: string; returnTo?: string }> }) {
  const { companyId } = await params;
  const query = await searchParams;
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const t = await getTranslations("customerList");
  const term = query.q?.trim() ?? "";

  let customerQuery = supabase
    .from("clients")
    .select("id, first_name, last_name, phone, is_vip, created_at")
    .eq("company_id", context.company.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (term) {
    const safeTerm = term.replace(/[,%()]/g, " ").trim();
    if (safeTerm) customerQuery = customerQuery.or(`first_name.ilike.%${safeTerm}%,last_name.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%`);
  }

  const { data: customers, error } = await customerQuery;
  if (error) throw new Error("Klientet e kompanise nuk u ngarkuan.");

  const canCreate = canManageCompanyOperations(context.role);
  const errorMessage = messageFromSearchParams(query.error);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{t("eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("description", { company: context.company.name })}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700"><UsersRound className="h-4 w-4 text-brand" /> {customers?.length ?? 0} {t("inList")}</span>
      </header>

      {query.saved ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{t("saved")}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{errorMessage}</p> : null}
      {canCreate ? <CompanyCustomerCreateForm companyId={context.company.id} initialOpen={query.create === "1"} returnTo={query.returnTo === `/app/${context.company.id}/invoices/new` ? query.returnTo : undefined} /> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <form className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <span className="sr-only">{t("searchLabel")}</span>
            <input name="q" defaultValue={term} placeholder={t("searchPlaceholder")} className="w-full rounded-lg border border-slate-300 !py-2.5 !pl-11 !pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">{t("search")}</button>
        </form>

        {customers && customers.length > 0 ? <ul className="divide-y divide-slate-100">{customers.map((customer) => (
          <li key={customer.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex items-center gap-2"><Link href={`/app/${context.company.id}/customers/${customer.id}` as Route} className="truncate font-black text-slate-950 underline-offset-4 hover:text-brand hover:underline">{customer.first_name} {customer.last_name}</Link>{customer.is_vip ? <Star className="h-4 w-4 shrink-0 fill-brand text-brand" aria-label={t("vipLabel")} /> : null}</div><p className="mt-1 text-sm text-slate-600">{customer.phone}</p></div>
            <Link href={`/app/${context.company.id}/customers/${customer.id}` as Route} className="text-sm font-bold text-brand underline underline-offset-4">{t("profile")}</Link>
          </li>
        ))}</ul> : <div className="px-5 py-12 text-center text-sm text-slate-600">{term ? t("noneFound") : t("empty")}</div>}
      </section>
    </main>
  );
}
