-- 0007 · Google Agenda como origem explícita de calendário iCal
-- Os calendários do Google continuam usando o mesmo feed iCal de somente leitura.
-- Use o "endereço secreto em formato iCal" para manter a agenda privada.

alter table public.external_calendars
  drop constraint if exists external_calendars_source_check;

alter table public.external_calendars
  add constraint external_calendars_source_check
  check (source in ('airbnb', 'google', 'vrbo', 'booking', 'other'));
