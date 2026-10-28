"use client";

import { X } from "lucide-react";
import { useState } from "react";

export type GalleryImage = {
  id: string;
  imageUrl: string;
  title: string;
  detail?: string;
};

const fallbackGalleryItems: GalleryImage[] = [
  {
    id: "placeholder-diagnostics",
    title: "Diagnostikim motorri",
    detail: "Kontroll me pajisje profesionale dhe lexim gabimesh.",
    imageUrl: "https://images.unsplash.com/photo-1606577924006-27d39b132ae2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "placeholder-maintenance",
    title: "Mirembajtje periodike",
    detail: "Nderrim vaj, filtra dhe kontroll i pergjithshem.",
    imageUrl: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "placeholder-steering",
    title: "Sistem drejtimi",
    detail: "Kontroll suspensioni, timoni dhe stabiliteti.",
    imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80"
  }
];

export function GalleryPreview({ images = [] }: { images?: GalleryImage[] }) {
  const galleryItems = images.length > 0 ? images : fallbackGalleryItems;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = galleryItems[activeIndex];

  function openGallery(index: number) {
    setActiveIndex(index);
    setIsOpen(true);
  }

  return (
    <section id="galeria" className="scroll-mt-28 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-dark">Punet e fundit</p>
          <h2 className="mt-2 text-3xl font-black text-ink">Galeria e servisit</h2>
        </div>
        <button type="button" onClick={() => openGallery(0)} className="text-left text-sm font-bold text-brand-dark sm:text-right">
          Shiko galerine
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {galleryItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openGallery(index)}
            className="group min-h-[220px] overflow-hidden rounded-[24px] bg-slate-950 text-left text-white shadow-sm"
          >
            <div className="flex h-full flex-col justify-end bg-cover bg-center p-5 transition duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.92)), url(${item.imageUrl})` }}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-soft">Foto {index + 1}</p>
              <h3 className="mt-2 text-xl font-black">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-200">{item.detail}</p>
            </div>
          </button>
        ))}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Galeria e servisit">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-panel">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-dark">Galeria</p>
                <h3 className="text-xl font-black text-ink">{activeItem.title}</h3>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
              <div className="min-h-[340px] bg-cover bg-center sm:min-h-[520px]" style={{ backgroundImage: `url(${activeItem.imageUrl})` }} />
              <div className="grid gap-3 p-4">
                <p className="text-sm leading-6 text-slate">{activeItem.detail}</p>
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                  {galleryItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`min-h-[86px] overflow-hidden rounded-2xl border bg-cover bg-center ${
                        activeIndex === index ? "border-brand ring-2 ring-brand/30" : "border-slate-200"
                      }`}
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.62)), url(${item.imageUrl})` }}
                      aria-label={`Shfaq ${item.title}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
