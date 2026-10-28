"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createCompanyCounterSale } from "@/app/saas-actions";
import { CameraCodeScanner } from "@/components/camera-code-scanner";

export type InventorySaleItem = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  sale_price: number | string;
  stock_quantity: number | string;
};

export function InventorySalesPanel({
  companyId,
  currency,
  items,
  clients = [],
  standalone = false,
}: {
  companyId: string;
  currency: "EUR" | "ALL";
  items: InventorySaleItem[];
  clients?: { id: string; name: string; phone: string | null }[];
  standalone?: boolean;
}) {
  const t = useTranslations("inventory");
  const locale = useLocale();
  const money = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
      value,
    );
  const [scan, setScan] = useState("");
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState("");

  const matchingItems = useMemo(() => {
    const query = scan.trim().toLocaleLowerCase();
    if (query.length < 2) return [];
    return items
      .filter(
        (item) =>
          item.name.toLocaleLowerCase().includes(query) ||
          item.sku.toLocaleLowerCase().includes(query) ||
          item.barcode?.toLocaleLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [items, scan]);

  const addItem = (item: InventorySaleItem) => {
    setCart((current) =>
      current.some((line) => line.id === item.id)
        ? current.map((line) =>
            line.id === item.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...current, { id: item.id, quantity: 1 }],
    );
    setScan("");
    setError(null);
  };

  const addByCode = () => {
    const code = scan.trim();
    const match = items.find(
      (item) =>
        item.barcode === code ||
        item.sku.toLowerCase() === code.toLowerCase() ||
        item.name.toLowerCase() === code.toLowerCase(),
    );
    if (!match) {
      if (matchingItems.length === 1) addItem(matchingItems[0]);
      else setError(t("notFound"));
      return;
    }
    addItem(match);
  };

  const lines = useMemo(
    () =>
      cart.map((line) => ({
        ...line,
        item: items.find((item) => item.id === line.id)!,
      })),
    [cart, items],
  );
  const total = lines.reduce(
    (sum, line) => sum + Number(line.item.sale_price) * line.quantity,
    0,
  );

  async function finish() {
    setBusy(true);
    setError(null);
    const result = await createCompanyCounterSale(
      companyId,
      cart.map((line) => ({ item_id: line.id, quantity: line.quantity })),
      total,
      clientId || null,
    );
    if (result?.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setCart([]);
    if (result.saleId)
      window.location.assign(
        `/app/${companyId}/inventory/sales/${result.saleId}`,
      );
    else window.location.reload();
  }

  return (
    <section
      data-testid="inventory-sales-panel"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">
        {t("counter")}
      </p>
      <h2 className="mt-1 text-xl font-black text-slate-950">
        {t("scanTitle")}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{t("scanHint")}</p>
      {standalone ? (
        <label className="mt-4 grid gap-1.5 text-sm font-bold text-slate-700">
          {t("optionalCustomer")}
          <select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className="!py-2.5"
          >
            <option value="">{t("walkInCustomer")}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.phone ? ` · ${client.phone}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="relative mt-4 flex gap-2">
        <input
          data-testid="inventory-sale-search"
          value={scan}
          onChange={(event) => {
            setScan(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addByCode();
            }
          }}
          placeholder={`${t("scanPlaceholder")} / ${t("name")}`}
          className="min-w-0 flex-1"
        />
        <CameraCodeScanner
          onDetected={(value) => {
            const match = items.find(
              (item) =>
                item.barcode === value.trim() ||
                item.sku.toLowerCase() === value.trim().toLowerCase(),
            );
            if (match) addItem(match);
            else setError(t("notFound"));
          }}
        />
      <button
        type="button"
        data-testid="inventory-sale-add"
        onClick={addByCode}
          className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
        >
          {t("add")}
        </button>
        {matchingItems.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {matchingItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold text-slate-950">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {item.sku}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-black text-slate-800">
                  {money(Number(item.sale_price))}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? (
        <p
          data-testid="inventory-sale-error"
          className="mt-3 text-sm font-bold text-rose-700"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-4 divide-y divide-slate-100">
        {lines.map((line) => (
          <div
            key={line.id}
            data-testid="inventory-sale-line"
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">
                {line.item.name}
              </p>
              <p className="text-xs text-slate-500">
                {money(Number(line.item.sale_price))} × {line.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2">
          <input
            data-testid="inventory-sale-quantity"
            aria-label={t("quantity")}
                type="number"
                min="1"
                max={Number(line.item.stock_quantity)}
                value={line.quantity}
                onChange={(event) =>
                  setCart((current) =>
                    current.map((row) =>
                      row.id === line.id
                        ? {
                            ...row,
                            quantity: Math.max(1, Number(event.target.value)),
                          }
                        : row,
                    ),
                  )
                }
                className="!w-16 !px-2 !py-1 text-center"
              />
              <button
                type="button"
                onClick={() =>
                  setCart((current) =>
                    current.filter((row) => row.id !== line.id),
                  )
                }
                className="text-xs font-bold text-rose-700"
              >
                {t("remove")}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="font-black text-slate-950">{t("total")}</span>
        <strong className="text-xl text-slate-950">{money(total)}</strong>
      </div>
      <button
        type="button"
        data-testid="inventory-sale-submit"
        disabled={!cart.length || busy}
        onClick={finish}
        className="mt-4 w-full rounded-lg bg-brand px-4 py-3 text-sm font-black text-white disabled:opacity-50"
      >
        {busy
          ? t("finishing")
          : standalone
            ? t("finishAndOpenReceipt")
            : t("finishSale")}
      </button>
    </section>
  );
}
