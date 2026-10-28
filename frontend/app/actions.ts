"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { deriveClientEmail, normalizePhone } from "@/lib/utils";
import { syncUiLocaleCookieForUser } from "@/app/locale-actions";

type ActionResult = {
  error?: string;
};

const maxGalleryImageSize = 500 * 1024;

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function logActionError(actionName: string, error: unknown) {
  console.error(`${actionName} ERROR:`, error);
}

function getRequiredFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${key}`);
  }

  return value.trim();
}

const addClientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(6),
  pin: z.string().min(4).max(12),
  isVip: z.boolean().optional()
});

const addVehicleSchema = z.object({
  clientId: z.string().uuid(),
  model: z.string().min(2),
  plateNumber: z.string().min(3),
  vin: z.string().optional(),
  currentKm: z.coerce.number().min(0)
});

const updateClientVipSchema = z.object({
  clientId: z.string().uuid(),
  isVip: z.boolean()
});

const invoiceItemSchema = z.object({
  name: z.string().min(2),
  materialCost: z.coerce.number().min(0),
  laborCost: z.coerce.number().min(0),
  fee: z.coerce.number().min(0),
  laborDiscountPercent: z.coerce.number().min(0).max(100).optional()
});

const addServiceSchema = z.object({
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  isVip: z.boolean().optional(),
  type: z.enum(["normal", "periodic"]),
  date: z.string().min(1),
  km: z.coerce.number().min(0),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  nextKm: z.string().optional(),
  nextDate: z.string().optional(),
  items: z.array(invoiceItemSchema)
});

const updateInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  issuedAt: z.string().min(1),
  dueDate: z.string().optional(),
  amountPaid: z.coerce.number().min(0),
  status: z.enum(["draft", "issued", "partial", "paid"])
});

const updateInvoiceItemsSchema = z.object({
  invoiceId: z.string().uuid(),
  serviceId: z.string().uuid(),
  items: z.array(invoiceItemSchema).min(1)
});

const uploadGalleryImageSchema = z.object({
  title: z.string().max(120).optional()
});

const createAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["super_admin", "admin"])
});

const updateAdminSchema = z.object({
  adminId: z.string().uuid(),
  role: z.enum(["super_admin", "admin"]),
  isActive: z.boolean()
});

const addKioskClientSchema = z.object({
  mechanicAdminId: z.string().uuid(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(6),
  pin: z.string().min(4).max(12),
  vehicleModel: z.string().optional(),
  plateNumber: z.string().optional(),
  currentKm: z.coerce.number().min(0).optional(),
  note: z.string().min(2).max(1000)
});

function requireServiceRoleKey(actionName: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    console.error(`${actionName} ERROR:`, error);
    return false;
  }

  return true;
}

export async function createAdmin(formData: FormData): Promise<ActionResult | void> {
  try {
    await requireSuperAdmin();

    if (!requireServiceRoleKey("CREATE_ADMIN")) {
      return { error: "Server admin key missing" };
    }

    const parsedResult = createAdminSchema.safeParse({
      email: getRequiredFormString(formData, "email").toLowerCase(),
      fullName: getRequiredFormString(formData, "fullName"),
      password: getRequiredFormString(formData, "password"),
      role: getRequiredFormString(formData, "role")
    });

    if (!parsedResult.success) {
      return { error: "Kontrollo fushat e adminit." };
    }

    const parsed = parsedResult.data;
    const adminSupabase = createAdminSupabase();
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        role: "admin"
      }
    });

    if (authError || !authUser.user) {
      console.error("CREATE_ADMIN ERROR:", authError);
      return { error: authError?.message ?? "Admini nuk u krijua." };
    }

    const { error: insertError } = await adminSupabase.from("admins").insert({
      id: authUser.user.id,
      email: parsed.email,
      full_name: parsed.fullName,
      role: parsed.role,
      is_active: true
    });

    if (insertError) {
      console.error("CREATE_ADMIN ERROR:", insertError);
      return { error: insertError.message };
    }

    revalidatePath("/admin/admins");
    redirect("/admin/admins?success=Admini%20u%20krijua.");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("CREATE_ADMIN", error);
    return { error: "Something went wrong" };
  }
}

export async function createAdminForm(formData: FormData): Promise<void> {
  const result = await createAdmin(formData);

  if (result?.error) {
    redirect(`/admin/admins?error=${encodeURIComponent(result.error)}`);
  }
}

export async function updateAdmin(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireSuperAdmin();
    const parsedResult = updateAdminSchema.safeParse({
      adminId: getRequiredFormString(formData, "adminId"),
      role: getRequiredFormString(formData, "role"),
      isActive: formData.get("isActive") === "on"
    });

    if (!parsedResult.success) {
      return { error: "Kontrollo fushat e adminit." };
    }

    const parsed = parsedResult.data;

    if (parsed.adminId === user.id && (!parsed.isActive || parsed.role !== "super_admin")) {
      return { error: "Nuk mund te heqesh aksesin tend si super admin." };
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("admins")
      .update({
        role: parsed.role,
        is_active: parsed.isActive
      })
      .eq("id", parsed.adminId);

    if (error) {
      console.error("UPDATE_ADMIN ERROR:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/admins");
    redirect("/admin/admins?success=Admini%20u%20perditesua.");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("UPDATE_ADMIN", error);
    return { error: "Something went wrong" };
  }
}

export async function updateAdminForm(formData: FormData): Promise<void> {
  const result = await updateAdmin(formData);

  if (result?.error) {
    redirect(`/admin/admins?error=${encodeURIComponent(result.error)}`);
  }
}

export async function addKioskClient(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireSuperAdmin();

    if (!requireServiceRoleKey("ADD_KIOSK_CLIENT")) {
      return { error: "Server admin key missing" };
    }

    const parsedResult = addKioskClientSchema.safeParse({
      mechanicAdminId: getRequiredFormString(formData, "mechanicAdminId"),
      firstName: getRequiredFormString(formData, "firstName"),
      lastName: getRequiredFormString(formData, "lastName"),
      phone: normalizePhone(getRequiredFormString(formData, "phone")),
      pin: getRequiredFormString(formData, "pin"),
      vehicleModel: String(formData.get("vehicleModel") ?? "").trim(),
      plateNumber: String(formData.get("plateNumber") ?? "").trim(),
      currentKm: String(formData.get("currentKm") ?? "0"),
      note: getRequiredFormString(formData, "note")
    });

    if (!parsedResult.success) {
      return { error: "Kontrollo fushat e regjistrimit." };
    }

    const parsed = parsedResult.data;
    const adminSupabase = createAdminSupabase();
    const { data: mechanic, error: mechanicError } = await adminSupabase
      .from("admins")
      .select("id, is_active, role")
      .eq("id", parsed.mechanicAdminId)
      .single();

    if (mechanicError || !mechanic?.is_active) {
      console.error("ADD_KIOSK_CLIENT ERROR:", mechanicError);
      return { error: "Mekaniku nuk u gjet ose nuk eshte aktiv." };
    }

    const email = deriveClientEmail(parsed.phone);
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: parsed.pin,
      email_confirm: true,
      user_metadata: {
        role: "client",
        phone: parsed.phone
      }
    });

    if (authError || !authUser.user) {
      console.error("ADD_KIOSK_CLIENT ERROR:", authError);
      return { error: authError?.message ?? "Klienti nuk u krijua." };
    }

    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .insert({
        auth_user_id: authUser.user.id,
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        phone: parsed.phone,
        pin_hash: "",
        is_vip: false,
        owner_id: parsed.mechanicAdminId
      })
      .select("id")
      .single();

    if (clientError || !client) {
      console.error("ADD_KIOSK_CLIENT ERROR:", clientError);
      return { error: clientError?.message ?? "Klienti nuk u ruajt." };
    }

    const setClientPinHashArgs: Database["public"]["Functions"]["set_client_pin_hash"]["Args"] = {
      input_phone: parsed.phone,
      input_pin: parsed.pin,
      input_owner_id: parsed.mechanicAdminId
    };
    const { error: pinHashError } = await adminSupabase.rpc("set_client_pin_hash" as never, setClientPinHashArgs as never);

    if (pinHashError) {
      console.error("ADD_KIOSK_CLIENT ERROR:", pinHashError);
      return { error: pinHashError.message };
    }

    const hasVehicle = Boolean(parsed.vehicleModel && parsed.plateNumber);

    if (hasVehicle) {
      const { error: vehicleError } = await adminSupabase.from("vehicles").insert({
        client_id: client.id,
        model: parsed.vehicleModel,
        plate_number: parsed.plateNumber,
        current_km: parsed.currentKm ?? 0,
        owner_id: parsed.mechanicAdminId
      });

      if (vehicleError) {
        console.error("ADD_KIOSK_CLIENT ERROR:", vehicleError);
        return { error: vehicleError.message };
      }
    }

    const { error: noteError } = await adminSupabase.from("client_intake_notes").insert({
      client_id: client.id,
      owner_id: parsed.mechanicAdminId,
      created_by: user.id,
      note: parsed.note,
      status: "open"
    });

    if (noteError) {
      console.error("ADD_KIOSK_CLIENT ERROR:", noteError);
      return { error: noteError.message };
    }

    revalidatePath("/admin/kiosk");
    revalidatePath("/admin");
    redirect("/admin/kiosk?success=Klienti%20u%20regjistrua.");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("ADD_KIOSK_CLIENT", error);
    return { error: "Something went wrong" };
  }
}

export async function addKioskClientForm(formData: FormData): Promise<void> {
  const result = await addKioskClient(formData);

  if (result?.error) {
    redirect(`/admin/kiosk?error=${encodeURIComponent(result.error)}`);
  }
}

export async function adminLogin(formData: FormData): Promise<ActionResult | void> {
  try {
    const supabase = await createServerSupabase();
    const email = getRequiredFormString(formData, "email");
    const password = getRequiredFormString(formData, "password");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await syncUiLocaleCookieForUser(data.user.id);
    }

    const next = formData.get("next");
    const destination = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
    // Onboarding routes an existing member to their workspace; `new=1` keeps
    // the company-creation flow open when it came from the marketing page.
    redirect(destination as Route);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("ADMIN_LOGIN", error);
    return { error: "Something went wrong" };
  }
}

export async function adminLoginForm(formData: FormData): Promise<void> {
  const result = await adminLogin(formData);

  if (result?.error) {
    redirect(`/admin-login?error=${encodeURIComponent(result.error)}`);
  }
}

export async function clientLogin(formData: FormData): Promise<ActionResult | void> {
  try {
    const supabase = await createServerSupabase();
    const phone = normalizePhone(getRequiredFormString(formData, "phone"));
    const pin = getRequiredFormString(formData, "pin");
    const verifyClientPinArgs: Database["public"]["Functions"]["verify_client_pin"]["Args"] = {
      input_phone: phone,
      input_pin: pin
    };

    const { data: verified, error: verificationError } = await supabase.rpc(
      "verify_client_pin" as never,
      verifyClientPinArgs as never
    );
    const verifiedRows = (verified ?? []) as Database["public"]["Functions"]["verify_client_pin"]["Returns"];

    if (verificationError || verifiedRows.length === 0) {
      return { error: "Numri ose PIN-i nuk eshte i sakte." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: deriveClientEmail(phone),
      password: pin
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await syncUiLocaleCookieForUser(data.user.id);
    }

    redirect("/client");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("CLIENT_LOGIN", error);
    return { error: "Something went wrong" };
  }
}

export async function clientLoginForm(formData: FormData): Promise<void> {
  const result = await clientLogin(formData);

  if (result?.error) {
    redirect(`/client-login?error=${encodeURIComponent(result.error)}`);
  }
}

export async function signOut(): Promise<ActionResult | void> {
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    redirect("/");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("SIGN_OUT", error);
    return { error: "Something went wrong" };
  }
}

export async function signOutForm(): Promise<void> {
  const result = await signOut();

  if (result?.error) {
    redirect(`/?error=${encodeURIComponent(result.error)}`);
  }
}

export async function addClient(formData: FormData): Promise<ActionResult | void> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("ADD CLIENT ERROR:", userError);
      return { error: "Admin profile missing" };
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError) {
      console.error("ADD CLIENT ERROR:", adminError);
    }

    if (!admin) {
      return { error: "Admin profile missing" };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const error = new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
      console.error("ADD CLIENT ERROR:", error);
      return { error: "Server admin key missing" };
    }

    const adminSupabase = createAdminSupabase();

    const parsedResult = addClientSchema.safeParse({
      firstName: getRequiredFormString(formData, "firstName"),
      lastName: getRequiredFormString(formData, "lastName"),
      phone: normalizePhone(getRequiredFormString(formData, "phone")),
      pin: getRequiredFormString(formData, "pin"),
      isVip: formData.get("isVip") === "on"
    });

    if (!parsedResult.success) {
      return { error: "Please check the client form fields." };
    }

    const parsed = parsedResult.data;
    const email = deriveClientEmail(parsed.phone);
    const setClientPinHashArgs: Database["public"]["Functions"]["set_client_pin_hash"]["Args"] = {
      input_phone: parsed.phone,
      input_pin: parsed.pin,
      input_owner_id: admin.id
    };

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: parsed.pin,
      email_confirm: true,
      user_metadata: {
        role: "client",
        phone: parsed.phone
      }
    });

    if (authError || !authUser.user) {
      console.error("ADD CLIENT ERROR:", authError);
      return { error: authError?.message ?? "Nuk u krijua klienti." };
    }

    const { error: insertError } = await adminSupabase.from("clients").insert({
      auth_user_id: authUser.user.id,
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      phone: parsed.phone,
      pin_hash: "",
      is_vip: parsed.isVip ?? false,
      owner_id: admin.id
    });

    if (insertError) {
      console.error("ADD CLIENT ERROR:", insertError);
      return { error: insertError.message };
    }

    const { error: pinHashError } = await adminSupabase.rpc("set_client_pin_hash" as never, setClientPinHashArgs as never);

    if (pinHashError) {
      console.error("ADD CLIENT ERROR:", pinHashError);
      return { error: pinHashError.message };
    }

    revalidatePath("/admin");
    redirect("/admin?success=Klienti%20u%20shtua.");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("ADD CLIENT ERROR:", error);

    if (error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return { error: "Server admin key missing" };
    }

    return { error: "Something went wrong" };
  }
}

export async function addClientForm(formData: FormData): Promise<void> {
  const result = await addClient(formData);

  if (result?.error) {
    redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  }
}

export async function addVehicle(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireAdmin();
    const supabase = await createServerSupabase();

    const parsedResult = addVehicleSchema.safeParse({
      clientId: getRequiredFormString(formData, "clientId"),
      model: getRequiredFormString(formData, "model"),
      plateNumber: getRequiredFormString(formData, "plateNumber"),
      vin: String(formData.get("vin") ?? ""),
      currentKm: getRequiredFormString(formData, "currentKm")
    });

    if (!parsedResult.success) {
      return { error: "Please check the vehicle form fields." };
    }

    const parsed = parsedResult.data;
    const { error } = await supabase.from("vehicles").insert({
      client_id: parsed.clientId,
      model: parsed.model,
      plate_number: parsed.plateNumber,
      vin: parsed.vin || null,
      current_km: parsed.currentKm,
      owner_id: user.id
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/clients/${parsed.clientId}`);
    redirect(`/admin/clients/${parsed.clientId}?success=Automjeti%20u%20shtua.`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("ADD_VEHICLE", error);
    return { error: "Something went wrong" };
  }
}

