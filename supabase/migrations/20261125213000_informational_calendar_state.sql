-- Distinguish a real iCal-backed calendar from manual confirmation mode.
create or replace function public.has_active_property_calendar(p_property uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.external_calendars ec
    where ec.property_id = p_property and ec.active
  );
$$;
revoke all on function public.has_active_property_calendar(uuid) from public;
grant execute on function public.has_active_property_calendar(uuid) to anon, authenticated;
