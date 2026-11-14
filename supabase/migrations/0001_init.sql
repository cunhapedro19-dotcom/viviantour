-- ============================================================================
-- VIVIANTOURR — Migração inicial
-- Marketplace de turismo multi-fornecedor — Arraial do Cabo / RJ
--
-- Conteúdo:
--   1. Extensões
--   2. Enums
--   3. Tabelas + constraints + índices
--   4. Funções auxiliares de acesso (RBAC)
--   5. Triggers (profiles automáticos, updated_at)
--   6. RPCs de reserva (controle de concorrência)
--   7. Disponibilidade (reservas + bloqueios + eventos iCal)
--   8. Row Level Security (isolamento multi-tenant)
--   9. Storage
--
-- Executar no SQL Editor do Supabase (guia no README).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSÕES
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;     -- gen_random_uuid()
create extension if not exists btree_gist;   -- exclusion constraints (uuid + ranges)
create extension if not exists pg_trgm;      -- busca textual (ilike acelerado)

-- ---------------------------------------------------------------------------
-- 2. ENUMS
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'owner', 'provider', 'customer');
create type public.org_kind as enum ('host', 'operator');
create type public.org_status as enum ('pending', 'active', 'suspended', 'rejected');
create type public.listing_status as enum ('draft', 'pending_review', 'published', 'rejected', 'paused');
create type public.booking_status as enum ('pending', 'awaiting_payment', 'confirmed', 'declined', 'cancelled', 'completed');
create type public.booking_kind as enum ('stay', 'tour');
create type public.departure_status as enum ('open', 'blocked', 'cancelled');

-- ---------------------------------------------------------------------------
-- 3. TABELAS
-- ---------------------------------------------------------------------------

-- PERFIS --------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text,
  avatar_url  text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ORGANIZAÇÕES (perfil comercial de fornecedores: hospedagens ou operações) --
create table public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  kind                   public.org_kind not null default 'host',
  status                 public.org_status not null default 'pending',
  bio                    text,
  logo_url               text,
  cover_url              text,
  city                   text not null default 'Arraial do Cabo',
  state                  text not null default 'RJ',
  phone                  text,
  whatsapp               text,
  email                  text,
  document_type          text check (document_type in ('cpf','cnpj')),
  document_number        text,
  commission_override_pct numeric(5,2),
  created_by             uuid references public.profiles (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  member_role     text not null default 'owner' check (member_role in ('owner','manager','staff')),
  created_at      timestamptz not null default now(),
  unique (organization_id, profile_id)
);

-- PERFIL DE PRESTADOR (guias, operadores náuticos, experiências) -------------
create table public.provider_profiles (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null unique references public.profiles (id) on delete cascade,
  org_id         uuid references public.organizations (id) on delete set null,
  display_name   text,
  specialty      text,
  bio            text,
  languages      text[] not null default '{}',
  license_number text,
  verified       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- CATEGORIAS -----------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  kind        text not null check (kind in ('stay','tour')),
  description text,
  icon        text,
  sort        int not null default 0,
  active      boolean not null default true
);

create table public.amenities (
  id    uuid primary key default gen_random_uuid(),
  key   text not null unique,
  label text not null,
  icon  text,
  kind  text not null default 'stay' check (kind in ('stay','tour')),
  sort  int not null default 0
);

-- HOSPEDAGENS ----------------------------------------------------------------
create table public.properties (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id),
  owner_id           uuid not null references public.profiles (id),
  category_id        uuid references public.categories (id),
  name               text not null,
  slug               text not null unique,
  summary            text,
  description        text,
  address            text,
  neighborhood       text,
  city               text not null default 'Arraial do Cabo',
  state              text not null default 'RJ',
  zip                text,
  lat                numeric(9,6),
  lng                numeric(9,6),
  capacity           int not null default 2 check (capacity > 0),
  bedrooms           int not null default 1,
  bathrooms          numeric(3,1) not null default 1,
  base_price_cents   int not null default 0 check (base_price_cents >= 0),
  cleaning_fee_cents int not null default 0,
  min_nights         int not null default 1,
  rules              text,
  check_in_time      time not null default '14:00',
  check_out_time     time not null default '11:00',
  status             public.listing_status not null default 'draft',
  rating_avg         numeric(3,2) not null default 0,
  reviews_count      int not null default 0,
  cover_url          text,
  feed_token         uuid not null default gen_random_uuid() unique, -- feed iCal de saída
  rejection_reason   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.property_photos (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  url         text not null,
  alt         text,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id  uuid not null references public.amenities (id) on delete cascade,
  primary key (property_id, amenity_id)
);

