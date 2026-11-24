-- Aceita Google Agenda como origem de calendário externo (iCal).
alter table public.external_calendars drop constraint if exists external_calendars_source_check;
alter table public.external_calendars
  add constraint external_calendars_source_check
  check (source = any (array['airbnb','vrbo','booking','google','other']));;
