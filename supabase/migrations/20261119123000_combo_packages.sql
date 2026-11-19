-- Pacotes montados pela equipe Viviantourr: passeios entre si e/ou hospedagem.
create table public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  status public.listing_status not null default 'draft',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  sort integer not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  constraint combo_items_one_listing check ((property_id is not null and service_id is null) or (property_id is null and service_id is not null)),
  unique (combo_id, property_id),
  unique (combo_id, service_id)
);

create index combo_items_combo_sort_idx on public.combo_items(combo_id, sort);
create trigger combos_updated_at before update on public.combos for each row execute function public.set_updated_at();

alter table public.combos enable row level security;
alter table public.combo_items enable row level security;
revoke all on table public.combos, public.combo_items from anon, authenticated;
grant select on table public.combos, public.combo_items to anon, authenticated;
grant insert, update, delete on table public.combos, public.combo_items to authenticated;

create policy "combos public read" on public.combos for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "combos admin write" on public.combos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "combo items public read" on public.combo_items for select to anon, authenticated using (exists (select 1 from public.combos c where c.id = combo_id and (c.status = 'published' or public.is_admin())));
create policy "combo items admin write" on public.combo_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
