create or replace function public.apply_proposal_override(
  _evaluation_id uuid,
  _base_price numeric,
  _final_value numeric,
  _internal_notes text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.evaluations
     set base_price     = _base_price,
         final_value    = _final_value,
         internal_notes = _internal_notes
   where id = _evaluation_id;
end $$;

create or replace function public.revert_proposal_override(
  _evaluation_id uuid,
  _original_base_price numeric,
  _original_final_value numeric,
  _internal_notes text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.evaluations
     set base_price     = _original_base_price,
         final_value    = _original_final_value,
         internal_notes = _internal_notes
   where id = _evaluation_id;
end $$;