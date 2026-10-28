import { redirect } from "next/navigation";
import type { Route } from "next";
import { createServerSupabase } from "@/lib/supabase/server";

export const COMPANY_ROLES = ["owner", "admin", "manager", "staff", "accounting", "viewer"] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const COMPANY_CAPABILITIES = [
  "website",
  "appointments",
  "workshop_operations",
  "inventory",
  "invoicing",
] as const;

export type CompanyCapability = (typeof COMPANY_CAPABILITIES)[number];
export type CompanyProductSurface = "workshop" | "business_site";
export type CompanyLifecycleStatus = "active" | "demo_trial" | "conversion_pending" | "expired";

export type CompanyMembership = {
  company: {
    id: string;
    name: string;
    slug: string;
    product_surface: CompanyProductSurface;
    industry_key: string;
    industry_subcategory_key: string;
    business_site_generation_source: string | null;
    business_site_generation_version: number | null;
    lifecycle_status: CompanyLifecycleStatus;
    demo_expires_at: string | null;
  };
  role: CompanyRole;
  capabilities: CompanyCapability[];
};

function isCompanyRole(value: string): value is CompanyRole {
  return COMPANY_ROLES.includes(value as CompanyRole);
}

function isCompanyCapability(value: string): value is CompanyCapability {
  return COMPANY_CAPABILITIES.includes(value as CompanyCapability);
}

export function canManageCompany(role: CompanyRole) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canManageCompanyOperations(role: CompanyRole) {
  return role === "owner" || role === "admin" || role === "manager" || role === "staff";
}

export function canManageCompanyFinance(role: CompanyRole) {
  return role === "owner" || role === "admin" || role === "manager" || role === "accounting";
}

export function hasCompanyCapability(membership: CompanyMembership, capability: CompanyCapability) {
  return membership.capabilities.includes(capability);
}

export async function requireSaasUser(loginPath = "/admin-login") {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginPath as Route);
  }

  return { supabase, user };
}

export async function listCompanyMemberships(loginPath?: string): Promise<CompanyMembership[]> {
  const { supabase, user } = await requireSaasUser(loginPath);
  const { data: memberships, error: membershipsError } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw new Error("Could not load company memberships.");
  }

  const activeMemberships = (memberships ?? []).filter((membership) => isCompanyRole(membership.role));

  if (activeMemberships.length === 0) {
    return [];
  }

  const companyIds = activeMemberships.map((membership) => membership.company_id);
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, slug, product_surface, industry_key, industry_subcategory_key, business_site_generation_source, business_site_generation_version, lifecycle_status, demo_expires_at")
    .in("id", companyIds)
    .eq("status", "active");

  if (companiesError) {
    throw new Error("Could not load companies.");
  }

  const { data: modules, error: modulesError } = await supabase
    .from("company_modules")
    .select("company_id, module_key")
    .in("company_id", companyIds);

  if (modulesError) {
    throw new Error("Could not load company capabilities.");
  }

  const capabilitiesByCompanyId = new Map<string, CompanyCapability[]>();
  for (const companyModule of modules ?? []) {
    if (!isCompanyCapability(companyModule.module_key)) continue;
    const current = capabilitiesByCompanyId.get(companyModule.company_id) ?? [];
    current.push(companyModule.module_key);
    capabilitiesByCompanyId.set(companyModule.company_id, current);
  }

  const companyById = new Map((companies ?? []).map((company) => [company.id, company]));

  return activeMemberships.flatMap((membership) => {
    const company = companyById.get(membership.company_id);

    return company
      ? [{ company, role: membership.role, capabilities: capabilitiesByCompanyId.get(company.id) ?? [] }]
      : [];
  });
}

export async function requireCompanyContext(companyId: string, requiredCapability?: CompanyCapability) {
  const memberships = await listCompanyMemberships();
  const membership = memberships.find((item) => item.company.id === companyId);

  if (!membership) {
    redirect("/onboarding?error=Kompania%20nuk%20u%20gjet%20ose%20nuk%20ke%20akses." as Route);
  }

  if (requiredCapability && !hasCompanyCapability(membership, requiredCapability)) {
    redirect(`/app/${companyId}?error=Ky%20modul%20nuk%20eshte%20ne%20paketen%20e%20kompanise.` as Route);
  }

  return membership;
}
