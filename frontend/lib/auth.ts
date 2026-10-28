import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-login");
  }

  if (user.user_metadata?.role === "client") {
    redirect("/client");
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("admins")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminProfileError || !adminProfile) {
    redirect("/admin-login?error=Admin%20profile%20is%20not%20configured.");
  }

  return { adminProfile, supabase, user };
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();

  if (session.adminProfile.role !== "super_admin") {
    redirect("/admin?error=Vetem%20super%20admin%20ka%20akses%20ketu.");
  }

  return session;
}

export async function requireClient() {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/client-login");
  }

  return { supabase, user };
}