create table public.property_blocks (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  start_date  date not null,
  end_date    date not null, -- exclusivo: noite de check-out livre
  reason      text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  check (end_date > start_date)
);

-- CALENDÁRIOS EXTERNOS (iCal) — URLs privadas, nunca expostas publicamente ---
create table public.external_calendars (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties (id) on delete cascade,
  source          text not null default 'airbnb' check (source in ('airbnb','vrbo','booking','other')),
  label           text,
  ical_url        text not null,
  active          boolean not null default true,
  last_synced_at  timestamptz,
  last_status     text,        -- ok | error
  last_error      text,
  created_at      timestamptz not null default now()
);

create table public.calendar_events (
  id                  uuid primary key default gen_random_uuid(),
  external_calendar_id uuid not null references public.external_calendars (id) on delete cascade,
  uid                 text not null,
  summary             text,
  starts_at           timestamptz,
  ends_at             timestamptz,
  all_day             boolean not null default true,
  status              text not null default 'confirmed',
  created_at          timestamptz not null default now(),
  unique (external_calendar_id, uid)
);

-- EMBARCAÇÕES ----------------------------------------------------------------
create table public.vessels (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id),
  name        text not null,
  vessel_type text,
  capacity    int,
  length_m    numeric(5,2),
  description text,
  photos      jsonb not null default '[]',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- PASSEIOS / EXPERIÊNCIAS ----------------------------------------------------
create table public.services (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organizations (id),
  provider_profile_id    uuid references public.provider_profiles (id) on delete set null,
  category_id            uuid references public.categories (id),
  vessel_id              uuid references public.vessels (id) on delete set null,
  kind                   text not null default 'boat_tour' check (kind in ('boat_tour','experience','guide')),
  name                   text not null,
  slug                   text not null unique,
  summary                text,
  description            text,
  duration_minutes       int not null default 60,
  meeting_point          text,
  itinerary              jsonb not null default '[]',   -- [{ "order": 1, "title": "...", "description": "..." }]
  included               jsonb not null default '[]',   -- ["Equipamento de mergulho", ...]
  requirements           text,
  price_per_person_cents int not null default 0 check (price_per_person_cents >= 0),
  child_price_cents      int,
  min_guests             int not null default 1,
  max_guests             int,
  status                 public.listing_status not null default 'draft',
  rating_avg             numeric(3,2) not null default 0,
  reviews_count          int not null default 0,
  cover_url              text,
  rejection_reason       text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.service_media (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  url        text not null,
  type       text not null default 'image' check (type in ('image','video')),
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

-- SAÍDAS OPERACIONAIS (agenda dos passeios) ----------------------------------
create table public.departures (
  id                   uuid primary key default gen_random_uuid(),
  service_id           uuid not null references public.services (id) on delete cascade,
  starts_at            timestamptz not null,
  ends_at              timestamptz,
  capacity             int not null default 10 check (capacity > 0),
  seats_booked         int not null default 0,
  status               public.departure_status not null default 'open',
  price_override_cents int,
  created_at           timestamptz not null default now(),
  unique (service_id, starts_at),
  check (seats_booked >= 0),
  check (seats_booked <= capacity)
);

-- RESERVAS -------------------------------------------------------------------
create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique default ('VT-' || upper(substr(md5(random()::text), 1, 8))),
  kind                public.booking_kind not null,
  org_id              uuid not null references public.organizations (id),
  property_id         uuid references public.properties (id) on delete set null,
  service_id          uuid references public.services (id) on delete set null,
  departure_id        uuid references public.departures (id) on delete set null,
  customer_id         uuid not null references public.profiles (id),
  status              public.booking_status not null default 'pending',
  adults              int not null default 1,
  children            int not null default 0,
  guests_total        int not null default 1,
  check_in            date,
  check_out           date,
  nights              int,
  starts_at           timestamptz,
  ends_at             timestamptz,
  total_cents         int not null default 0,
  cleaning_fee_cents  int not null default 0,
  commission_cents    int not null default 0,
  net_cents           int not null default 0,
  currency            char(3) not null default 'BRL',
  customer_note       text,
  provider_note       text,
  contact_phone       text,
  cancellation_reason text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  confirmed_at        timestamptz,
  declined_at         timestamptz,
  cancelled_at        timestamptz,
  completed_at        timestamptz,
  -- duas reservas confirmadas nunca podem se sobrepor na mesma hospedagem
  constraint bookings_no_overlap_stays
    exclude using gist (
      property_id with =,
      daterange(check_in, check_out, '[)') with &&
    ) where (kind = 'stay' and status in ('confirmed','awaiting_payment') and property_id is not null)
);

create table public.booking_guests (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  full_name  text not null,
  document   text,
  birth_date date,
  type       text not null default 'adult' check (type in ('adult','child'))
);

-- FINANCEIRO (sem gateway nesta fase — estrutura pronta) ---------------------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  method       text,
  status       text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  amount_cents int not null default 0,
  provider     text,
  provider_ref text,
  raw          jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.commission_rules (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null check (scope in ('global','category','org')),
  category_id uuid references public.categories (id),
  org_id      uuid references public.organizations (id),
  percent     numeric(5,2) not null default 10,
  fixed_cents int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- apenas uma regra global ativa / uma regra por categoria / por organização
create unique index commission_rules_global_uniq on public.commission_rules (scope) where active and scope = 'global';
create unique index commission_rules_category_uniq on public.commission_rules (category_id) where active and scope = 'category' and category_id is not null;
create unique index commission_rules_org_uniq on public.commission_rules (org_id) where active and scope = 'org' and org_id is not null;

create table public.commissions (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  rule_id     uuid references public.commission_rules (id),
  percent     numeric(5,2) not null,
  fixed_cents int not null default 0,
  amount_cents int not null default 0,
  net_cents   int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.payouts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id),
  period_start    date not null,
  period_end      date not null,
  gross_cents     int not null default 0,
  commission_cents int not null default 0,
  net_cents       int not null default 0,
  status          text not null default 'pending' check (status in ('pending','processing','paid','failed')),
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);

-- AVALIAÇÕES / FAVORITOS / NOTIFICAÇÕES --------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  service_id  uuid references public.services (id) on delete cascade,
  org_id      uuid not null references public.organizations (id),
  author_id   uuid not null references public.profiles (id),
  rating      int not null check (rating between 1 and 5),
  title       text,
  comment     text,
  reply       text,
  reply_at    timestamptz,
  status      text not null default 'published' check (status in ('pending','published','hidden')),
  created_at  timestamptz not null default now()
);

