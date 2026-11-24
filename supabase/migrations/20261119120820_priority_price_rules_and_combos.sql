drop trigger if exists listing_price_rules_no_overlap on public.listing_price_rules;
drop function if exists public.prevent_overlapping_listing_price_rules();
alter table public.listing_price_rules add column if not exists combo_id uuid references public.combos(id) on delete cascade, add column if not exists priority integer not null default 0 check (priority >= 0);
alter table public.listing_price_rules drop constraint if exists listing_price_rules_one_listing, add constraint listing_price_rules_one_listing check ((property_id is not null and service_id is null and combo_id is null) or (property_id is null and service_id is not null and combo_id is null) or (property_id is null and service_id is null and combo_id is not null));
create index if not exists listing_price_rules_combo_period_idx on public.listing_price_rules(combo_id, starts_on, ends_on) where combo_id is not null;
drop policy if exists "price rules public read" on public.listing_price_rules;
create policy "price rules public read" on public.listing_price_rules for select to anon, authenticated using (exists (select 1 from public.services s where s.id = service_id and s.status = 'published') or exists (select 1 from public.properties p where p.id = property_id and p.status = 'published' and p.show_public_prices) or exists (select 1 from public.combos c where c.id = combo_id and c.status = 'published'));;
