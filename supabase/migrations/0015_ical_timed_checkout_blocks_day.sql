-- Timed events from property calendars often represent an occupied day with
-- a checkout time. Keep that entire calendar day unavailable on the site.
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
            case
              when ce.all_day then (ce.ends_at at time zone 'America/Sao_Paulo')::date
              else (ce.ends_at at time zone 'America/Sao_Paulo')::date + 1
            end,
            '[)'
          ) && daterange(p_from, p_to, '[)')
  );
$$;