export async function addVehicleForm(formData: FormData): Promise<void> {
  const result = await addVehicle(formData);

  if (result?.error) {
    const clientId = String(formData.get("clientId") ?? "");
    redirect(clientId ? `/admin/clients/${clientId}?error=${encodeURIComponent(result.error)}` : `/admin?error=${encodeURIComponent(result.error)}`);
  }
}

export async function updateClientVip(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireAdmin();
    const supabase = await createServerSupabase();
    const parsedResult = updateClientVipSchema.safeParse({
      clientId: getRequiredFormString(formData, "clientId"),
      isVip: formData.get("isVip") === "on"
    });

    if (!parsedResult.success) {
      return { error: "Please check the client form fields." };
    }

    const parsed = parsedResult.data;
    const { error } = await supabase
      .from("clients")
      .update({ is_vip: parsed.isVip })
      .eq("id", parsed.clientId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("UPDATE CLIENT VIP ERROR:", error);
      return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/clients/${parsed.clientId}`);
    redirect(`/admin/clients/${parsed.clientId}?success=Klienti%20u%20perditesua.`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("UPDATE_CLIENT_VIP", error);
    return { error: "Something went wrong" };
  }
}

export async function updateClientVipForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await updateClientVip(formData);

  if (result?.error) {
    redirect(`/admin/clients/${clientId}?error=${encodeURIComponent(result.error)}`);
  }
}

export async function addService(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireAdmin();
    const supabase = await createServerSupabase();

    const rawItemsValue = getRequiredFormString(formData, "items");
    const rawItems = JSON.parse(rawItemsValue);
    const parsedResult = addServiceSchema.safeParse({
      clientId: getRequiredFormString(formData, "clientId"),
      vehicleId: getRequiredFormString(formData, "vehicleId"),
      isVip: formData.get("isVip") === "on",
      type: getRequiredFormString(formData, "type"),
      date: getRequiredFormString(formData, "date"),
      km: getRequiredFormString(formData, "km"),
      notes: String(formData.get("notes") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      nextKm: String(formData.get("nextKm") ?? ""),
      nextDate: String(formData.get("nextDate") ?? ""),
      items: rawItems
    });

    if (!parsedResult.success) {
      return { error: "Please check the service form fields." };
    }

    const parsed = parsedResult.data;
    const totalAmount = parsed.items.reduce((sum, item) => {
      return sum + item.materialCost + item.laborCost + item.fee;
    }, 0);

    const { error: clientVipError } = await supabase
      .from("clients")
      .update({ is_vip: parsed.isVip ?? false })
      .eq("id", parsed.clientId)
      .eq("owner_id", user.id);

    if (clientVipError) {
      return { error: clientVipError.message };
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .insert({
        vehicle_id: parsed.vehicleId,
        type: parsed.type,
        date: parsed.date,
        km: parsed.km,
        notes: parsed.notes || null,
        total_amount: totalAmount,
        owner_id: user.id
      })
      .select("id")
      .single();

    if (serviceError || !service) {
      return { error: serviceError?.message ?? "Sherbimi nuk u ruajt." };
    }

    const { error: itemsError } = await supabase.from("service_items").insert(
      parsed.items.map((item) => ({
        service_id: service.id,
        name: item.name,
        material_cost: item.materialCost,
        labor_cost: item.laborCost,
        fee: item.fee,
        labor_discount_percent: item.laborDiscountPercent ?? 0,
        owner_id: user.id
      }))
    );

    if (itemsError) {
      return { error: itemsError.message };
    }

    const { error: invoiceError } = await supabase.from("invoices").insert({
      client_id: parsed.clientId,
      service_id: service.id,
      issued_at: parsed.date,
      due_date: parsed.dueDate || null,
      status: "issued",
      amount_paid: 0,
      total_amount: totalAmount,
      owner_id: user.id
    });

    if (invoiceError) {
      return { error: invoiceError.message };
    }

    const hasCustomReminder = Boolean(parsed.nextKm || parsed.nextDate);

    if (parsed.type === "periodic" || hasCustomReminder) {
      const fallbackNextDate = new Date(parsed.date);
      fallbackNextDate.setDate(fallbackNextDate.getDate() + 180);
      const nextKm = parsed.nextKm ? Number(parsed.nextKm) : parsed.km + 10000;

      const { error: reminderError } = await supabase.from("reminders").insert({
        vehicle_id: parsed.vehicleId,
        type: "Sherbimi i radhes",
        next_km: Number.isFinite(nextKm) ? nextKm : null,
        next_date: parsed.nextDate || fallbackNextDate.toISOString().slice(0, 10),
        notified: false,
        owner_id: user.id
      });

      if (reminderError) {
        return { error: reminderError.message };
      }
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/clients/${parsed.clientId}`);
    revalidatePath("/client");
    redirect(`/admin/clients/${parsed.clientId}?success=Sherbimi%20u%20shtua.`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("ADD_SERVICE", error);
    return { error: "Something went wrong" };
  }
}

