"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

function getHashValue(key: string) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get(key);
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const invitationNext = next?.startsWith("/accept-invitation?invite=") ? next : null;
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepareRecoverySession() {
      const accessToken = getHashValue("access_token");
      const refreshToken = getHashValue("refresh_token");

      if (!accessToken || !refreshToken) {
        setError(t("resetLinkInvalid"));
        return;
      }

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const cleanUrl = invitationNext
        ? `/reset-password?next=${encodeURIComponent(invitationNext)}`
        : "/reset-password";
      window.history.replaceState(null, "", cleanUrl);
      setIsReady(true);
    }

    prepareRecoverySession();
  }, [invitationNext, t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError(t("passwordMinimum"));
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    if (invitationNext) {
      setMessage(t("passwordSet"));
      window.setTimeout(() => window.location.replace(invitationNext), 900);
      return;
    }

    await supabase.auth.signOut();
    setMessage(t("passwordChanged"));
    window.setTimeout(() => window.location.replace("/admin-login"), 900);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

      <label className="block text-sm font-medium text-slate-700">
        {t("newPassword")}
        <input name="password" type="password" minLength={8} required disabled={!isReady || isSubmitting} />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        {t("repeatPassword")}
        <input name="confirmPassword" type="password" minLength={8} required disabled={!isReady || isSubmitting} />
      </label>

      <button
        type="submit"
        disabled={!isReady || isSubmitting}
        className="inline-flex items-center justify-center rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? t("creating") : t("savePassword")}
      </button>
    </form>
  );
}
