create or replace function public.create_lead(
  _name text, _email text, _phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.leads (customer_name, customer_email, customer_phone,
                            assessment_responses, status)
  values (_name, _email, _phone, '{}'::jsonb, 'in_progress')
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.upsert_lead_by_email(
  _name text, _email text, _phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare existing_id uuid;
begin
  select id into existing_id from public.leads
   where customer_email = _email
   order by created_at desc limit 1;

  if existing_id is not null then
    update public.leads
       set customer_name = coalesce(nullif(_name,''), customer_name),
           customer_phone = coalesce(nullif(_phone,''), customer_phone),
           status = 'in_progress'
     where id = existing_id;
    return existing_id;
  end if;

  return public.create_lead(_name, _email, _phone);
end $$;

grant execute on function public.create_lead(text,text,text) to anon, authenticated;
grant execute on function public.upsert_lead_by_email(text,text,text) to anon, authenticated;