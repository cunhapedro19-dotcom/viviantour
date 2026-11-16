-- 0004 — Modelo de monetização configurável pela equipe Viviantourr
--
-- A equipe define, no painel admin (/admin/configuracoes), como a plataforma
-- monetiza hospedagens e serviços:
--   free         → gratuito inicialmente (construir a rede antes de monetizar)
--   commission   → comissão por reserva (percentual de cada reserva confirmada)
--   subscription → mensalidade dos fornecedores (sem comissão)
--   hybrid       → mensalidade + comissão por reserva
--
-- Quando o modelo é 'free' ou 'subscription', a RPC respond_booking deixa de
-- aplicar comissão (valor líquido = valor bruto). A cobrança recorrente da
-- mensalidade é combinada fora do sistema por enquanto; automação entra em
-- fase futura.

insert into public.platform_settings (key, value) values
  ('monetization', '{"model": "free", "percent": 10, "monthly_fee_cents": 0}')
on conflict (key) do nothing;

-- Leitura pública apenas da chave de monetização (a página /anuncie exibe o
-- modelo vigente). As demais chaves continuam visíveis só para o admin.
create policy "settings: monetização é pública"
  on public.platform_settings
  for select
  using (key = 'monetization');

-- Fornecedor aceita/recusa — mesma função da 0001, agora respeitando o
-- modelo de monetização definido pela equipe.
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
  v_pct     numeric;
  v_fixed   int;
  v_comm    int;
  v_net     int;
  v_cat     uuid;
  v_model   text;
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

    -- modelo de monetização definido pela equipe (padrão: comissão de 10%)
    select coalesce(value->>'model', 'commission') into v_model
    from public.platform_settings where key = 'monetization';
    select coalesce((value->>'percent')::numeric, 10) into v_pct
    from public.platform_settings where key = 'monetization';
    v_fixed := 0;

    -- regras comerciais específicas (organização ou categoria) sobrepõem o padrão
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
    )
    order by case scope when 'org' then 0 else 1 end
    limit 1;

    if v_rule.id is not null then
      v_pct   := v_rule.percent;
      v_fixed := v_rule.fixed_cents;
    end if;

    -- gratuito ou mensalidade: nenhuma comissão por reserva
    if v_model in ('free', 'subscription') then
      v_pct   := 0;
      v_fixed := 0;
    end if;

    v_comm := round(v_booking.total_cents * v_pct / 100.0) + v_fixed;
    v_net  := v_booking.total_cents - v_comm;

    update public.bookings
      set status = 'confirmed',
          confirmed_at = now(),
          commission_cents = v_comm,
          net_cents = v_net
      where id = p_booking_id;

    if v_comm > 0 then
      insert into public.commissions (booking_id, rule_id, percent, fixed_cents, amount_cents, net_cents)
      values (p_booking_id, v_rule.id, v_pct, v_fixed, v_comm, v_net);
    end if;

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
