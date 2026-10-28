"use client";

import { useEffect } from "react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = error.digest?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "unavailable";

  useEffect(() => {
    // Keep browser diagnostics minimal: Next.js keeps the matching server error
    // under its digest in the hosting logs. Do not send form or customer data.
    console.error("ROUTE_RENDER_FAILED", { reference });
  }, [reference]);

  return <main className="mx-auto flex min-h-[55vh] w-full max-w-xl items-center px-4 py-10 sm:px-6"><section className="w-full rounded-2xl border border-rose-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-rose-700">PitlaneOne</p><h1 className="mt-3 text-2xl font-black text-slate-950">Something went wrong</h1><p className="mt-3 text-sm leading-6 text-slate-600">Your data was not changed. Please try again. If the issue continues, share the reference below with support.</p><p className="mt-5 rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">Reference: {reference}</p><button type="button" onClick={reset} className="mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">Try again</button></section></main>;
}