create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  service_id  uuid references public.services (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (profile_id, property_id),
  unique (profile_id, service_id)
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type       text not null default 'system',
  title      text not null,
  body       text,
  data       jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id),
  action     text not null,
  entity     text,
  entity_id  uuid,
  data       jsonb,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------
create index properties_status_city_idx  on public.properties (status, city);
create index properties_org_idx          on public.properties (org_id);
create index property_photos_prop_idx    on public.property_photos (property_id, sort);
create index services_status_idx         on public.services (status);
create index services_org_idx            on public.services (org_id);
create index departures_service_idx      on public.departures (service_id, starts_at);
create index bookings_customer_idx       on public.bookings (customer_id, status);
create index bookings_org_idx            on public.bookings (org_id, status);
create index bookings_property_idx       on public.bookings (property_id, status);
create index bookings_departure_idx      on public.bookings (departure_id);
create index calendar_events_range_idx   on public.calendar_events (external_calendar_id, starts_at, ends_at);
create index external_calendars_due_idx  on public.external_calendars (active, last_synced_at);
create index notifications_profile_idx   on public.notifications (profile_id, read_at);
create index reviews_property_idx        on public.reviews (property_id, status);
create index reviews_service_idx         on public.reviews (service_id, status);
create index properties_name_trgm_idx    on public.properties using gin (name gin_trgm_ops);
create index services_name_trgm_idx      on public.services using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. FUNÇÕES AUXILIARES (RBAC)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org and profile_id = auth.uid()
  );
$$;

create or replace function public.my_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members
  where profile_id = auth.uid();
$$;

