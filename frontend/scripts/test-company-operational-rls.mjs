import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const repositoryRoot = path.resolve(process.cwd(), "..");

function localSupabaseEnvironment() {
  const output = execSync("npx --yes supabase@2.110.0 status -o env", {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const environment = Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
      })
  );

  const apiUrl = environment.API_URL;
  const isLocalApi = (() => {
    try {
      return ["127.0.0.1", "localhost"].includes(new URL(apiUrl).hostname);
    } catch {
      return false;
    }
  })();

  if (!isLocalApi) {
    throw new Error("Company RLS test only runs against local Supabase.");
  }

  if (!environment.ANON_KEY || !environment.SERVICE_ROLE_KEY) {
    throw new Error("Local Supabase credentials were unavailable.");
  }

  return { ...environment, API_URL: apiUrl };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createTestUser(admin, suffix) {
  const email = `company-rls-${suffix}-${randomUUID()}@example.test`;
  const password = `Local-${randomUUID()}-test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });

  if (error || !data.user) {
    throw new Error("Could not create local RLS test user.");
  }

  return { id: data.user.id, email, password };
}

async function authenticatedClient(apiUrl, anonKey, user) {
  const client = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });

  if (error) {
    throw new Error("Could not authenticate local RLS test user.");
  }

  return client;
}

async function createCompany(client, userId, label) {
  const slug = `rls-${label}-${randomUUID().slice(0, 8)}`;
  const { error: insertError } = await client.rpc("create_trial_company", {
    input_name: `RLS ${label}`,
    input_slug: slug
  });

  if (insertError) {
    throw new Error("Could not create local RLS test company.");
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await client.from("companies").select("id").eq("slug", slug).maybeSingle();

    if (error) {
      throw new Error("Could not read local RLS test company.");
    }

    if (data) {
      return data.id;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error("Company bootstrap membership was not available in time.");
}

async function main() {
  const environment = localSupabaseEnvironment();
  const admin = createClient(environment.API_URL, environment.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const createdUsers = [];
  const createdCompanies = [];

  try {
    const userA = await createTestUser(admin, "a");
    const userB = await createTestUser(admin, "b");
    const userC = await createTestUser(admin, "c");
    const userD = await createTestUser(admin, "d");
    createdUsers.push(userA, userB, userC, userD);

    const clientA = await authenticatedClient(environment.API_URL, environment.ANON_KEY, userA);
    const clientB = await authenticatedClient(environment.API_URL, environment.ANON_KEY, userB);
    const clientC = await authenticatedClient(environment.API_URL, environment.ANON_KEY, userC);
    const clientD = await authenticatedClient(environment.API_URL, environment.ANON_KEY, userD);
    const companyA = await createCompany(clientA, userA.id, "a");
    const companyB = await createCompany(clientB, userB.id, "b");
    createdCompanies.push(companyA, companyB);

    const { data: foreignTeamBeforeAdd, error: foreignTeamBeforeAddError } = await clientB
      .from("company_users")
      .select("user_id")
      .eq("company_id", companyA);
    if (foreignTeamBeforeAddError || (foreignTeamBeforeAdd ?? []).length !== 0) {
      throw new Error("A different company can read a private team directory.");
    }

    const { error: outsiderTeamWriteError } = await clientB.rpc("add_company_member_by_email", {
      input_company_id: companyA,
      input_email: userC.email,
      input_role: "staff"
    });
    assert(outsiderTeamWriteError, "A user outside the company can add company members.");

    const { error: addAdminError } = await clientA.rpc("add_company_member_by_email", {
      input_company_id: companyA,
      input_email: userC.email,
      input_role: "admin"
    });
    if (addAdminError) {
      throw new Error("Company owner could not add a company administrator.");
    }

    const { error: adminRoleEscalationError } = await clientC.rpc("add_company_member_by_email", {
      input_company_id: companyA,
      input_email: userB.email,
      input_role: "admin"
    });
    assert(Boolean(adminRoleEscalationError), "A company admin can create another administrator.");

    const { error: addStaffError } = await clientC.rpc("add_company_member_by_email", {
      input_company_id: companyA,
      input_email: userB.email,
      input_role: "staff"
    });
    if (addStaffError) {
      throw new Error("Company administrator could not add a staff member.");
    }

    const { error: outsiderInvitationWriteError } = await clientB.rpc("create_company_invitation", {
      input_company_id: companyA,
      input_email: userD.email,
      input_role: "staff"
    });
    assert(Boolean(outsiderInvitationWriteError), "A user outside the company can create an invitation.");

    const { data: foreignInvitations, error: foreignInvitationsError } = await clientB
      .from("company_invitations")
      .select("id")
      .eq("company_id", companyA);
    if (foreignInvitationsError || (foreignInvitations ?? []).length !== 0) {
      throw new Error("A different company can read private invitations.");
    }

    const { error: adminInviteAdminError } = await clientC.rpc("create_company_invitation", {
      input_company_id: companyA,
      input_email: userD.email,
      input_role: "admin"
    });
    assert(Boolean(adminInviteAdminError), "A company administrator can invite another administrator.");

    const { data: invitation, error: invitationError } = await clientA.rpc("create_company_invitation", {
      input_company_id: companyA,
      input_email: userD.email,
      input_role: "staff"
    });
    if (invitationError || !invitation?.id || invitation.email !== userD.email || invitation.status !== "pending") {
      throw new Error("Company owner could not create a pending invitation.");
    }

    const { data: acceptedCompanyId, error: acceptanceError } = await clientD.rpc("accept_company_invitation", {
      input_invitation_id: invitation.id
    });
    if (acceptanceError || acceptedCompanyId !== companyA) {
      throw new Error("An invited account could not accept its own company invitation.");
    }

    const { data: acceptedInvitation, error: acceptedInvitationError } = await clientA
      .from("company_invitations")
      .select("status, accepted_by")
      .eq("id", invitation.id)
      .single();
    if (acceptedInvitationError || acceptedInvitation?.status !== "accepted" || acceptedInvitation.accepted_by !== userD.id) {
      throw new Error("Accepted invitation did not retain its acceptance evidence.");
    }

    const { data: invitedMembership, error: invitedMembershipError } = await clientA
      .from("company_users")
      .select("role, member_email, is_active")
      .eq("company_id", companyA)
      .eq("user_id", userD.id)
      .single();
    if (
      invitedMembershipError ||
      invitedMembership?.role !== "staff" ||
      invitedMembership.member_email !== userD.email ||
      !invitedMembership.is_active
    ) {
      throw new Error("Accepted invitation did not create the expected scoped company membership.");
    }

    const { data: memberDirectory, error: memberDirectoryError } = await clientA
      .from("company_users")
      .select("user_id, role, member_email, is_active")
      .eq("company_id", companyA);
    if (memberDirectoryError || !memberDirectory?.some((member) => member.user_id === userB.id && member.member_email === userB.email && member.role === "staff")) {
      throw new Error("Company owner cannot read the expected member directory.");
    }

    const { data: staffDirectory, error: staffDirectoryError } = await clientB
      .from("company_users")
      .select("user_id")
      .eq("company_id", companyA);
    if (staffDirectoryError || staffDirectory?.some((member) => member.user_id !== userB.id)) {
      throw new Error("A staff member can read other company members.");
    }

    const { error: directMembershipUpdateError } = await clientB
      .from("company_users")
      .update({ role: "admin" })
      .eq("company_id", companyA)
      .eq("user_id", userB.id);
    assert(Boolean(directMembershipUpdateError), "A browser client can directly escalate a company membership.");

    const appointmentDate = (() => {
      const date = new Date();
      date.setDate(date.getDate() + 14);
      while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    })();
    const { error: publishProfileError } = await clientA.from("company_profiles").update({ is_public: true }).eq("company_id", companyA);
    if (publishProfileError) throw new Error("Appointment test company could not publish its profile.");

    const publicClient = createClient(environment.API_URL, environment.ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: matchingRequestId, error: matchingRequestError } = await publicClient.rpc("create_public_appointment_request", {
      input_company_id: companyA,
      input_customer_name: "Matching Appointment",
      input_phone: "+49251000001",
      input_service_interest: "Inspection",
      input_preferred_date: appointmentDate,
      input_preferred_time: "09:00",
      input_note: null
    });
    if (matchingRequestError || !matchingRequestId) throw new Error("Public appointment request could not be created.");

    const { data: staffAppointment, error: staffAppointmentError } = await clientB
      .from("company_appointment_requests")
      .select("id, status")
      .eq("id", matchingRequestId)
      .single();
    if (staffAppointmentError || staffAppointment?.status !== "requested") {
      throw new Error(`A staff member cannot read the company appointment inbox: ${staffAppointmentError?.message ?? `status=${staffAppointment?.status ?? "missing"}`}`);
    }
    const { error: directAppointmentMutationError } = await clientB
      .from("company_appointment_requests")
      .update({ customer_name: "Forbidden mutation" })
      .eq("id", matchingRequestId);
    assert(Boolean(directAppointmentMutationError), "Staff can bypass the guarded appointment actions with a direct table update.");

    const { data: matchingStatus, error: matchingScheduleError } = await clientB.rpc("propose_or_confirm_company_appointment_request", {
      input_company_id: companyA,
      input_request_id: matchingRequestId,
      input_date: appointmentDate,
      input_time: "09:00",
      input_duration_minutes: 60
    });
    if (matchingScheduleError || matchingStatus !== "confirmed") {
      throw new Error(`The customer's exact requested time was not confirmed by staff: ${matchingScheduleError?.message ?? `status=${matchingStatus ?? "missing"}`}`);
    }

    const { data: alternativeRequestId, error: alternativeRequestError } = await publicClient.rpc("create_public_appointment_request", {
      input_company_id: companyA,
      input_customer_name: "Alternative Appointment",
      input_phone: "+49251000002",
      input_service_interest: "Brake service",
      input_preferred_date: appointmentDate,
      input_preferred_time: "10:00",
      input_note: null
    });
    if (alternativeRequestError || !alternativeRequestId) throw new Error("Alternative appointment request could not be created.");

    const { data: alternativeStatus, error: alternativeScheduleError } = await clientB.rpc("propose_or_confirm_company_appointment_request", {
      input_company_id: companyA,
      input_request_id: alternativeRequestId,
      input_date: appointmentDate,
      input_time: "11:00",
      input_duration_minutes: 60
    });
    if (alternativeScheduleError || alternativeStatus !== "awaiting_customer") {
      throw new Error("An alternative appointment time was confirmed without customer approval.");
    }

    const { data: storedProposal, error: storedProposalError } = await clientB
      .from("company_appointment_requests")
      .select("status, scheduled_start")
      .eq("id", alternativeRequestId)
      .single();
    if (storedProposalError || storedProposal?.status !== "awaiting_customer" || !storedProposal.scheduled_start?.includes("11:00:00")) {
      throw new Error("The alternative appointment proposal was not stored correctly.");
    }

    const { data: publicOccupiedSlots, error: publicOccupiedSlotsError } = await publicClient.rpc("list_public_appointment_slots", {
      input_company_id: companyA,
      input_from: appointmentDate,
      input_to: appointmentDate
    });
    if (
      publicOccupiedSlotsError ||
      !publicOccupiedSlots?.some((slot) => slot.scheduled_time.startsWith("09:00")) ||
      !publicOccupiedSlots?.some((slot) => slot.scheduled_time.startsWith("11:00"))
    ) {
      throw new Error("Confirmed and proposed appointments do not agree with public occupied slots.");
    }

    const { data: overlappingRequestId, error: overlappingRequestError } = await publicClient.rpc("create_public_appointment_request", {
      input_company_id: companyA,
      input_customer_name: "Overlapping Appointment",
      input_phone: "+49251000003",
      input_service_interest: "Collision test",
      input_preferred_date: appointmentDate,
      input_preferred_time: "11:30",
      input_note: null
    });
    if (overlappingRequestError || !overlappingRequestId) throw new Error("Overlap test request could not be created.");

    const { error: overlappingScheduleError } = await clientB.rpc("propose_or_confirm_company_appointment_request", {
      input_company_id: companyA,
      input_request_id: overlappingRequestId,
      input_date: appointmentDate,
      input_time: "11:30",
      input_duration_minutes: 60
    });
    assert(Boolean(overlappingScheduleError), "An appointment was allowed to overlap an awaiting-customer slot.");

    const { error: declineOverlapError } = await clientB.rpc("decline_company_appointment_request", {
      input_company_id: companyA,
      input_request_id: overlappingRequestId
    });
    if (declineOverlapError) throw new Error("The rejected overlap test request could not be closed.");

    const { error: customerAcceptanceError } = await clientB.rpc("confirm_proposed_company_appointment_request", {
      input_company_id: companyA,
      input_request_id: alternativeRequestId
    });
    if (customerAcceptanceError) throw new Error("Staff could not confirm an accepted appointment proposal.");

    const { data: acceptedAppointment } = await clientB
      .from("company_appointment_requests")
      .select("status")
      .eq("id", alternativeRequestId)
      .single();
    assert(acceptedAppointment?.status === "confirmed", "Customer acceptance did not move the proposal into the confirmed calendar.");

    const { error: ownerMemberUpdateError } = await clientA.rpc("update_company_member_access", {
      input_company_id: companyA,
      input_user_id: userB.id,
      input_role: "accounting",
      input_is_active: false
    });
    if (ownerMemberUpdateError) {
      throw new Error("Company owner could not update member access.");
    }

    const { data: createdCustomerRecords, error: customerError } = await clientA.rpc(
      "create_company_customer_with_vehicle",
      {
        input_company_id: companyA,
        input_first_name: "Test",
        input_last_name: "Company A",
        input_phone: `+355${Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0")}`,
        input_is_vip: false,
        input_vehicle_model: "RLS Test Vehicle",
        input_vehicle_plate_number: `RLS-${randomUUID().slice(0, 6)}`,
        input_vehicle_vin: null,
        input_vehicle_current_km: 10_000
      }
    );
    const createdCustomerRecord = createdCustomerRecords?.[0];

    if (customerError || !createdCustomerRecord?.client_id || !createdCustomerRecord.vehicle_id) {
      const reason = customerError
        ? `${customerError.code ?? "unknown"}: ${customerError.message}`
        : "The RPC returned no client or vehicle identifier.";
      throw new Error(`Company A could not atomically create a scoped client and vehicle. ${reason}`);
    }

    const { data: customer, error: customerReadError } = await clientA
      .from("clients")
      .select("id, company_id, owner_id")
      .eq("id", createdCustomerRecord.client_id)
      .single();

    if (customerReadError || !customer) {
      throw new Error("Created client could not be read by its company.");
    }

    assert(customer.company_id === companyA, "Created client has the wrong company scope.");
    assert(customer.owner_id === null, "SaaS client creation still requires a legacy admin owner.");

    const { error: billingAddressError } = await clientA.from("clients").update({
      billing_address: "Musterstrasse 12",
      billing_postal_code: "10115",
      billing_city: "Berlin",
      billing_country: "Deutschland",
      billing_name: "RLS Kunde GmbH",
      billing_email: "rechnung@kunde.example",
      billing_country_code: "DE",
      customer_type: "business",
      electronic_address: "rechnung@kunde.example",
      buyer_reference: "RLS-4711"
    }).eq("id", customer.id);
    if (billingAddressError) throw new Error("Company A could not save its customer's billing address.");

    const { error: invoiceLocaleSettingsError } = await clientA.from("company_invoice_settings").update({
      registration_country: "DE",
      default_tax_rate: 19,
      legal_name: "RLS Werkstatt GmbH",
      tax_id: "DE123456789",
      seller_street: "Werkstattweg 1",
      seller_postal_code: "10115",
      seller_city: "Berlin",
      seller_country_code: "DE",
      contact_email: "rechnung@werkstatt.example"
    }).eq("company_id", companyA);
    if (invoiceLocaleSettingsError) throw new Error("Company A could not configure its invoice country and tax rate.");

    const { data: foreignBillingRows, error: foreignBillingAddressError } = await clientB.from("clients").update({ billing_city: "Forbidden" }).eq("id", customer.id).select("id");
    assert(Boolean(foreignBillingAddressError) || foreignBillingRows?.length === 0, "Company B can change Company A's customer billing address.");

    const { data: ownVehicle, error: vehicleReadError } = await clientA
      .from("vehicles")
      .select("id")
      .eq("id", createdCustomerRecord.vehicle_id)
      .single();

    if (vehicleReadError || !ownVehicle) {
      throw new Error("Created vehicle could not be read by its company.");
    }

    const { data: secondVehicleId, error: secondVehicleError } = await clientA.rpc("create_company_vehicle", {
      input_client_id: customer.id,
      input_model: "RLS Extra Vehicle",
      input_plate_number: `RLS-${randomUUID().slice(0, 6)}`,
      input_vin: null,
      input_current_km: 12_000
    });

    if (secondVehicleError || !secondVehicleId) {
      throw new Error("Company A could not add another scoped vehicle.");
    }

    const { data: staffService, error: staffServiceError } = await clientD
      .from("services")
      .insert({
        company_id: companyA,
        vehicle_id: secondVehicleId,
        type: "normal",
        date: "2026-07-29",
        km: 12_010,
        notes: "Created by scoped staff",
        total_amount: 0
      })
      .select("id, created_by")
      .single();
    if (staffServiceError || !staffService || staffService.created_by !== userD.id) {
      throw new Error("A staff-created service did not retain its original creator.");
    }

    const { error: ownerOperationalEditError } = await clientA
      .from("services")
      .update({ notes: "Owner follow-up without changing the creator" })
      .eq("id", staffService.id);
    if (ownerOperationalEditError) throw new Error("An owner could not make an ordinary operational service edit.");

    const { data: ownerEditedStaffService, error: ownerEditedStaffServiceError } = await clientA
      .from("services")
      .select("created_by, notes")
      .eq("id", staffService.id)
      .single();
    if (ownerEditedStaffServiceError || ownerEditedStaffService?.created_by !== userD.id || ownerEditedStaffService.notes !== "Owner follow-up without changing the creator") {
      throw new Error("An ordinary owner edit did not preserve the staff service creator.");
    }

    const { error: creatorOverwriteError } = await clientA
      .from("services")
      .update({ created_by: userA.id })
      .eq("id", staffService.id);
    assert(Boolean(creatorOverwriteError), "An owner can silently replace the original service creator.");

    const { data: staffInventoryItemId, error: staffInventoryItemError } = await clientD.rpc("create_company_inventory_item", {
      input_company_id: companyA,
      input_sku: `RLS-STOCK-${randomUUID().slice(0, 8)}`,
      input_barcode: null,
      input_name: "RLS staff stock item",
      input_description: null,
      input_unit: "pcs",
      input_sale_price: 12.5,
      input_tax_rate: 19,
      input_initial_stock: 2,
      input_reorder_level: 1
    });
    if (staffInventoryItemError || !staffInventoryItemId) throw new Error("Staff could not create an inventory item for the ledger test.");

    const { data: receivedMovementId, error: receiveStockError } = await clientD.rpc("receive_company_inventory_stock", {
      input_company_id: companyA,
      input_item_id: staffInventoryItemId,
      input_quantity: 3,
      input_note: "RLS supplier delivery"
    });
    if (receiveStockError || !receivedMovementId) throw new Error("Staff stock receipt could not create a ledger movement.");

    const { data: receivedMovement, error: receivedMovementError } = await clientA
      .from("company_inventory_movements")
      .select("movement_type, quantity_delta, note, created_by")
      .eq("id", receivedMovementId)
      .single();
    if (
      receivedMovementError ||
      receivedMovement?.movement_type !== "receive" ||
      Number(receivedMovement.quantity_delta) !== 3 ||
      receivedMovement.note !== "RLS supplier delivery" ||
      receivedMovement.created_by !== userD.id
    ) {
      throw new Error("Stock receipt ledger did not retain its actor, quantity and note.");
    }

    const { error: foreignVehicleInsertError } = await clientB.rpc("create_company_vehicle", {
      input_client_id: customer.id,
      input_model: "Forbidden Vehicle",
      input_plate_number: `FORB-${randomUUID().slice(0, 6)}`,
      input_vin: null,
      input_current_km: 0
    });

    assert(Boolean(foreignVehicleInsertError), "Company B can create a vehicle for Company A's customer.");

    const { data: service, error: serviceError } = await clientA
      .from("services")
      .insert({
        company_id: companyA,
        vehicle_id: ownVehicle.id,
        type: "normal",
        date: "2026-07-29",
        km: 15_000,
        total_amount: 0
      })
      .select("id")
      .single();

    if (serviceError || !service) {
      throw new Error("Company A could not create a scoped service.");
    }

    const { error: itemError } = await clientA.from("service_items").insert({
      company_id: companyA,
      service_id: service.id,
      name: "RLS test service item",
      material_cost: 20,
      labor_cost: 30,
      fee: 5,
      labor_discount_percent: 10
    });

    if (itemError) {
      throw new Error("Company A could not create a scoped service item.");
    }

    const { data: issuedInvoiceId, error: issueInvoiceError } = await clientA.rpc("create_company_invoice_from_service", {
      input_company_id: companyA,
      input_service_id: service.id,
      input_due_date: "2026-08-15"
    });

    if (issueInvoiceError || !issuedInvoiceId) {
      throw new Error(`Company A could not issue a service invoice: ${issueInvoiceError?.message ?? "RPC returned no invoice id"}`);
    }

    const { error: duplicateIssueError } = await clientA.rpc("create_company_invoice_from_service", {
      input_company_id: companyA,
      input_service_id: service.id,
      input_due_date: "2026-08-15"
    });
    assert(Boolean(duplicateIssueError), "The same completed service can be issued as a second invoice.");

    const { count: serviceInvoiceCount, error: serviceInvoiceCountError } = await clientA
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyA)
      .eq("service_id", service.id);
    if (serviceInvoiceCountError || serviceInvoiceCount !== 1) {
      throw new Error("Duplicate invoice rejection did not preserve exactly one service invoice.");
    }

    const { data: issuedInvoice, error: issuedInvoiceError } = await clientA
      .from("invoices")
      .select("id, company_id, client_id, service_id, invoice_number, invoice_snapshot, registration_country, currency, status, material_total, labor_total, fee_total, net_amount, tax_rate, tax_amount, total_amount, amount_paid")
      .eq("id", issuedInvoiceId)
      .single();

    if (issuedInvoiceError || !issuedInvoice) {
      throw new Error("Issued invoice could not be read.");
    }

    assert(issuedInvoice.company_id === companyA, "Issued invoice has the wrong company scope.");
    assert(issuedInvoice.client_id === customer.id && issuedInvoice.service_id === service.id, "Issued invoice is not linked to its service and customer.");
    assert(Number(issuedInvoice.labor_total) === 27, "Issued invoice discounted labor total is incorrect.");
    assert(Number(issuedInvoice.fee_total) === 0 && Number(issuedInvoice.material_total) === 25, "Issued invoice gross material breakdown is incorrect.");
    assert(Number(issuedInvoice.net_amount) === 43.7, "Issued invoice did not extract net from the gross price.");
    assert(Number(issuedInvoice.tax_rate) === 19 && Number(issuedInvoice.tax_amount) === 8.3 && Number(issuedInvoice.total_amount) === 52, "Issued invoice gross-inclusive tax calculation is incorrect.");
    assert(issuedInvoice.invoice_snapshot?.client?.billing_city === "Berlin", "Issued invoice did not freeze the recipient billing address.");
    assert(issuedInvoice.invoice_snapshot?.accounting?.seller?.legal_name === "RLS Werkstatt GmbH" && issuedInvoice.invoice_snapshot?.accounting?.buyer?.customer_type === "business", "Issued invoice did not freeze its German accounting parties.");
    assert(issuedInvoice.registration_country === "DE" && issuedInvoice.currency === "EUR" && issuedInvoice.invoice_snapshot?.registration_country === "DE", "Issued invoice did not freeze the German registration context.");
    assert(/^F-\d{4}-\d{6}$/.test(issuedInvoice.invoice_number ?? "") && issuedInvoice.currency === "EUR", "Issued invoice does not have a valid company invoice number.");
    assert(Number(issuedInvoice.amount_paid) === 0 && issuedInvoice.status === "issued", "Issued invoice has the wrong initial payment state.");

    const { error: directInvoiceInsertError } = await clientA.from("invoices").insert({
      company_id: companyA,
      client_id: customer.id,
      service_id: service.id,
      total_amount: 1,
      amount_paid: 0,
      status: "issued"
    });
    assert(Boolean(directInvoiceInsertError), "Browser client can create invoices without the guarded RPC.");

    const { error: invoicedItemChangeError } = await clientA.from("service_items").insert({
      company_id: companyA,
      service_id: service.id,
      name: "Late change",
      material_cost: 1,
      labor_cost: 0,
      fee: 0,
      labor_discount_percent: 0
    });
    assert(Boolean(invoicedItemChangeError), "An invoiced service can still change its line items.");

    const { error: firstPaymentError } = await clientA.rpc("record_company_invoice_payment", {
      input_company_id: companyA,
      input_invoice_id: issuedInvoiceId,
      input_amount: 20
    });
    if (firstPaymentError) throw new Error(`A valid partial invoice payment was rejected: ${firstPaymentError.message}`);

    const { data: partialInvoice, error: partialInvoiceError } = await clientA
      .from("invoices")
      .select("status, amount_paid")
      .eq("id", issuedInvoiceId)
      .single();
    if (partialInvoiceError || partialInvoice?.status !== "partial" || Number(partialInvoice.amount_paid) !== 20) {
      throw new Error("Partial invoice payment did not update the invoice correctly.");
    }

    const { error: overpaymentError } = await clientA.rpc("record_company_invoice_payment", {
      input_company_id: companyA,
      input_invoice_id: issuedInvoiceId,
      input_amount: 33
    });
    assert(Boolean(overpaymentError), "Invoice overpayment was accepted.");

    const { error: finalPaymentError } = await clientA.rpc("record_company_invoice_payment", {
      input_company_id: companyA,
      input_invoice_id: issuedInvoiceId,
      input_amount: 32
    });
    if (finalPaymentError) throw new Error("Final invoice payment was rejected.");

    const { data: paidInvoice, error: paidInvoiceError } = await clientA
      .from("invoices")
      .select("status, amount_paid")
      .eq("id", issuedInvoiceId)
      .single();
    if (paidInvoiceError || paidInvoice?.status !== "paid" || Number(paidInvoice.amount_paid) !== 52) {
      throw new Error("Final invoice payment did not close the invoice.");
    }

    const { error: unconfirmedRefundError } = await clientA.rpc("cancel_company_invoice_with_refund", {
      input_company_id: companyA,
      input_invoice_id: issuedInvoiceId,
      input_reason: "RLS paid cancellation test",
      input_refund_confirmed: false
    });
    assert(Boolean(unconfirmedRefundError), "A paid invoice was cancelled without refund confirmation.");

    const { data: stornoId, error: stornoError } = await clientA.rpc("cancel_company_invoice_with_refund", {
      input_company_id: companyA,
      input_invoice_id: issuedInvoiceId,
      input_reason: "RLS paid cancellation test",
      input_refund_confirmed: true
    });
    if (stornoError || !stornoId) throw new Error(`Paid invoice refund/Storno failed: ${stornoError?.message ?? "missing Storno id"}`);
    const [{ data: cancelledInvoice }, { data: stornoInvoice }, { data: paymentLedger }] = await Promise.all([
      clientA.from("invoices").select("lifecycle_status, amount_paid, cancelled_by_invoice_id").eq("id", issuedInvoiceId).single(),
      clientA.from("invoices").select("invoice_kind, related_invoice_id, total_amount, invoice_snapshot").eq("id", stornoId).single(),
      clientA.from("company_invoice_payments").select("entry_type, amount").eq("invoice_id", issuedInvoiceId).order("created_at", { ascending: true })
    ]);
    assert(cancelledInvoice?.lifecycle_status === "cancelled" && Number(cancelledInvoice.amount_paid) === 0 && cancelledInvoice.cancelled_by_invoice_id === stornoId, "Paid original invoice was not cancelled after refund.");
    assert(stornoInvoice?.invoice_kind === "storno" && stornoInvoice.related_invoice_id === issuedInvoiceId && Number(stornoInvoice.total_amount) === -52, "Linked Storno invoice is incorrect.");
    assert(stornoInvoice?.invoice_snapshot?.accounting?.buyer?.customer_type === "business", "Storno did not preserve the original accounting snapshot.");
    assert(paymentLedger?.filter((entry) => entry.entry_type === "payment").length === 2 && paymentLedger?.filter((entry) => entry.entry_type === "refund").length === 1 && Number(paymentLedger?.find((entry) => entry.entry_type === "refund")?.amount) === 52, "Payment/refund ledger is incomplete.");

    const { error: albanianSettingsError } = await clientA.from("company_invoice_settings").update({
      registration_country: "AL",
      default_tax_rate: 20
    }).eq("company_id", companyA);
    if (albanianSettingsError) throw new Error("Company A could not select the Albanian invoice context.");

    const { data: albanianService, error: albanianServiceError } = await clientA.from("services").insert({
      company_id: companyA,
      vehicle_id: secondVehicleId,
      type: "normal",
      date: "2026-07-30",
      km: 12_100,
      total_amount: 0
    }).select("id").single();
    if (albanianServiceError || !albanianService) throw new Error("Albanian invoice test service could not be created.");

    const { error: albanianItemError } = await clientA.from("service_items").insert({
      company_id: companyA,
      service_id: albanianService.id,
      name: "Albanian invoice item",
      material_cost: 60,
      labor_cost: 40,
      fee: 0,
      labor_discount_percent: 0
    });
    if (albanianItemError) throw new Error("Albanian invoice test item could not be created.");

    const { data: albanianInvoiceId, error: albanianInvoiceError } = await clientA.rpc("create_company_invoice_from_service", {
      input_company_id: companyA,
      input_service_id: albanianService.id,
      input_due_date: "2026-08-16"
    });
    if (albanianInvoiceError || !albanianInvoiceId) throw new Error("Albanian invoice could not be issued.");

    const { data: newestInvoices, error: newestInvoicesError } = await clientA
      .from("invoices")
      .select("id, issued_at, created_at")
      .eq("company_id", companyA)
      .order("issued_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (newestInvoicesError) throw new Error("Company invoice order could not be read.");
    const newestAlbanianIndex = newestInvoices?.findIndex((invoice) => invoice.id === albanianInvoiceId) ?? -1;
    const originalInvoiceIndex = newestInvoices?.findIndex((invoice) => invoice.id === issuedInvoiceId) ?? -1;
    if (newestAlbanianIndex < 0 || originalInvoiceIndex < 0 || newestAlbanianIndex >= originalInvoiceIndex) {
      throw new Error("Invoices created later on the same issue date are not ordered newest first.");
    }

    const { data: albanianInvoice } = await clientA.from("invoices")
      .select("registration_country, currency, net_amount, tax_rate, tax_amount, total_amount, invoice_snapshot")
      .eq("id", albanianInvoiceId)
      .single();
    assert(albanianInvoice?.registration_country === "AL" && albanianInvoice.currency === "ALL", "Albanian invoice did not use the registered country currency.");
    assert(Number(albanianInvoice?.net_amount) === 83.33 && Number(albanianInvoice?.tax_rate) === 20 && Number(albanianInvoice?.tax_amount) === 16.67 && Number(albanianInvoice?.total_amount) === 100, "Albanian gross-inclusive invoice totals are incorrect.");
    assert(albanianInvoice?.invoice_snapshot?.registration_country === "AL" && albanianInvoice.invoice_snapshot?.currency === "ALL", "Albanian invoice did not freeze its presentation context.");

    const { data: pricedService, error: pricedServiceError } = await clientA
      .from("services")
      .select("total_amount")
      .eq("id", service.id)
      .single();

    if (pricedServiceError || Number(pricedService?.total_amount) !== 52) {
      throw new Error("Service total was not derived from its scoped service items.");
    }

    const { error: olderServiceError } = await clientA.from("services").insert({
      company_id: companyA,
      vehicle_id: ownVehicle.id,
      type: "periodic",
      date: "2026-07-28",
      km: 14_000,
      total_amount: 0
    });

    if (olderServiceError) {
      throw new Error("Company A could not create an older scoped service.");
    }

    const { data: odometerVehicle, error: odometerVehicleError } = await clientA
      .from("vehicles")
      .select("current_km")
      .eq("id", ownVehicle.id)
      .single();

    const { data: atomicServiceId, error: atomicServiceError } = await clientA.rpc("create_company_service_with_item", {
      input_company_id: companyA,
      input_vehicle_id: ownVehicle.id,
      input_type: "normal",
      input_date: "2026-07-30",
      input_km: 16_000,
      input_notes: "Atomic local test",
      input_item_name: "Atomic item",
      input_material_cost: 10,
      input_labor_cost: 40,
      input_fee: 2,
      input_labor_discount_percent: 25
    });

    if (atomicServiceError || !atomicServiceId) {
      throw new Error("Company A could not atomically create a service and its first item.");
    }

    const { data: atomicService, error: atomicServiceReadError } = await clientA
      .from("services")
      .select("total_amount, service_items!service_items_service_company_id_fkey(name)")
      .eq("id", atomicServiceId)
      .single();

    if (
      atomicServiceReadError ||
      Number(atomicService?.total_amount) !== 42 ||
      atomicService.service_items?.length !== 1
    ) {
      throw new Error(
        "Atomic service creation did not persist the expected service item and total."
      );
    }

    if (odometerVehicleError || odometerVehicle?.current_km !== 15_000) {
      throw new Error("Service history did not preserve the vehicle's highest odometer reading.");
    }

    const { data: updatedOdometerVehicle, error: updatedOdometerVehicleError } = await clientA
      .from("vehicles")
      .select("current_km")
      .eq("id", ownVehicle.id)
      .single();

    if (updatedOdometerVehicleError || updatedOdometerVehicle?.current_km !== 16_000) {
      throw new Error("Atomic service creation did not update the vehicle odometer.");
    }

    const { error: invoiceSettingsError } = await clientA.from("company_invoice_settings").upsert(
      {
        company_id: companyA,
        legal_name: "RLS Company A Shpk",
        tax_id: "L12345678A",
        bank_name: "Test Bank",
        bank_iban: "AL00000000000000000000000000"
      },
      { onConflict: "company_id" }
    );

    if (invoiceSettingsError) {
      throw new Error("Company A could not save private invoice settings.");
    }

    const { data: foreignInvoiceSettings, error: foreignInvoiceSettingsError } = await clientB
      .from("company_invoice_settings")
      .select("legal_name")
      .eq("company_id", companyA)
      .maybeSingle();

    if (foreignInvoiceSettingsError || foreignInvoiceSettings) {
      throw new Error("Company B can read Company A private invoice settings.");
    }

    const { data: foreignInvoiceSettingsUpdate, error: foreignInvoiceSettingsUpdateError } = await clientB
      .from("company_invoice_settings")
      .update({ legal_name: "Cross tenant company" })
      .eq("company_id", companyA)
      .select("legal_name")
      .maybeSingle();

    if (foreignInvoiceSettingsUpdateError || foreignInvoiceSettingsUpdate) {
      throw new Error("Company B can update Company A private invoice settings.");
    }

    const { data: foreignRead, error: foreignReadError } = await clientB
      .from("clients")
      .select("id")
      .eq("id", customer.id)
      .maybeSingle();

    if (foreignReadError || foreignRead) {
      throw new Error("Company B can read Company A client data.");
    }

    const { data: foreignVehicleRead, error: foreignVehicleReadError } = await clientB
      .from("vehicles")
      .select("id")
      .eq("id", ownVehicle.id)
      .maybeSingle();

    if (foreignVehicleReadError || foreignVehicleRead) {
      throw new Error("Company B can read Company A vehicle data.");
    }

    const { error: foreignInsertError } = await clientB.from("clients").insert({
      company_id: companyA,
      first_name: "Cross",
      last_name: "Tenant",
      phone: `+355${Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0")}`,
      pin_hash: ""
    });

    assert(Boolean(foreignInsertError), "Company B can create data in Company A scope.");

    const { error: foreignServiceError } = await clientB.from("services").insert({
      company_id: companyA,
      vehicle_id: ownVehicle.id,
      type: "normal",
      date: "2026-07-29",
      km: 99_999,
      total_amount: 0
    });

    assert(Boolean(foreignServiceError), "Company B can create service history in Company A scope.");

    const { error: foreignItemError } = await clientB.from("service_items").insert({
      company_id: companyA,
      service_id: service.id,
      name: "Cross-tenant item",
      material_cost: 1,
      labor_cost: 0,
      fee: 0,
      labor_discount_percent: 0
    });

    assert(Boolean(foreignItemError), "Company B can add service items in Company A scope.");

    const { error: foreignInvoicePaymentError } = await clientB.rpc("record_company_invoice_payment", {
      input_company_id: companyA,
      input_invoice_id: issuedInvoiceId,
      input_amount: 1
    });
    assert(Boolean(foreignInvoicePaymentError), "Company B can record a payment against Company A's invoice.");

    const { data: foreignUpdate, error: foreignUpdateError } = await clientB
      .from("clients")
      .update({ first_name: "Cross-tenant" })
      .eq("id", customer.id)
      .select("first_name")
      .maybeSingle();

    if (foreignUpdateError || foreignUpdate) {
      throw new Error("Company B can update Company A client data.");
    }

    const { data: persistedCustomer, error: persistedCustomerError } = await clientA
      .from("clients")
      .select("first_name")
      .eq("id", customer.id)
      .single();

    if (persistedCustomerError || persistedCustomer?.first_name !== "Test") {
      throw new Error("Cross-tenant update changed Company A client data.");
    }

    console.log("Company operational RLS isolation passed.");
  } finally {
    for (const companyId of createdCompanies) {
      await admin.from("companies").delete().eq("id", companyId);
    }

    for (const user of createdUsers) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Company operational RLS test failed.");
  process.exitCode = 1;
});
