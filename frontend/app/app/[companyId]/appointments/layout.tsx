import type { ReactNode } from "react";
import { requireCompanyContext } from "@/lib/company";

export default async function AppointmentsLayout({ children, params }: { children: ReactNode; params: Promise<{ companyId: string }> }) {
  await requireCompanyContext((await params).companyId, "appointments");
  return children;
}
