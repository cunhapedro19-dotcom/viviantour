-- Passeios podem ter valor individual ou um valor fechado para um grupo.
-- O nome legado da coluna de preco foi mantido para nao quebrar integracoes existentes.
alter table public.services
  add column if not exists price_mode text not null default 'per_person'
    check (price_mode in ('per_person', 'per_group')),
  add column if not exists price_group_size integer
    check (price_group_size is null or price_group_size > 0);

alter table public.services
  drop constraint if exists services_group_price_requires_size,
  add constraint services_group_price_requires_size check (
    (price_mode = 'per_person' and price_group_size is null)
    or (price_mode = 'per_group' and price_group_size is not null)
  );

-- Mantem o total das reservas coerente para solicitacoes do cliente
-- e reservas lancadas pela administracao.
create or replace function public.apply_tour_price_mode_to_booking()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_service public.services;
  v_departure public.departures;
  v_price integer;
begin
  if new.kind <> 'tour' or new.service_id is null then
    return new;
  end if;

  select * into v_service from public.services where id = new.service_id;
  if v_service.id is null then
    return new;
  end if;

  if v_service.price_mode = 'per_group'
     and new.guests_total > coalesce(v_service.price_group_size, 0) then
    raise exception 'GROUP_SIZE_EXCEEDED';
  end if;

  v_price := v_service.price_per_person_cents;
  if new.departure_id is not null then
    select * into v_departure from public.departures where id = new.departure_id;
    v_price := coalesce(v_departure.price_override_cents, v_price);
  end if;

  new.total_cents := case
    when v_service.price_mode = 'per_group' then v_price
    else new.guests_total * v_price
  end;

  return new;
end;
$$;

drop trigger if exists bookings_apply_tour_price_mode on public.bookings;
create trigger bookings_apply_tour_price_mode
before insert or update of service_id, departure_id, guests_total on public.bookings
for each row execute function public.apply_tour_price_mode_to_booking();

revoke all on function public.apply_tour_price_mode_to_booking() from public, anon, authenticated;
