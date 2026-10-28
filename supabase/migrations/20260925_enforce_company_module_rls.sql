-- Capability-aware RLS for the shared core. This protects module data even
-- when a user bypasses the workspace navigation and calls PostgREST directly.

create or replace function public.has_company_capability(
  input_company_id uuid,
  input_user_id uuid,
  input_module_key text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_company_member(input_company_id, input_user_id)
    and exists (
      select 1
      from public.company_modules cm
      where cm.company_id = input_company_id
        and cm.module_key = input_module_key
    );
$$;

revoke all on function public.has_company_capability(uuid, uuid, text) from public;
grant execute on function public.has_company_capability(uuid, uuid, text) to authenticated;

-- Some production environments received an earlier partial rollout of these
-- policies. Drop both legacy and capability policy names before recreating the
-- canonical capability-aware set.
drop policy if exists "capability read clients" on public.clients;
drop policy if exists "capability manage clients" on public.clients;
drop policy if exists "capability read vehicles" on public.vehicles;
drop policy if exists "capability manage vehicles" on public.vehicles;
drop policy if exists "capability read services" on public.services;
drop policy if exists "capability manage services" on public.services;
drop policy if exists "capability read service items" on public.service_items;
drop policy if exists "capability manage service items" on public.service_items;
drop policy if exists "capability read reminders" on public.reminders;
drop policy if exists "capability manage reminders" on public.reminders;
drop policy if exists "capability read intake notes" on public.client_intake_notes;
drop policy if exists "capability manage intake notes" on public.client_intake_notes;
drop policy if exists "capability read appointment work tickets" on public.company_appointment_work_tickets;
drop policy if exists "capability read invoices" on public.invoices;
drop policy if exists "capability manage invoices" on public.invoices;
drop policy if exists "capability read invoice settings" on public.company_invoice_settings;
drop policy if exists "capability manage invoice settings" on public.company_invoice_settings;
drop policy if exists "capability read company payment ledger" on public.company_invoice_payments;
drop policy if exists "capability read invoice documents" on public.invoice_documents;
drop policy if exists "capability read invoice events" on public.invoice_events;
drop policy if exists "capability read inventory items" on public.company_inventory_items;
drop policy if exists "capability read inventory movements" on public.company_inventory_movements;
drop policy if exists "capability read counter sales" on public.company_counter_sales;
drop policy if exists "capability read counter sale lines" on public.company_counter_sale_lines;
drop policy if exists "capability read appointment requests" on public.company_appointment_requests;
drop policy if exists "capability read appointment business hours" on public.company_appointment_business_hours;

-- Workshop operations
drop policy if exists "company members read clients" on public.clients;
drop policy if exists "company operators manage clients" on public.clients;
create policy "capability read clients" on public.clients for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations'));
create policy "capability manage clients" on public.clients for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company members read vehicles" on public.vehicles;
drop policy if exists "company operators manage vehicles" on public.vehicles;
create policy "capability read vehicles" on public.vehicles for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations'));
create policy "capability manage vehicles" on public.vehicles for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company members read services" on public.services;
drop policy if exists "company operators manage services" on public.services;
create policy "capability read services" on public.services for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations'));
create policy "capability manage services" on public.services for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company members read service items" on public.service_items;
drop policy if exists "company operators manage service items" on public.service_items;
create policy "capability read service items" on public.service_items for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations'));
create policy "capability manage service items" on public.service_items for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company members read reminders" on public.reminders;
drop policy if exists "company operators manage reminders" on public.reminders;
create policy "capability read reminders" on public.reminders for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations'));
create policy "capability manage reminders" on public.reminders for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company members read intake notes" on public.client_intake_notes;
drop policy if exists "company operators manage intake notes" on public.client_intake_notes;
create policy "capability read intake notes" on public.client_intake_notes for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations'));
create policy "capability manage intake notes" on public.client_intake_notes for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company operators read appointment work tickets" on public.company_appointment_work_tickets;
create policy "capability read appointment work tickets" on public.company_appointment_work_tickets for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'workshop_operations') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

-- Invoicing and immutable invoice evidence
drop policy if exists "company members read invoices" on public.invoices;
drop policy if exists "company finance manage invoices" on public.invoices;
create policy "capability read invoices" on public.invoices for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing'));
create policy "capability manage invoices" on public.invoices for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'invoicing') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']::text[]));

drop policy if exists "members read company invoice settings" on public.company_invoice_settings;
drop policy if exists "company admins insert invoice settings" on public.company_invoice_settings;
drop policy if exists "company admins update invoice settings" on public.company_invoice_settings;
create policy "capability read invoice settings" on public.company_invoice_settings for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing'));
create policy "capability manage invoice settings" on public.company_invoice_settings for all to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]))
with check (public.has_company_capability(company_id, auth.uid(), 'invoicing') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]));

drop policy if exists "members read company payment ledger" on public.company_invoice_payments;
create policy "capability read company payment ledger" on public.company_invoice_payments for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing'));

drop policy if exists "company members read invoice documents" on public.invoice_documents;
create policy "capability read invoice documents" on public.invoice_documents for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing'));

drop policy if exists "company members read invoice events" on public.invoice_events;
create policy "capability read invoice events" on public.invoice_events for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'invoicing'));

-- Inventory and counter sales
drop policy if exists "members read inventory items" on public.company_inventory_items;
drop policy if exists "members read inventory movements" on public.company_inventory_movements;
drop policy if exists "members read counter sales" on public.company_counter_sales;
drop policy if exists "members read counter sale lines" on public.company_counter_sale_lines;
create policy "capability read inventory items" on public.company_inventory_items for select to authenticated using (public.has_company_capability(company_id, auth.uid(), 'inventory'));
create policy "capability read inventory movements" on public.company_inventory_movements for select to authenticated using (public.has_company_capability(company_id, auth.uid(), 'inventory'));
create policy "capability read counter sales" on public.company_counter_sales for select to authenticated using (public.has_company_capability(company_id, auth.uid(), 'inventory'));
create policy "capability read counter sale lines" on public.company_counter_sale_lines for select to authenticated using (public.has_company_capability(company_id, auth.uid(), 'inventory'));

-- Appointment data stays available to Website + Booking as well as Workshop.
drop policy if exists "company operations read appointment requests" on public.company_appointment_requests;
drop policy if exists "company managers read appointment requests" on public.company_appointment_requests;
create policy "capability read appointment requests" on public.company_appointment_requests for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'appointments') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company operations read appointment business hours" on public.company_appointment_business_hours;
drop policy if exists "company managers read appointment business hours" on public.company_appointment_business_hours;
create policy "capability read appointment business hours" on public.company_appointment_business_hours for select to authenticated
using (public.has_company_capability(company_id, auth.uid(), 'appointments') and public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

notify pgrst, 'reload schema';