-- permite ao fundador entrar na própria organização sem recursão de RLS
create or replace function public.can_join_org(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or public.is_org_member(p_org)
      or not exists (
        select 1 from public.organization_members
        where organization_id = p_org
      );
$$;

-- ---------------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'customer';
begin
  if new.raw_user_meta_data->>'role' in ('owner','provider') then
    v_role := (new.raw_user_meta_data->>'role')::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger properties_updated_at    before update on public.properties    for each row execute function public.set_updated_at();
create trigger services_updated_at      before update on public.services      for each row execute function public.set_updated_at();
create trigger bookings_updated_at      before update on public.bookings      for each row execute function public.set_updated_at();
create trigger payments_updated_at      before update on public.payments      for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. DISPONIBILIDADE
-- ---------------------------------------------------------------------------
-- Regra: uma data está ocupada se houver (a) reserva confirmada/aguardando
-- pagamento, (b) bloqueio manual ou (c) evento de calendário externo (iCal).
create or replace function public.fn_property_is_available(p_property uuid, p_from date, p_to date)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.bookings b
    where b.property_id = p_property
      and b.kind = 'stay'
      and b.status in ('confirmed','awaiting_payment')
      and daterange(b.check_in, b.check_out, '[)') && daterange(p_from, p_to, '[)')
  ) and not exists (
    select 1 from public.property_blocks pb
    where pb.property_id = p_property
      and daterange(pb.start_date, pb.end_date, '[)') && daterange(p_from, p_to, '[)')
  ) and not exists (
    select 1
    from public.calendar_events ce
    join public.external_calendars ec on ec.id = ce.external_calendar_id
    where ec.property_id = p_property
      and ec.active
      and ce.status <> 'cancelled'
      and daterange(
            (ce.starts_at at time zone 'America/Sao_Paulo')::date,
            (ce.ends_at   at time zone 'America/Sao_Paulo')::date, '[)'
          ) && daterange(p_from, p_to, '[)')
  );
$$;

-- consulta pública para o calendário da página do anúncio
create or replace function public.check_property_availability(p_property uuid, p_from date, p_to date)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.fn_property_is_available(p_property, p_from, p_to);
$$;

-- mapa de disponibilidade dia a dia (usado pelo calendário do anúncio)
create or replace function public.get_property_blocked_dates(p_property uuid, p_from date, p_to date)
returns table (day date, available boolean)
language sql stable security definer set search_path = public as $$
  select
    d::date as day,
    public.fn_property_is_available(p_property, d::date, (d + interval '1 day')::date) as available
  from generate_series(p_from, p_to, interval '1 day') d;
$$;

grant execute on function public.get_property_blocked_dates to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPCs DE RESERVA (com controle de concorrência)
-- ---------------------------------------------------------------------------

