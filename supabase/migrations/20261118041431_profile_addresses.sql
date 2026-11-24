alter table public.profiles
  add column if not exists address_postal_code text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state varchar(2);

alter table public.profiles
  add constraint profiles_address_state_check
  check (address_state is null or address_state ~ '^[A-Z]{2}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'customer';
begin
  if new.raw_user_meta_data->>'role' in ('owner','provider') then
    v_role := (new.raw_user_meta_data->>'role')::public.user_role;
  end if;

  insert into public.profiles (
    id, email, full_name, phone, role,
    address_postal_code, address_street, address_number, address_complement,
    address_neighborhood, address_city, address_state
  ) values (
    new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''), v_role,
    nullif(new.raw_user_meta_data->>'address_postal_code', ''),
    nullif(new.raw_user_meta_data->>'address_street', ''),
    nullif(new.raw_user_meta_data->>'address_number', ''),
    nullif(new.raw_user_meta_data->>'address_complement', ''),
    nullif(new.raw_user_meta_data->>'address_neighborhood', ''),
    nullif(new.raw_user_meta_data->>'address_city', ''),
    nullif(upper(new.raw_user_meta_data->>'address_state'), '')
  ) on conflict (id) do nothing;

  return new;
end;
$$;;
