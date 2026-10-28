"use client";

import { useState } from "react";
import { updateInvoiceItemsForm } from "@/app/actions";
import { SubmitButton } from "@/components/forms";
import { formatCurrency } from "@/lib/utils";

type InvoiceItem = {
  name: string;
  materialCost: number;
  laborBaseCost: number;
  laborCost: number;
  laborDiscountPercent: number;
  fee: number;
};

const emptyItem: InvoiceItem = {
  name: "",
  materialCost: 0,
  laborBaseCost: 0,
  laborCost: 0,
  laborDiscountPercent: 0,
  fee: 0
};

export function InvoiceItemsForm({
  invoiceId,
  serviceId,
  isVip,
  items
}: {
  invoiceId: string;
  serviceId: string;
  isVip: boolean;
  items: InvoiceItem[];
}) {
  const [rows, setRows] = useState<InvoiceItem[]>(items.length > 0 ? items : [{ ...emptyItem }]);
  const total = rows.reduce((sum, item) => sum + item.materialCost + item.laborCost + item.fee, 0);

  function updateRow(index: number, key: keyof InvoiceItem, value: string) {
    setRows((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: key === "name" ? value : Number(value),
              ...(key === "laborCost" ? { laborBaseCost: item.laborDiscountPercent > 0 ? Number(value) / 0.8 : Number(value) } : {})
            }
          : item
      )
    );
  }

  function removeRow(index: number) {
    setRows((current) => {
      const nextRows = current.filter((_, itemIndex) => itemIndex !== index);
      return nextRows.length > 0 ? nextRows : [{ ...emptyItem }];
    });
  }

  function setVipLaborDiscount(index: number, checked: boolean) {
    setRows((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const baseCost = item.laborDiscountPercent > 0 ? item.laborBaseCost : item.laborCost;

        return checked
          ? {
              ...item,
              laborBaseCost: baseCost,
              laborCost: Number((baseCost * 0.8).toFixed(2)),
              laborDiscountPercent: 20
            }
          : {
              ...item,
              laborCost: Number(item.laborBaseCost.toFixed(2)),
              laborDiscountPercent: 0
            };
      })
    );
  }

  return (
    <form action={updateInvoiceItemsForm} className="mt-4 space-y-4 rounded-[24px] bg-slate-50 p-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="items" value={JSON.stringify(rows)} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-base font-black text-ink">Edito defektet dhe rreshtat</h4>
          <p className="mt-1 text-sm text-slate">Shto defekte/materiale/pune derisa fatura nuk eshte paguar.</p>
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { ...emptyItem }])}
          className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Shto defekt
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-[22px] bg-white p-3 ring-1 ring-slate-200">
            <input
              value={item.name}
              onChange={(event) => updateRow(index, "name", event.target.value)}
              placeholder="Defekti, simptoma ose materiali"
              required
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Leket e materialit
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.materialCost}
                  onChange={(event) => updateRow(index, "materialCost", event.target.value)}
                  placeholder="Cmimi blerjes/materialit"
                  required
                />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Fitim / risk
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.fee}
                  onChange={(event) => updateRow(index, "fee", event.target.value)}
                  placeholder="Markup / risk / fitim"
                  required
                />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Haku i punes
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.laborCost}
                  onChange={(event) => updateRow(index, "laborCost", event.target.value)}
                  placeholder="Puna / ore / fiks"
                  required
                />
                {isVip ? (
                  <label
                    className="mt-2 inline-flex items-center gap-2 text-xs font-semibold normal-case tracking-normal text-brand-dark"
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-brand-dark p-0"
                      checked={item.laborDiscountPercent === 20}
                      onChange={(event) => {
                        setVipLaborDiscount(index, event.target.checked);
                      }}
                    />
                    VIP -20%
                  </label>
                ) : null}
              </label>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate sm:flex-row sm:items-center sm:justify-between">
              <span>Totali i rreshtit: {formatCurrency(item.materialCost + item.fee + item.laborCost)}</span>
              <button type="button" onClick={() => removeRow(index)} className="text-left font-semibold text-rose-600 sm:text-right">
                Hiq rreshtin
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[22px] bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-300">Totali i ri i fatures</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(total)}</p>
        </div>
        <SubmitButton label="Ruaj rreshtat" pendingLabel="Po ruhen..." />
      </div>
    </form>
  );
}
