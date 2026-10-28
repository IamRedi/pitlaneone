"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  canManageCompany,
  canManageCompanyFinance,
  canManageCompanyOperations,
  requireCompanyContext,
  requireSaasUser,
} from "@/lib/company";
import {
  archiveInvoicePdf,
  archiveInvoiceXRechnung,
} from "@/lib/invoice-archive";
import { companyInvitationDeliveryError } from "@/lib/invitation-error";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { logServerFailure } from "@/lib/observability";
import { resolveProductEntitlement } from "@/lib/billing/entitlements";

const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

function invoiceBuyerType(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    return null;
  const accounting = (snapshot as Record<string, unknown>).accounting;
  if (
    !accounting ||
    typeof accounting !== "object" ||
    Array.isArray(accounting)
  )
    return null;
  const buyer = (accounting as Record<string, unknown>).buyer;
  if (!buyer || typeof buyer !== "object" || Array.isArray(buyer)) return null;
  const customerType = (buyer as Record<string, unknown>).customer_type;
  return typeof customerType === "string" ? customerType : null;
}

const createCompanyCustomerSchema = z
  .object({
    companyId: z.string().uuid(),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(5).max(40),
    isVip: z.boolean(),
    billingAddress: z.string().trim().max(180),
    billingPostalCode: z.string().trim().max(24),
    billingCity: z.string().trim().max(100),
    billingCountry: z.string().trim().max(100),
    vehicleModel: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(2).max(120).optional(),
    ),
    vehiclePlateNumber: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(3).max(20).optional(),
    ),
    vehicleVin: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(32).optional(),
    ),
    vehicleCurrentKm: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(0).max(2_000_000).optional(),
    ),
  })
  .superRefine((value, context) => {
    const hasVehicleData = Boolean(
      value.vehicleModel ||
      value.vehiclePlateNumber ||
      value.vehicleVin ||
      value.vehicleCurrentKm !== undefined,
    );

    if (hasVehicleData && !value.vehicleModel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vehicleModel"],
        message: "Vehicle model is required.",
      });
    }

    if (hasVehicleData && !value.vehiclePlateNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vehiclePlateNumber"],
        message: "Vehicle plate number is required.",
      });
    }
  });

const createCompanyVehicleSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  model: z.string().trim().min(2).max(120),
  plateNumber: z.string().trim().min(3).max(20),
  vin: z.string().trim().max(32),
  currentKm: z.coerce.number().int().min(0).max(2_000_000),
});

function vehicleSaveErrorMessage(
  code: string | null | undefined,
  message?: string,
) {
  switch (code) {
    case "23505":
      return "Kjo%20targe%20eshte%20regjistruar%20tashme%20per%20kete%20klient.";
    case "23502":
      return "Skema%20e%20automjeteve%20nuk%20eshte%20plotesisht%20e%20konfiguruar.";
    case "23503":
      return "Lidhja%20e%20automjetit%20nuk%20u%20ruajt.%20Apliko%20migrimin%20e%20fundit%20dhe%20provo%20perseri.";
    case "42883":
    case "PGRST202":
      return "Konfigurimi%20i%20ruajtjes%20se%20automjeteve%20mungon.%20Apliko%20migrimin%2020260805%20dhe%20provo%20perseri.";
    case "42501":
      if (message?.includes("Customer is not available")) {
        return "Ky%20eshte%20nje%20klient%20i%20veter%20qe%20nuk%20i%20perket%20kompanise%20aktive.%20Krijo%20nje%20klient%20te%20ri%20ose%20beje%20migrimin%20e%20te%20dhenave%20te%20vjetra.";
      }
      return "Nuk%20ke%20leje%20per%20te%20ruajtur%20automjete%20ne%20kete%20kompani.";
    default:
      return "Automjeti%20nuk%20u%20ruajt.%20Provo%20perseri.";
  }
}

function customerSaveErrorMessage(
  code: string | null | undefined,
  message?: string,
) {
  switch (code) {
    case "23505":
      return "Kjo%20targe%20ose%20ky%20numer%20eshte%20regjistruar%20tashme%20ne%20kete%20kompani.";
    case "22023":
      return "Per%20automjetin%20duhen%20modeli%20dhe%20targa.";
    case "23502":
      return "Skema%20e%20klienteve%20nuk%20eshte%20plotesisht%20e%20konfiguruar.%20Apliko%20migrimin%2020260805.";
    case "42883":
    case "PGRST202":
    case "PGRST204":
      return "Konfigurimi%20i%20ruajtjes%20se%20klienteve%20mungon.%20Apliko%20migrimin%2020260805%20dhe%20provo%20perseri.";
    case "42501":
      if (message?.toLowerCase().includes("active company")) {
        return "Kompania%20aktive%20nuk%20u%20verifikua.%20Rifresko%20faqen,%20zgjidh%20kompanine%20dhe%20provo%20perseri.";
      }
      return "Nuk%20ke%20te%20drejte%20te%20regjistrosh%20kliente%20ne%20kete%20kompani.";
    default:
      return "Klienti%20nuk%20u%20ruajt.%20Provo%20perseri.";
  }
}

function logCompanyActionFailure(action: string, error: unknown) {
  void logServerFailure(action, error);
}

function normalizeVehicleIdentifier(value: string) {
  return value.trim().toUpperCase();
}

const companyDomainSchema = z.object({
  companyId: z.string().uuid(),
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(
      /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    ),
});

const publicAppointmentRequestSchema = z.object({
  companyId: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  serviceInterest: z.string().trim().max(120),
  catalogItemId: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional(),
  ),
  vehicleDescription: z.string().trim().max(120),
  vehiclePlate: z.string().trim().max(24),
  preferredDate: z.preprocess(
    emptyStringToUndefined,
    z.string().date().optional(),
  ),
  preferredTime: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  ),
  note: z.string().trim().max(1000),
}).superRefine((value, context) => {
  if (!value.catalogItemId && value.serviceInterest.length < 2) {
    context.addIssue({
      code: "custom",
      path: ["serviceInterest"],
      message: "Service is required",
    });
  }
});

const updateAppointmentRequestSchema = z.object({
  companyId: z.string().uuid(),
  requestId: z.string().uuid(),
  intent: z.enum(["schedule", "decline", "customer_accepted"]),
  scheduledDate: z.preprocess(
    emptyStringToUndefined,
    z.string().date().optional(),
  ),
  scheduledTime: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  ),
  durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
});

const updateAppointmentWorkTicketSchema = z.object({
  companyId: z.string().uuid(),
  ticketId: z.string().uuid(),
  vehicleDescription: z.string().trim().min(2).max(120),
  vehiclePlate: z.string().trim().min(2).max(24),
});

const cancelCompanyAppointmentSchema = z.object({
  companyId: z.string().uuid(),
  requestId: z.string().uuid(),
});

const companyCatalogItemSchema = z.object({
  companyId: z.string().uuid(),
  itemType: z.enum(["product", "service"]),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600),
  price: z.coerce.number().min(0).max(9_999_999.99),
  originalPrice: z.preprocess(emptyStringToUndefined, z.coerce.number().min(0).max(9_999_999.99).optional()),
  isFeatured: z.preprocess((value) => value === "on", z.boolean()),
  currency: z.enum(["EUR", "ALL"]),
  durationMinutes: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(15).max(480).optional(),
  ),
});

const inventoryItemSchema = z.object({
  companyId: z.string().uuid(),
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().max(255),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000),
  unit: z.string().trim().min(1).max(24),
  salePrice: z.coerce.number().min(0).max(9_999_999.99),
  taxRate: z.coerce.number().min(0).max(100),
  initialStock: z.coerce.number().min(0).max(9_999_999),
  reorderLevel: z.coerce.number().min(0).max(9_999_999),
});
const inventoryReceiveSchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.coerce.number().positive().max(9_999_999),
  note: z.string().trim().max(500),
});
const counterSaleSchema = z.object({
  companyId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        quantity: z.number().positive().max(9_999_999),
      }),
    )
    .min(1),
  amountPaid: z.number().min(0).max(9_999_999.99).optional(),
});

function vercelDomainUrl(path: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) return null;
  const team = process.env.VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`
    : "";
  return { url: `https://api.vercel.com${path}${team}`, token, projectId };
}

export async function connectCompanyCustomDomain(formData: FormData) {
  const parsed = companyDomainSchema.safeParse({
    companyId: formData.get("companyId"),
    hostname: formData.get("hostname"),
  });
  if (!parsed.success)
    redirect(
      `/app/${formData.get("companyId")}/settings?error=Domaini%20nuk%20eshte%20ne%20format%20te%20vlefshem.` as Route,
    );
  const context = await requireCompanyContext(parsed.data.companyId);
  if (context.role !== "owner")
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Vetem%20pronari%20mund%20te%20lidhe%20domain.` as Route,
    );
  const config = vercelDomainUrl(
    `/v10/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID ?? "")}/domains`,
  );
  if (!config)
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Integrimi%20i%20domainit%20nuk%20eshte%20konfiguruar%20ende.` as Route,
    );
  const vercelResponse = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: parsed.data.hostname }),
  });
  if (!vercelResponse.ok && vercelResponse.status !== 409)
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Domaini%20nuk%20u%20shtua%20ne%20Vercel.%20Kontrollo%20nese%20eshte%20ne%20perdorim.` as Route,
    );
  const { supabase } = await requireSaasUser();
  await supabase
    .from("company_domains")
    .update({ is_primary: false })
    .eq("company_id", context.company.id);
  const { error } = await supabase.from("company_domains").upsert(
    {
      company_id: context.company.id,
      hostname: parsed.data.hostname,
      domain_type: "custom",
      is_primary: true,
      is_verified: false,
    },
    { onConflict: "hostname" },
  );
  if (error)
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Domaini%20u%20shtua%20ne%20Vercel,%20por%20nuk%20u%20ruajt.` as Route,
    );
  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  redirect(`/app/${parsed.data.companyId}/settings?domainAdded=1` as Route);
}

