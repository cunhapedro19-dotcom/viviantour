-- 0005 · Painel administrativo: permissões e cadastros feitos pelo admin
-- (já aplicada no projeto Supabase viviantourr; este arquivo mantém o repositório reproduzível)

-- ---------------------------------------------------------------------------
-- 1) Funções usadas dentro das policies de RLS precisam de EXECUTE para quem
--    consulta as tabelas. Sem isso, qualquer leitura de `profiles` falhava com
--    "permission denied for function is_admin" e o painel mostrava "Acesso restrito".
-- ---------------------------------------------------------------------------
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_org_member(uuid) to authenticated, anon;
grant execute on function public.my_org_ids() to authenticated, anon;
grant execute on function public.can_join_org(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Só administradores podem alterar o papel (`role`) de um perfil.
--    Antes, qualquer usuário logado conseguia se promover a admin pela API.
--    auth.uid() é nulo no SQL Editor / service role, então esses continuam livres.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o papel de um perfil'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke insert, update, delete on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- 3) Políticas ADICIONAIS (permissivas) para o admin cadastrar fornecedores e anúncios
-- ---------------------------------------------------------------------------
drop policy if exists "orgs: admin cria" on public.organizations;
create policy "orgs: admin cria" on public.organizations
  for insert to authenticated with check (public.is_admin());

drop policy if exists "membros: admin vincula" on public.organization_members;
create policy "membros: admin vincula" on public.organization_members
  for insert to authenticated with check (public.is_admin());

drop policy if exists "prestador: admin cria" on public.provider_profiles;
create policy "prestador: admin cria" on public.provider_profiles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "imóveis: admin cria" on public.properties;
create policy "imóveis: admin cria" on public.properties
  for insert to authenticated with check (public.is_admin());

drop policy if exists "passeios: admin cria" on public.services;
create policy "passeios: admin cria" on public.services
  for insert to authenticated with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) Reserva criada pelo painel, em nome de um cliente
--    (ou do próprio admin, se p_customer_id for nulo).
--    Com p_auto_confirm = true, confirma na hora via respond_booking.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_booking(
  p_kind          booking_kind,
  p_property_id   uuid    default null,
  p_departure_id  uuid    default null,
  p_adults        integer default 1,
  p_children      integer default 0,
  p_check_in      date    default null,
  p_check_out     date    default null,
  p_customer_id   uuid    default null,
  p_customer_note text    default null,
  p_contact_phone text    default null,
  p_auto_confirm  boolean default false
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer   uuid := coalesce(p_customer_id, auth.uid());
  v_guests     int;
  v_prop       public.properties;
  v_serv       public.services;
  v_dep        public.departures;
  v_nights     int;
  v_total      int;
  v_booking_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  if not exists (select 1 from public.profiles where id = v_customer) then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  v_guests := p_adults + greatest(coalesce(p_children, 0), 0);
  if v_guests < 1 then raise exception 'INVALID_GUESTS'; end if;

  if p_kind = 'stay' then
    if p_property_id is null or p_check_in is null or p_check_out is null then
      raise exception 'MISSING_FIELDS';
    end if;
    if p_check_out <= p_check_in then raise exception 'INVALID_DATES'; end if;

    select * into v_prop from public.properties where id = p_property_id;
    if v_prop.id is null then raise exception 'PROPERTY_NOT_FOUND'; end if;

    v_nights := (p_check_out - p_check_in);
    if v_nights < v_prop.min_nights then raise exception 'MIN_NIGHTS'; end if;
    if v_guests > v_prop.capacity then raise exception 'CAPACITY_EXCEEDED'; end if;

    perform pg_advisory_xact_lock(hashtextextended('property:' || p_property_id::text, 0));
    if not public.fn_property_is_available(p_property_id, p_check_in, p_check_out) then
      raise exception 'NOT_AVAILABLE';
    end if;

    v_total := v_nights * v_prop.base_price_cents + coalesce(v_prop.cleaning_fee_cents, 0);

    insert into public.bookings (
      kind, org_id, property_id, customer_id, status,
      adults, children, guests_total, check_in, check_out, nights,
      total_cents, cleaning_fee_cents, customer_note, contact_phone
    ) values (
      'stay', v_prop.org_id, p_property_id, v_customer, 'pending',
      p_adults, coalesce(p_children, 0), v_guests, p_check_in, p_check_out, v_nights,
      v_total, coalesce(v_prop.cleaning_fee_cents, 0), p_customer_note, p_contact_phone
    ) returning id into v_booking_id;

  elsif p_kind = 'tour' then
    if p_departure_id is null then raise exception 'MISSING_FIELDS'; end if;

    select * into v_dep from public.departures where id = p_departure_id for update;
    if v_dep.id is null then raise exception 'DEPARTURE_NOT_FOUND'; end if;
    if v_dep.status <> 'open' then raise exception 'DEPARTURE_UNAVAILABLE'; end if;
    if v_dep.starts_at < now() then raise exception 'DEPARTURE_PAST'; end if;

    select * into v_serv from public.services where id = v_dep.service_id;
    if v_serv.id is null then raise exception 'SERVICE_NOT_FOUND'; end if;

    if v_guests > (v_dep.capacity - v_dep.seats_booked) then raise exception 'NO_SEATS'; end if;

    v_total := v_guests * coalesce(v_dep.price_override_cents, v_serv.price_per_person_cents);

    insert into public.bookings (
      kind, org_id, service_id, departure_id, customer_id, status,
      adults, children, guests_total, starts_at, ends_at,
      total_cents, customer_note, contact_phone
    ) values (
      'tour', v_serv.org_id, v_serv.id, v_dep.id, v_customer, 'pending',
      p_adults, coalesce(p_children, 0), v_guests, v_dep.starts_at, v_dep.ends_at,
      v_total, p_customer_note, p_contact_phone
    ) returning id into v_booking_id;

  else
    raise exception 'INVALID_KIND';
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
  values (auth.uid(), 'booking.admin_created', 'booking', v_booking_id,
          jsonb_build_object('customer_id', v_customer, 'auto_confirm', p_auto_confirm));

  if p_auto_confirm then
    perform public.respond_booking(v_booking_id, 'accept');
  end if;

  return v_booking_id;
end $$;

revoke execute on function public.admin_create_booking(booking_kind, uuid, uuid, integer, integer, date, date, uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_create_booking(booking_kind, uuid, uuid, integer, integer, date, date, uuid, text, text, boolean) to authenticated;
