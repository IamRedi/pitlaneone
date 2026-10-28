"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    title: "Servis profesional për automjete",
    subtitle: "Motor, drejtim, diagnostikim",
    imageUrl: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1800&q=80"
  },
  {
    title: "Diagnostikim me kompjuter",
    subtitle: "Software për marka të ndryshme",
    imageUrl: "https://images.unsplash.com/photo-1606577924006-27d39b132ae2?auto=format&fit=crop&w=1800&q=80"
  },
  {
    title: "Mirëmbajtje e besueshme",
    subtitle: "Cilësi dhe transparencë",
    imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1800&q=80"
  }
];

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 shadow-panel">
      {slides.map((slide, index) => (
        <div
          key={slide.title}
          aria-hidden={activeIndex !== index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out ${
            activeIndex === index ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
        />
      ))}
      <div className="absolute inset-0 bg-slate-950/68" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/15" />

      <div className="relative flex min-h-[520px] flex-col justify-end p-6 text-white sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-brand-soft backdrop-blur">
            Autoservis profesional
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{slides[activeIndex].title}</h1>
          <p className="mt-4 text-lg font-semibold text-slate-100 sm:text-2xl">{slides[activeIndex].subtitle}</p>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
            Servis modern me pajisje profesionale, diagnostikim të avancuar dhe punë të dokumentuar qartë për çdo klient.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/onboarding" className="inline-flex justify-center rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-sm">
              Hyr si Admin
            </Link>
            <Link href="/client-login" className="inline-flex justify-center rounded-full border border-white/55 bg-white/12 px-6 py-3 text-sm font-bold text-white backdrop-blur">
              Hyr si Klient
            </Link>
          </div>
        </div>

        <div className="mt-8 flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Shfaq slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${activeIndex === index ? "w-10 bg-brand" : "w-2.5 bg-white/55"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