-- Cliente envia solicitação ---------------------------------------------------
create or replace function public.create_booking_request(
  p_kind          public.booking_kind,
  p_property_id   uuid default null,
  p_service_id    uuid default null,   -- informativo; a vaga vem da saída
  p_departure_id  uuid default null,
  p_adults        int default 1,
  p_children      int default 0,
  p_check_in      date default null,
  p_check_out     date default null,
  p_customer_note text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_guests int;
  v_prop   public.properties;
  v_serv   public.services;
  v_dep    public.departures;
  v_nights int;
  v_total  int;
  v_org    uuid;
  v_code   text;
  v_booking_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_guests := p_adults + greatest(coalesce(p_children, 0), 0);
  if v_guests < 1 then raise exception 'INVALID_GUESTS'; end if;

  if p_kind = 'stay' then
    if p_property_id is null or p_check_in is null or p_check_out is null then
      raise exception 'MISSING_FIELDS';
    end if;
    if p_check_out <= p_check_in then raise exception 'INVALID_DATES'; end if;

    select * into v_prop from public.properties
      where id = p_property_id and status = 'published';
    if v_prop.id is null then raise exception 'PROPERTY_NOT_FOUND'; end if;

    v_nights := (p_check_out - p_check_in);
    if v_nights < v_prop.min_nights then raise exception 'MIN_NIGHTS'; end if;
    if v_guests > v_prop.capacity then raise exception 'CAPACITY_EXCEEDED'; end if;

    -- trava de concorrência por imóvel
    perform pg_advisory_xact_lock(hashtextextended('property:' || p_property_id::text, 0));

    if not public.fn_property_is_available(p_property_id, p_check_in, p_check_out) then
      raise exception 'NOT_AVAILABLE';
    end if;

    v_total := v_nights * v_prop.base_price_cents + coalesce(v_prop.cleaning_fee_cents, 0);
    v_org   := v_prop.org_id;

    insert into public.bookings (
      kind, org_id, property_id, customer_id, status,
      adults, children, guests_total, check_in, check_out, nights,
      total_cents, cleaning_fee_cents, customer_note, contact_phone
    ) values (
      'stay', v_org, p_property_id, auth.uid(), 'pending',
      p_adults, coalesce(p_children,0), v_guests, p_check_in, p_check_out, v_nights,
      v_total, coalesce(v_prop.cleaning_fee_cents, 0), p_customer_note, p_contact_phone
    ) returning id, code into v_booking_id, v_code;

  elsif p_kind = 'tour' then
    if p_departure_id is null then raise exception 'MISSING_FIELDS'; end if;

    select * into v_dep from public.departures where id = p_departure_id for update;
    if v_dep.id is null then raise exception 'DEPARTURE_NOT_FOUND'; end if;
    if v_dep.status <> 'open' then raise exception 'DEPARTURE_UNAVAILABLE'; end if;
    if v_dep.starts_at < now() then raise exception 'DEPARTURE_PAST'; end if;

    select * into v_serv from public.services
      where id = v_dep.service_id and status = 'published';
    if v_serv.id is null then raise exception 'SERVICE_NOT_FOUND'; end if;

    if v_guests > (v_dep.capacity - v_dep.seats_booked) then
      raise exception 'NO_SEATS';
    end if;

    v_total := v_guests * coalesce(v_dep.price_override_cents, v_serv.price_per_person_cents);
    v_org   := v_serv.org_id;

    insert into public.bookings (
      kind, org_id, service_id, departure_id, customer_id, status,
      adults, children, guests_total, starts_at, ends_at,
      total_cents, customer_note, contact_phone
    ) values (
      'tour', v_org, v_serv.id, v_dep.id, auth.uid(), 'pending',
      p_adults, coalesce(p_children,0), v_guests, v_dep.starts_at, v_dep.ends_at,
      v_total, p_customer_note, p_contact_phone
    ) returning id, code into v_booking_id, v_code;

  else
    raise exception 'INVALID_KIND';
  end if;

  -- notifica os membros da organização
  insert into public.notifications (profile_id, type, title, body, data)
  select om.profile_id, 'booking',
         'Nova solicitação de reserva',
         'Código ' || v_code || ' — aguardando sua resposta.',
         jsonb_build_object('booking_id', v_booking_id)
  from public.organization_members om
  where om.organization_id = v_org;

  insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (auth.uid(), 'booking.requested', 'booking', v_booking_id);

  return v_booking_id;
end $$;

-- Fornecedor aceita/recusa ----------------------------------------------------
create or replace function public.respond_booking(
  p_booking_id uuid,
  p_action     text,               -- 'accept' | 'decline'
  p_reason     text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_dep     public.departures;
  v_rule    public.commission_rules;
  v_default numeric;
  v_pct     numeric;
  v_fixed   int;
  v_comm    int;
  v_net     int;
  v_cat     uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'NOT_FOUND'; end if;

  if not (public.is_admin() or public.is_org_member(v_booking.org_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status <> 'pending' then raise exception 'INVALID_STATUS'; end if;

  if p_action = 'accept' then
    if v_booking.kind = 'stay' then
      if not public.fn_property_is_available(v_booking.property_id, v_booking.check_in, v_booking.check_out) then
        raise exception 'NOT_AVAILABLE';
      end if;
    else
      select * into v_dep from public.departures where id = v_booking.departure_id for update;
      if v_dep.id is null or v_dep.status <> 'open' then raise exception 'DEPARTURE_UNAVAILABLE'; end if;
      if (v_dep.capacity - v_dep.seats_booked) < v_booking.guests_total then
        raise exception 'NO_SEATS';
      end if;
      update public.departures
        set seats_booked = seats_booked + v_booking.guests_total
        where id = v_dep.id;
    end if;

    -- comissão: regra da organização > categoria > global
    select category_id into v_cat
    from public.properties where id = v_booking.property_id
    union all
    select category_id
    from public.services where id = v_booking.service_id
    limit 1;

    select * into v_rule from public.commission_rules
    where active and (
      (scope = 'org' and org_id = v_booking.org_id)
      or (scope = 'category' and category_id = v_cat)
      or scope = 'global'
    )
    order by case scope when 'org' then 0 when 'category' then 1 else 2 end
    limit 1;

    select (value->>'percent')::numeric into v_default
    from public.platform_settings where key = 'commission_default';

    v_pct  := coalesce(v_rule.percent, v_default, 10);
    v_fixed := coalesce(v_rule.fixed_cents, 0);
    v_comm := round(v_booking.total_cents * v_pct / 100.0) + v_fixed;
    v_net  := v_booking.total_cents - v_comm;

    update public.bookings
      set status = 'confirmed',
          confirmed_at = now(),
          commission_cents = v_comm,
          net_cents = v_net
      where id = p_booking_id;

    insert into public.commissions (booking_id, rule_id, percent, fixed_cents, amount_cents, net_cents)
    values (p_booking_id, v_rule.id, v_pct, v_fixed, v_comm, v_net);

    insert into public.notifications (profile_id, type, title, body, data)
    values (
      v_booking.customer_id, 'booking', 'Reserva confirmada!',
      'Sua reserva ' || v_booking.code || ' foi confirmada pelo fornecedor.',
      jsonb_build_object('booking_id', p_booking_id)
    );

  elsif p_action = 'decline' then
    update public.bookings
      set status = 'declined',
          declined_at = now(),
          cancellation_reason = p_reason
      where id = p_booking_id;

    insert into public.notifications (profile_id, type, title, body, data)
    values (
      v_booking.customer_id, 'booking', 'Solicitação recusada',
      'A reserva ' || v_booking.code || ' foi recusada pelo fornecedor.',
      jsonb_build_object('booking_id', p_booking_id)
    );

  else
    raise exception 'INVALID_ACTION';
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
  values (auth.uid(), 'booking.' || p_action, 'booking', p_booking_id,
          jsonb_build_object('reason', p_reason));
end $$;

-- Cancelamento (cliente, fornecedor ou admin) ---------------------------------
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason     text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_dep     public.departures;
  v_notify  uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'NOT_FOUND'; end if;

  if not (
    v_booking.customer_id = auth.uid()
    or public.is_org_member(v_booking.org_id)
    or public.is_admin()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status not in ('pending','awaiting_payment','confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  if v_booking.kind = 'tour' and v_booking.status = 'confirmed' then
    select * into v_dep from public.departures where id = v_booking.departure_id for update;
    if v_dep.id is not null then
      update public.departures
        set seats_booked = greatest(seats_booked - v_booking.guests_total, 0)
        where id = v_dep.id;
    end if;
  end if;

  update public.bookings
    set status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason
    where id = p_booking_id;

  v_notify := case when v_booking.customer_id = auth.uid()
                   then (select om.profile_id from public.organization_members om
                         where om.organization_id = v_booking.org_id limit 1)
                   else v_booking.customer_id end;

  if v_notify is not null then
    insert into public.notifications (profile_id, type, title, body, data)
    values (v_notify, 'booking', 'Reserva cancelada',
            'A reserva ' || v_booking.code || ' foi cancelada.',
            jsonb_build_object('booking_id', p_booking_id));
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
  values (auth.uid(), 'booking.cancelled', 'booking', p_booking_id,
          jsonb_build_object('reason', p_reason));
end $$;

-- Conclui automaticamente reservas com datas passadas (uso: cron) -------------
create or replace function public.complete_past_bookings()
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with done as (
    update public.bookings
      set status = 'completed', completed_at = now()
      where status = 'confirmed'
        and (
          (kind = 'stay' and check_out < current_date)
          or (kind = 'tour' and coalesce(ends_at, starts_at) < now())
        )
    returning 1
  )
  select count(*) into v_count from done;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- PERMISSÕES DAS FUNÇÕES
-- ---------------------------------------------------------------------------
revoke all on function public.create_booking_request from public, anon;
revoke all on function public.respond_booking from public, anon;
revoke all on function public.cancel_booking from public, anon;
revoke all on function public.complete_past_bookings from public, anon, authenticated;
revoke all on function public.handle_new_user from public, anon, authenticated;
revoke all on function public.fn_property_is_available from public, anon, authenticated;
revoke all on function public.is_admin from public, anon, authenticated;
revoke all on function public.is_org_member from public, anon, authenticated;
revoke all on function public.my_org_ids from public, anon, authenticated;
revoke all on function public.can_join_org from public, anon, authenticated;

grant execute on function public.create_booking_request to authenticated;
grant execute on function public.respond_booking to authenticated;
grant execute on function public.cancel_booking to authenticated;
grant execute on function public.check_property_availability to anon, authenticated;
grant execute on function public.complete_past_bookings to service_role;

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.provider_profiles    enable row level security;
alter table public.categories           enable row level security;
alter table public.amenities            enable row level security;
alter table public.properties           enable row level security;
alter table public.property_photos      enable row level security;
alter table public.property_amenities   enable row level security;
alter table public.property_blocks      enable row level security;
alter table public.external_calendars   enable row level security;
alter table public.calendar_events      enable row level security;
alter table public.vessels              enable row level security;
alter table public.services             enable row level security;
alter table public.service_media        enable row level security;
alter table public.departures           enable row level security;
alter table public.bookings             enable row level security;
alter table public.booking_guests       enable row level security;
alter table public.payments             enable row level security;
alter table public.commission_rules     enable row level security;
alter table public.commissions          enable row level security;
alter table public.payouts              enable row level security;
alter table public.reviews              enable row level security;
alter table public.favorites            enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.platform_settings    enable row level security;

-- PROFILES -------------------------------------------------------------------
create policy "perfis: ler o próprio" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "perfis: atualizar o próprio" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ORGANIZATIONS ---------------------------------------------------------------
create policy "orgs: públicas ativas visíveis" on public.organizations
  for select using (
    status = 'active' or public.is_org_member(id) or public.is_admin()
  );
create policy "orgs: criar a própria" on public.organizations
  for insert to authenticated with check (created_by = auth.uid());
create policy "orgs: membros administram" on public.organizations
  for update using (public.is_org_member(id) or public.is_admin())
  with check (public.is_org_member(id) or public.is_admin());
create policy "orgs: admin remove" on public.organizations
  for delete using (public.is_admin());

-- ORGANIZATION_MEMBERS --------------------------------------------------------
create policy "membros: ver próprios vínculos" on public.organization_members
  for select using (
    profile_id = auth.uid() or public.is_org_member(organization_id) or public.is_admin()
  );
create policy "membros: fundador entra na própria org" on public.organization_members
  for insert to authenticated
  with check (profile_id = auth.uid() and public.can_join_org(organization_id));
create policy "membros: membros gerenciam equipe" on public.organization_members
  for update using (public.is_org_member(organization_id) or public.is_admin())
  with check (public.is_org_member(organization_id) or public.is_admin());
create policy "membros: membros removem equipe" on public.organization_members
  for delete using (public.is_org_member(organization_id) or public.is_admin());

-- PROVIDER_PROFILES -----------------------------------------------------------
create policy "prestador: ler próprio ou da org" on public.provider_profiles
  for select using (
    profile_id = auth.uid() or public.is_admin()
    or (org_id is not null and public.is_org_member(org_id))
  );
create policy "prestador: criar o próprio" on public.provider_profiles
  for insert to authenticated with check (profile_id = auth.uid());
create policy "prestador: atualizar o próprio" on public.provider_profiles
  for update using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- CATEGORIAS / COMODIDADES ----------------------------------------------------
create policy "categorias: leitura pública" on public.categories
  for select using (active or public.is_admin());
create policy "categorias: admin escreve" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "comodidades: leitura pública" on public.amenities
  for select using (true);
create policy "comodidades: admin escreve" on public.amenities
  for all using (public.is_admin()) with check (public.is_admin());

-- PROPERTIES ------------------------------------------------------------------
create policy "imóveis: públicos publicados" on public.properties
  for select using (
    status = 'published' or public.is_org_member(org_id) or public.is_admin()
  );
create policy "imóveis: membros criam" on public.properties
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "imóveis: membros editam" on public.properties
  for update using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());
create policy "imóveis: admin remove" on public.properties
  for delete using (public.is_admin());

-- FOTOS / COMODIDADES DE IMÓVEL / BLOQUEIOS ------------------------------------
create policy "fotos: leitura de imóveis visíveis" on public.property_photos
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.status = 'published' or public.is_org_member(p.org_id) or public.is_admin())
    )
  );
create policy "fotos: membros escrevem" on public.property_photos
  for all to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );

create policy "amenities de imóvel: leitura" on public.property_amenities
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.status = 'published' or public.is_org_member(p.org_id) or public.is_admin())
    )
  );
