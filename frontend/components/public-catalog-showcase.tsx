"use client";

import { Package, X } from "lucide-react";
import { useState } from "react";

type CatalogItem = {
  id: string;
  item_type: "product" | "service";
  name: string;
  description: string | null;
  price: number | string;
  currency: string;
  image_url: string | null;
  duration_minutes?: number | null;
};

export function PublicCatalogShowcase({ items, locale, textColor, surfaceColor, accentColor, radius, serviceLabel, productLabel }: { items: CatalogItem[]; locale: string; textColor: string; surfaceColor: string; accentColor: string; radius: string; serviceLabel: string; productLabel: string }) {
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const format = (item: CatalogItem) => new Intl.NumberFormat(locale, { style: "currency", currency: item.currency, maximumFractionDigits: 2 }).format(Number(item.price));

  return <>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className="group flex min-h-32 overflow-hidden border text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(0,0,0,.14)]" style={{ borderColor: `${textColor}18`, borderRadius: radius, background: surfaceColor }}>
        <div className="relative h-32 w-28 shrink-0 overflow-hidden" style={{ background: `${accentColor}14` }}>{item.image_url ? <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="grid h-full place-items-center"><Package className="h-6 w-6 opacity-35" /></span>}<span className="absolute bottom-2 left-2 px-2 py-1 text-[10px] font-bold" style={{ background: accentColor, color: "#151515", borderRadius: radius }}>{item.item_type === "service" ? serviceLabel : productLabel}</span></div>
        <span className="min-w-0 flex-1 p-4"><span className="flex items-start justify-between gap-2"><span className="min-w-0 text-base font-bold leading-snug">{item.name}</span><strong className="shrink-0 text-sm" style={{ color: accentColor }}>{format(item)}</strong></span>{item.description ? <span className="mt-2 line-clamp-2 block text-sm leading-5 opacity-70">{item.description}</span> : <span className="mt-2 block text-sm opacity-55">{item.item_type === "service" ? serviceLabel : productLabel}</span>}</span>
      </button>)}
    </div>
    {selected ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
      <article className="relative grid w-full max-w-xl overflow-hidden border shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:grid-cols-[.85fr_1.15fr]" style={{ borderColor: `${textColor}22`, borderRadius: radius, background: surfaceColor, color: textColor }} onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center border bg-black/35 text-white backdrop-blur" style={{ borderColor: "#ffffff33", borderRadius: radius }} aria-label="Mbyll"><X className="h-4 w-4" /></button>
        <div className="min-h-60" style={{ background: `${accentColor}16` }}>{selected.image_url ? <img src={selected.image_url} alt={selected.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-10 w-10 opacity-35" /></div>}</div>
        <div className="p-6"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em]" style={{ background: `${accentColor}20`, color: accentColor, borderRadius: radius }}>{selected.item_type === "service" ? serviceLabel : productLabel}</span><h3 className="mt-5 text-2xl font-black tracking-tight">{selected.name}</h3><strong className="mt-3 block text-xl" style={{ color: accentColor }}>{format(selected)}</strong>{selected.description ? <p className="mt-5 text-sm leading-7 opacity-75">{selected.description}</p> : null}{selected.item_type === "service" && selected.duration_minutes ? <p className="mt-5 text-xs font-bold opacity-60">{selected.duration_minutes} min</p> : null}</div>
      </article>
    </div> : null}
  </>;
}
