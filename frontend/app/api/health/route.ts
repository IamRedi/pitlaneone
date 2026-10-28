import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local";

  return NextResponse.json(
    {
      status: "ok",
      service: "pitlaneone-web",
      release
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow"
      }
    }
  );
}
