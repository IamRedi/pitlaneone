"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { appLocaleCookieName, isAppLocale } from "@/i18n/config";
import { createServerSupabase } from "@/lib/supabase/server";

async function writeLocaleCookie(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set(appLocaleCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function syncUiLocaleCookieForUser(userId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("ui_locale")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("SYNC_UI_LOCALE_PREFERENCE_ERROR:", error);
    return;
  }

  if (isAppLocale(data?.ui_locale)) {
    await writeLocaleCookie(data.ui_locale);
  }
}

export async function setUiLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");

  if (!isAppLocale(locale)) {
    return;
  }

  await writeLocaleCookie(locale);

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.from("user_preferences").upsert(
      { user_id: user.id, ui_locale: locale },
      { onConflict: "user_id" }
    );

    if (error) {
      // The cookie remains the immediate preference. The database migration is
      // applied separately in each Supabase environment.
      console.error("SET_UI_LOCALE_PREFERENCE_ERROR:", error);
    }
  }

  revalidatePath("/", "layout");
}
