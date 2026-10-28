import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ShoppingBasket } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { InventorySalesPanel, type InventorySaleItem } from "@/components/inventory-sales-panel";
import { canManageCompanyOperations, requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function NewCounterSalePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await requireCompanyContext(companyId);
  if (!canManageCompanyOperations(context.role)) throw new Error("You do not have permission to create a counter sale.");
  const { supabase } = await requireSaasUser();
  const [{ data: items, error: itemError }, { data: clients, error: clientError }, { data: settings }] = await Promise.all([
    supabase.from("company_inventory_items").select("id, sku, barcode, name, sale_price, stock_quantity").eq("company_id", context.company.id).eq("is_active", true).gt("stock_quantity", 0).order("name"),
    supabase.from("clients").select("id, first_name, last_name, phone").eq("company_id", context.company.id).order("first_name").limit(500),
    supabase.from("company_invoice_settings").select("default_currency").eq("company_id", context.company.id).maybeSingle()
  ]);
  if (itemError || clientError) throw new Error("Could not load point of sale.");
  const t = await getTranslations("inventory");
  const clientOptions = (clients ?? []).map((client) => ({ id: client.id, name: `${client.first_name} ${client.last_name}`.trim(), phone: client.phone }));
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><Link href={`/app/${companyId}/inventory` as Route} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand"><ChevronLeft className="h-4 w-4" /> {t("title")}</Link><header className="mt-5 rounded-xl border border-slate-200 bg-slate-950 px-6 py-7 text-white"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">{t("counterSaleEyebrow")}</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><ShoppingBasket className="h-7 w-7 text-brand-soft" /> {t("counterSaleTitle")}</h1><p className="mt-2 text-sm text-slate-300">{t("counterSaleHint")}</p></header><div className="mt-6"><InventorySalesPanel companyId={companyId} currency={(settings?.default_currency === "ALL" ? "ALL" : "EUR")} items={(items ?? []) as InventorySaleItem[]} clients={clientOptions} standalone /></div></main>;
}
