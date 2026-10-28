export function formatCurrency(value: number) {
  return new Intl.NumberFormat("sq-AL", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function deriveClientEmail(phone: string) {
  const compact = normalizePhone(phone).replace(/\+/g, "00");
  return `client-${compact}@servis-manager.pro`;
}
