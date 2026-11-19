-- Preço e disponibilidade são camadas independentes. Esta migração não cria
-- bloqueios nem altera a sincronização iCal das hospedagens.

create table public.listing_price_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  price_cents integer not null check (price_cents >= 0),
  label text,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_price_rules_one_listing check ((property_id is not null and service_id is null) or (property_id is null and service_id is not null)),
  constraint listing_price_rules_valid_period check (ends_on is null or ends_on > starts_on)
);

create index listing_price_rules_property_period_idx on public.listing_price_rules(property_id, starts_on, ends_on) where property_id is not null;
create index listing_price_rules_service_period_idx on public.listing_price_rules(service_id, starts_on, ends_on) where service_id is not null;

create or replace function public.prevent_overlapping_listing_price_rules()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from public.listing_price_rules r
    where r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and r.property_id is not distinct from new.property_id
      and r.service_id is not distinct from new.service_id
      and daterange(r.starts_on, r.ends_on, '[)') && daterange(new.starts_on, new.ends_on, '[)')
  ) then raise exception 'PRICE_RULE_OVERLAP'; end if;
  return new;
end;
$$;
create trigger listing_price_rules_no_overlap before insert or update on public.listing_price_rules for each row execute function public.prevent_overlapping_listing_price_rules();
create trigger listing_price_rules_updated_at before update on public.listing_price_rules for each row execute function public.set_updated_at();

-- Hospedagens mantêm valores privados; passeios podem apresentar “a partir de”.
alter table public.properties add column if not exists show_public_prices boolean not null default false;
-- Janela operacional separada do preço e usada só no Barco Premium por enquanto.
alter table public.services add column if not exists booking_available_through date;

alter table public.listing_price_rules enable row level security;
revoke all on table public.listing_price_rules from anon, authenticated;
grant select on table public.listing_price_rules to anon, authenticated;
grant insert, update, delete on table public.listing_price_rules to authenticated;

create policy "price rules public read" on public.listing_price_rules for select to anon using (
  exists (select 1 from public.services s where s.id = service_id and s.status = 'published')
  or exists (select 1 from public.properties p where p.id = property_id and p.status = 'published' and p.show_public_prices)
);
create policy "price rules managers read" on public.listing_price_rules for select to authenticated using (
  public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and public.is_org_member(p.org_id))
  or exists (select 1 from public.services s where s.id = service_id and public.is_org_member(s.org_id))
);
create policy "price rules managers insert" on public.listing_price_rules for insert to authenticated with check (
  public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and public.is_org_member(p.org_id))
  or exists (select 1 from public.services s where s.id = service_id and public.is_org_member(s.org_id))
);
create policy "price rules managers update" on public.listing_price_rules for update to authenticated using (
  public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and public.is_org_member(p.org_id))
  or exists (select 1 from public.services s where s.id = service_id and public.is_org_member(s.org_id))
) with check (
  public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and public.is_org_member(p.org_id))
  or exists (select 1 from public.services s where s.id = service_id and public.is_org_member(s.org_id))
);
create policy "price rules managers delete" on public.listing_price_rules for delete to authenticated using (
  public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and public.is_org_member(p.org_id))
  or exists (select 1 from public.services s where s.id = service_id and public.is_org_member(s.org_id))
);

-- Regras iniciais: fim exclusivo evita sobreposição (06/01 não é reservável).
update public.services
set booking_available_through = date '2027-01-05',
    price_per_person_cents = 13000,
    included = case when included @> '["Almoço incluso"]'::jsonb then included else included || '["Almoço incluso"]'::jsonb end
where slug = 'passeio-de-barco-premium-com-almoco-incluso-q7yt';

insert into public.listing_price_rules (service_id, starts_on, ends_on, price_cents, label, details)
select id, date '2026-11-01', date '2026-12-26', 13000, 'Até 25 de dezembro', 'Com almoço incluso'
from public.services where slug = 'passeio-de-barco-premium-com-almoco-incluso-q7yt';
insert into public.listing_price_rules (service_id, starts_on, ends_on, price_cents, label, details)
select id, date '2026-12-26', date '2027-01-06', 18000, '26 de dezembro a 5 de janeiro', 'Com almoço incluso'
from public.services where slug = 'passeio-de-barco-premium-com-almoco-incluso-q7yt';

revoke all on function public.prevent_overlapping_listing_price_rules() from public, anon, authenticated;
