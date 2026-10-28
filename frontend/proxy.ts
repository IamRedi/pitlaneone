import { NextResponse, type NextRequest } from "next/server";

const ignoredHosts = new Set(["localhost", "127.0.0.1", "app.example.com"]);

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    return response;
  };
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const path = request.nextUrl.pathname;

  if (!host || ignoredHosts.has(host) || host.endsWith(".vercel.app") || path.startsWith("/_next") || path.startsWith("/api")) return next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return next();

  const domainLookup = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_public_company_domain`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json", "x-request-id": requestId },
    body: JSON.stringify({ input_hostname: host }), cache: "no-store"
  });
  const domains = domainLookup.ok ? await domainLookup.json() as Array<{ slug?: string }> : [];
  const slug = domains[0]?.slug;
  if (!slug) return next();

  const url = request.nextUrl.clone();
  url.pathname = `/b/${slug}${path === "/" ? "" : path}`;
  const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
