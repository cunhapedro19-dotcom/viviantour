-- Reuse existing external events; never write manual blocks or bookings.
alter table public.external_calendars
  add column next_sync_at timestamptz not null default now(),
  add column sync_started_at timestamptz,
  add column sync_token uuid,
  add column imported_count integer not null default 0;

update public.external_calendars
set ical_url = regexp_replace(ical_url, '^webcal://', 'https://', 'i');
-- Historical errors used to overwrite the last successful timestamp.
update public.external_calendars set last_synced_at = null where last_status = 'error';

create or replace function public.can_manage_property_calendar(p_property uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.properties p
    where p.id = p_property and public.is_host_manager(p.org_id));
$$;
revoke all on function public.can_manage_property_calendar(uuid) from public, anon;
grant execute on function public.can_manage_property_calendar(uuid) to authenticated;

drop policy if exists "ical: membros veem" on public.external_calendars;
drop policy if exists "ical: membros escrevem" on public.external_calendars;
create policy "calendar managers" on public.external_calendars for all to authenticated
using (public.can_manage_property_calendar(property_id))
with check (public.can_manage_property_calendar(property_id));

-- Status/locks can only be changed by the backend, even through direct REST calls.
revoke insert, update on public.external_calendars from authenticated;
grant insert (property_id, source, label, ical_url, active) on public.external_calendars to authenticated;
grant update (source, label, ical_url, active) on public.external_calendars to authenticated;

create or replace function public.claim_calendar_sync(p_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.external_calendars set last_status = 'syncing', sync_started_at = now(), sync_token = p_token
  where id = p_id and active
    and (sync_started_at is null or sync_started_at < now() - interval '5 minutes');
  return found;
end;
$$;

create or replace function public.finish_calendar_sync(p_id uuid, p_token uuid, p_events jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform 1 from public.external_calendars where id = p_id and sync_token = p_token and active for update;
  if not found then raise exception 'Sincroniza��o expirada ou calend�rio desconectado'; end if;
  insert into public.calendar_events(external_calendar_id, uid, summary, starts_at, ends_at, all_day, status)
  select p_id, e.uid, e.summary, e.starts_at, e.ends_at, e.all_day, e.status
  from jsonb_to_recordset(p_events) as e(uid text, summary text, starts_at timestamptz, ends_at timestamptz, all_day boolean, status text)
  on conflict (external_calendar_id, uid) do update set summary = excluded.summary,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, all_day = excluded.all_day, status = excluded.status;
  delete from public.calendar_events where external_calendar_id = p_id
    and uid not in (select value->>'uid' from jsonb_array_elements(p_events));
  n := jsonb_array_length(p_events);
  update public.external_calendars set last_status = 'ok', last_error = null,
    last_synced_at = now(), next_sync_at = now() + interval '15 minutes',
    imported_count = n, sync_started_at = null, sync_token = null where id = p_id;
  return n;
end;
$$;
revoke all on function public.claim_calendar_sync(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_calendar_sync(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_calendar_sync(uuid, uuid) to service_role;
grant execute on function public.finish_calendar_sync(uuid, uuid, jsonb) to service_role;
create index external_calendars_next_sync_idx on public.external_calendars(next_sync_at) where active;

;
