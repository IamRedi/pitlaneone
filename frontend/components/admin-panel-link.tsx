"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminPanelLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function checkAdminSession() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || user.user_metadata?.role === "client") {
        if (isMounted) {
          setIsAdmin(false);
        }
        return;
      }

      const { data: adminProfile } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (isMounted) {
        setIsAdmin(Boolean(adminProfile));
      }
    }

    checkAdminSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      checkAdminSession();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      href="/onboarding"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-white shadow-sm transition hover:bg-brand-dark"
    >
      <LayoutDashboard className="h-4 w-4" />
      Paneli
    </Link>
  );
}
