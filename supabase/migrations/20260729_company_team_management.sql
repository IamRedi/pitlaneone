-- Company team memberships are managed through narrow, audited RPCs rather
-- than direct browser writes. This prevents role escalation through the API.
alter table public.company_users
add column if not exists member_email text;

alter table public.company_users
add constraint company_users_member_email_length
check (member_email is null or char_length(member_email) <= 254);

update public.company_users cu
set member_email = lower(au.email)
from auth.users au
where au.id = cu.user_id
  and cu.member_email is null;

create or replace function public.protect_company_membership_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.company_id <> old.company_id or new.user_id <> old.user_id then
    raise exception 'Company membership identity cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_company_membership_identity on public.company_users;
create trigger protect_company_membership_identity
before update on public.company_users
for each row execute function public.protect_company_membership_identity();

create or replace function public.add_company_member_by_email(
  input_company_id uuid,
  input_email text,
  input_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  target_user_id uuid;
  target_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin']) then
    raise exception 'Only a company owner or administrator can manage members.';
  end if;

  select role
  into caller_role
  from public.company_users
  where company_id = input_company_id
    and user_id = auth.uid()
    and is_active = true;

  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'Only a company owner or administrator can manage members.';
  end if;

  if input_role not in ('admin', 'manager', 'staff', 'accounting', 'viewer') then
    raise exception 'Choose a valid non-owner company role.';
  end if;

  if caller_role = 'admin' and input_role = 'admin' then
    raise exception 'Only the company owner can add an administrator.';
  end if;

  select id, lower(email)
  into target_user_id, target_email
  from auth.users
  where lower(email) = lower(trim(input_email))
  limit 1;

  if target_user_id is null then
    raise exception 'The user must create a Makinaime account before being added to a company.';
  end if;

  if exists (
    select 1
    from public.company_users
    where company_id = input_company_id
      and user_id = target_user_id
  ) then
    raise exception 'This user is already part of the company.';
  end if;

  insert into public.company_users (company_id, user_id, role, member_email, is_active)
  values (input_company_id, target_user_id, input_role, target_email, true);
end;
$$;

create or replace function public.update_company_member_access(
  input_company_id uuid,
  input_user_id uuid,
  input_role text,
  input_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin']) then
    raise exception 'Only a company owner or administrator can manage members.';
  end if;

  select role
  into caller_role
  from public.company_users
  where company_id = input_company_id
    and user_id = auth.uid()
    and is_active = true;

  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'Only a company owner or administrator can manage members.';
  end if;

  if input_user_id = auth.uid() then
    raise exception 'Use a separate ownership and access flow to change your own company access.';
  end if;

  select role
  into target_role
  from public.company_users
  where company_id = input_company_id
    and user_id = input_user_id;

  if target_role is null then
    raise exception 'Company member was not found.';
  end if;

  if target_role = 'owner' then
    raise exception 'Company owner access cannot be changed here.';
  end if;

  if input_role not in ('admin', 'manager', 'staff', 'accounting', 'viewer') then
    raise exception 'Choose a valid non-owner company role.';
  end if;

  if caller_role = 'admin' and (target_role = 'admin' or input_role = 'admin') then
    raise exception 'Only the company owner can manage administrator access.';
  end if;

  update public.company_users
  set role = input_role,
      is_active = input_is_active
  where company_id = input_company_id
    and user_id = input_user_id;
end;
$$;

revoke all on function public.add_company_member_by_email(uuid, text, text) from public;
revoke all on function public.update_company_member_access(uuid, uuid, text, boolean) from public;
grant execute on function public.add_company_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.update_company_member_access(uuid, uuid, text, boolean) to authenticated;

drop policy if exists "members read company users" on public.company_users;
create policy "self or company admins read company users"
on public.company_users
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_company_role(company_id, auth.uid(), array['owner', 'admin'])
);

drop policy if exists "company admins add users" on public.company_users;
drop policy if exists "company admins update users" on public.company_users;
drop policy if exists "company owners remove users" on public.company_users;

revoke insert, update, delete on public.company_users from authenticated;
grant select on public.company_users to authenticated;
