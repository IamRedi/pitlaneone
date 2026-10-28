"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PitlaneOneBrand } from "@/components/pitlane-one-brand";

export function SiteNavbar() {
  const t = useTranslations("marketingNav");
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("home");
  const navItems = useMemo(() => [
    { label: t("platform"), href: "/#features", sectionId: "features" },
    { label: t("website"), href: "/#website", sectionId: "website" },
    { label: t("start"), href: "/#pricing", sectionId: "pricing" }
  ], [t]);

  useEffect(() => {
    if (pathname === "/gallery") { setActiveSection("gallery"); return; }
    const sections = navItems.map((item) => document.getElementById(item.sectionId)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname, navItems]);

  return <header className="sticky top-3 z-40 mb-8 rounded-2xl border border-slate-800/40 bg-slate-950/94 px-4 py-3 shadow-panel backdrop-blur"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><Link href="/" aria-label="PitlaneOne" className="inline-flex"><PitlaneOneBrand compact /></Link><p className="mt-1 max-w-[360px] text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 sm:text-left">{t("tagline")}</p></div><div className="flex items-start gap-2 sm:items-center"><nav className="grid flex-1 grid-cols-2 gap-2 text-center text-xs font-bold sm:flex sm:flex-wrap sm:justify-end sm:text-sm"><Link href="/admin-login?next=%2Fonboarding" className="rounded-xl bg-white/8 px-3 py-2 text-slate-200 transition hover:bg-white/14 hover:text-white">{t("signIn")}</Link>{navItems.map((item) => <Link key={item.sectionId} href={item.href as "/#features" | "/#website" | "/#pricing"} className={`rounded-xl px-3 py-2 transition ${activeSection === item.sectionId ? "bg-brand text-white shadow-sm" : "bg-white/8 text-slate-200 hover:bg-white/14 hover:text-white"}`}>{item.label}</Link>)}</nav><LanguageSwitcher dark compact /></div></div></header>;
}