create policy "amenities de imóvel: membros escrevem" on public.property_amenities
  for all to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );

create policy "bloqueios: membros veem" on public.property_blocks
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );
create policy "bloqueios: membros escrevem" on public.property_blocks
  for all to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );

-- CALENDÁRIOS EXTERNOS (privados — só o dono e o service_role acessam) --------
create policy "ical: membros veem" on public.external_calendars
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );
create policy "ical: membros escrevem" on public.external_calendars
  for all to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );

-- EVENTOS DE CALENDÁRIO (só via service_role / cron — nenhuma policy de escrita)
create policy "eventos ical: membros veem" on public.calendar_events
  for select using (
    exists (
      select 1 from public.external_calendars ec
      join public.properties p on p.id = ec.property_id
      where ec.id = external_calendar_id
        and (public.is_org_member(p.org_id) or public.is_admin())
    )
  );

-- VESSELS ---------------------------------------------------------------------
create policy "embarcações: leitura de ativas" on public.vessels
  for select using (active or public.is_org_member(org_id) or public.is_admin());
create policy "embarcações: membros escrevem" on public.vessels
  for all to authenticated
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

-- SERVICES --------------------------------------------------------------------
create policy "passeios: públicos publicados" on public.services
  for select using (
    status = 'published' or public.is_org_member(org_id) or public.is_admin()
  );
