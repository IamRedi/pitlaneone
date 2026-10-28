-- Resolve only verified, published custom domains for the edge router.
-- The verification token remains private: this function exposes only a slug.
create or replace function public.resolve_public_company_domain(input_hostname text)
returns table (slug text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.slug
  from public.company_domains d
  join public.companies c on c.id = d.company_id
  join public.company_profiles p on p.company_id = c.id
  where d.hostname = lower(trim(input_hostname))
    and d.domain_type = 'custom'
    and d.is_verified = true
    and p.is_public = true
  limit 1;
$$;

revoke all on function public.resolve_public_company_domain(text) from public;
grant execute on function public.resolve_public_company_domain(text) to anon, authenticated;
