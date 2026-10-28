"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createCompanyCatalogItem,
  deleteCompanyCatalogItem,
  updateCompanyCatalogItem,
} from "@/app/saas-actions";
import { SubmitButton } from "@/components/forms";

export type CompanyCatalogItem = {
  id: string;
  item_type: "product" | "service";
  name: string;
  description: string | null;
  price: number | string;
  currency: "EUR" | "ALL";
  image_url: string | null;
  duration_minutes: number | null;
  original_price?: number | string | null;
  is_featured?: boolean;
};

function money(value: number | string, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

async function convertToThumbnail(
  input: HTMLInputElement,
  setPreview: (value: string | null) => void,
) {
  const source = input.files?.[0];
  if (!source || !source.type.startsWith("image/")) return;
  try {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(source);
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image"));
      image.src = sourceUrl;
    });
    const scale = Math.min(
      1,
      960 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    URL.revokeObjectURL(sourceUrl);
    if (!blob) return;
    const webp = new File(
      [blob],
      `${source.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp" },
    );
    const transfer = new DataTransfer();
    transfer.items.add(webp);
    input.files = transfer.files;
    setPreview(URL.createObjectURL(webp));
  } catch {
    setPreview(URL.createObjectURL(source));
  }
}

function CatalogImageInput({ initialUrl }: { initialUrl?: string | null }) {
  const t = useTranslations("catalog");
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);

  return (
    <label className="block cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-2.5 transition hover:border-brand/70 hover:bg-brand/5">
      <span className="flex items-center gap-2.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-800 text-slate-400">
          {preview ? (
            <img
              src={preview}
              alt={t("previewAlt")}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </span>
        <span>
          <span className="block text-xs font-black text-white">
            {t("photo")}
          </span>
          <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">
            {t("photoHint")}
          </span>
        </span>
      </span>
      <input
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) =>
          void convertToThumbnail(event.currentTarget, setPreview)
        }
      />
    </label>
  );
}

function CatalogTypePicker({
  selected,
  onChange,
}: {
  selected: "product" | "service";
  onChange: (value: "product" | "service") => void;
}) {
  const t = useTranslations("catalog");

  return (
    <fieldset>
      <legend className="text-xs font-black text-slate-200">{t("type")}</legend>
      <input type="hidden" name="itemType" value={selected} />
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {([
          ["product", t("physicalProduct"), Package],
          ["service", t("service"), Sparkles],
        ] as const).map(([type, label, Icon]) => (
          <button
            key={type}
            type="button"
            aria-pressed={selected === type}
            onClick={() => onChange(type)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition ${selected === type ? "border-brand bg-brand/10 text-brand" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function CatalogFields({ item }: { item?: CompanyCatalogItem }) {
  const t = useTranslations("catalog");
  const [itemType, setItemType] = useState<"product" | "service">(
    item?.item_type ?? "product",
  );
  const [isFeatured, setIsFeatured] = useState(item?.is_featured ?? false);

  return (
    <>
      <CatalogTypePicker selected={itemType} onChange={setItemType} />
      <div className={`grid gap-3 sm:grid-cols-2 ${itemType === "service" ? "xl:grid-cols-[1fr_8rem_7rem_9rem]" : "xl:grid-cols-[1fr_8rem_7rem]"}`}>
        <label className="grid gap-1 text-xs font-black text-slate-200">
          {t("name")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={item?.name}
            placeholder={t("namePlaceholder")}
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-200">
          {t("price")}
          <input
            name="price"
            type="number"
            min="0"
            max="9999999.99"
            step="0.01"
            required
            defaultValue={item?.price}
            placeholder="0.00"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-200">
          {t("currency")}
          <select name="currency" defaultValue={item?.currency ?? "EUR"}>
            <option value="EUR">EUR (€)</option>
            <option value="ALL">ALL (L)</option>
          </select>
        </label>
        {itemType === "service" ? (
          <label className="grid gap-1 text-xs font-black text-slate-200">
            {t("duration")}
            <select
              name="durationMinutes"
              defaultValue={item?.duration_minutes ?? 60}
            >
              {[30, 45, 60, 90, 120, 180, 240].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} {t("minutes")}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <label className="grid gap-1 text-xs font-black text-slate-200">
        <span>
          {t("descriptionField")} {" "}
          <span className="font-normal text-slate-400">({t("optional")})</span>
        </span>
        <textarea
          name="description"
          rows={2}
          maxLength={600}
          defaultValue={item?.description ?? ""}
          placeholder={t("descriptionPlaceholder")}
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-xs font-black text-slate-200">
          <input name="isFeatured" type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
          {t("offer")}
        </label>
        {isFeatured ? <label className="grid gap-1 text-xs font-black text-slate-200">{t("originalPrice")}<input name="originalPrice" type="number" min="0" step="0.01" defaultValue={item?.original_price ?? ""} placeholder="0.00" /></label> : null}
      </div>
      <CatalogImageInput initialUrl={item?.image_url} />
    </>
  );
}

export function CompanyCatalogManager({
  companyId,
  items,
}: {
  companyId: string;
  items: CompanyCatalogItem[];
}) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const [createOpen, setCreateOpen] = useState(items.length === 0);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#website-catalog") setCreateOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <section
      id="website-catalog"
      className="mt-6 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 shadow-2xl shadow-black/20"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-brand">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-black text-white">{t("title")}</h2>
            <p className="mt-0.5 text-xs font-bold text-slate-400">
              {t("itemCount", { count: items.length })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((open) => !open)}
          aria-expanded={createOpen}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${createOpen ? "border border-slate-600 bg-slate-800 text-slate-200" : "bg-brand text-white hover:bg-brand/90"}`}
        >
          {createOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {createOpen ? t("close") : t("add")}
        </button>
      </header>

      <div className="p-4 sm:p-5">
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          {t("description")}
        </p>

        {createOpen ? (
          <form
            action={createCompanyCatalogItem}
            className="mt-4 grid gap-4 rounded-xl border border-brand/30 bg-slate-950/60 p-3.5 sm:p-4"
          >
            <input type="hidden" name="companyId" value={companyId} />
            <CatalogFields />
            <div className="flex justify-end border-t border-slate-800 pt-3">
              <SubmitButton label={t("add")} pendingLabel={t("saving")} />
            </div>
          </form>
        ) : null}

        {items.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="group flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950/55 transition hover:border-slate-500"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-slate-800 sm:h-28 sm:w-28">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-500">
                      <Package className="h-7 w-7" />
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                    {item.item_type === "service"
                      ? t("service")
                      : t("physicalProduct")}
                  </span>
                  {item.is_featured && item.original_price ? <span className="absolute right-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-950">{t("offer")}</span> : null}
                </div>
                <div className="min-w-0 flex-1 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate text-sm font-black text-white">{item.name}</h3>
                    <strong className="shrink-0 text-xs text-brand">
                      {money(item.price, item.currency, locale)}
                    </strong>
                  </div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-400">
                      {item.description}
                    </p>
                  ) : null}
                  {item.item_type === "service" ? (
                    <p className="mt-1 text-[11px] font-black text-slate-400">
                      {item.duration_minutes ?? 60} {t("minutes")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-4 border-t border-slate-800 pt-2">
                    <details className="group/editor min-w-0 flex-1">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-black text-brand">
                        <Pencil className="h-3.5 w-3.5" />
                        {t("edit")}
                      </summary>
                      <form
                        action={updateCompanyCatalogItem}
                        className="mt-3 grid gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
                      >
                        <input type="hidden" name="companyId" value={companyId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <CatalogFields item={item} />
                        <SubmitButton
                          label={t("saveChanges")}
                          pendingLabel={t("saving")}
                        />
                      </form>
                    </details>
                    <form action={deleteCompanyCatalogItem}>
                      <input type="hidden" name="companyId" value={companyId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        type="submit"
                        onClick={(event) => {
                          if (!window.confirm(t("remove"))) event.preventDefault();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("remove")}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid place-items-center rounded-xl border border-dashed border-slate-700 px-5 py-8 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-800 text-slate-400">
              <Package className="h-5 w-5" />
            </span>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
              {t("empty")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
