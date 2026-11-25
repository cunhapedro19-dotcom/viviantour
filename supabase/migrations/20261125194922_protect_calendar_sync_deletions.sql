-- Local-only Phase 5 proposal. A feed must never silently release occupied dates.
begin;

alter table public.external_calendars
  add column pending_occupancy_hash text,
  add column pending_occupancy_at timestamptz;

create or replace function public.finish_calendar_sync(p_id uuid, p_token uuid, p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_calendar public.external_calendars;
  v_count integer;
  v_existing integer;
  v_releasing integer;
  v_hash text;
  v_pending boolean := false;
  v_imported integer;
begin
  select * into v_calendar from public.external_calendars
    where id = p_id and sync_token = p_token and active for update;
  if not found then raise exception 'CALENDAR_SYNC_EXPIRED'; end if;

  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 10000 then
    raise exception 'CALENDAR_INVALID_SNAPSHOT';
  end if;
  select count(*), count(distinct e.uid) into v_count, v_imported
  from jsonb_to_recordset(p_events) as e(uid text, summary text,
    starts_at timestamptz, ends_at timestamptz, all_day boolean, status text);
  if v_count <> v_imported or exists (
    select 1 from jsonb_to_recordset(p_events) as e(uid text, summary text,
      starts_at timestamptz, ends_at timestamptz, all_day boolean, status text)
    where e.uid is null or btrim(e.uid) = '' or e.starts_at is null
      or e.ends_at is null or e.ends_at <= e.starts_at
      or e.all_day is null or e.status is null
  ) then raise exception 'CALENDAR_INVALID_SNAPSHOT'; end if;

  select count(*) into v_existing from public.calendar_events
    where external_calendar_id = p_id;
  if v_count = 0 and v_existing > 0 then
    raise exception 'CALENDAR_EMPTY_SNAPSHOT_PROTECTED';
  end if;

  select count(*) into v_releasing
  from public.calendar_events ce
  left join jsonb_to_recordset(p_events) as e(uid text, summary text,
    starts_at timestamptz, ends_at timestamptz, all_day boolean, status text)
    on e.uid = ce.uid
  where ce.external_calendar_id = p_id
    and (e.uid is null or ce.starts_at is distinct from e.starts_at
      or ce.ends_at is distinct from e.ends_at
      or ce.all_day is distinct from e.all_day
      or ce.status is distinct from e.status);

  select md5(coalesce(jsonb_agg(jsonb_build_array(e.uid, e.starts_at,
    e.ends_at, e.all_day, e.status) order by e.uid)::text, '[]')) into v_hash
  from jsonb_to_recordset(p_events) as e(uid text, summary text,
    starts_at timestamptz, ends_at timestamptz, all_day boolean, status text);

  if v_releasing > 0 and not coalesce((
    v_calendar.pending_occupancy_hash = v_hash
    and v_calendar.pending_occupancy_at <= now() - interval '6 hours'
  ), false) then
    v_pending := true;
    -- Union of old and new periods blocks both until the feed is confirmed.
    insert into public.calendar_events as ce
      (external_calendar_id, uid, summary, starts_at, ends_at, all_day, status)
    select p_id, e.uid, e.summary, e.starts_at, e.ends_at, e.all_day, e.status
    from jsonb_to_recordset(p_events) as e(uid text, summary text,
      starts_at timestamptz, ends_at timestamptz, all_day boolean, status text)
    on conflict (external_calendar_id, uid) do update
      set summary = excluded.summary,
        starts_at = least(ce.starts_at, excluded.starts_at),
        ends_at = greatest(ce.ends_at, excluded.ends_at),
        all_day = ce.all_day or excluded.all_day,
        status = 'confirmed';
  else
    insert into public.calendar_events
      (external_calendar_id, uid, summary, starts_at, ends_at, all_day, status)
    select p_id, e.uid, e.summary, e.starts_at, e.ends_at, e.all_day, e.status
    from jsonb_to_recordset(p_events) as e(uid text, summary text,
      starts_at timestamptz, ends_at timestamptz, all_day boolean, status text)
    on conflict (external_calendar_id, uid) do update
      set summary = excluded.summary, starts_at = excluded.starts_at,
        ends_at = excluded.ends_at, all_day = excluded.all_day,
        status = excluded.status;
    delete from public.calendar_events ce where ce.external_calendar_id = p_id
      and not exists (
        select 1 from jsonb_to_recordset(p_events) as e(uid text)
        where e.uid = ce.uid
      );
  end if;

  select count(*) into v_imported from public.calendar_events
    where external_calendar_id = p_id;
  update public.external_calendars set
    last_status = case when v_pending then 'pending_removal' else 'ok' end,
    last_error = null, last_synced_at = now(),
    next_sync_at = date_bin(interval '1 day', now() - interval '9 hours',
      timestamptz '2000-01-01') + interval '1 day 9 hours',
    imported_count = v_imported,
    pending_occupancy_hash = case when v_pending then v_hash else null end,
    pending_occupancy_at = case when v_pending then
      case when pending_occupancy_hash = v_hash then pending_occupancy_at else now() end
      else null end,
    sync_started_at = null, sync_token = null
  where id = p_id;
  return v_count;
end;
$$;

revoke all on function public.finish_calendar_sync(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.finish_calendar_sync(uuid, uuid, jsonb)
  to service_role;

commit;
