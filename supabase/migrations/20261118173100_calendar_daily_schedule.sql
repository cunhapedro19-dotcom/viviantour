create or replace function public.finish_calendar_sync(p_id uuid, p_token uuid, p_events jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform 1 from public.external_calendars where id = p_id and sync_token = p_token and active for update;
  if not found then raise exception 'Sincronização expirada ou calendário desconectado'; end if;
  insert into public.calendar_events(external_calendar_id, uid, summary, starts_at, ends_at, all_day, status)
  select p_id, e.uid, e.summary, e.starts_at, e.ends_at, e.all_day, e.status
  from jsonb_to_recordset(p_events) as e(uid text, summary text, starts_at timestamptz, ends_at timestamptz, all_day boolean, status text)
  on conflict (external_calendar_id, uid) do update set summary = excluded.summary,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, all_day = excluded.all_day, status = excluded.status;
  delete from public.calendar_events where external_calendar_id = p_id
    and uid not in (select value->>'uid' from jsonb_array_elements(p_events));
  n := jsonb_array_length(p_events);
  update public.external_calendars set last_status = 'ok', last_error = null,
    last_synced_at = now(), next_sync_at = date_bin(interval '1 day', now() - interval '9 hours', timestamptz '2000-01-01') + interval '1 day 9 hours',
    imported_count = n, sync_started_at = null, sync_token = null where id = p_id;
  return n;
end;
$$;
;
