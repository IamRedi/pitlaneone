import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function validToken(value: string | null, expected: string | undefined) {
  if (!value || !expected) return false;
  const supplied = Buffer.from(value);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

/** A deliberately opt-in production monitoring check. Never enable without a secret token. */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!validToken(token, process.env.MONITORING_TEST_TOKEN)) return new NextResponse(null, { status: 404 });

  const eventId = Sentry.captureMessage("PitlaneOne controlled monitoring test", "info");
  await Sentry.flush(2_000);
  return NextResponse.json({ accepted: true, event_id: eventId }, { headers: { "Cache-Control": "no-store" } });
}
