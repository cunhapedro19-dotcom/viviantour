-- Read-only assertions for the local fictional PostgreSQL database.
-- Run only against an isolated test database; the transaction is rolled back.
begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('organization_members','organizations','properties','services',
                        'property_photos','property_blocks','external_calendars',
                        'service_media','departures','vessels','listing_price_rules')
      and policyname in (
        'membros: fundador entra na própria org',
        'membros: membros gerenciam equipe',
        'membros: membros removem equipe',
        'imóveis: membros criam',
        'imóveis: membros editam',
        'passeios: membros criam',
        'passeios: membros editam',
        'fotos: membros escrevem',
        'bloqueios: membros escrevem',
        'ical: membros escrevem',
        'mídia: membros escrevem',
        'saídas: membros escrevem',
        'embarcações: membros escrevem'
      )
  ) then
    raise exception 'MVP_CONTAINMENT_OLD_WRITE_POLICY_REMAINS';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_members'
      and policyname = 'mvp admin gerencia membros'
      and coalesce(qual, '') ilike '%is_admin%'
  ) then
    raise exception 'MVP_CONTAINMENT_ADMIN_MEMBER_POLICY_MISSING';
  end if;

  if has_table_privilege('anon', 'public.organization_members', 'INSERT')
     or has_table_privilege('anon', 'public.organization_members', 'UPDATE')
     or has_table_privilege('anon', 'public.organization_members', 'DELETE') then
    raise exception 'MVP_CONTAINMENT_ANON_MEMBERSHIP_GRANT_REMAINS';
  end if;

  if not has_function_privilege('anon', 'public.has_active_property_calendar(uuid)', 'EXECUTE') then
    raise exception 'MVP_CALENDAR_STATE_RPC_NOT_PUBLIC_READABLE';
  end if;
end $$;

rollback;
