-- Informações comerciais próprias de cada combo. Mantemos o preço-base
-- separado da oferta para que a promoção deixe de valer automaticamente
-- depois da data definida pela equipe.
alter table public.combos
  add column if not exists promo_price_cents integer check (promo_price_cents is null or promo_price_cents >= 0),
  add column if not exists promo_ends_on date,
  add column if not exists price_label text,
  add column if not exists additional_fees text[] not null default '{}'::text[],
  add column if not exists itinerary jsonb not null default '[]'::jsonb,
  add constraint combos_promo_requires_end_date check (
    promo_price_cents is null or promo_ends_on is not null
  );

comment on column public.combos.promo_price_cents is 'Preço promocional do pacote; expira em promo_ends_on.';
comment on column public.combos.promo_ends_on is 'Último dia, inclusive, em que o valor promocional se aplica.';
comment on column public.combos.price_label is 'Complemento comercial do preço, por exemplo: para 2 pessoas.';
comment on column public.combos.additional_fees is 'Taxas e avisos mostrados separadamente do valor do pacote.';
comment on column public.combos.itinerary is 'Lista ordenada de paradas ou etapas exclusivas do combo.';
