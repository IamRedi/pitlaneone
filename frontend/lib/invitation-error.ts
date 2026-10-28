function normaliseError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return "";
}

export function companyInvitationDeliveryError(error: unknown) {
  const message = normaliseError(error);

  if (message.includes("rate limit") || message.includes("too many requests") || message.includes("429")) {
    return "Supabase ka kufizuar perkohesisht dergimin e email-eve. Prit dhe provo perseri, ose krijo llogarine te Authentication dhe perdor 'Add member'.";
  }

  if (message.includes("already registered") || message.includes("already been registered") || message.includes("user already exists")) {
    return "Kjo llogari ekziston tashme. Mos dergo ftese te re; perdor 'Add member' me te njejtin email.";
  }

  if (message.includes("email") && (message.includes("invalid") || message.includes("unable to validate"))) {
    return "Adresa e email-it nuk u pranua nga Supabase. Kontrolloje dhe provo perseri.";
  }

  if (message.includes("service role") || message.includes("supabase_service_role_key")) {
    return "Konfigurimi server-side per dergimin e ftesave mungon.";
  }

  return "Emaili i fteses nuk u dergua. Provo perseri ose krijo llogarine te Authentication dhe perdor 'Add member'.";
}

export function safeInvitationErrorSignature(error: unknown) {
  const raw = error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "unknown";

  return raw
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<uuid>")
    .slice(0, 300);
}
