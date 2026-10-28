"use client";

import { useEffect } from "react";
import { authHashRedirectTarget } from "@/lib/auth-redirect";

export function AuthRecoveryRedirect() {
  useEffect(() => {
    const target = authHashRedirectTarget(window.location);
    if (target) window.location.replace(target);
  }, []);

  return null;
}
