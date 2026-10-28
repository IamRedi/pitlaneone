import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ClipboardPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CompanyInvoiceStartWizard } from "@/components/company-invoice-start-wizard";
import { canManageCompanyOperations, requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function NewCompanyInvoicePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ customerId?: string; vehicleId?: string }> }) {
  const { companyId } = await params;
  const query = await searchParams;
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const t = await getTranslations("invoiceWizard");
  if (!canManageCompanyOperations(context.role)) return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6"><p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">{t("noAccess")}</p></main>;

  const [{ data: clients, error: clientsError }, { data: vehicles, error: vehiclesError }] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name, phone").eq("company_id", context.company.id).order("first_name").limit(500),
    supabase.from("vehicles").select("id, client_id, model, plate_number").eq("company_id", context.company.id).order("model").limit(1000)
  ]);
  if (clientsError || vehiclesError) throw new Error("Fatura e re nuk u ngarkua.");
  const vehiclesByCustomer = new Map<string, Array<{ id: string; model: string; plate: string }>>();
  for (const vehicle of vehicles ?? []) vehiclesByCustomer.set(vehicle.client_id, [...(vehiclesByCustomer.get(vehicle.client_id) ?? []), { id: vehicle.id, model: vehicle.model, plate: vehicle.plate_number }]);
  const customers = (clients ?? []).map((client) => ({ id: client.id, name: `${client.first_name} ${client.last_name}`.trim(), phone: client.phone, vehicles: vehiclesByCustomer.get(client.id) ?? [] }));

  return <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6"><Link href={`/app/${context.company.id}/invoices` as Route} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-brand"><ChevronLeft className="h-4 w-4" /> {t("back")}</Link><header className="rounded-xl border border-slate-200 bg-slate-950 px-6 py-7 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">{t("eyebrow")}</p><h1 className="mt-2 inline-flex items-center gap-3 text-3xl font-black"><ClipboardPlus className="h-7 w-7 text-brand-soft" /> {t("pageTitle")}</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">{t("pageDescription")}</p></header><CompanyInvoiceStartWizard companyId={context.company.id} customers={customers} selectedCustomerId={query.customerId} selectedVehicleId={query.vehicleId} /></main>;
}
