import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Route } from "next";
import { CompanyWorkspaceShell } from "@/components/company-workspace-shell";
import { canManageCompany, canManageCompanyOperations, listCompanyMemberships, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function CompanyWorkspaceLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const memberships = await listCompanyMemberships();
  const activeMembership = memberships.find((membership) => membership.company.id === companyId);

  if (!activeMembership) {
    redirect("/onboarding?error=Kompania%20nuk%20u%20gjet%20ose%20nuk%20ke%20akses." as Route);
  }

  const { supabase } = await requireSaasUser();
  const [{ data: profile }, { count: pendingAppointmentCount }] = await Promise.all([
    supabase.from("company_profiles").select("is_public").eq("company_id", activeMembership.company.id).maybeSingle(),
    canManageCompanyOperations(activeMembership.role)
      ? supabase.from("company_appointment_requests").select("id", { count: "exact", head: true }).eq("company_id", activeMembership.company.id).in("status", ["requested", "awaiting_customer"])
      : Promise.resolve({ count: 0 })
  ]);

  return (
    <CompanyWorkspaceShell
      activeCompany={activeMembership.company}
      activeRole={activeMembership.role}
      capabilities={activeMembership.capabilities}
      memberships={memberships}
      canManage={canManageCompany(activeMembership.role)}
      canOperate={canManageCompanyOperations(activeMembership.role)}
      canCreateCompany={activeMembership.role === "owner"}
      isPublicProfile={profile?.is_public ?? false}
      pendingAppointmentCount={activeMembership.capabilities.includes("appointments") ? pendingAppointmentCount ?? 0 : 0}
    >
      {children}
    </CompanyWorkspaceShell>
  );
}
