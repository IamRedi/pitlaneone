import { getLocale, getTranslations } from "next-intl/server";
import { PackageSearch, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  InventorySalesPanel,
  type InventorySaleItem,
} from "@/components/inventory-sales-panel";
import { receiveCompanyInventoryStock } from "@/app/saas-actions";
import { InventoryItemCreateForm } from "@/components/inventory-item-create-form";
import { appLocaleFormats, toAppLocale } from "@/i18n/config";
import {
  canManageCompanyOperations,
  requireCompanyContext,
  requireSaasUser,
} from "@/lib/company";

export const dynamic = "force-dynamic";

type CounterSale = {
  id: string;
  receipt_number: string;
  currency: "EUR" | "ALL";
  status: string;
  total_amount: number | string;
  amount_paid: number | string;
  created_at: string;
  creator_email: string | null;
  line_count: number | string;
};

function dateFilter(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ error?: string; from?: string; to?: string }>;
}) {
  const { companyId } = await params;
  const query = await searchParams;
  const from = dateFilter(query.from);
  const to = dateFilter(query.to);
  const context = await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  const t = await getTranslations("inventory");
  const tHistory = await getTranslations("inventoryHistory");
  const locale = appLocaleFormats[toAppLocale(await getLocale())];
  const { data: items, error } = await supabase
    .from("company_inventory_items")
    .select(
      "id, sku, barcode, name, description, unit, sale_price, stock_quantity, reorder_level",
    )
    .eq("company_id", context.company.id)
    .eq("is_active", true)
    .order("name");
  const { data: settings } = await supabase
    .from("company_invoice_settings")
    .select("default_currency")
    .eq("company_id", context.company.id)
    .maybeSingle();
  const { data: rawSales, error: salesError } = await supabase.rpc(
    "list_company_counter_sales",
    {
      input_company_id: context.company.id,
      input_from: from ?? null,
      input_to: to ?? null,
    },
  );
  if (error) throw new Error("Inventory could not be loaded.");
  if (salesError) throw new Error("Inventory sales could not be loaded.");

  const canOperate = canManageCompanyOperations(context.role);
  const currency = settings?.default_currency ?? "EUR";
  const money = (value: number) =>
    value.toLocaleString(locale, { style: "currency", currency });
  const sales = (rawSales ?? []) as CounterSale[];
  const saleTotal = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0,
  );
  const paidTotal = sales.reduce(
    (sum, sale) => sum + Number(sale.amount_paid),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="rounded-2xl border border-slate-200 bg-slate-950 px-6 py-7 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">
          {t("eyebrow")}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t("title")}</h1>
            <p className="mt-2 text-sm text-slate-300">{t("description")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/app/${companyId}/inventory/sale` as Route}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
            >
              <ShoppingBasket className="h-4 w-4" />
              {t("newSale")}
            </Link>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                {t("items")}
              </p>
              <p className="mt-1 text-2xl font-black">{items?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </header>
      {query.error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-800">
          {decodeURIComponent(query.error)}
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {t("items")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {items?.length ?? 0} {t("items").toLowerCase()}
              </p>
            </div>
            {canOperate ? (
              <InventoryItemCreateForm companyId={companyId} />
            ) : null}
          </div>
          {items?.length ? (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const lowStock =
                  Number(item.stock_quantity) <= Number(item.reorder_level);
                return (
                  <li
                    key={item.id}
                    data-testid="inventory-item"
                    data-inventory-sku={item.sku}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-slate-950">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.sku}
                          {item.barcode ? ` · ${item.barcode}` : ""}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p
                          data-testid="inventory-item-stock"
                          className={`text-base font-black ${lowStock ? "text-rose-700" : "text-slate-950"}`}
                        >
                          {Number(item.stock_quantity)} {item.unit}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-600">
                          {money(Number(item.sale_price))}
                        </p>
                      </div>
                    </div>
                    {canOperate ? (
                      <form
                        action={receiveCompanyInventoryStock}
                        data-testid="inventory-receive-form"
                        className="mt-3 grid gap-2 rounded-lg bg-slate-900 p-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <input
                          type="hidden"
                          name="companyId"
                          value={companyId}
                        />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input
                          name="quantity"
                          type="number"
                          step="0.001"
                          min="0.001"
                          required
                          placeholder="+ 0"
                          className="!border-slate-600 !bg-slate-950 !px-3 !py-2 !text-slate-100 placeholder:!text-slate-400"
                        />
                        <input
                          name="note"
                          placeholder={t("note")}
                          className="!border-slate-600 !bg-slate-950 !px-3 !py-2 !text-slate-100 placeholder:!text-slate-400"
                        />
                        <button className="rounded-md bg-brand px-3 py-2 text-sm font-bold text-white">
                          {t("addStock")}
                        </button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-6 py-16 text-center">
              <PackageSearch className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-bold text-slate-800">{t("empty")}</p>
            </div>
          )}
        </section>
        {canOperate ? (
          <div className="self-start lg:sticky lg:top-6">
            <InventorySalesPanel
              companyId={companyId}
              currency={currency}
              items={(items ?? []) as InventorySaleItem[]}
            />
          </div>
        ) : null}
      </div>

      <section
        data-testid="inventory-sales-history"
        className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 p-5">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">
            {tHistory("eyebrow")}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {tHistory("title")}
          </h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              {tHistory("from")}
              <input type="date" name="from" defaultValue={from ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              {tHistory("to")}
              <input type="date" name="to" defaultValue={to ?? ""} />
            </label>
            <button className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">
              {tHistory("apply")}
            </button>
            <a
              href={`/app/${companyId}/inventory`}
              className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700"
            >
              {tHistory("clear")}
            </a>
          </form>
        </div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {tHistory("salesTotal")}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {money(saleTotal)}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {tHistory("collected")}
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {money(paidTotal)}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {tHistory("salesCount")}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {sales.length}
            </p>
          </div>
        </div>
        {sales.length ? (
          <ul className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <li key={sale.id} data-testid="inventory-sale-history-row">
                <Link
                  href={`/app/${companyId}/inventory/sales/${sale.id}` as Route}
                  className="grid gap-2 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="font-black text-slate-950">
                      {sale.receipt_number}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(sale.created_at).toLocaleString(locale)} ·{" "}
                      {sale.line_count} {tHistory("lines")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    {tHistory("createdBy")}:{" "}
                    {sale.creator_email ?? tHistory("unknownCreator")}
                  </p>
                  <div className="text-left sm:text-right">
                    <p className="font-black text-slate-950">
                      {money(Number(sale.total_amount))}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {tHistory("paid")}: {money(Number(sale.amount_paid))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-sm font-semibold text-slate-600">
            {tHistory("noSales")}
          </p>
        )}
      </section>
    </main>
  );
}
