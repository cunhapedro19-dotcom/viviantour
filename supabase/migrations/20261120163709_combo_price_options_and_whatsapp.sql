alter table public.combos
  add column if not exists price_options jsonb not null default '[]'::jsonb,
  add column if not exists booking_whatsapp text;

comment on column public.combos.price_options is 'Opções de preço do combo: [{label, priceCents}].';
comment on column public.combos.booking_whatsapp is 'WhatsApp específico para reservas deste combo; vazio usa o contato geral.';;