export async function verifyCompanyCustomDomain(formData: FormData) {
  const parsed = companyDomainSchema.safeParse({
    companyId: formData.get("companyId"),
    hostname: formData.get("hostname"),
  });
  if (!parsed.success)
    redirect(`/app/${formData.get("companyId")}/settings` as Route);
  const context = await requireCompanyContext(parsed.data.companyId);
  if (context.role !== "owner")
    redirect(`/app/${parsed.data.companyId}/settings` as Route);
  const config = vercelDomainUrl(
    `/v9/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID ?? "")}/domains/${encodeURIComponent(parsed.data.hostname)}/verify`,
  );
  if (!config)
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Integrimi%20i%20domainit%20nuk%20eshte%20konfiguruar%20ende.` as Route,
    );
  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
  });
  const result = response.ok
    ? ((await response.json()) as { verified?: boolean })
    : null;
  const { supabase } = await requireSaasUser();
  if (result?.verified)
    await supabase
      .from("company_domains")
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq("company_id", context.company.id)
      .eq("hostname", parsed.data.hostname);
  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  redirect(`/app/${parsed.data.companyId}/settings?domainChecked=1` as Route);
}

const createCompanyServiceSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  type: z.enum(["normal", "periodic"]),
  date: z.string().date(),
  km: z.coerce.number().int().min(0).max(2_000_000),
  notes: z.string().trim().max(2000),
  laborDiscountPercent: z.coerce.number().min(0).max(100),
});

const createCompanyOpenWorkSchema = createCompanyServiceSchema.omit({
  laborDiscountPercent: true,
});

const finalizeCompanyOpenWorkSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  serviceId: z.string().uuid(),
  notes: z.string().trim().max(2000),
  laborDiscountPercent: z.coerce.number().min(0).max(100),
  dueDate: z.string().date().or(z.literal("")),
});

const createCompanyInvoiceSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dueDate: z.string().date().or(z.literal("")),
});

const recordCompanyInvoicePaymentSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
});

const companyServiceLineItemsSchema = z
  .array(
    z
      .object({
        name: z.string().trim().min(2).max(160),
        quantity: z.coerce.number().positive().max(1_000_000),
        unit: z.string().trim().max(16),
        unitPrice: z.coerce.number().min(0).max(1_000_000),
        laborCost: z.coerce.number().min(0).max(1_000_000),
      })
      .refine((item) => item.quantity * item.unitPrice + item.laborCost > 0),
  )
  .min(1)
  .max(40);

const companyPlannedWorkItemsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(2).max(160),
    }),
  )
  .min(1)
  .max(40);

const updateCompanyCustomerBillingSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid(),
  billingAddress: z.string().trim().max(180),
  billingPostalCode: z.string().trim().max(24),
  billingCity: z.string().trim().max(100),
  billingCountry: z.string().trim().max(100),
  billingName: z.string().trim().max(160),
  billingEmail: z.string().trim().email().max(254).or(z.literal("")),
  billingCountryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  vatId: z.string().trim().max(40),
  customerType: z.enum(["consumer", "business", "public"]),
  electronicAddress: z.string().trim().max(254),
  buyerReference: z.string().trim().max(100),
});

const recordInvoicePagePaymentSchema = z.object({
  companyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
});

const invoiceArchiveSchema = z.object({
  companyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
});

const cancelCompanyInvoiceSchema = invoiceArchiveSchema.extend({
  reason: z.string().trim().min(5).max(500),
  refundConfirmed: z.boolean(),
});

function companyVehiclePath(
  companyId: string,
  customerId: string,
  vehicleId: string,
) {
  return `/app/${companyId}/customers/${customerId}/vehicles/${vehicleId}` as Route;
}

function revalidateCompanyWorkspace(companyId: string) {
  revalidatePath(`/app/${companyId}`, "layout");
}

export async function createCompanyCustomer(formData: FormData) {
  const parsed = createCompanyCustomerSchema.safeParse({
    companyId: formData.get("companyId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    isVip: formData.get("isVip") === "on",
    billingAddress: formData.get("billingAddress") ?? "",
    billingPostalCode: formData.get("billingPostalCode") ?? "",
    billingCity: formData.get("billingCity") ?? "",
    billingCountry: formData.get("billingCountry") ?? "",
    vehicleModel: formData.get("vehicleModel"),
    vehiclePlateNumber: formData.get("vehiclePlateNumber"),
    vehicleVin: formData.get("vehicleVin"),
    vehicleCurrentKm: formData.get("vehicleCurrentKm"),
  });

  if (!parsed.success) {
    redirect(
      `/app/${formData.get("companyId")}/customers?error=Kontrollo%20te%20dhenat%20e%20klientit.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);

  if (!canManageCompanyOperations(context.role)) {
    redirect(
      `/app/${parsed.data.companyId}/customers?error=Nuk%20ke%20te%20drejte%20te%20shtosh%20kliente.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: createdRecords, error: customerError } = await supabase.rpc(
    "create_company_customer_with_vehicle",
    {
      input_company_id: context.company.id,
      input_first_name: parsed.data.firstName,
      input_last_name: parsed.data.lastName,
      input_phone: parsed.data.phone,
      input_is_vip: parsed.data.isVip,
      input_vehicle_model: parsed.data.vehicleModel ?? null,
      input_vehicle_plate_number: parsed.data.vehiclePlateNumber
        ? normalizeVehicleIdentifier(parsed.data.vehiclePlateNumber)
        : null,
      input_vehicle_vin: parsed.data.vehicleVin
        ? normalizeVehicleIdentifier(parsed.data.vehicleVin)
        : null,
      input_vehicle_current_km: parsed.data.vehicleCurrentKm ?? null,
    },
  );
  const createdCustomer = createdRecords?.[0];

  if (customerError || !createdCustomer) {
    if (customerError)
      logCompanyActionFailure("CREATE_COMPANY_CUSTOMER_FAILED", customerError);
    redirect(
      `/app/${parsed.data.companyId}/customers?error=${customerSaveErrorMessage(customerError?.code, customerError?.message)}` as Route,
    );
  }

  if (
    parsed.data.billingAddress ||
    parsed.data.billingPostalCode ||
    parsed.data.billingCity ||
    parsed.data.billingCountry
  ) {
    const { error: billingError } = await supabase
      .from("clients")
      .update({
        billing_address: parsed.data.billingAddress || null,
        billing_postal_code: parsed.data.billingPostalCode || null,
        billing_city: parsed.data.billingCity || null,
        billing_country: parsed.data.billingCountry || null,
      })
      .eq("id", createdCustomer.client_id)
      .eq("company_id", context.company.id);

    if (billingError) {
      logCompanyActionFailure(
        "UPDATE_NEW_CUSTOMER_BILLING_FAILED",
        billingError,
      );
      redirect(
        `/app/${parsed.data.companyId}/customers/${createdCustomer.client_id}?error=Klienti%20u%20ruajt,%20por%20adresa%20e%20fatures%20nuk%20u%20ruajt.` as Route,
      );
    }
  }

  revalidatePath(`/app/${parsed.data.companyId}/customers`);
  const requestedReturnTo = String(formData.get("returnTo") ?? "");
  const invoiceReturnPath = `/app/${parsed.data.companyId}/invoices/new`;
  if (requestedReturnTo === invoiceReturnPath && createdCustomer.vehicle_id) {
    redirect(
      `${invoiceReturnPath}?customerId=${createdCustomer.client_id}&vehicleId=${createdCustomer.vehicle_id}` as Route,
    );
  }
  const creationStatus = createdCustomer.vehicle_id
    ? "customerSaved=1&vehicleSaved=1"
    : "customerSaved=1";
  redirect(
    `/app/${parsed.data.companyId}/customers/${createdCustomer.client_id}?${creationStatus}` as Route,
  );
}

export async function updateCompanyCustomerBillingDetails(formData: FormData) {
  const parsed = updateCompanyCustomerBillingSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    billingAddress: formData.get("billingAddress") ?? "",
    billingPostalCode: formData.get("billingPostalCode") ?? "",
    billingCity: formData.get("billingCity") ?? "",
    billingCountry: formData.get("billingCountry") ?? "",
    billingName: formData.get("billingName") ?? "",
    billingEmail: formData.get("billingEmail") ?? "",
    billingCountryCode: formData.get("billingCountryCode") ?? "DE",
    vatId: formData.get("vatId") ?? "",
    customerType: formData.get("customerType") ?? "consumer",
    electronicAddress: formData.get("electronicAddress") ?? "",
    buyerReference: formData.get("buyerReference") ?? "",
  });
  const fallbackPath =
    `/app/${formData.get("companyId")}/customers/${formData.get("customerId")}` as Route;

  if (!parsed.success)
    redirect(
      `${fallbackPath}?error=Kontrollo%20adresen%20e%20fatures.` as Route,
    );

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role)) redirect(fallbackPath);

  const { supabase } = await requireSaasUser();
  const { error } = await supabase
    .from("clients")
    .update({
      billing_address: parsed.data.billingAddress || null,
      billing_postal_code: parsed.data.billingPostalCode || null,
      billing_city: parsed.data.billingCity || null,
      billing_country: parsed.data.billingCountry || null,
      billing_name: parsed.data.billingName || null,
      billing_email: parsed.data.billingEmail || null,
      billing_country_code: parsed.data.billingCountryCode,
      vat_id: parsed.data.vatId || null,
      customer_type: parsed.data.customerType,
      electronic_address: parsed.data.electronicAddress || null,
      buyer_reference: parsed.data.buyerReference || null,
    })
    .eq("id", parsed.data.customerId)
    .eq("company_id", context.company.id);

  if (error) {
    logCompanyActionFailure("UPDATE_CUSTOMER_BILLING_FAILED", error);
    redirect(
      `${fallbackPath}?error=Adresa%20e%20fatures%20nuk%20u%20ruajt.` as Route,
    );
  }

  revalidatePath(fallbackPath);
  redirect(`${fallbackPath}?billingSaved=1` as Route);
}

export async function createCompanyVehicle(formData: FormData) {
  const parsed = createCompanyVehicleSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    model: formData.get("model"),
    plateNumber: formData.get("plateNumber"),
    vin: formData.get("vin") ?? "",
    currentKm: formData.get("currentKm"),
  });

  const fallbackPath = `/app/${formData.get("companyId")}/customers/${formData.get("customerId")}`;

  if (!parsed.success) {
    redirect(
      `${fallbackPath}?error=Kontrollo%20te%20dhenat%20e%20automjetit.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);

  if (!canManageCompanyOperations(context.role)) {
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20shtosh%20automjete.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: createdVehicleId, error } = await supabase.rpc(
    "create_company_vehicle",
    {
      input_client_id: parsed.data.customerId,
      input_model: parsed.data.model,
      input_plate_number: normalizeVehicleIdentifier(parsed.data.plateNumber),
      input_vin: parsed.data.vin
        ? normalizeVehicleIdentifier(parsed.data.vin)
        : null,
      input_current_km: parsed.data.currentKm,
    },
  );

  if (error || !createdVehicleId) {
    // Keep production diagnostics structural so customer input is never logged.
    logCompanyActionFailure("CREATE_COMPANY_VEHICLE_FAILED", error);
    redirect(
      `${fallbackPath}?error=${vehicleSaveErrorMessage(error?.code, error?.message)}` as Route,
    );
  }

  revalidatePath(fallbackPath);
  redirect(`${fallbackPath}?vehicleSaved=1` as Route);
}

