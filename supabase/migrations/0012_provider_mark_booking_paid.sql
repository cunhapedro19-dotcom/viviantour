create or replace function public.mark_booking_paid(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_admin() or public.is_org_member(v_booking.org_id)) then raise exception 'FORBIDDEN'; end if;
  if v_booking.status <> 'awaiting_payment' then raise exception 'INVALID_STATUS'; end if;
  update public.payments set status = 'paid', provider = coalesce(provider, 'manual')
    where id = (select id from public.payments where booking_id = p_booking_id order by created_at desc limit 1);
  update public.bookings set status = 'confirmed', confirmed_at = now() where id = p_booking_id;
  insert into public.audit_logs(actor_id, action, entity, entity_id, data)
    values (auth.uid(), 'payment.manually_marked_paid', 'booking', p_booking_id, jsonb_build_object('source', 'panel'));
end $$;
revoke all on function public.mark_booking_paid(uuid) from public, anon;
grant execute on function public.mark_booking_paid(uuid) to authenticated;
