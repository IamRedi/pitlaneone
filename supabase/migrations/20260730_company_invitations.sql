create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  role text not null check (role in ('admin', 'manager', 'staff', 'accounting', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_by is null and accepted_at is null)
  )
);

create unique index company_invitations_one_pending_email_idx
on public.company_invitations (company_id, email)
where status = 'pending';

create index company_invitations_company_status_idx
on public.company_invitations (company_id, status, created_at desc);

create index company_invitations_pending_email_idx
on public.company_invitations (email, expires_at)
where status = 'pending';

create trigger set_company_invitations_updated_at
before update on public.company_invitations
for each row execute function public.set_updated_at();

alter table public.company_invitations enable row level security;

create policy "company admins read invitations"
on public.company_invitations
for select to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

create or replace function public.create_company_invitation(
  input_company_id uuid,
  input_email text,
  input_role text
)
returns public.company_invitations
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  normalized_email text := lower(trim(input_email));
  invitation public.company_invitations;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin']) then
    raise exception 'Only a company owner or administrator can invite members.';
  end if;

  select role into caller_role
  from public.company_users
  where company_id = input_company_id
    and user_id = auth.uid()
    and is_active = true;

  if caller_role is null then
    raise exception 'Only an active company manager can invite members.';
  end if;

  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if input_role not in ('admin', 'manager', 'staff', 'accounting', 'viewer') then
    raise exception 'Choose a valid non-owner company role.';
  end if;

  if caller_role = 'admin' and input_role = 'admin' then
    raise exception 'Only the company owner can invite an administrator.';
  end if;

  if exists (
    select 1
    from public.company_users cu
    join auth.users au on au.id = cu.user_id
    where cu.company_id = input_company_id
      and lower(au.email) = normalized_email
  ) then
    raise exception 'This email already belongs to a company member.';
  end if;

  update public.company_invitations
  set status = 'revoked'
  where company_id = input_company_id
    and email = normalized_email
    and status = 'pending';

  insert into public.company_invitations (company_id, email, role, invited_by)
  values (input_company_id, normalized_email, input_role, auth.uid())
  returning * into invitation;

  return invitation;
end;
$$;

create or replace function public.revoke_company_invitation(input_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select company_id into invitation_company_id
  from public.company_invitations
  where id = input_invitation_id
    and status = 'pending';

  if invitation_company_id is null
    or not public.has_company_role(invitation_company_id, auth.uid(), array['owner', 'admin']) then
    raise exception 'You do not have permission to revoke this invitation.';
  end if;

  update public.company_invitations
  set status = 'revoked'
  where id = input_invitation_id;
end;
$$;

create or replace function public.accept_company_invitation(input_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  invitation public.company_invitations;
  authenticated_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select lower(email) into authenticated_email
  from auth.users
  where id = auth.uid();

  select * into invitation
  from public.company_invitations
  where id = input_invitation_id
    and status = 'pending'
  for update;

  if invitation.id is null then
    raise exception 'This invitation is unavailable.';
  end if;

  if invitation.expires_at <= now() then
    raise exception 'This invitation has expired.';
  end if;

  if authenticated_email is null or invitation.email <> authenticated_email then
    raise exception 'This invitation belongs to a different email address.';
  end if;

  insert into public.company_users (company_id, user_id, role, member_email, is_active)
  values (invitation.company_id, auth.uid(), invitation.role, authenticated_email, true)
  on conflict (company_id, user_id) do nothing;

  update public.company_invitations
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = invitation.id;

  return invitation.company_id;
end;
$$;

revoke all on function public.create_company_invitation(uuid, text, text) from public;
revoke all on function public.revoke_company_invitation(uuid) from public;
revoke all on function public.accept_company_invitation(uuid) from public;
grant execute on function public.create_company_invitation(uuid, text, text) to authenticated;
grant execute on function public.revoke_company_invitation(uuid) to authenticated;
grant execute on function public.accept_company_invitation(uuid) to authenticated;

revoke insert, update, delete on public.company_invitations from authenticated;
grant select on public.company_invitations to authenticated;
