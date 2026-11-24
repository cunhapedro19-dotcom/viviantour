create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- auth.uid() é nulo no SQL Editor / service role: nesses casos é permitido
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o papel de um perfil'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- anon nunca deve escrever em profiles
revoke insert, update, delete on public.profiles from anon;;
