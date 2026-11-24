-- Políticas ADICIONAIS (permissivas, somem com as existentes): só administradores.
create policy "orgs: admin cria" on public.organizations
  for insert to authenticated with check (public.is_admin());

create policy "membros: admin vincula" on public.organization_members
  for insert to authenticated with check (public.is_admin());

create policy "prestador: admin cria" on public.provider_profiles
  for insert to authenticated with check (public.is_admin());

create policy "imóveis: admin cria" on public.properties
  for insert to authenticated with check (public.is_admin());

create policy "passeios: admin cria" on public.services
  for insert to authenticated with check (public.is_admin());

-- Reserva criada pelo painel, em nome de um cliente (ou do próprio admin, se p_customer_id for nulo).
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
grant execute on function public.admin_create_booking(booking_kind, uuid, uuid, integer, integer, date, date, uuid, text, text, boolean) to authenticated;;
