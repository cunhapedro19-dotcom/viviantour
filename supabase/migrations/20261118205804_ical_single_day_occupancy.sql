-- Treat an iCal event as an occupied calendar day even when the provider
-- exports it as a short time slot on that same day (for example 12:00–13:00).
create or replace function public.fn_property_is_available(p_property uuid, p_from date, p_to date)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.bookings b
    where b.property_id = p_property
      and b.kind = 'stay'
      and b.status in ('confirmed','awaiting_payment')
      and daterange(b.check_in, b.check_out, '[)') && daterange(p_from, p_to, '[)')
  ) and not exists (
    select 1 from public.property_blocks pb
    where pb.property_id = p_property
      and daterange(pb.start_date, pb.end_date, '[)') && daterange(p_from, p_to, '[)')
  ) and not exists (
    select 1
    from public.calendar_events ce
    join public.external_calendars ec on ec.id = ce.external_calendar_id
    where ec.property_id = p_property
      and ec.active
      and ce.status <> 'cancelled'
      and daterange(
            (ce.starts_at at time zone 'America/Sao_Paulo')::date,
            greatest(
              (ce.ends_at at time zone 'America/Sao_Paulo')::date,
              (ce.starts_at at time zone 'America/Sao_Paulo')::date + 1
            ), '[)'
          ) && daterange(p_from, p_to, '[)')
  );
$$;;