export async function createCompanyOpenWork(formData: FormData) {
  const parsed = createCompanyOpenWorkSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    type: formData.get("type"),
    date: formData.get("date"),
    km: formData.get("km"),
    notes: formData.get("notes") ?? "",
  });
  const fallbackPath = companyVehiclePath(
    String(formData.get("companyId")),
    String(formData.get("customerId")),
    String(formData.get("vehicleId")),
  );

  if (!parsed.success) {
    redirect(
      `${fallbackPath}?error=Kontrollo%20te%20dhenat%20e%20punes.` as Route,
    );
  }

  let plannedItems: z.infer<typeof companyPlannedWorkItemsSchema>;
  try {
    plannedItems = companyPlannedWorkItemsSchema.parse(
      JSON.parse(String(formData.get("plannedItemsJson") ?? "[]")),
    );
  } catch {
    redirect(
      `${fallbackPath}?error=Shto%20te%20pakten%20nje%20pune%20te%20planifikuar.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role)) {
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20hapesh%20pune.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: serviceId, error } = await supabase.rpc(
    "create_company_open_work",
    {
      input_company_id: context.company.id,
      input_vehicle_id: parsed.data.vehicleId,
      input_type: parsed.data.type,
      input_date: parsed.data.date,
      input_km: parsed.data.km,
      input_notes: parsed.data.notes,
      input_items: plannedItems,
    },
  );

  if (error || !serviceId) {
    logCompanyActionFailure("CREATE_COMPANY_OPEN_WORK_FAILED", error);
    redirect(
      `${fallbackPath}?error=Puna%20e%20hapur%20nuk%20u%20ruajt.` as Route,
    );
  }

  revalidateCompanyWorkspace(context.company.id);
  redirect(`${fallbackPath}?workOpened=1#work-${serviceId}` as Route);
}

export async function finalizeCompanyOpenWork(formData: FormData) {
  const parsed = finalizeCompanyOpenWorkSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    serviceId: formData.get("serviceId"),
    notes: formData.get("notes") ?? "",
    laborDiscountPercent: formData.get("laborDiscountPercent"),
    dueDate: formData.get("dueDate") ?? "",
  });
  const fallbackPath = companyVehiclePath(
    String(formData.get("companyId")),
    String(formData.get("customerId")),
    String(formData.get("vehicleId")),
  );

  if (!parsed.success) {
    redirect(
      `${fallbackPath}?error=Kontrollo%20te%20dhenat%20e%20fatures.` as Route,
    );
  }

  let serviceItems: z.infer<typeof companyServiceLineItemsSchema>;
  try {
    serviceItems = companyServiceLineItemsSchema.parse(
      JSON.parse(String(formData.get("serviceItemsJson") ?? "[]")),
    );
  } catch {
    redirect(
      `${fallbackPath}?error=Ploteso%20cmimin%20e%20materialit%20ose%20te%20punes%20per%20cdo%20rresht.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyFinance(context.role)) {
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20leshosh%20fatura.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: invoiceId, error } = await supabase.rpc(
    "finalize_company_open_work",
    {
      input_company_id: context.company.id,
      input_service_id: parsed.data.serviceId,
      input_items: serviceItems.map((item) => ({
        ...item,
        laborDiscountPercent: parsed.data.laborDiscountPercent,
      })),
      input_notes: parsed.data.notes,
      input_due_date: parsed.data.dueDate || null,
    },
  );

  if (error || !invoiceId) {
    logCompanyActionFailure("FINALIZE_COMPANY_OPEN_WORK_FAILED", error);
    redirect(
      `${fallbackPath}?error=Puna%20nuk%20u%20finalizua.%20Kontrollo%20cmimet%20dhe%20provo%20perseri.` as Route,
    );
  }

  try {
    await archiveInvoicePdf(supabase, context.company.id, invoiceId);
  } catch (archiveError) {
    logCompanyActionFailure(
      "ARCHIVE_FINALIZED_OPEN_WORK_INVOICE_FAILED",
      archiveError,
    );
    revalidateCompanyWorkspace(context.company.id);
    redirect(
      `/app/${context.company.id}/invoices/${invoiceId}?archiveError=1` as Route,
    );
  }
  revalidateCompanyWorkspace(context.company.id);
  redirect(`/app/${context.company.id}/invoices/${invoiceId}` as Route);
}

export async function createCompanyService(formData: FormData) {
  const parsed = createCompanyServiceSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    type: formData.get("type"),
    date: formData.get("date"),
    km: formData.get("km"),
    notes: formData.get("notes") ?? "",
    laborDiscountPercent: formData.get("laborDiscountPercent"),
  });

  const fallbackPath = `/app/${formData.get("companyId")}/customers/${formData.get("customerId")}/vehicles/${formData.get("vehicleId")}`;

  if (!parsed.success) {
    redirect(
      `${fallbackPath}?error=Kontrollo%20te%20dhenat%20e%20sherbimit.` as Route,
    );
  }

  let serviceItems: z.infer<typeof companyServiceLineItemsSchema>;
  try {
    serviceItems = companyServiceLineItemsSchema.parse(
      JSON.parse(String(formData.get("serviceItemsJson") ?? "[]")),
    );
  } catch {
    redirect(
      `${fallbackPath}?error=Kontrollo%20rreshtat%20e%20sherbimit.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);

  if (!canManageCompanyOperations(context.role)) {
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20regjistrosh%20sherbime.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, client_id")
    .eq("id", parsed.data.vehicleId)
    .eq("client_id", parsed.data.customerId)
    .eq("company_id", context.company.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    redirect(
      `${fallbackPath}?error=Automjeti%20nuk%20u%20gjet%20ne%20kompanine%20aktive.` as Route,
    );
  }

  const { data: createdServiceId, error } = await supabase.rpc(
    "create_company_service_with_line_items",
    {
      input_company_id: context.company.id,
      input_vehicle_id: vehicle.id,
      input_type: parsed.data.type,
      input_date: parsed.data.date,
      input_km: parsed.data.km,
      input_notes: parsed.data.notes,
      input_labor_discount_percent: parsed.data.laborDiscountPercent,
      input_items: serviceItems,
    },
  );

  if (error) {
    logCompanyActionFailure("CREATE_COMPANY_SERVICE_FAILED", error);
    redirect(`${fallbackPath}?error=Sherbimi%20nuk%20u%20ruajt.` as Route);
  }

  if (formData.get("issueInvoice") === "on") {
    if (!canManageCompanyFinance(context.role)) {
      redirect(
        `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20leshosh%20fatura.` as Route,
      );
    }

    const { data: invoiceId, error: invoiceError } = await supabase.rpc(
      "create_company_invoice_from_service",
      {
        input_company_id: context.company.id,
        input_service_id: createdServiceId,
        input_due_date: null,
      },
    );

    if (invoiceError || !invoiceId) {
      logCompanyActionFailure(
        "CREATE_COMPANY_INVOICE_AFTER_SERVICE_FAILED",
        invoiceError,
      );
      redirect(
        `${fallbackPath}?serviceSaved=1&error=Sherbimi%20u%20ruajt,%20por%20fatura%20nuk%20u%20leshuna.` as Route,
      );
    }

    try {
      await archiveInvoicePdf(supabase, context.company.id, invoiceId);
    } catch (archiveError) {
      logCompanyActionFailure(
        "ARCHIVE_NEW_SERVICE_INVOICE_FAILED",
        archiveError,
      );
      revalidateCompanyWorkspace(context.company.id);
      redirect(
        `/app/${context.company.id}/invoices/${invoiceId}?archiveError=1` as Route,
      );
    }
    revalidateCompanyWorkspace(context.company.id);
    redirect(`/app/${context.company.id}/invoices/${invoiceId}` as Route);
  }

  revalidateCompanyWorkspace(context.company.id);
  redirect(`${fallbackPath}?serviceSaved=1` as Route);
}

export async function createCompanyInvoiceFromService(formData: FormData) {
  const parsed = createCompanyInvoiceSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    serviceId: formData.get("serviceId"),
    dueDate: formData.get("dueDate") ?? "",
  });
  const fallbackPath = companyVehiclePath(
    String(formData.get("companyId")),
    String(formData.get("customerId")),
    String(formData.get("vehicleId")),
  );
  if (!parsed.success)
    redirect(`${fallbackPath}?error=Kontrollo%20daten%20e%20fatures.` as Route);

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyFinance(context.role))
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20per%20fatura.` as Route,
    );

  const { supabase } = await requireSaasUser();
  const { data: invoiceId, error } = await supabase.rpc(
    "create_company_invoice_from_service",
    {
      input_company_id: context.company.id,
      input_service_id: parsed.data.serviceId,
      input_due_date: parsed.data.dueDate || null,
    },
  );
  if (error) {
    logCompanyActionFailure("CREATE_COMPANY_INVOICE_FAILED", error);
    const message =
      error.code === "23505"
        ? "Numri%20i%20fatures%20u%20perplas.%20Apliko%20migrimin%2020260816%20dhe%20provo%20perseri."
        : "Fatura%20nuk%20u%20leshua.%20Sherbimi%20mund%20te%20jete%20tashme%20i%20faturuar.";
    redirect(`${fallbackPath}?error=${message}` as Route);
  }
  if (!invoiceId)
    redirect(`${fallbackPath}?error=Fatura%20nuk%20u%20krijua.` as Route);
  try {
    await archiveInvoicePdf(supabase, context.company.id, invoiceId);
  } catch (archiveError) {
    logCompanyActionFailure("ARCHIVE_SERVICE_INVOICE_FAILED", archiveError);
    revalidateCompanyWorkspace(context.company.id);
    redirect(
      `/app/${context.company.id}/invoices/${invoiceId}?archiveError=1` as Route,
    );
  }
  revalidateCompanyWorkspace(context.company.id);
  redirect(`/app/${context.company.id}/invoices/${invoiceId}` as Route);
}

export async function recordCompanyInvoicePayment(formData: FormData) {
  const parsed = recordCompanyInvoicePaymentSchema.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    vehicleId: formData.get("vehicleId"),
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
  });
  const fallbackPath = companyVehiclePath(
    String(formData.get("companyId")),
    String(formData.get("customerId")),
    String(formData.get("vehicleId")),
  );
  if (!parsed.success)
    redirect(
      `${fallbackPath}?error=Kontrollo%20shumen%20e%20pageses.` as Route,
    );

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyFinance(context.role))
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20per%20fatura.` as Route,
    );

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("record_company_invoice_payment", {
    input_company_id: context.company.id,
    input_invoice_id: parsed.data.invoiceId,
    input_amount: parsed.data.amount,
  });
  if (error) {
    logCompanyActionFailure("RECORD_COMPANY_INVOICE_PAYMENT_FAILED", error);
    redirect(
      `${fallbackPath}?error=Pagesa%20nuk%20u%20regjistrua.%20Kontrollo%20shumen%20e%20mbetur.` as Route,
    );
  }
  revalidateCompanyWorkspace(context.company.id);
  redirect(`${fallbackPath}?paymentSaved=1` as Route);
}