export async function addServiceForm(formData: FormData): Promise<void> {
  const result = await addService(formData);

  if (result?.error) {
    const clientId = String(formData.get("clientId") ?? "");
    const vehicleId = String(formData.get("vehicleId") ?? "");
    redirect(`/admin/services/new?error=${encodeURIComponent(result.error)}${clientId ? `&clientId=${clientId}` : ""}${vehicleId ? `&vehicleId=${vehicleId}` : ""}`);
  }
}

export async function updateInvoice(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireAdmin();
    const supabase = await createServerSupabase();
    const parsedResult = updateInvoiceSchema.safeParse({
      invoiceId: getRequiredFormString(formData, "invoiceId"),
      issuedAt: getRequiredFormString(formData, "issuedAt"),
      dueDate: String(formData.get("dueDate") ?? ""),
      amountPaid: getRequiredFormString(formData, "amountPaid"),
      status: getRequiredFormString(formData, "status")
    });

    if (!parsedResult.success) {
      return { error: "Please check the invoice form fields." };
    }

    const parsed = parsedResult.data;
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, status, total_amount, service_id, clients(owner_id)")
      .eq("id", parsed.invoiceId)
      .eq("owner_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("UPDATE INVOICE ERROR:", invoiceError);
      return { error: "Fatura nuk u gjet." };
    }

    const invoiceClient = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;

    if (!invoiceClient || invoiceClient.owner_id !== user.id) {
      return { error: "Fatura nuk u gjet." };
    }

    if (invoice.status === "paid") {
      return { error: "Fatura e paguar nuk mund te editohet." };
    }

    let currentTotalAmount = Number(invoice.total_amount ?? 0);

    if (invoice.service_id) {
      const { data: serviceItems, error: serviceItemsError } = await supabase
        .from("service_items")
        .select("material_cost, labor_cost, fee")
        .eq("service_id", invoice.service_id)
        .eq("owner_id", user.id);

      if (serviceItemsError) {
        console.error("UPDATE INVOICE ERROR:", serviceItemsError);
        return { error: serviceItemsError.message };
      }

      if (serviceItems && serviceItems.length > 0) {
        currentTotalAmount = serviceItems.reduce((sum, item) => {
          return sum + Number(item.material_cost ?? 0) + Number(item.labor_cost ?? 0) + Number(item.fee ?? 0);
        }, 0);
      }
    }

    const nextAmountPaid = parsed.status === "paid" ? currentTotalAmount : parsed.amountPaid;

    if (nextAmountPaid > currentTotalAmount) {
      return { error: "Shuma e paguar nuk mund te jete me e madhe se totali." };
    }

    const { error } = await supabase
      .from("invoices")
      .update({
        issued_at: parsed.issuedAt,
        due_date: parsed.dueDate || null,
        amount_paid: nextAmountPaid,
        total_amount: currentTotalAmount,
        status: parsed.status
      })
      .eq("id", parsed.invoiceId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("UPDATE INVOICE ERROR:", error);
      return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/invoices/${parsed.invoiceId}`);
    revalidatePath("/client");
    redirect(`/admin/invoices/${parsed.invoiceId}?success=Fatura%20u%20perditesua.`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("UPDATE_INVOICE", error);
    return { error: "Something went wrong" };
  }
}

export async function updateInvoiceForm(formData: FormData): Promise<void> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const result = await updateInvoice(formData);

  if (result?.error) {
    redirect(`/admin/invoices/${invoiceId}?error=${encodeURIComponent(result.error)}`);
  }
}

export async function updateInvoiceItems(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireAdmin();
    const supabase = await createServerSupabase();
    const rawItems = JSON.parse(getRequiredFormString(formData, "items"));
    const parsedResult = updateInvoiceItemsSchema.safeParse({
      invoiceId: getRequiredFormString(formData, "invoiceId"),
      serviceId: getRequiredFormString(formData, "serviceId"),
      items: rawItems
    });

    if (!parsedResult.success) {
      return { error: "Please check the invoice item fields." };
    }

    const parsed = parsedResult.data;
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, status, amount_paid, service_id, clients(owner_id)")
      .eq("id", parsed.invoiceId)
      .eq("owner_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("UPDATE INVOICE ITEMS ERROR:", invoiceError);
      return { error: "Fatura nuk u gjet." };
    }

    const invoiceClient = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;

    if (!invoiceClient || invoiceClient.owner_id !== user.id || invoice.service_id !== parsed.serviceId) {
      return { error: "Fatura nuk u gjet." };
    }

    if (invoice.status === "paid") {
      return { error: "Fatura e paguar nuk mund te editohet." };
    }

    const totalAmount = parsed.items.reduce((sum, item) => {
      return sum + item.materialCost + item.laborCost + item.fee;
    }, 0);

    const { error: deleteError } = await supabase.from("service_items").delete().eq("service_id", parsed.serviceId).eq("owner_id", user.id);

    if (deleteError) {
      console.error("UPDATE INVOICE ITEMS ERROR:", deleteError);
      return { error: deleteError.message };
    }

    const { error: insertError } = await supabase.from("service_items").insert(
      parsed.items.map((item) => ({
        service_id: parsed.serviceId,
        name: item.name,
        material_cost: item.materialCost,
        labor_cost: item.laborCost,
        fee: item.fee,
        labor_discount_percent: item.laborDiscountPercent ?? 0,
        owner_id: user.id
      }))
    );

    if (insertError) {
      console.error("UPDATE INVOICE ITEMS ERROR:", insertError);
      return { error: insertError.message };
    }

    const { error: serviceError } = await supabase
      .from("services")
      .update({ total_amount: totalAmount })
      .eq("id", parsed.serviceId)
      .eq("owner_id", user.id)
      .select("id")
      .single();

    if (serviceError) {
      console.error("UPDATE INVOICE ITEMS ERROR:", serviceError);
      return { error: serviceError.message };
    }

    const nextAmountPaid = Math.min(Number(invoice.amount_paid ?? 0), totalAmount);
    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update({
        amount_paid: nextAmountPaid,
        total_amount: totalAmount
      })
      .eq("id", parsed.invoiceId)
      .eq("owner_id", user.id)
      .select("id")
      .single();

    if (invoiceUpdateError) {
      console.error("UPDATE INVOICE ITEMS ERROR:", invoiceUpdateError);
      return { error: invoiceUpdateError.message };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/invoices/${parsed.invoiceId}`);
    revalidatePath("/client");
    redirect(`/admin/invoices/${parsed.invoiceId}?success=Rreshtat%20e%20fatures%20u%20perditesuan.`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("UPDATE_INVOICE_ITEMS", error);
    return { error: "Something went wrong" };
  }
}

