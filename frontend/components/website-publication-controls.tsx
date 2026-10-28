"use client";

import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";

import { updateCompanyWebsitePublication } from "@/app/saas-actions";

export function WebsitePublicationControls({ companyId, websitePath, isPublic, publishLabel, publishedLabel, publicDescription, privateDescription, openLabel, savedLabel, canPublish, blockedLabel }: {
  companyId: string;
  websitePath: Route;
  isPublic: boolean;
  publishLabel: string;
  publishedLabel: string;
  publicDescription: string;
  privateDescription: string;
  openLabel: string;
  savedLabel: string;
  canPublish: boolean;
  blockedLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [blocked, setBlocked] = useState(false);

  return <section id="website-publication" className="mt-6 scroll-mt-28 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.12)] sm:px-5">
    <div className="min-w-0">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-black text-white">
      <input
        type="checkbox"
        checked={isPublic}
        disabled={pending || (!isPublic && !canPublish)}
        onChange={(event) => {
          setSaved(false);
          setBlocked(false);
          startTransition(async () => {
            const result = await updateCompanyWebsitePublication(companyId, event.target.checked);
            setSaved(result.ok);
            setBlocked(!result.ok && "reason" in result);
          });
        }}
        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-sky-400 focus:ring-sky-400 disabled:cursor-wait"
      />
        {isPublic ? publishedLabel : publishLabel}
      </label>
      <p className="mt-1 pl-[1.625rem] text-xs leading-5 text-slate-400">{isPublic ? publicDescription : privateDescription}</p>
    </div>
    <div className="flex flex-wrap items-center justify-end gap-3">{!isPublic && !canPublish ? <span className="max-w-sm text-xs font-semibold text-amber-300">{blockedLabel}</span> : null}{blocked ? <span className="max-w-sm text-xs font-semibold text-rose-300">{blockedLabel}</span> : null}{saved ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" />{savedLabel}</span> : null}{isPublic ? <Link href={websitePath} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400">{openLabel}<ExternalLink className="h-4 w-4" aria-hidden="true" /></Link> : <span className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-500">{openLabel}</span>}</div>
  </section>;
}
