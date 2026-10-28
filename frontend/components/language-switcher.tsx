"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setUiLocale } from "@/app/locale-actions";
import { appLocales, type AppLocale } from "@/i18n/config";

const nativeLocaleNames: Record<AppLocale, string> = {
  sq: "Shqip", en: "English", de: "Deutsch", it: "Italiano", tr: "Türkçe", pl: "Polski"
};

export function LanguageSwitcher({ dark = false, compact = false, sidebar = false }: { dark?: boolean; compact?: boolean; sidebar?: boolean }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("common");
  const [selected, setSelected] = useState<AppLocale>(locale);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setSelected(locale), [locale]);

  const chooseLocale = (nextLocale: AppLocale) => {
    if (nextLocale === selected) { setOpen(false); return; }
    setSelected(nextLocale);
    setOpen(false);
    const formData = new FormData(); formData.set("locale", nextLocale);
    startTransition(async () => { await setUiLocale(formData); router.refresh(); });
  };

  const buttonClass = sidebar
    ? "w-full justify-between border-transparent bg-transparent px-2 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
    : dark
    ? "border-brand/60 bg-slate-900 text-white shadow-[0_0_0_2px_rgba(201,111,59,.18)] hover:bg-slate-800"
    : "border-slate-300 bg-white text-slate-900 hover:border-brand";

  return <div className="relative shrink-0">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-label={t("language")} aria-expanded={open} disabled={pending} className={`inline-flex h-8 min-w-12 items-center gap-1 rounded-md border px-2 text-[11px] font-black tracking-[.08em] uppercase outline-none transition focus:ring-2 focus:ring-brand/50 disabled:opacity-60 ${buttonClass} ${compact ? "sm:h-8" : "h-9"}`}>
      {sidebar ? <span>{nativeLocaleNames[selected]}</span> : selected}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {open ? <div data-locale-menu className={`workspace-side-menu absolute z-50 w-36 overflow-hidden rounded-lg border p-1 shadow-xl ${sidebar ? "bottom-full left-0 mb-2 border-white/10 bg-[#11161d] text-white" : `right-0 mt-2 ${dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-950"}`}`}>
      {appLocales.map((item) => <button data-active={item === selected ? "true" : "false"} key={item} type="button" onClick={() => chooseLocale(item)} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-bold transition ${item === selected ? (dark ? "bg-white/10 text-brand-soft" : "bg-brand/10 text-brand-dark") : dark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}><span>{nativeLocaleNames[item]}</span><span className="text-[10px] font-black uppercase opacity-60">{item}</span></button>)}
    </div> : null}
  </div>;
}
