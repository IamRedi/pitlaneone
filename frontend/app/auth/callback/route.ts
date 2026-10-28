import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next"); const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/onboarding?new=1";
  const response = NextResponse.redirect(new URL(destination, url.origin));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: Array<{ name: string; value: string; options: Parameters<typeof response.cookies.set>[2] }>) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  if (code) await supabase.auth.exchangeCodeForSession(code);
  return response;
}
