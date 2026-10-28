"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = error.digest?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "unavailable";

  return <html lang="en"><body><main style={{ fontFamily: "system-ui, sans-serif", margin: "0 auto", maxWidth: 640, padding: "64px 24px" }}><p>PitlaneOne</p><h1>Something went wrong</h1><p>Your data was not changed. Please try again. If the issue continues, share this reference with support: <code>{reference}</code></p><button type="button" onClick={reset}>Try again</button></main></body></html>;
}
