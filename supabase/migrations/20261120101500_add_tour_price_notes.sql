-- Taxas e condições apresentadas junto ao preço de cada passeio.
alter table public.services
  add column if not exists price_notes jsonb not null default '[]'::jsonb
  check (jsonb_typeof(price_notes) = 'array');