create policy "passeios: membros criam" on public.services
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "passeios: membros editam" on public.services
  for update using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());
create policy "passeios: admin remove" on public.services
  for delete using (public.is_admin());

-- SERVICE_MEDIA ----------------------------------------------------------------
create policy "mídia: leitura de serviços visíveis" on public.service_media
  for select using (
    exists (
      select 1 from public.services s
      where s.id = service_id
        and (s.status = 'published' or public.is_org_member(s.org_id) or public.is_admin())
    )
  );
create policy "mídia: membros escrevem" on public.service_media
  for all to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and (public.is_org_member(s.org_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id and (public.is_org_member(s.org_id) or public.is_admin())
    )
  );

-- DEPARTURES -------------------------------------------------------------------
create policy "saídas: leitura de serviços visíveis" on public.departures
  for select using (
    exists (
      select 1 from public.services s
      where s.id = service_id
        and (s.status = 'published' or public.is_org_member(s.org_id) or public.is_admin())
    )
  );
create policy "saídas: membros escrevem" on public.departures
  for all to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and (public.is_org_member(s.org_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id and (public.is_org_member(s.org_id) or public.is_admin())
    )
  );

-- BOOKINGS ---------------------------------------------------------------------
create policy "reservas: cliente vê as suas" on public.bookings
  for select using (
    customer_id = auth.uid() or public.is_org_member(org_id) or public.is_admin()
  );
