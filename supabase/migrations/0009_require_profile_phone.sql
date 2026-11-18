-- Todo perfil precisa ter um celular válido para contatos futuros.
alter table public.profiles
  alter column phone set not null;

alter table public.profiles
  add constraint profiles_phone_digits_check
  check (char_length(regexp_replace(phone, '\\D', '', 'g')) between 10 and 15);
