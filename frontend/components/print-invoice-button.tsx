"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

export function PrintInvoiceButton() {
  const t = useTranslations("invoiceDetailUi");
  return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110 print:hidden"><Printer className="h-4 w-4" aria-hidden="true" />{t("print")}</button>;
}