export async function recordInvoicePagePayment(formData: FormData) {
  const parsed = recordInvoicePagePaymentSchema.safeParse({
    companyId: formData.get("companyId"),
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
  });
  const fallbackPath =
    `/app/${formData.get("companyId")}/invoices/${formData.get("invoiceId")}` as Route;

  if (!parsed.success)
    redirect(
      `${fallbackPath}?error=Kontrollo%20shumen%20e%20pageses.` as Route,
    );

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyFinance(context.role)) {
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20regjistrosh%20pagesa.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("record_company_invoice_payment", {
    input_company_id: context.company.id,
    input_invoice_id: parsed.data.invoiceId,
    input_amount: parsed.data.amount,
  });

  if (error) {
    logCompanyActionFailure("RECORD_INVOICE_PAGE_PAYMENT_FAILED", error);
    redirect(
      `${fallbackPath}?error=Pagesa%20nuk%20u%20regjistrua.%20Kontrollo%20shumen%20e%20mbetur.` as Route,
    );
  }

  revalidateCompanyWorkspace(context.company.id);
  redirect(`${fallbackPath}?paymentSaved=1` as Route);
}

export async function archiveCompanyInvoice(formData: FormData) {
  const parsed = invoiceArchiveSchema.safeParse({
    companyId: formData.get("companyId"),
    invoiceId: formData.get("invoiceId"),
  });
  const fallbackPath =
    `/app/${formData.get("companyId")}/invoices/${formData.get("invoiceId")}` as Route;
  if (!parsed.success) redirect(`${fallbackPath}?archiveError=1` as Route);
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyFinance(context.role))
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20arkivosh%20fatura.` as Route,
    );
  const { supabase } = await requireSaasUser();
  try {
    await archiveInvoicePdf(
      supabase,
      context.company.id,
      parsed.data.invoiceId,
    );
    const { data: invoice } = await supabase
      .from("invoices")
      .select("registration_country, invoice_snapshot")
      .eq("company_id", context.company.id)
      .eq("id", parsed.data.invoiceId)
      .maybeSingle();
    const buyerType = invoiceBuyerType(invoice?.invoice_snapshot);
    if (
      invoice?.registration_country === "DE" &&
      (buyerType === "business" || buyerType === "public")
    ) {
      await archiveInvoiceXRechnung(
        supabase,
        context.company.id,
        parsed.data.invoiceId,
      );
    }
  } catch (error) {
    logCompanyActionFailure("ARCHIVE_COMPANY_INVOICE_FAILED", error);
    redirect(
      `${fallbackPath}?archiveError=${encodeURIComponent(error instanceof Error ? error.message : "archive failed")}` as Route,
    );
  }
  revalidatePath(fallbackPath);
  redirect(`${fallbackPath}?archiveSaved=1` as Route);
}

export async function cancelCompanyInvoice(formData: FormData) {
  const parsed = cancelCompanyInvoiceSchema.safeParse({
    companyId: formData.get("companyId"),
    invoiceId: formData.get("invoiceId"),
    reason: formData.get("reason"),
    refundConfirmed: formData.get("refundConfirmed") === "on",
  });
  const fallbackPath =
    `/app/${formData.get("companyId")}/invoices/${formData.get("invoiceId")}` as Route;
  if (!parsed.success)
    redirect(
      `${fallbackPath}?error=Shkruaj%20arsyen%20e%20anulimit,%20minimumi%205%20karaktere.` as Route,
    );
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyFinance(context.role))
    redirect(
      `${fallbackPath}?error=Nuk%20ke%20te%20drejte%20te%20anulosh%20fatura.` as Route,
    );
  const { supabase } = await requireSaasUser();

  try {
    await archiveInvoicePdf(
      supabase,
      context.company.id,
      parsed.data.invoiceId,
    );
  } catch (error) {
    logCompanyActionFailure("ARCHIVE_BEFORE_STORNO_FAILED", error);
    redirect(
      `${fallbackPath}?error=Fatura%20origjinale%20duhet%20te%20arkivohet%20para%20Storno-s.` as Route,
    );
  }

  const { data: stornoId, error } = await supabase.rpc(
    "cancel_company_invoice_with_refund",
    {
      input_company_id: context.company.id,
      input_invoice_id: parsed.data.invoiceId,
      input_reason: parsed.data.reason,
      input_refund_confirmed: parsed.data.refundConfirmed,
    },
  );
  if (error || !stornoId) {
    logCompanyActionFailure("CANCEL_COMPANY_INVOICE_FAILED", error);
    const message = error?.message?.includes("Confirm that")
      ? "Konfirmo%20qe%20pagesa%20eshte%20kthyer%20para%20krijimit%20te%20Storno-s."
      : "Storno%20nuk%20u%20krijua.%20Fatura%20mund%20te%20jete%20anuluar%20tashme.";
    redirect(`${fallbackPath}?error=${message}` as Route);
  }

  try {
    await archiveInvoicePdf(supabase, context.company.id, stornoId);
    const { data: storno } = await supabase
      .from("invoices")
      .select("registration_country, invoice_snapshot")
      .eq("company_id", context.company.id)
      .eq("id", stornoId)
      .maybeSingle();
    const stornoBuyerType = invoiceBuyerType(storno?.invoice_snapshot);
    if (
      storno?.registration_country === "DE" &&
      (stornoBuyerType === "business" || stornoBuyerType === "public")
    ) {
      await archiveInvoiceXRechnung(supabase, context.company.id, stornoId);
    }
  } catch (archiveError) {
    logCompanyActionFailure("ARCHIVE_STORNO_INVOICE_FAILED", archiveError);
    revalidateCompanyWorkspace(context.company.id);
    redirect(
      `/app/${context.company.id}/invoices/${stornoId}?stornoCreated=1&archiveError=1` as Route,
    );
  }
  revalidateCompanyWorkspace(context.company.id);
  redirect(
    `/app/${context.company.id}/invoices/${stornoId}?stornoCreated=1` as Route,
  );
}

export async function createCompany(formData: FormData) {
  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect(
      "/onboarding?error=Kontrollo%20emrin%20dhe%20identifikuesin%20e%20kompanise." as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: companyId, error } = await supabase.rpc(
    "create_pitlane_trial_company",
    {
      input_name: parsed.data.name,
      input_slug: parsed.data.slug,
    },
  );

  if (error || !companyId) {
    const rawMessage = error?.message ?? "";
    const message =
      error?.code === "23505"
        ? "Ky%20identifikues%20eshte%20ne%20perdorim."
        : rawMessage.includes("current plan includes one company")
          ? "Plani%20yt%20perfshin%20nje%20kompani.%20Aktivizo%20paketen%20per%20kompanine%20e%20dyte."
          : rawMessage.includes("introductory PitlaneOne trial was already used")
            ? "Prova%207-ditore%20e%20PitlaneOne%20eshte%20perdorur%20tashme."
            : "Kompania%20nuk%20u%20krijua.";
    redirect(`/onboarding?error=${message}` as Route);
  }

  redirect(`/app/${companyId}` as Route);
}

export async function createPublicAppointmentRequest(formData: FormData) {
  const rawCompanyId = formData.get("companyId");
  const rawSlug = formData.get("slug");
  const fallbackSlug =
    typeof rawSlug === "string" ? rawSlug.trim().toLowerCase() : "";
  const fallbackPath = `/b/${fallbackSlug}`;
  const parsed = publicAppointmentRequestSchema.safeParse({
    companyId: rawCompanyId,
    slug: rawSlug,
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    serviceInterest: formData.get("serviceInterest"),
    catalogItemId: formData.get("catalogItemId") ?? "",
    vehicleDescription: formData.get("vehicleDescription") ?? "",
    vehiclePlate: formData.get("vehiclePlate") ?? "",
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    redirect(`${fallbackPath}?appointment=invalid#termin` as Route);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("create_public_appointment_request", {
    input_company_id: parsed.data.companyId,
    input_customer_name: parsed.data.customerName,
    input_phone: parsed.data.phone,
    input_service_interest: parsed.data.serviceInterest,
    input_catalog_item_id: parsed.data.catalogItemId ?? null,
    input_vehicle_description: parsed.data.vehicleDescription || null,
    input_vehicle_plate: parsed.data.vehiclePlate || null,
    input_preferred_date: parsed.data.preferredDate ?? null,
    input_preferred_time: parsed.data.preferredTime ?? null,
    input_note: parsed.data.note || null,
  });

  if (error) {
    redirect(`/b/${parsed.data.slug}?appointment=error#termin` as Route);
  }

  revalidatePath(`/app/${parsed.data.companyId}/appointments`);
  redirect(`/b/${parsed.data.slug}?appointment=sent#termin` as Route);
}

export async function updateCompanyAppointmentRequest(formData: FormData) {
  const parsed = updateAppointmentRequestSchema.safeParse({
    companyId: formData.get("companyId"),
    requestId: formData.get("requestId"),
    intent: formData.get("intent"),
    scheduledDate: formData.get("scheduledDate") ?? undefined,
    scheduledTime: formData.get("scheduledTime") ?? undefined,
    durationMinutes: formData.get("durationMinutes") ?? undefined,
  });

  if (!parsed.success) redirect("/onboarding" as Route);
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  const { supabase } = await requireSaasUser();
  let error: { message: string } | null = null;
  let resultStatus: string | null = null;

  if (parsed.data.intent === "schedule") {
    if (!parsed.data.scheduledDate || !parsed.data.scheduledTime) {
      error = { message: "Zgjidh datën dhe orën e terminit." };
    } else {
      const result = await supabase.rpc(
        "propose_or_confirm_company_appointment_request",
        {
          input_company_id: context.company.id,
          input_request_id: parsed.data.requestId,
          input_date: parsed.data.scheduledDate,
          input_time: parsed.data.scheduledTime,
          input_duration_minutes: parsed.data.durationMinutes ?? 60,
        },
      );
      error = result.error;
      resultStatus = result.data;
    }
  } else if (parsed.data.intent === "customer_accepted") {
    const result = await supabase.rpc(
      "confirm_proposed_company_appointment_request",
      {
        input_company_id: context.company.id,
        input_request_id: parsed.data.requestId,
      },
    );
    error = result.error;
  } else {
    const result = await supabase.rpc("decline_company_appointment_request", {
      input_company_id: context.company.id,
      input_request_id: parsed.data.requestId,
    });
    error = result.error;
  }

  if (error)
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Kerkesa%20nuk%20u%20perditesua.` as Route,
    );
  revalidatePath(`/app/${parsed.data.companyId}/appointments`);
  const outcome =
    resultStatus === "awaiting_customer" ? "proposal=1" : "saved=1";
  redirect(
    `/app/${parsed.data.companyId}/appointments?${outcome}#request-${parsed.data.requestId}` as Route,
  );
}

