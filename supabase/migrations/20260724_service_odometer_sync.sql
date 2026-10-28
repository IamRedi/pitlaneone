-- Keep the operational odometer in sync with scoped service history.
-- Odometer values are monotonic: correcting an older service must not lower
-- the latest known reading on the vehicle record.
create or replace function public.sync_vehicle_current_km_from_service()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.company_id is null then
    return new;
  end if;

  update public.vehicles
  set current_km = new.km
  where id = new.vehicle_id
    and company_id = new.company_id
    and current_km < new.km;

  return new;
end;
$$;

drop trigger if exists sync_vehicle_current_km_from_service on public.services;

create trigger sync_vehicle_current_km_from_service
after insert or update of km, vehicle_id, company_id on public.services
for each row execute function public.sync_vehicle_current_km_from_service();
