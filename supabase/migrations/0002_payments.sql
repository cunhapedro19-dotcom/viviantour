-- ============================================================================
-- VIVIANTOURR — Migração 0002: Fase 7 (pagamentos)
--
-- Fluxo da reserva passa a ser:
--   pending → (fornecedor aceita) awaiting_payment → (pagamento confirmado)
--   → confirmed
--
-- Conteúdo:
--   1. respond_booking   — aceitar agora gera cobrança (awaiting_payment);
--                          a comissão continua calculada na aceitação
--   2. record_payment    — RPC que registra o pagamento e confirma a reserva
--                          (cliente dono da reserva ou service_role/webhook)
--   3. cancel_booking    — cancelamento marca pagamento pago como reembolsado
--   4. Policy de INSERT em payments (cliente registra a cobrança pendente)
--   5. Permissões das novas funções
--
-- Idempotente: pode ser executada mais de uma vez sem efeitos colaterais.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RESPOND_BOOKING — aceitar muda o status para "aguardando pagamento"
-- ---------------------------------------------------------------------------
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

    -- datas/vagas já ficam bloqueadas (awaiting_payment conta como ocupado
    -- na exclusão de sobreposição e na função de disponibilidade)
    update public.bookings
      set status = 'awaiting_payment',
          commission_cents = v_comm,
          net_cents = v_net
      where id = p_booking_id;

    insert into public.commissions (booking_id, rule_id, percent, fixed_cents, amount_cents, net_cents)
    values (p_booking_id, v_rule.id, v_pct, v_fixed, v_comm, v_net);

    insert into public.notifications (profile_id, type, title, body, data)
    values (
      v_booking.customer_id, 'payment', 'Reserva aceita — conclua o pagamento',
      'O fornecedor aceitou a reserva ' || v_booking.code || '. Pague para confirmá-la.',
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

-- ---------------------------------------------------------------------------
-- 2. RECORD_PAYMENT — registra o pagamento e confirma a reserva quando pago
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(
  p_booking_id   uuid,
  p_status       text,          -- 'pending' | 'paid' | 'failed' | 'refunded'
  p_method       text default null,
  p_provider     text default null,
  p_provider_ref text default null,
  p_raw          jsonb default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_payment public.payments;
begin
  if p_status not in ('pending','paid','failed','refunded') then
    raise exception 'INVALID_STATUS';
  end if;

  -- autorização: dono da reserva (confirmação manual) ou service_role (webhook)
  if coalesce(auth.role(), '') <> 'service_role'
     and not exists (
       select 1 from public.bookings b
       where b.id = p_booking_id and b.customer_id = auth.uid()
     ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'NOT_FOUND'; end if;

  select * into v_payment from public.payments
    where booking_id = p_booking_id
    order by created_at desc
    limit 1;

  if v_payment.id is not null then
    update public.payments
      set status       = p_status,
          method       = coalesce(p_method, v_payment.method),
          provider     = coalesce(p_provider, v_payment.provider),
          provider_ref = coalesce(p_provider_ref, v_payment.provider_ref),
          raw          = coalesce(p_raw, v_payment.raw)
      where id = v_payment.id;
  else
    insert into public.payments
      (booking_id, method, status, amount_cents, provider, provider_ref, raw)
    values
      (p_booking_id, p_method, p_status, v_booking.total_cents, p_provider, p_provider_ref, p_raw);
  end if;

  if p_status = 'paid' then
    if v_booking.status = 'confirmed' then
      return; -- já confirmada — webhook repetido
    end if;
    if v_booking.status <> 'awaiting_payment' then
      raise exception 'INVALID_STATUS';
    end if;

    update public.bookings
      set status = 'confirmed', confirmed_at = now()
      where id = p_booking_id;

    insert into public.notifications (profile_id, type, title, body, data)
    select om.profile_id, 'payment',
           'Pagamento recebido',
           'A reserva ' || v_booking.code || ' foi paga e está confirmada.',
           jsonb_build_object('booking_id', p_booking_id)
    from public.organization_members om
    where om.organization_id = v_booking.org_id;

    insert into public.audit_logs (actor_id, action, entity, entity_id)
    values (auth.uid(), 'payment.paid', 'booking', p_booking_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. CANCEL_BOOKING — agora marca pagamento pago como reembolsado
-- ---------------------------------------------------------------------------
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

  -- pagamento pago vira "reembolsado" (registro financeiro do valor a devolver)
  if v_booking.status in ('awaiting_payment','confirmed') then
    update public.payments
      set status = 'refunded'
      where booking_id = p_booking_id and status = 'paid';
  end if;

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

-- ---------------------------------------------------------------------------
-- 4. PAYMENTS — cliente pode registrar a cobrança pendente (checkout)
--    A confirmação (paid) continua exclusiva da RPC record_payment
--    ou do service_role.
-- ---------------------------------------------------------------------------
create policy "pagamentos: cliente registra cobrança" on public.payments
  for insert to authenticated
  with check (
    status in ('pending','failed')
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. PERMISSÕES
-- ---------------------------------------------------------------------------
revoke all on function public.record_payment from public, anon, authenticated;
grant execute on function public.record_payment to authenticated, service_role;

-- ============================================================================
-- FIM
-- ============================================================================