export async function cancelCompanyAppointmentRequest(formData: FormData) {
  const parsed = cancelCompanyAppointmentSchema.safeParse({
    companyId: formData.get("companyId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) redirect("/onboarding" as Route);

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("cancel_company_appointment_request", {
    input_company_id: context.company.id,
    input_request_id: parsed.data.requestId,
  });
  if (error) {
    logCompanyActionFailure("CANCEL_COMPANY_APPOINTMENT_FAILED", error);
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Termini%20nuk%20u%20anulua.` as Route,
    );
  }

  revalidateCompanyWorkspace(context.company.id);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(`/app/${parsed.data.companyId}/appointments?saved=1` as Route);
}

export async function openCompanyAppointmentWorkTicket(formData: FormData) {
  const parsed = updateAppointmentWorkTicketSchema.safeParse({
    companyId: formData.get("companyId"),
    ticketId: formData.get("ticketId"),
    vehicleDescription: formData.get("vehicleDescription"),
    vehiclePlate: formData.get("vehiclePlate"),
  });

  if (!parsed.success) redirect("/onboarding" as Route);
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  const { supabase } = await requireSaasUser();
  const { data: ticket, error: ticketError } = await supabase
    .from("company_appointment_work_tickets")
    .select("id, customer_name, phone, service_interest, note, scheduled_start")
    .eq("id", parsed.data.ticketId)
    .eq("company_id", context.company.id)
    .eq("status", "ready")
    .maybeSingle();

  if (ticketError || !ticket) {
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Ticketi%20i%20punes%20nuk%20u%20gjet.` as Route,
    );
  }

  const plateNumber = normalizeVehicleIdentifier(parsed.data.vehiclePlate);
  const customerNameParts = ticket.customer_name.trim().split(/\s+/);
  const firstName = customerNameParts.shift() || "Kunde";
  const lastName = customerNameParts.join(" ") || "Termin";
  const { data: existingCustomer, error: existingCustomerError } =
    await supabase
      .from("clients")
      .select("id")
      .eq("company_id", context.company.id)
      .eq("phone", ticket.phone)
      .maybeSingle();

  if (existingCustomerError) {
    logCompanyActionFailure(
      "LOOKUP_APPOINTMENT_WORK_CUSTOMER_FAILED",
      existingCustomerError,
    );
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Klienti%20nuk%20u%20kontrollua.` as Route,
    );
  }

  let customerId = existingCustomer?.id;
  let vehicleId: string | null = null;

  if (!customerId) {
    const { data: createdRecords, error: customerError } = await supabase.rpc(
      "create_company_customer_with_vehicle",
      {
        input_company_id: context.company.id,
        input_first_name: firstName,
        input_last_name: lastName,
        input_phone: ticket.phone,
        input_is_vip: false,
        input_vehicle_model: parsed.data.vehicleDescription,
        input_vehicle_plate_number: plateNumber,
        input_vehicle_vin: null,
        input_vehicle_current_km: 0,
      },
    );
    const createdCustomer = createdRecords?.[0];
    if (customerError || !createdCustomer?.vehicle_id) {
      logCompanyActionFailure(
        "CREATE_APPOINTMENT_WORK_CUSTOMER_FAILED",
        customerError,
      );
      redirect(
        `/app/${parsed.data.companyId}/appointments?error=Klienti%20ose%20automjeti%20nuk%20u%20ruajt.` as Route,
      );
    }
    customerId = createdCustomer.client_id;
    vehicleId = createdCustomer.vehicle_id;
  } else {
    const { data: existingVehicle, error: vehicleLookupError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("company_id", context.company.id)
      .eq("client_id", customerId)
      .eq("plate_number", plateNumber)
      .maybeSingle();

    if (vehicleLookupError) {
      logCompanyActionFailure(
        "LOOKUP_APPOINTMENT_WORK_VEHICLE_FAILED",
        vehicleLookupError,
      );
      redirect(
        `/app/${parsed.data.companyId}/appointments?error=Automjeti%20nuk%20u%20kontrollua.` as Route,
      );
    }

    if (existingVehicle) {
      vehicleId = existingVehicle.id;
    } else {
      const { data: createdVehicleId, error: vehicleError } =
        await supabase.rpc("create_company_vehicle", {
          input_client_id: customerId,
          input_model: parsed.data.vehicleDescription,
          input_plate_number: plateNumber,
          input_vin: null,
          input_current_km: 0,
        });
      if (vehicleError || !createdVehicleId) {
        logCompanyActionFailure(
          "CREATE_APPOINTMENT_WORK_VEHICLE_FAILED",
          vehicleError,
        );
        redirect(
          `/app/${parsed.data.companyId}/appointments?error=Automjeti%20nuk%20u%20ruajt.` as Route,
        );
      }
      vehicleId = createdVehicleId;
    }
  }

  if (!customerId || !vehicleId) {
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Puna%20nuk%20u%20hap.` as Route,
    );
  }

  const { data: serviceId, error: serviceError } = await supabase.rpc(
    "create_company_open_work",
    {
      input_company_id: context.company.id,
      input_vehicle_id: vehicleId,
      input_type: "normal",
      input_date: ticket.scheduled_start.slice(0, 10),
      input_km: 0,
      input_notes: ticket.note ?? "",
      input_items: [{ name: ticket.service_interest }],
    },
  );

  if (serviceError || !serviceId) {
    logCompanyActionFailure(
      "CREATE_APPOINTMENT_OPEN_WORK_FAILED",
      serviceError,
    );
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Puna%20nuk%20u%20hap.` as Route,
    );
  }

  const admin = createAdminSupabase();
  const { error: ticketUpdateError } = await admin
    .from("company_appointment_work_tickets")
    .update({
      vehicle_description: parsed.data.vehicleDescription,
      vehicle_plate: plateNumber,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.ticketId)
    .eq("company_id", context.company.id);

  if (ticketUpdateError) {
    logCompanyActionFailure(
      "COMPLETE_APPOINTMENT_WORK_TICKET_FAILED",
      ticketUpdateError,
    );
    redirect(
      `/app/${parsed.data.companyId}/appointments?error=Ticketi%20i%20punes%20nuk%20u%20perditesua.` as Route,
    );
  }

  revalidateCompanyWorkspace(context.company.id);
  redirect(
    `${companyVehiclePath(context.company.id, customerId, vehicleId)}?workOpened=1#work-${serviceId}` as Route,
  );
}

export async function updateCompanyAppointmentBusinessHours(
  formData: FormData,
) {
  const rawCompanyId = formData.get("companyId");
  const companyId = typeof rawCompanyId === "string" ? rawCompanyId : "";
  if (!z.string().uuid().safeParse(companyId).success)
    redirect("/onboarding" as Route);
  const context = await requireCompanyContext(companyId);
  if (!canManageCompany(context.role)) redirect(`/app/${companyId}` as Route);
  const hours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    is_open: formData.get(`open-${weekday}`) === "on",
    opens_at: String(formData.get(`opensAt-${weekday}`) ?? "08:00"),
    closes_at: String(formData.get(`closesAt-${weekday}`) ?? "18:00"),
    slot_minutes: Number(formData.get(`slotMinutes-${weekday}`) ?? 30),
  }));
  const valid = hours.every(
    (row) =>
      /^\d{2}:\d{2}$/.test(row.opens_at) &&
      /^\d{2}:\d{2}$/.test(row.closes_at) &&
      [15, 20, 30, 60].includes(row.slot_minutes),
  );
  if (!valid)
    redirect(
      `/app/${companyId}/appointments?error=Orari%20i%20punes%20nuk%20eshte%20i%20vlefshem.` as Route,
    );
  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc(
    "update_company_appointment_business_hours",
    { input_company_id: context.company.id, input_hours: hours },
  );
  if (error)
    redirect(
      `/app/${companyId}/appointments?error=Orari%20i%20punes%20nuk%20u%20ruajt.` as Route,
    );
  revalidatePath(`/app/${companyId}/appointments`);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(`/app/${companyId}/appointments?saved=1` as Route);
}

function normalizePublicUrl(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

const companyBrandingSchema = z.object({
  companyId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600),
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  email: z.string().trim().max(254),
  address: z.string().trim().max(180),
  city: z.string().trim().max(100),
  country: z.string().trim().max(100),
  instagramUrl: z.string().trim().max(2048).url().startsWith("https://").or(z.literal("")),
  facebookUrl: z.string().trim().max(2048).url().startsWith("https://").or(z.literal("")),
  tiktokUrl: z.string().trim().max(2048).url().startsWith("https://").or(z.literal("")),
  legalNoticeUrl: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }),
  privacyPolicyUrl: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }),
  websiteLocale: z.enum(["sq", "en", "de", "it", "tr", "pl"]),
  heroEyebrow: z.string().trim().min(2).max(80),
  heroTitle: z.string().trim().min(4).max(140),
  heroSubtitle: z.string().trim().min(10).max(500),
  aboutTitle: z.string().trim().min(4).max(140),
  aboutBody: z.string().trim().min(20).max(1000),
  servicesTitle: z.string().trim().min(4).max(140),
  serviceOneTitle: z.string().trim().min(2).max(100),
  serviceOneDescription: z.string().trim().min(10).max(400),
  serviceTwoTitle: z.string().trim().min(2).max(100),
  serviceTwoDescription: z.string().trim().min(10).max(400),
  serviceThreeTitle: z.string().trim().min(2).max(100),
  serviceThreeDescription: z.string().trim().min(10).max(400),
  galleryTitle: z.string().trim().min(4).max(140),
  gallerySubtitle: z.string().trim().min(10).max(500),
  contactTitle: z.string().trim().min(4).max(140),
  contactBody: z.string().trim().min(10).max(500),
  themePreset: z.enum([
    "steel-copper",
    "chrome",
    "light-metal",
    "crimson",
    "atelier",
    "velocity",
    "studio",
    "clarity",
    "forge",
  ]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  surfaceColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isPublic: z.boolean(),
});

const companyInvoiceSettingsSchema = z.object({
  companyId: z.string().uuid(),
  registrationCountry: z.enum(["DE", "AL", "IT"]),
  defaultCurrency: z.enum(["EUR", "ALL"]),
  allPerEurRate: z.coerce.number().positive().max(1000000),
  legalName: z.string().trim().max(160),
  taxId: z.string().trim().max(80),
  registrationNumber: z.string().trim().max(80),
  bankName: z.string().trim().max(120),
  bankIban: z.string().trim().max(80),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  sellerStreet: z.string().trim().max(180),
  sellerPostalCode: z.string().trim().max(24),
  sellerCity: z.string().trim().max(100),
  sellerCountryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  contactEmail: z.string().trim().email().max(254).or(z.literal("")),
  paymentTerms: z.string().trim().min(2).max(500),
  vatExemptionReason: z.string().trim().max(500),
  invoiceFooter: z.string().trim().max(600),
});

const addCompanyMemberSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "staff", "accounting", "viewer"]),
});

const updateCompanyMemberAccessSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "manager", "staff", "accounting", "viewer"]),
  isActive: z.boolean(),
});

const createCompanyInvitationSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "staff", "accounting", "viewer"]),
});

const acceptCompanyInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

const revokeCompanyInvitationSchema = z.object({
  companyId: z.string().uuid(),
  invitationId: z.string().uuid(),
});

function publicAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!configuredUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS outside localhost");
  }

  return url.toString().replace(/\/$/, "");
}

const companyAssetSchema = z.object({
  companyId: z.string().uuid(),
  assetType: z.enum([
    "logo",
    "hero",
    "service-1",
    "service-2",
    "service-3",
    "gallery-1",
    "gallery-2",
    "gallery-3",
  ]),
});

const companyAssetFieldByType = {
  logo: "logo_url",
  hero: "hero_image_url",
  "hero-mobile": "hero_mobile_image_url",
  "service-1": "service_one_image_url",
  "service-2": "service_two_image_url",
  "service-3": "service_three_image_url",
  "gallery-1": "gallery_one_image_url",
  "gallery-2": "gallery_two_image_url",
  "gallery-3": "gallery_three_image_url",
} as const;

const companyBrandAssetTypeSchema = z.enum([
  "logo",
  "hero",
  "hero-mobile",
  "service-1",
  "service-2",
  "service-3",
  "gallery-1",
  "gallery-2",
  "gallery-3",
]);

const acceptedAssetTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function assetErrorUrl(companyId: string, message: string) {
  return `/app/${companyId}/settings?error=${encodeURIComponent(message)}` as Route;
}

function optionalValue(value: string) {
  return value || null;
}

export async function updateCompanyWebsitePublication(
  companyId: string,
  isPublic: boolean,
) {
  const parsedCompanyId = z.string().uuid().safeParse(companyId);
  if (!parsedCompanyId.success) return { ok: false };

  const context = await requireCompanyContext(parsedCompanyId.data);
  if (!canManageCompany(context.role)) return { ok: false };

  const { supabase } = await requireSaasUser();
  if (isPublic) {
    const productKey = context.company.product_surface === "business_site" ? "businesssite" : "pitlane";
    const entitlement = await resolveProductEntitlement(supabase, productKey);
    if (!entitlement.mayPublish) return { ok: false, reason: "missing_entitlement" as const };
    const { data: profile, error: profileError } = await supabase
      .from("company_profiles")
      .select("description, phone, email, hero_title")
      .eq("company_id", parsedCompanyId.data)
      .single();
    if (
      profileError ||
      !profile?.description ||
      !profile.hero_title ||
      (!profile.phone && !profile.email)
    ) {
      return { ok: false, reason: "incomplete_profile" as const };
    }
  }
  const { error } = await supabase
    .from("company_profiles")
    .update({ is_public: isPublic })
    .eq("company_id", parsedCompanyId.data);
  if (error) return { ok: false };

  revalidatePath(`/app/${parsedCompanyId.data}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  return { ok: true };
}

export async function rotateCompanyWebsitePreview(companyId: string) {
  const parsedCompanyId = z.string().uuid().safeParse(companyId);
  if (!parsedCompanyId.success) return { ok: false as const };
  const context = await requireCompanyContext(parsedCompanyId.data);
  if (!canManageCompany(context.role)) return { ok: false as const };
  const previewToken = randomUUID();
  const { supabase } = await requireSaasUser();
  const { error } = await supabase.from("company_profiles").update({ preview_token: previewToken }).eq("company_id", parsedCompanyId.data);
  if (error) return { ok: false as const };
  revalidatePath(`/app/${parsedCompanyId.data}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  return { ok: true as const, url: `${publicAppUrl()}/b/${context.company.slug}?preview=${previewToken}` };
}

export async function clearCompanyBrandAsset(
  companyId: string,
  assetType: string,
) {
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      assetType: companyBrandAssetTypeSchema,
    })
    .safeParse({ companyId, assetType });
  if (!parsed.success) return { ok: false };

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role)) return { ok: false };

  const databaseField = companyAssetFieldByType[parsed.data.assetType];
  const { supabase } = await requireSaasUser();
  const { data: current, error: readError } = await supabase
    .from("company_theme_settings")
    .select(databaseField)
    .eq("company_id", parsed.data.companyId)
    .single();
  if (readError) return { ok: false };

  const { error: updateError } = await supabase
    .from("company_theme_settings")
    .update({ [databaseField]: null })
    .eq("company_id", parsed.data.companyId);
  if (updateError) return { ok: false };

  const currentUrl =
    current && typeof current === "object"
      ? (current as Record<string, unknown>)[databaseField]
      : null;
  if (typeof currentUrl === "string") {
    const marker = "/company-assets/";
    const markerIndex = currentUrl.indexOf(marker);
    const storagePath =
      markerIndex >= 0
        ? decodeURIComponent(currentUrl.slice(markerIndex + marker.length))
        : "";
    const expectedPrefix = `${parsed.data.companyId}/brand/${parsed.data.assetType}/`;
    if (storagePath.startsWith(expectedPrefix))
      await supabase.storage.from("company-assets").remove([storagePath]);
  }

  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  return { ok: true };
}

