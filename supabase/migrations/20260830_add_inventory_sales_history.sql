create or replace function public.list_company_counter_sales(
  input_company_id uuid,
  input_from date default null,
  input_to date default null
)
returns table (
  id uuid,
  receipt_number text,
  currency text,
  status text,
  total_amount numeric,
  amount_paid numeric,
  created_at timestamptz,
  created_by uuid,
  creator_email text,
  line_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','staff','accounting','viewer']::text[]) then
    raise exception 'Company access is required.' using errcode = '42501';
  end if;

  return query
  select
    sale.id,
    sale.receipt_number,
    sale.currency,
    sale.status,
    sale.total_amount,
    sale.amount_paid,
    sale.created_at,
    sale.created_by,
    member.member_email,
    count(line.id)::bigint as line_count
  from public.company_counter_sales sale
  left join public.company_users member
    on member.company_id = sale.company_id and member.user_id = sale.created_by
  left join public.company_counter_sale_lines line on line.sale_id = sale.id
  where sale.company_id = input_company_id
    and (input_from is null or sale.created_at >= input_from::timestamptz)
    and (input_to is null or sale.created_at < (input_to + 1)::timestamptz)
  group by sale.id, member.member_email
  order by sale.created_at desc, sale.id desc;
end;
$$;

revoke all on function public.list_company_counter_sales(uuid, date, date) from public, anon, authenticated, service_role;
grant execute on function public.list_company_counter_sales(uuid, date, date) to authenticated;
notify pgrst, 'reload schema';
