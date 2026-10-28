"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createCompanyInventoryItem } from "@/app/saas-actions";
import { CameraCodeScanner } from "@/components/camera-code-scanner";
import { SubmitButton } from "@/components/forms";

export function InventoryItemCreateForm({ companyId }: { companyId: string }) {
  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");
  const [barcode, setBarcode] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="inventory-item-create-open"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-110"
      >
        <Plus className="h-4 w-4" />
        {t("addItem")}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/70 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={t("addItem")}
        >
          <div className="mx-auto my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-soft">
                  {t("items")}
                </p>
                <h3 className="mt-1 text-xl font-black">{t("addItem")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              action={createCompanyInventoryItem}
              data-testid="inventory-item-create-form"
              className="grid gap-4 p-5 sm:grid-cols-2"
            >
              <input type="hidden" name="companyId" value={companyId} />
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("name")}
                <input name="name" required autoFocus placeholder={t("name")} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("sku")}
                <input name="sku" required placeholder={t("sku")} />
              </label>
              <div className="sm:col-span-2">
                <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                  {t("barcode")}
                  <div className="flex gap-2">
                    <input
                      name="barcode"
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      placeholder={t("barcode")}
                      className="min-w-0 flex-1"
                    />
                    <CameraCodeScanner onDetected={setBarcode} />
                  </div>
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("unit")}
                <input name="unit" required defaultValue="pcs" />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("price")}
                <input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("vat")}
                <input
                  name="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue="0"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("initialStock")}
                <input
                  name="initialStock"
                  type="number"
                  step="0.001"
                  min="0"
                  defaultValue="0"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200">
                {t("reorderLevel")}
                <input
                  name="reorderLevel"
                  type="number"
                  step="0.001"
                  min="0"
                  defaultValue="0"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-200 sm:col-span-2">
                {t("descriptionField")}
                <textarea name="description" className="min-h-24" />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-200"
                >
                  {tCommon("cancel")}
                </button>
                <SubmitButton
                  label={t("saveItem")}
                  pendingLabel={t("saving")}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