export async function updateCompanyBranding(formData: FormData) {
  const parsed = companyBrandingSchema.safeParse({
    companyId: formData.get("companyId"),
    displayName: formData.get("displayName"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    country: formData.get("country"),
    instagramUrl: normalizePublicUrl(formData.get("instagramUrl")),
    facebookUrl: normalizePublicUrl(formData.get("facebookUrl")),
    tiktokUrl: normalizePublicUrl(formData.get("tiktokUrl")),
    legalNoticeUrl: formData.get("legalNoticeUrl"),
    privacyPolicyUrl: formData.get("privacyPolicyUrl"),
    websiteLocale: formData.get("websiteLocale"),
    heroEyebrow: formData.get("heroEyebrow"),
    heroTitle: formData.get("heroTitle"),
    heroSubtitle: formData.get("heroSubtitle"),
    aboutTitle: formData.get("aboutTitle"),
    aboutBody: formData.get("aboutBody"),
    servicesTitle: formData.get("servicesTitle"),
    serviceOneTitle: formData.get("serviceOneTitle"),
    serviceOneDescription: formData.get("serviceOneDescription"),
    serviceTwoTitle: formData.get("serviceTwoTitle"),
    serviceTwoDescription: formData.get("serviceTwoDescription"),
    serviceThreeTitle: formData.get("serviceThreeTitle"),
    serviceThreeDescription: formData.get("serviceThreeDescription"),
    galleryTitle: formData.get("galleryTitle"),
    gallerySubtitle: formData.get("gallerySubtitle"),
    contactTitle: formData.get("contactTitle"),
    contactBody: formData.get("contactBody"),
    themePreset: formData.get("themePreset"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    backgroundColor: formData.get("backgroundColor"),
    surfaceColor: formData.get("surfaceColor"),
    textColor: formData.get("textColor"),
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/app/${formData.get("companyId")}/settings?error=Kontrollo%20te%20dhenat%20e%20profilit.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);

  if (!canManageCompany(context.role)) {
    redirect(`/app/${parsed.data.companyId}` as Route);
  }

  const { supabase } = await requireSaasUser();
  const profileUpdate = {
    display_name: parsed.data.displayName,
    description: optionalValue(parsed.data.description),
    phone: optionalValue(parsed.data.phone),
    whatsapp: optionalValue(parsed.data.whatsapp),
    email: optionalValue(parsed.data.email),
    address: optionalValue(parsed.data.address),
    city: optionalValue(parsed.data.city),
    country: optionalValue(parsed.data.country),
    instagram_url: optionalValue(parsed.data.instagramUrl),
    facebook_url: optionalValue(parsed.data.facebookUrl),
    tiktok_url: optionalValue(parsed.data.tiktokUrl),
    legal_notice_url: optionalValue(parsed.data.legalNoticeUrl),
    privacy_policy_url: optionalValue(parsed.data.privacyPolicyUrl),
    website_locale: parsed.data.websiteLocale,
    hero_eyebrow: parsed.data.heroEyebrow,
    hero_title: parsed.data.heroTitle,
    hero_subtitle: parsed.data.heroSubtitle,
    about_title: parsed.data.aboutTitle,
    about_body: parsed.data.aboutBody,
    services_title: parsed.data.servicesTitle,
    service_one_title: parsed.data.serviceOneTitle,
    service_one_description: parsed.data.serviceOneDescription,
    service_two_title: parsed.data.serviceTwoTitle,
    service_two_description: parsed.data.serviceTwoDescription,
    service_three_title: parsed.data.serviceThreeTitle,
    service_three_description: parsed.data.serviceThreeDescription,
    gallery_title: parsed.data.galleryTitle,
    gallery_subtitle: parsed.data.gallerySubtitle,
    contact_title: parsed.data.contactTitle,
    contact_body: parsed.data.contactBody,
  };
  const themeUpdate = {
    theme_preset: parsed.data.themePreset,
    primary_color: parsed.data.primaryColor,
    accent_color: parsed.data.accentColor,
    background_color: parsed.data.backgroundColor,
    surface_color: parsed.data.surfaceColor,
    text_color: parsed.data.textColor,
  };

  const [{ error: profileError }, { error: themeError }] = await Promise.all([
    supabase
      .from("company_profiles")
      .update(profileUpdate)
      .eq("company_id", parsed.data.companyId),
    supabase
      .from("company_theme_settings")
      .update(themeUpdate)
      .eq("company_id", parsed.data.companyId),
  ]);

  if (profileError || themeError) {
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Ndryshimet%20nuk%20u%20ruajten.` as Route,
    );
  }

  const editorAssets = [
    ["brandAssetLogo", "logo", "logo_url"],
    ["brandAssetHero", "hero", "hero_image_url"],
    ["brandAssetHeroMobile", "hero-mobile", "hero_mobile_image_url"],
    ["brandAssetServiceOne", "service-1", "service_one_image_url"],
    ["brandAssetServiceTwo", "service-2", "service_two_image_url"],
    ["brandAssetServiceThree", "service-3", "service_three_image_url"],
    ["brandAssetGalleryOne", "gallery-1", "gallery_one_image_url"],
    ["brandAssetGalleryTwo", "gallery-2", "gallery_two_image_url"],
    ["brandAssetGalleryThree", "gallery-3", "gallery_three_image_url"],
  ] as const;

  for (const [formField, assetType, databaseField] of editorAssets) {
    const file = formData.get(formField);
    if (!(file instanceof File) || file.size === 0) continue;

    const extension =
      acceptedAssetTypes[file.type as keyof typeof acceptedAssetTypes];
    const maxBytes = assetType === "logo" ? 3 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!extension || file.size > maxBytes) {
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          `Perdor JPG, PNG ose WebP deri ne ${assetType === "logo" ? "3 MB" : "8 MB"}.`,
        ),
      );
    }

    const path = `${parsed.data.companyId}/brand/${assetType}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError)
      redirect(assetErrorUrl(parsed.data.companyId, "Imazhi nuk u ngarkua."));

    const { data: publicUrlData } = supabase.storage
      .from("company-assets")
      .getPublicUrl(path);
    const { error: assetUpdateError } = await supabase
      .from("company_theme_settings")
      .update({ [databaseField]: publicUrlData.publicUrl })
      .eq("company_id", parsed.data.companyId);
    if (assetUpdateError) {
      await supabase.storage.from("company-assets").remove([path]);
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Imazhi u ngarkua por nuk u ruajt ne profil.",
        ),
      );
    }
  }

  const extraGalleryFiles = formData.getAll("brandAssetGalleryExtra");
  for (const file of extraGalleryFiles) {
    if (!(file instanceof File) || file.size === 0) continue;
    const extension =
      acceptedAssetTypes[file.type as keyof typeof acceptedAssetTypes];
    if (!extension || file.size > 8 * 1024 * 1024) {
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Fotot shtese duhet te jene JPG, PNG ose WebP deri ne 8 MB.",
        ),
      );
    }
    const path = `${parsed.data.companyId}/brand/gallery-extra/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError)
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Fotoja e galerise nuk u ngarkua.",
        ),
      );
    const { data: publicUrlData } = supabase.storage
      .from("company-assets")
      .getPublicUrl(path);
    const { error: galleryError } = await supabase
      .from("gallery_images")
      .insert({
        company_id: parsed.data.companyId,
        image_url: publicUrlData.publicUrl,
        title: null,
      });
    if (galleryError) {
      await supabase.storage.from("company-assets").remove([path]);
      redirect(
        assetErrorUrl(parsed.data.companyId, "Fotoja e galerise nuk u ruajt."),
      );
    }
  }

  revalidatePath(`/app/${parsed.data.companyId}`);
  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(`/app/${parsed.data.companyId}/settings?saved=1` as Route);
}

export async function createCompanyCatalogItem(formData: FormData) {
  const parsed = companyCatalogItemSchema.safeParse({
    companyId: formData.get("companyId"),
    itemType: formData.get("itemType"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    originalPrice: formData.get("originalPrice") ?? "",
    isFeatured: formData.get("isFeatured"),
    currency: formData.get("currency"),
    durationMinutes: formData.get("durationMinutes") ?? "",
  });

  if (!parsed.success)
    redirect(
      `/app/${formData.get("companyId")}/settings?error=Kontrollo%20te%20dhenat%20e%20produktit.` as Route,
    );
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role))
    redirect(`/app/${parsed.data.companyId}/settings` as Route);
  const { supabase, user } = await requireSaasUser();

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const extension =
      acceptedAssetTypes[file.type as keyof typeof acceptedAssetTypes];
    if (!extension || file.size > 8 * 1024 * 1024)
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Fotoja duhet te jete JPG, PNG ose WebP deri ne 8 MB.",
        ),
      );
    const path = `${parsed.data.companyId}/brand/catalog/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError)
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Fotoja e produktit nuk u ngarkua.",
        ),
      );
    imageUrl = supabase.storage.from("company-assets").getPublicUrl(path)
      .data.publicUrl;
  }

  const { error } = await supabase.from("company_catalog_items").insert({
    company_id: parsed.data.companyId,
    item_type: parsed.data.itemType,
    name: parsed.data.name,
    description: optionalValue(parsed.data.description),
    price: parsed.data.price,
    original_price: parsed.data.isFeatured ? parsed.data.originalPrice ?? null : null,
    is_featured: parsed.data.isFeatured && parsed.data.originalPrice !== undefined,
    currency: parsed.data.currency,
    duration_minutes:
      parsed.data.itemType === "service"
        ? (parsed.data.durationMinutes ?? 60)
        : null,
    image_url: imageUrl,
    created_by: user.id,
  });
  if (error)
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Produkti%20nuk%20u%20ruajt.` as Route,
    );
  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(`/app/${parsed.data.companyId}/settings?catalogSaved=1` as Route);
}

export async function deleteCompanyCatalogItem(formData: FormData) {
  const companyId = z.string().uuid().safeParse(formData.get("companyId"));
  const itemId = z.string().uuid().safeParse(formData.get("itemId"));
  if (!companyId.success || !itemId.success) redirect("/onboarding" as Route);
  const context = await requireCompanyContext(companyId.data);
  if (!canManageCompany(context.role))
    redirect(`/app/${companyId.data}/settings` as Route);
  const { supabase } = await requireSaasUser();
  const { error } = await supabase
    .from("company_catalog_items")
    .delete()
    .eq("company_id", companyId.data)
    .eq("id", itemId.data);
  if (error)
    redirect(
      `/app/${companyId.data}/settings?error=Produkti%20nuk%20u%20fshi.` as Route,
    );
  revalidatePath(`/app/${companyId.data}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(`/app/${companyId.data}/settings?catalogDeleted=1` as Route);
}

export async function updateCompanyCatalogItem(formData: FormData) {
  const itemId = z.string().uuid().safeParse(formData.get("itemId"));
  const parsed = companyCatalogItemSchema.safeParse({
    companyId: formData.get("companyId"),
    itemType: formData.get("itemType"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    originalPrice: formData.get("originalPrice") ?? "",
    isFeatured: formData.get("isFeatured"),
    currency: formData.get("currency"),
    durationMinutes: formData.get("durationMinutes") ?? "",
  });
  if (!itemId.success || !parsed.success)
    redirect(
      `/app/${formData.get("companyId")}/settings?error=Kontrollo%20te%20dhenat%20e%20produktit.` as Route,
    );
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role))
    redirect(`/app/${parsed.data.companyId}/settings` as Route);
  const { supabase } = await requireSaasUser();

  const update: Record<string, string | number | boolean | null> = {
    item_type: parsed.data.itemType,
    name: parsed.data.name,
    description: optionalValue(parsed.data.description),
    price: parsed.data.price,
    original_price: parsed.data.isFeatured ? parsed.data.originalPrice ?? null : null,
    is_featured: parsed.data.isFeatured && parsed.data.originalPrice !== undefined,
    currency: parsed.data.currency,
    duration_minutes:
      parsed.data.itemType === "service"
        ? (parsed.data.durationMinutes ?? 60)
        : null,
    updated_at: new Date().toISOString(),
  };
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const extension =
      acceptedAssetTypes[file.type as keyof typeof acceptedAssetTypes];
    if (!extension || file.size > 8 * 1024 * 1024)
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Fotoja duhet te jete JPG, PNG ose WebP deri ne 8 MB.",
        ),
      );
    const path = `${parsed.data.companyId}/brand/catalog/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError)
      redirect(
        assetErrorUrl(
          parsed.data.companyId,
          "Fotoja e produktit nuk u ngarkua.",
        ),
      );
    update.image_url = supabase.storage
      .from("company-assets")
      .getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supabase
    .from("company_catalog_items")
    .update(update)
    .eq("company_id", parsed.data.companyId)
    .eq("id", itemId.data);
  if (error)
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Produkti%20nuk%20u%20perditesua.` as Route,
    );
  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(`/app/${parsed.data.companyId}/settings?catalogUpdated=1` as Route);
}

export async function createCompanyInventoryItem(formData: FormData) {
  const parsed = inventoryItemSchema.safeParse({
    companyId: formData.get("companyId"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    name: formData.get("name"),
    description: formData.get("description"),
    unit: formData.get("unit"),
    salePrice: formData.get("salePrice"),
    taxRate: formData.get("taxRate"),
    initialStock: formData.get("initialStock"),
    reorderLevel: formData.get("reorderLevel"),
  });
  if (!parsed.success)
    redirect(
      `/app/${formData.get("companyId")}/inventory?error=Kontrollo%20te%20dhenat%20e%20artikullit.` as Route,
    );
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);
  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("create_company_inventory_item", {
    input_company_id: context.company.id,
    input_sku: parsed.data.sku,
    input_barcode: parsed.data.barcode,
    input_name: parsed.data.name,
    input_description: parsed.data.description,
    input_unit: parsed.data.unit,
    input_sale_price: parsed.data.salePrice,
    input_tax_rate: parsed.data.taxRate,
    input_initial_stock: parsed.data.initialStock,
    input_reorder_level: parsed.data.reorderLevel,
  });
  if (error)
    redirect(
      `/app/${parsed.data.companyId}/inventory?error=Artikulli%20nuk%20u%20ruajt.` as Route,
    );
  revalidateCompanyWorkspace(context.company.id);
  redirect(`/app/${parsed.data.companyId}/inventory?saved=1` as Route);
}

export async function receiveCompanyInventoryStock(formData: FormData) {
  const parsed = inventoryReceiveSchema.safeParse({
    companyId: formData.get("companyId"),
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success)
    redirect(
      `/app/${formData.get("companyId")}/inventory?error=Kontrollo%20sasine.` as Route,
    );
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);
  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("receive_company_inventory_stock", {
    input_company_id: context.company.id,
    input_item_id: parsed.data.itemId,
    input_quantity: parsed.data.quantity,
    input_note: parsed.data.note || null,
  });
  if (error)
    redirect(
      `/app/${parsed.data.companyId}/inventory?error=Stoku%20nuk%20u%20perditesua.` as Route,
    );
  revalidateCompanyWorkspace(context.company.id);
  redirect(`/app/${parsed.data.companyId}/inventory?stockSaved=1` as Route);
}

export async function createCompanyCounterSale(
  companyId: string,
  lines: { item_id: string; quantity: number }[],
  amountPaid?: number,
  clientId?: string | null,
) {
  const parsed = counterSaleSchema.safeParse({ companyId, lines, amountPaid });
  if (!parsed.success) return { error: "Kontrollo artikujt e shitjes." };
  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompanyOperations(context.role))
    return { error: "Nuk ke të drejtë për shitje." };
  const selectedClientId =
    clientId && z.string().uuid().safeParse(clientId).success ? clientId : null;
  const { supabase } = await requireSaasUser();
  const { data: saleId, error } = await supabase.rpc(
    "create_company_counter_sale",
    {
      input_company_id: context.company.id,
      input_lines: parsed.data.lines,
      input_amount_paid: parsed.data.amountPaid ?? null,
      input_client_id: selectedClientId,
    },
  );
  if (error) return { error: "Shitja nuk u ruajt. Kontrollo stokun." };
  revalidateCompanyWorkspace(context.company.id);
  return { success: true, saleId };
}

