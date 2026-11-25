-- Reconciliação da Fase 3 com o modelo MVP admin-only.
-- Executar após 20261125212000 e antes de 20261125213000.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function public.guard_organization_members()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner_count integer;
begin
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.organization_id is distinct from old.organization_id or new.profile_id is distinct from old.profile_id or new.created_at is distinct from old.created_at) then
    raise exception 'MEMBERSHIP_IDENTITY_IMMUTABLE' using errcode='42501';
  end if;
  if old.member_role = 'owner' and (tg_op='DELETE' or new.member_role <> 'owner') then
    select count(*) into v_owner_count from public.organization_members where organization_id=old.organization_id and member_role='owner';
    if v_owner_count <= 1 then raise exception 'LAST_ORGANIZATION_OWNER' using errcode='23514'; end if;
  end if;
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end; $$;
revoke all on function public.guard_organization_members() from public, anon, authenticated;
drop trigger if exists guard_organization_members on public.organization_members;
create trigger guard_organization_members before update or delete on public.organization_members for each row execute function public.guard_organization_members();

create or replace function public.guard_organization_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id then raise exception 'ORGANIZATION_ID_IMMUTABLE' using errcode='42501'; end if;
  if not public.is_admin() and (new.created_by is distinct from old.created_by or new.kind is distinct from old.kind or new.status is distinct from old.status or new.commission_override_pct is distinct from old.commission_override_pct) then
    raise exception 'ORGANIZATION_ADMIN_FIELDS' using errcode='42501';
  end if;
  return new;
end; $$;
revoke all on function public.guard_organization_fields() from public, anon, authenticated;
drop trigger if exists guard_organization_fields on public.organizations;
create trigger guard_organization_fields before update on public.organizations for each row execute function public.guard_organization_fields();

do $$ begin
  if to_regprocedure('public.respond_booking(uuid,text,text)') is not null and to_regprocedure('private.respond_booking_internal(uuid,text,text)') is null then
    alter function public.respond_booking(uuid,text,text) set schema private;
    alter function private.respond_booking(uuid,text,text) rename to respond_booking_internal;
  end if;
  if to_regprocedure('public.cancel_booking(uuid,text)') is not null and to_regprocedure('private.cancel_booking_internal(uuid,text)') is null then
    alter function public.cancel_booking(uuid,text) set schema private;
    alter function private.cancel_booking(uuid,text) rename to cancel_booking_internal;
  end if;
end $$;
revoke all on function private.respond_booking_internal(uuid,text,text) from public, anon, authenticated;
revoke all on function private.cancel_booking_internal(uuid,text) from public, anon, authenticated;

create or replace function public.respond_booking(p_booking_id uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.bookings where id=p_booking_id;
  if v_org is null then raise exception 'NOT_FOUND'; end if;
  if not public.is_admin() and coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform private.respond_booking_internal(p_booking_id,p_action,p_reason);
end; $$;
revoke all on function public.respond_booking(uuid,text,text) from public, anon;
grant execute on function public.respond_booking(uuid,text,text) to authenticated, service_role;

create or replace function public.mark_booking_paid(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if v_booking.id is null then raise exception 'NOT_FOUND'; end if;
  if not public.is_admin() and coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_booking.status <> 'awaiting_payment' then raise exception 'INVALID_STATUS'; end if;
  update public.payments set status='paid', provider=coalesce(provider,'manual') where id=(select id from public.payments where booking_id=p_booking_id order by created_at desc limit 1);
  update public.bookings set status='confirmed', confirmed_at=now() where id=p_booking_id;
end; $$;
revoke all on function public.mark_booking_paid(uuid) from public, anon;
grant execute on function public.mark_booking_paid(uuid) to authenticated, service_role;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id=p_booking_id;
  if v_booking.id is null then raise exception 'NOT_FOUND'; end if;
  if v_booking.customer_id is distinct from auth.uid() and not public.is_admin() and coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform private.cancel_booking_internal(p_booking_id,p_reason);
end; $$;
revoke all on function public.cancel_booking(uuid,text) from public, anon;
grant execute on function public.cancel_booking(uuid,text) to authenticated, service_role;

commit;
