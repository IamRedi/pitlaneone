export function authHashRedirectTarget({
  pathname,
  search,
  hash
}: {
  pathname: string;
  search: string;
  hash: string;
}) {
  if (!hash || pathname === "/reset-password") return null;

  if (hash.includes("error_code=otp_expired")) {
    return "/admin-login?error=Linku%20i%20reset-it%20ka%20skaduar.%20Dergo%20nje%20link%20te%20ri.";
  }

  if (hash.includes("type=recovery")) {
    return `/reset-password${hash}`;
  }

  if (hash.includes("type=invite")) {
    const next = `${pathname}${search}`;
    return `/reset-password?next=${encodeURIComponent(next)}${hash}`;
  }

  return null;
}