export async function updateCompanyInvoiceSettings(formData: FormData) {
  const parsed = companyInvoiceSettingsSchema.safeParse({
    companyId: formData.get("companyId"),
    registrationCountry: formData.get("registrationCountry"),
    defaultCurrency: formData.get("defaultCurrency"),
    allPerEurRate: formData.get("allPerEurRate"),
    legalName: formData.get("legalName"),
    taxId: formData.get("taxId"),
    registrationNumber: formData.get("registrationNumber"),
    bankName: formData.get("bankName"),
    bankIban: formData.get("bankIban"),
    defaultTaxRate: formData.get("defaultTaxRate"),
    sellerStreet: formData.get("sellerStreet"),
    sellerPostalCode: formData.get("sellerPostalCode"),
    sellerCity: formData.get("sellerCity"),
    sellerCountryCode: formData.get("sellerCountryCode"),
    contactEmail: formData.get("contactEmail"),
    paymentTerms: formData.get("paymentTerms"),
    vatExemptionReason: formData.get("vatExemptionReason"),
    invoiceFooter: formData.get("invoiceFooter"),
  });

  if (!parsed.success) {
    redirect(
      `/app/${formData.get("companyId")}/settings?error=Kontrollo%20te%20dhenat%20e%20fatures.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);

  if (!canManageCompany(context.role)) {
    redirect(`/app/${parsed.data.companyId}` as Route);
  }

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.from("company_invoice_settings").upsert(
    {
      company_id: context.company.id,
      registration_country: parsed.data.registrationCountry,
      // Germany and Italy invoice in EUR. Albania may deliberately use EUR or ALL.
      default_currency:
        parsed.data.registrationCountry === "AL"
          ? parsed.data.defaultCurrency
          : "EUR",
      all_per_eur_rate: parsed.data.allPerEurRate,
      legal_name: optionalValue(parsed.data.legalName),
      tax_id: optionalValue(parsed.data.taxId),
      registration_number: optionalValue(parsed.data.registrationNumber),
      bank_name: optionalValue(parsed.data.bankName),
      bank_iban: optionalValue(parsed.data.bankIban),
      default_tax_rate: parsed.data.defaultTaxRate,
      tax_rate_configured: true,
      seller_street: optionalValue(parsed.data.sellerStreet),
      seller_postal_code: optionalValue(parsed.data.sellerPostalCode),
      seller_city: optionalValue(parsed.data.sellerCity),
      seller_country_code: parsed.data.sellerCountryCode,
      contact_email: optionalValue(parsed.data.contactEmail),
      payment_terms: parsed.data.paymentTerms,
      vat_exemption_reason: optionalValue(parsed.data.vatExemptionReason),
      invoice_footer: optionalValue(parsed.data.invoiceFooter),
    },
    { onConflict: "company_id" },
  );

  if (error) {
    redirect(
      `/app/${parsed.data.companyId}/settings?error=Te%20dhenat%20e%20fatures%20nuk%20u%20ruajten.` as Route,
    );
  }

  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  revalidatePath(`/app/${parsed.data.companyId}/invoices`);
  revalidatePath(`/app/${parsed.data.companyId}`, "layout");
  redirect(`/app/${parsed.data.companyId}/settings?invoiceSaved=1` as Route);
}

export async function addCompanyMember(formData: FormData) {
  const parsed = addCompanyMemberSchema.safeParse({
    companyId: formData.get("companyId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(
      `/app/${formData.get("companyId")}/team?error=Kontrollo%20emailin%20dhe%20rolin.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("add_company_member_by_email", {
    input_company_id: context.company.id,
    input_email: parsed.data.email.toLowerCase(),
    input_role: parsed.data.role,
  });

  if (error) {
    redirect(
      `/app/${parsed.data.companyId}/team?error=${encodeURIComponent(error.message)}` as Route,
    );
  }

  revalidatePath(`/app/${parsed.data.companyId}/team`);
  redirect(`/app/${parsed.data.companyId}/team?saved=1` as Route);
}

export async function updateCompanyMemberAccess(formData: FormData) {
  const parsed = updateCompanyMemberAccessSchema.safeParse({
    companyId: formData.get("companyId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/app/${formData.get("companyId")}/team?error=Kontrollo%20te%20dhenat%20e%20anetarit.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("update_company_member_access", {
    input_company_id: context.company.id,
    input_user_id: parsed.data.userId,
    input_role: parsed.data.role,
    input_is_active: parsed.data.isActive,
  });

  if (error) {
    redirect(
      `/app/${parsed.data.companyId}/team?error=${encodeURIComponent(error.message)}` as Route,
    );
  }

  revalidatePath(`/app/${parsed.data.companyId}/team`);
  redirect(`/app/${parsed.data.companyId}/team?saved=1` as Route);
}

export async function createCompanyInvitation(formData: FormData) {
  const parsed = createCompanyInvitationSchema.safeParse({
    companyId: formData.get("companyId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(
      `/app/${formData.get("companyId")}/team?error=Kontrollo%20emailin%20dhe%20rolin%20e%20fteses.` as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  let appUrl: string;
  try {
    appUrl = publicAppUrl();
  } catch {
    redirect(
      `/app/${parsed.data.companyId}/team?error=Konfigurimi%20i%20adreses%20se%20aplikacionit%20mungon.` as Route,
    );
  }

  const { supabase } = await requireSaasUser();
  const { data: invitation, error: invitationError } = await supabase.rpc(
    "create_company_invitation",
    {
      input_company_id: context.company.id,
      input_email: parsed.data.email.toLowerCase(),
      input_role: parsed.data.role,
    },
  );

  if (invitationError || !invitation) {
    redirect(
      `/app/${parsed.data.companyId}/team?error=${encodeURIComponent(invitationError?.message ?? "Ftesa nuk u krijua.")}` as Route,
    );
  }

  try {
    const redirectTo = `${appUrl}/accept-invitation?invite=${invitation.id}`;
    const { error: inviteError } =
      await createAdminSupabase().auth.admin.inviteUserByEmail(
        parsed.data.email.toLowerCase(),
        { redirectTo },
      );

    if (inviteError) {
      throw inviteError;
    }
  } catch (error) {
    logCompanyActionFailure("SEND_COMPANY_INVITATION_FAILED", error);
    await supabase.rpc("revoke_company_invitation", {
      input_invitation_id: invitation.id,
    });
    redirect(
      `/app/${parsed.data.companyId}/team?error=${encodeURIComponent(companyInvitationDeliveryError(error))}` as Route,
    );
  }

  revalidatePath(`/app/${parsed.data.companyId}/team`);
  redirect(`/app/${parsed.data.companyId}/team?inviteSent=1` as Route);
}

export async function acceptCompanyInvitation(formData: FormData) {
  const parsed = acceptCompanyInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=Ftesa%20nuk%20eshte%20e%20vlefshme." as Route);
  }

  const { supabase } = await requireSaasUser();
  const { data: companyId, error } = await supabase.rpc(
    "accept_company_invitation",
    {
      input_invitation_id: parsed.data.invitationId,
    },
  );

  if (error || !companyId) {
    redirect(
      `/onboarding?error=${encodeURIComponent(error?.message ?? "Ftesa nuk u pranua.")}` as Route,
    );
  }

  redirect(`/app/${companyId}` as Route);
}

export async function revokeCompanyInvitation(formData: FormData) {
  const parsed = revokeCompanyInvitationSchema.safeParse({
    companyId: formData.get("companyId"),
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=Ftesa%20nuk%20eshte%20e%20vlefshme." as Route);
  }

  const context = await requireCompanyContext(parsed.data.companyId);
  if (!canManageCompany(context.role))
    redirect(`/app/${parsed.data.companyId}` as Route);

  const { supabase } = await requireSaasUser();
  const { error } = await supabase.rpc("revoke_company_invitation", {
    input_invitation_id: parsed.data.invitationId,
  });

  if (error) {
    redirect(
      `/app/${parsed.data.companyId}/team?error=${encodeURIComponent(error.message)}` as Route,
    );
  }

  revalidatePath(`/app/${parsed.data.companyId}/team`);
  redirect(`/app/${parsed.data.companyId}/team?saved=1` as Route);
}

export async function uploadCompanyBrandAsset(formData: FormData) {
  const parsed = companyAssetSchema.safeParse({
    companyId: formData.get("companyId"),
    assetType: formData.get("assetType"),
  });

  if (!parsed.success) {
    redirect(
      "/onboarding?error=Kerkesa%20per%20imazh%20nuk%20eshte%20e%20vlefshme." as Route,
    );
  }

  const context = await requireCompanyContext(parsed.data.companyId);

  if (!canManageCompany(context.role)) {
    redirect(`/app/${parsed.data.companyId}` as Route);
  }

  const file = formData.get("file");
  const extension =
    file instanceof File
      ? acceptedAssetTypes[file.type as keyof typeof acceptedAssetTypes]
      : undefined;
  const maxBytes =
    parsed.data.assetType === "logo" ? 3 * 1024 * 1024 : 8 * 1024 * 1024;

  if (
    !(file instanceof File) ||
    file.size === 0 ||
    !extension ||
    file.size > maxBytes
  ) {
    const limit = parsed.data.assetType === "logo" ? "3 MB" : "8 MB";
    redirect(
      assetErrorUrl(
        parsed.data.companyId,
        `Perdor JPG, PNG ose WebP deri ne ${limit}.`,
      ),
    );
  }

  const { supabase } = await requireSaasUser();
  const path = `${parsed.data.companyId}/brand/${parsed.data.assetType}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("company-assets")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    redirect(assetErrorUrl(parsed.data.companyId, "Imazhi nuk u ngarkua."));
  }

  const { data: publicUrlData } = supabase.storage
    .from("company-assets")
    .getPublicUrl(path);
  const field = companyAssetFieldByType[parsed.data.assetType];
  const { error: updateError } = await supabase
    .from("company_theme_settings")
    .update({ [field]: publicUrlData.publicUrl })
    .eq("company_id", parsed.data.companyId);

  if (updateError) {
    await supabase.storage.from("company-assets").remove([path]);
    redirect(
      assetErrorUrl(
        parsed.data.companyId,
        "Imazhi u ngarkua por nuk u ruajt ne profil.",
      ),
    );
  }

  revalidatePath(`/app/${parsed.data.companyId}`);
  revalidatePath(`/app/${parsed.data.companyId}/settings`);
  revalidatePath(`/b/${context.company.slug}`);
  redirect(
    `/app/${parsed.data.companyId}/settings?asset=${parsed.data.assetType}` as Route,
  );
}
