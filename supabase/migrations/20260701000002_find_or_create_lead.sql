-- find_or_create_lead: reuses an existing in_progress lead for the same email
-- so that navigating back in the wizard (or returning in a new browser session)
-- never creates a duplicate lead.
create or replace function public.find_or_create_lead(
  _name  text,
  _email text,
  _phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  existing_id uuid;
begin
  -- Reuse the most recent in_progress lead with the same email
  select id into existing_id
    from public.leads
   where customer_email = _email
     and status = 'in_progress'
   order by created_at desc
   limit 1;

  if existing_id is not null then
    -- Patch name/phone in case the user corrected a typo
    update public.leads
       set customer_name  = coalesce(nullif(trim(_name),  ''), customer_name),
           customer_phone = coalesce(nullif(trim(_phone), ''), customer_phone)
     where id = existing_id;
    return existing_id;
  end if;

  -- No open lead found → create a fresh one
  return public.create_lead(_name, _email, _phone);
end $$;

grant execute on function public.find_or_create_lead(text,text,text) to anon, authenticated;
