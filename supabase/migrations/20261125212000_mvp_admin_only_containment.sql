-- MVP containment: preserve public reads and service_role syncs, but make
-- administrative writes available only to profiles with role = 'admin'.
-- Apply only after local validation; no commercial data is modified.
begin;

create or replace function public.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;
create or replace function public.can_manage_org_resources(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;
create or replace function public.is_host_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;
create or replace function public.is_operator_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;
create or replace function public.can_join_org(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;

drop policy if exists "membros: fundador entra na própria org" on public.organization_members;
drop policy if exists "membros: membros gerenciam equipe" on public.organization_members;
drop policy if exists "membros: membros removem equipe" on public.organization_members;
drop policy if exists "membros: owner convida equipe" on public.organization_members;
drop policy if exists "membros: owner gerencia equipe" on public.organization_members;
drop policy if exists "membros: owner remove equipe" on public.organization_members;
drop policy if exists "orgs: membros administram" on public.organizations;
drop policy if exists "orgs: owner administra" on public.organizations;
drop policy if exists "orgs: criar a própria" on public.organizations;
create policy "mvp admin gerencia membros" on public.organization_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin gerencia organizações" on public.organizations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "imóveis: membros criam" on public.properties;
drop policy if exists "imóveis: membros editam" on public.properties;
drop policy if exists "fotos: membros escrevem" on public.property_photos;
drop policy if exists "fotos: gestores escrevem" on public.property_photos;
drop policy if exists "amenities de imóvel: membros escrevem" on public.property_amenities;
drop policy if exists "amenities de imóvel: gestores escrevem" on public.property_amenities;
drop policy if exists "bloqueios: membros escrevem" on public.property_blocks;
drop policy if exists "bloqueios: gestores escrevem" on public.property_blocks;
drop policy if exists "ical: membros escrevem" on public.external_calendars;
drop policy if exists "passeios: membros criam" on public.services;
drop policy if exists "passeios: membros editam" on public.services;
drop policy if exists "mídia: membros escrevem" on public.service_media;
drop policy if exists "mídia: gestores escrevem" on public.service_media;
drop policy if exists "saídas: membros escrevem" on public.departures;
drop policy if exists "saídas: gestores escrevem" on public.departures;
drop policy if exists "embarcações: membros escrevem" on public.vessels;
drop policy if exists "passeios: gestores operator criam" on public.services;
drop policy if exists "passeios: gestores operator editam" on public.services;
drop policy if exists "price rules managers insert" on public.listing_price_rules;
drop policy if exists "price rules managers update" on public.listing_price_rules;
drop policy if exists "price rules managers delete" on public.listing_price_rules;

create policy "mvp admin escreve hospedagens" on public.properties
  for insert to authenticated with check (public.is_admin());
create policy "mvp admin edita hospedagens" on public.properties
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve fotos" on public.property_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve comodidades" on public.property_amenities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve bloqueios" on public.property_blocks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve calendários" on public.external_calendars
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve passeios" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve mídia" on public.service_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve saídas" on public.departures
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve embarcações" on public.vessels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mvp admin escreve preços" on public.listing_price_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "storage: autenticados enviam mídia" on storage.objects;
drop policy if exists "storage: equipe envia mídia" on storage.objects;
drop policy if exists "storage: dono atualiza" on storage.objects;
drop policy if exists "storage: dono remove" on storage.objects;
drop policy if exists "mvp admin envia mídia" on storage.objects;
drop policy if exists "mvp admin atualiza mídia" on storage.objects;
drop policy if exists "mvp admin remove mídia" on storage.objects;
create policy "mvp admin envia mídia" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "mvp admin atualiza mídia" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "mvp admin remove mídia" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

commit;
