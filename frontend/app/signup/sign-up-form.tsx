"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm({ next, businessSite = false, pitlane = false }: { next: string; businessSite?: boolean; pitlane?: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (password.length < 8) { setError(t("passwordMinimum")); setLoading(false); return; }
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.session) { router.replace(next as Route); router.refresh(); return; }
    setMessage(t("accountCreated")); setLoading(false);
  }

  const inputClass = businessSite ? "mt-2 w-full rounded-xl border border-[#342d27]/15 bg-white/70 px-4 py-3 text-[#25231f] outline-none transition placeholder:text-[#8d8277] focus:border-[#9a654d] focus:ring-2 focus:ring-[#9a654d]/15" : pitlane ? "mt-2 w-full rounded-xl border border-white/15 bg-[#090d12] px-4 py-3 text-white outline-none transition focus:border-[#d7ff3f] focus:ring-2 focus:ring-[#d7ff3f]/15" : "";
  return <form onSubmit={submit} className="space-y-4">{error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}{message ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}<label className={`block text-sm font-medium ${businessSite ? "text-[#4c453e]" : pitlane ? "text-[#cbd3dc]" : "text-slate-700"}`}>{t("email")}<input className={inputClass} name="email" type="email" required autoComplete="email" /></label><label className={`block text-sm font-medium ${businessSite ? "text-[#4c453e]" : pitlane ? "text-[#cbd3dc]" : "text-slate-700"}`}>{t("password")}<input className={inputClass} name="password" type="password" required minLength={8} autoComplete="new-password" /></label><button disabled={loading} className={`inline-flex w-full justify-center rounded-xl px-4 py-3 font-bold disabled:opacity-60 ${businessSite ? "bg-[#292824] text-white hover:bg-[#8a5c48]" : pitlane ? "bg-[#d7ff3f] text-[#101419] hover:bg-white" : "bg-brand text-white"}`}>{loading ? t("creating") : t("createAccount")}</button></form>;
}
