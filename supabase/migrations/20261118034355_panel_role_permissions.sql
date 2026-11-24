-- Painéis por papel: owner administra somente organizações host e propriedades;
-- provider administra somente organizações operator e passeios; admin acessa ambos.
-- As funções são usadas pelas policies de RLS e nunca dependem de metadata editável.

create or replace function public.is_host_manager(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    join public.profiles p on p.id = m.profile_id
    where m.organization_id = p_org
      and m.profile_id = auth.uid()
      and o.kind = 'host'
      and p.role = 'owner'
  );
$$;

create or replace function public.is_operator_manager(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    join public.profiles p on p.id = m.profile_id
    where m.organization_id = p_org
      and m.profile_id = auth.uid()
      and o.kind = 'operator'
      and p.role = 'provider'
  );
$$;

grant execute on function public.is_host_manager(uuid) to authenticated;
grant execute on function public.is_operator_manager(uuid) to authenticated;

drop policy if exists "imóveis: membros criam" on public.properties;
drop policy if exists "imóveis: membros editam" on public.properties;
create policy "imóveis: gestores host criam" on public.properties
  for insert to authenticated with check (public.is_host_manager(org_id));
create policy "imóveis: gestores host editam" on public.properties
  for update to authenticated
  using (public.is_host_manager(org_id))
  with check (public.is_host_manager(org_id));

drop policy if exists "passeios: membros criam" on public.services;
drop policy if exists "passeios: membros editam" on public.services;
create policy "passeios: gestores operator criam" on public.services
  for insert to authenticated with check (public.is_operator_manager(org_id));
create policy "passeios: gestores operator editam" on public.services
  for update to authenticated
  using (public.is_operator_manager(org_id))
  with check (public.is_operator_manager(org_id));;