export async function updateInvoiceItemsForm(formData: FormData): Promise<void> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const result = await updateInvoiceItems(formData);

  if (result?.error) {
    redirect(`/admin/invoices/${invoiceId}?error=${encodeURIComponent(result.error)}`);
  }
}

export async function uploadGalleryImage(formData: FormData): Promise<ActionResult | void> {
  try {
    const { user } = await requireAdmin();
    const supabase = await createServerSupabase();
    const fileValue = formData.get("image");
    const parsedResult = uploadGalleryImageSchema.safeParse({
      title: String(formData.get("title") ?? "").trim()
    });

    if (!parsedResult.success) {
      return { error: "Titulli eshte shume i gjate." };
    }

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return { error: "Zgjidh nje foto per galeri." };
    }

    if (!fileValue.type.startsWith("image/")) {
      return { error: "Lejohen vetem file imazhi." };
    }

    if (fileValue.size > maxGalleryImageSize) {
      return { error: "Foto duhet te jete maksimumi 500kb." };
    }

    const extension = fileValue.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = `gallery/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("gallery").upload(filePath, fileValue, {
      cacheControl: "3600",
      contentType: fileValue.type,
      upsert: false
    });

    if (uploadError) {
      console.error("UPLOAD GALLERY IMAGE ERROR:", uploadError);
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from("gallery").getPublicUrl(filePath);
    const { error: insertError } = await supabase.from("gallery_images").insert({
      owner_id: user.id,
      image_url: publicUrlData.publicUrl,
      title: parsedResult.data.title || null
    });

    if (insertError) {
      console.error("UPLOAD GALLERY IMAGE ERROR:", insertError);
      return { error: insertError.message };
    }

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/admin");
    redirect("/admin?success=Foto%20u%20ngarkua%20ne%20galeri.");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logActionError("UPLOAD_GALLERY_IMAGE", error);
    return { error: "Something went wrong" };
  }
}

export async function uploadGalleryImageForm(formData: FormData): Promise<void> {
  const result = await uploadGalleryImage(formData);

  if (result?.error) {
    redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  }
}
