begin;

create table if not exists public.property_interest_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  property_name text not null,
  property_type text not null,
  neighborhood text not null,
  address text,
  capacity integer not null check (capacity > 0),
  bedrooms integer not null check (bedrooms >= 0),
  bathrooms numeric(3,1) not null check (bathrooms >= 0),
  description text not null,
  amenities text[] not null default '{}',
  photo_urls text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','contacted','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.property_interest_submissions enable row level security;
revoke all on public.property_interest_submissions from anon, authenticated;
grant select on public.property_interest_submissions to authenticated;
grant update (status, admin_note) on public.property_interest_submissions to authenticated;
create policy "curadoria l� solicita��es" on public.property_interest_submissions
  for select to authenticated using (public.is_admin());
create policy "curadoria atualiza solicita��es" on public.property_interest_submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_property_interest(p_submission jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_owner and p.role='owner') then
    raise exception 'OWNER_REQUIRED' using errcode='42501';
  end if;
  if length(coalesce(p_submission->>'contact_name','')) < 2
    or length(coalesce(p_submission->>'contact_phone','')) < 8
    or length(coalesce(p_submission->>'contact_email','')) < 5
    or length(coalesce(p_submission->>'property_name','')) < 2
    or length(coalesce(p_submission->>'description','')) < 10 then
    raise exception 'INVALID_SUBMISSION' using errcode='22023';
  end if;
  if jsonb_typeof(p_submission->'photo_urls') <> 'array'
    or jsonb_array_length(p_submission->'photo_urls') < 3
    or jsonb_array_length(p_submission->'photo_urls') > 20
    or exists (
      select 1 from jsonb_array_elements_text(p_submission->'photo_urls') u(url)
      where split_part(u.url, '/storage/v1/object/public/media/', 2)
        not like v_owner::text || '/property-submissions/%'
    ) then
    raise exception 'INVALID_PHOTOS' using errcode='22023';
  end if;
  insert into public.property_interest_submissions (
    owner_id, contact_name, contact_phone, contact_email, property_name, property_type,
    neighborhood, address, capacity, bedrooms, bathrooms, description, amenities, photo_urls
  ) values (
    v_owner, p_submission->>'contact_name', p_submission->>'contact_phone', p_submission->>'contact_email',
    p_submission->>'property_name', p_submission->>'property_type', p_submission->>'neighborhood',
    nullif(p_submission->>'address',''), (p_submission->>'capacity')::integer,
    (p_submission->>'bedrooms')::integer, (p_submission->>'bathrooms')::numeric,
    p_submission->>'description', coalesce(array(select jsonb_array_elements_text(p_submission->'amenities')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_submission->'photo_urls')), '{}')
  ) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.submit_property_interest(jsonb) from public, anon;
grant execute on function public.submit_property_interest(jsonb) to authenticated;

create policy "owner uploads submission photos" on storage.objects
  for insert to authenticated with check (
    bucket_id='media'
    and (storage.foldername(name))[1]=auth.uid()::text
    and (storage.foldername(name))[2]='property-submissions'
  );

commit;

