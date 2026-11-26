-- Run only against the isolated vivian_calendar_phase5 database.
begin;

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email, raw_user_meta_data)
values ('90000000-0000-4000-8000-000000000001', 'calendar-owner@example.invalid', '{}');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, email, full_name, phone, role)
values ('90000000-0000-4000-8000-000000000001', 'calendar-owner@example.invalid', 'Fake owner', '0000000000', 'owner');
insert into public.organizations (id, name, slug, kind, status, created_by)
values ('91000000-0000-4000-8000-000000000001', 'Fake host', 'phase5-fake-host', 'host', 'active', '90000000-0000-4000-8000-000000000001');
insert into public.properties (id, org_id, owner_id, name, slug)
values ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'Fake property', 'phase5-fake-property');
insert into public.external_calendars (id, property_id, ical_url)
values ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'https://example.invalid/fake.ics');
insert into public.property_blocks (property_id, start_date, end_date, reason)
values ('92000000-0000-4000-8000-000000000001', '2026-12-15', '2026-12-17', 'manual fixture');

do $$ begin
  if has_function_privilege('authenticated', 'public.finish_calendar_sync(uuid,uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.finish_calendar_sync(uuid,uuid,jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.finish_calendar_sync(uuid,uuid,jsonb)', 'EXECUTE') then
    raise exception 'Function grants are unsafe';
  end if;
end $$;

set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001',
  '[{"uid":"a","starts_at":"2026-12-20T12:00:00Z","ends_at":"2026-12-22T12:00:00Z","all_day":true,"status":"confirmed"},{"uid":"b","starts_at":"2026-12-24T12:00:00Z","ends_at":"2026-12-26T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
reset role;
do $$ begin
  if (select count(*) from public.calendar_events where external_calendar_id='93000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'Initial import failed';
  end if;
end $$;

-- A valid but empty source must never release an occupied calendar automatically.
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002');
reset role;
do $$ begin
  begin
    perform public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002', '[]'::jsonb);
    raise exception 'Empty feed incorrectly accepted';
  exception when others then
    if sqlerrm <> 'CALENDAR_EMPTY_SNAPSHOT_PROTECTED' then raise; end if;
  end;
  if (select count(*) from public.calendar_events where external_calendar_id='93000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'Empty feed removed occupied dates';
  end if;
end $$;
update public.external_calendars set sync_token=null, sync_started_at=null where id='93000000-0000-4000-8000-000000000001';

-- First partial snapshot keeps b. Repetition within six hours still keeps b.
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000003');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000003',
  '[{"uid":"a","starts_at":"2026-12-20T12:00:00Z","ends_at":"2026-12-22T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
reset role;
do $$ begin
  if (select last_status from public.external_calendars where id='93000000-0000-4000-8000-000000000001') <> 'pending_removal'
     or (select count(*) from public.calendar_events where external_calendar_id='93000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'Partial feed released dates on first read';
  end if;
end $$;
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000004');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000004',
  '[{"uid":"a","starts_at":"2026-12-20T12:00:00Z","ends_at":"2026-12-22T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
reset role;
do $$ begin
  if (select count(*) from public.calendar_events where external_calendar_id='93000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'Early retry released dates';
  end if;
end $$;
update public.external_calendars set pending_occupancy_at=now()-interval '7 hours'
where id='93000000-0000-4000-8000-000000000001';
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000005');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000005',
  '[{"uid":"a","starts_at":"2026-12-20T12:00:00Z","ends_at":"2026-12-22T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
reset role;
do $$ begin
  if (select count(*) from public.calendar_events where external_calendar_id='93000000-0000-4000-8000-000000000001') <> 1
     or (select last_status from public.external_calendars where id='93000000-0000-4000-8000-000000000001') <> 'ok' then
    raise exception 'Confirmed removal did not complete';
  end if;
end $$;

-- A moved event first blocks the union of old and new dates.
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000006');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000006',
  '[{"uid":"a","starts_at":"2026-12-21T12:00:00Z","ends_at":"2026-12-23T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
reset role;
do $$ begin
  if (select starts_at from public.calendar_events where uid='a') <> '2026-12-20T12:00:00Z'::timestamptz
     or (select ends_at from public.calendar_events where uid='a') <> '2026-12-23T12:00:00Z'::timestamptz then
    raise exception 'Moved event released old dates before confirmation';
  end if;
end $$;
update public.external_calendars set pending_occupancy_at=now()-interval '7 hours'
where id='93000000-0000-4000-8000-000000000001';
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000007');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000007',
  '[{"uid":"a","starts_at":"2026-12-21T12:00:00Z","ends_at":"2026-12-23T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
reset role;
do $$ begin
  if (select starts_at from public.calendar_events where uid='a') <> '2026-12-21T12:00:00Z'::timestamptz
     or (select ends_at from public.calendar_events where uid='a') <> '2026-12-23T12:00:00Z'::timestamptz then
    raise exception 'Confirmed move did not complete';
  end if;
end $$;

-- Duplicate UIDs reject the whole snapshot; manual blocks remain independent.
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000008');
reset role;
do $$ begin
  begin
    perform public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000008',
      '[{"uid":"a","starts_at":"2026-12-21T12:00:00Z","ends_at":"2026-12-23T12:00:00Z","all_day":true,"status":"confirmed"},{"uid":"a","starts_at":"2026-12-21T12:00:00Z","ends_at":"2026-12-23T12:00:00Z","all_day":true,"status":"confirmed"}]'::jsonb);
    raise exception 'Duplicate UID incorrectly accepted';
  exception when others then
    if sqlerrm <> 'CALENDAR_INVALID_SNAPSHOT' then raise; end if;
  end;
  if (select count(*) from public.property_blocks where property_id='92000000-0000-4000-8000-000000000001') <> 1
     or (select count(*) from public.calendar_events where external_calendar_id='93000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Rejected snapshot changed protected blocks';
  end if;
end $$;

-- A brand-new empty calendar is valid; a stale token cannot mutate an existing one.
insert into public.external_calendars (id, property_id, ical_url)
values ('93000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', 'https://example.invalid/empty.ics');
set role service_role;
select public.claim_calendar_sync('93000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000009');
select public.finish_calendar_sync('93000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000009', '[]'::jsonb);
reset role;
do $$ begin
  if (select last_status from public.external_calendars where id='93000000-0000-4000-8000-000000000002') <> 'ok' then
    raise exception 'New empty calendar was rejected';
  end if;
  begin
    perform public.finish_calendar_sync('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000009', '[]'::jsonb);
    raise exception 'Stale token incorrectly accepted';
  exception when others then
    if sqlerrm <> 'CALENDAR_SYNC_EXPIRED' then raise; end if;
  end;
end $$;

rollback;
