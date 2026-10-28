"use client";

import { Eye, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { rotateCompanyWebsitePreview } from "@/app/saas-actions";
import { CopyTextButton } from "@/components/copy-text-button";

export function WebsitePreviewControls({ companyId, initialUrl }: { companyId: string; initialUrl: string }) {
  const t = useTranslations("settings");
  const [url, setUrl] = useState(initialUrl);
  const [pending, startTransition] = useTransition();
  return <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-4 text-sm shadow-[0_16px_42px_rgba(0,0,0,0.12)] sm:px-5">
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><Eye className="h-5 w-5" aria-hidden="true" /></span>
      <div>
        <p className="font-black text-white">{t("privatePreviewTitle")}</p>
        <p className="mt-0.5 max-w-xl text-xs leading-5 text-slate-400">{t("privatePreviewDescription")}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <CopyTextButton value={url} label={t("copyPreviewLink")} copiedLabel={t("previewLinkCopied")} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3.5 py-2.5 font-bold text-slate-950 transition hover:bg-sky-400" />
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3.5 py-2.5 font-bold text-white transition hover:border-slate-500 hover:bg-slate-800">{t("openPreview")} <ExternalLink className="h-4 w-4" /></a>
      <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await rotateCompanyWebsitePreview(companyId); if (result.ok) setUrl(result.url); })} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-wait disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />{pending ? t("renewingPreview") : t("renewPreview")}</button>
    </div>
  </section>;
}
