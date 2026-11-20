-- ============================================================================
-- VIVIANTOURR — Seed de dados de referência
-- Executar no SQL Editor do Supabase APÓS a migração 0001_init.sql
-- ============================================================================

-- CATEGORIAS — HOSPEDAGENS ----------------------------------------------------
insert into public.categories (slug, label, kind, icon, sort) values
  ('casa',           'Casa',              'stay', 'home',     1),
  ('apartamento',    'Apartamento',       'stay', 'building', 2),
  ('cobertura',      'Cobertura',         'stay', 'building', 3),
  ('pousada',        'Pousada',           'stay', 'home',     4),
  ('loft',           'Loft',              'stay', 'home',     5),
  ('flat-pe-na-areia','Flat pé na areia', 'stay', 'waves',    6)
on conflict (slug) do nothing;

-- CATEGORIAS — PASSEIOS E EXPERIÊNCIAS ----------------------------------------
insert into public.categories (slug, label, kind, icon, sort) values
  ('passeio-de-barco',  'Passeio de barco',      'tour', 'sailboat',   10),
  ('escuna',            'Passeio de escuna',     'tour', 'sailboat',   11),
  ('mergulho',          'Mergulho',              'tour', 'droplet',    12),
  ('experiencia-nautica','Experiência náutica',  'tour', 'compass',    13),
  ('bate-e-volta',      'Bate e volta',          'tour', 'bus',        14),
  ('city-tour',         'City tour',             'tour', 'map',        15),
  ('pesca-esportiva',   'Pesca esportiva',       'tour', 'fish',       15),
  ('quadriciclo',       'Quadriciclo',           'tour', 'mountain',   16),
  ('jet-ski-casal',     'Jet ski casal',         'tour', 'waves',      17),
  ('jet-ski-individual','Jet ski individual',    'tour', 'waves',      18),
  ('buggy-arubinha',    'Buggy Arubinha',        'tour', 'car',        19),
  ('buggy-arraial-do-cabo', 'Buggy Arraial do Cabo', 'tour', 'car',     20),
  ('paramotor',         'Paramotor',             'tour', 'wind',       21),
  ('mergulho-de-cilindro', 'Mergulho de cilindro','tour', 'droplet',    22)
on conflict (slug) do nothing;

-- COMODIDADES -----------------------------------------------------------------
insert into public.amenities (key, label, icon, kind, sort) values
  ('wifi',             'Wi-Fi',                    'wifi',           'stay', 1),
  ('ar_condicionado',  'Ar-condicionado',          'wind',           'stay', 2),
  ('cozinha',          'Cozinha equipada',         'cooking',        'stay', 3),
  ('piscina',          'Piscina',                  'waves',          'stay', 4),
  ('churrasqueira',    'Churrasqueira',            'flame',          'stay', 5),
  ('estacionamento',   'Estacionamento',           'car',            'stay', 6),
  ('vista_mar',        'Vista para o mar',         'eye',            'stay', 7),
  ('varanda',          'Varanda',                  'sun',            'stay', 8),
  ('maquina_lavar',    'Máquina de lavar',         'washing',        'stay', 9),
  ('tv_streaming',     'Smart TV com streaming',   'tv',             'stay', 10),
  ('berco_bebe',       'Berço para bebê',          'baby',           'stay', 11),
  ('aceita_pets',      'Aceita pets',              'paw',            'stay', 12),
  ('acessivel',        'Acessível',                'accessibility',  'stay', 13),
  ('roupa_cama',       'Roupa de cama e banho',    'bed',            'stay', 14),
  ('praia_proxima',    'Praia a poucos passos',    'umbrella',       'stay', 15)
on conflict (key) do nothing;

-- COMISSÃO PADRÃO (editável no painel admin em fases futuras) -----------------
insert into public.platform_settings (key, value) values
  ('commission_default', '{"percent": 10, "fixed_cents": 0}')
on conflict (key) do nothing;

insert into public.commission_rules (scope, percent, fixed_cents, active)
values ('global', 10.00, 0, true)
on conflict do nothing;

-- ============================================================================
-- PROMOÇÃO DO PRIMEIRO ADMINISTRADOR
-- Depois de criar sua conta pelo site (/cadastro), rode:
--
-- update public.profiles
--    set role = 'admin'
--  where email = 'seu-email@exemplo.com';
-- ============================================================================
