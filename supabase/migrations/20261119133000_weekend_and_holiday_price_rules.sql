-- Dias úteis usam o valor-base. Sábado e domingo podem ter uma tarifa recorrente
-- própria; feriados e temporadas continuam sendo regras por data, com prioridade.
alter table public.properties
  add column if not exists weekend_price_cents integer check (weekend_price_cents is null or weekend_price_cents >= 0);

alter table public.services
  add column if not exists weekend_price_cents integer check (weekend_price_cents is null or weekend_price_cents >= 0);

alter table public.combos
  add column if not exists weekend_price_cents integer check (weekend_price_cents is null or weekend_price_cents >= 0);

alter table public.listing_price_rules
  add column if not exists rule_kind text not null default 'seasonal'
    check (rule_kind in ('seasonal', 'holiday', 'special'));

comment on column public.properties.weekend_price_cents is 'Tarifa de sábado e domingo; nulo usa a diária de dias úteis.';
comment on column public.services.weekend_price_cents is 'Tarifa de sábado e domingo; nulo usa o preço padrão.';
comment on column public.combos.weekend_price_cents is 'Tarifa de sábado e domingo; nulo usa o preço padrão.';
comment on column public.listing_price_rules.rule_kind is 'seasonal, holiday ou special; regra de feriado deve ter prioridade maior.';