-- inserção/atualização direta bloqueadas: usar RPCs
-- (create_booking_request / respond_booking / cancel_booking)

-- BOOKING_GUESTS ----------------------------------------------------------------
create policy "hóspedes: participantes da reserva veem" on public.booking_guests
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.is_org_member(b.org_id) or public.is_admin())
    )
  );

-- PAYMENTS ----------------------------------------------------------------------
create policy "pagamentos: participantes veem" on public.payments
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.is_org_member(b.org_id) or public.is_admin())
    )
  );

-- COMMISSION_RULES ----------------------------------------------------------------
create policy "regras de comissão: leitura controlada" on public.commission_rules
  for select using (
    public.is_admin()
    or (scope = 'org' and org_id is not null and public.is_org_member(org_id))
  );
create policy "regras de comissão: admin escreve" on public.commission_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- COMMISSIONS ----------------------------------------------------------------------
create policy "comissões: participantes veem" on public.commissions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.is_org_member(b.org_id))
    )
  );

-- PAYOUTS ----------------------------------------------------------------------------
create policy "repasses: org e admin veem" on public.payouts
  for select using (public.is_org_member(org_id) or public.is_admin());
create policy "repasses: admin escreve" on public.payouts
  for all using (public.is_admin()) with check (public.is_admin());

-- REVIEWS ------------------------------------------------------------------------------
create policy "avaliações: publicadas visíveis" on public.reviews
  for select using (
    status = 'published'
    or author_id = auth.uid()
    or public.is_org_member(org_id)
    or public.is_admin()
  );
create policy "avaliações: autor avalia reserva concluída" on public.reviews
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
    )
  );
create policy "avaliações: fornecedor responde, admin modera" on public.reviews
  for update using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());
create policy "avaliações: admin remove" on public.reviews
  for delete using (public.is_admin());

-- FAVORITES -----------------------------------------------------------------------------
create policy "favoritos: do próprio usuário" on public.favorites
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- NOTIFICATIONS ----------------------------------------------------------------------------
create policy "notificações: do próprio usuário" on public.notifications
  for select using (profile_id = auth.uid());
create policy "notificações: marcar como lida" on public.notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- AUDIT_LOGS / SETTINGS ------------------------------------------------------------------------
create policy "auditoria: admin lê" on public.audit_logs
  for select using (public.is_admin());
create policy "settings: admin lê" on public.platform_settings
  for select using (public.is_admin());
create policy "settings: admin escreve" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. STORAGE (bucket público para fotos de anúncios)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "storage: leitura pública de mídia"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "storage: autenticados enviam mídia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

create policy "storage: dono atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

create policy "storage: dono remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

-- ============================================================================
-- FIM
-- ============================================================================
