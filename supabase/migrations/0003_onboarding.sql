-- 0003 — Correções de RLS para o modo real (primeiro uso, plataforma vazia)
--
-- 1) ONBOARDING: createOrganization insere a organização com INSERT ... RETURNING
--    (.select().single()). O PostgREST aplica as políticas de SELECT sobre as linhas
--    retornadas — e, nesse instante, o fundador ainda não é membro (o INSERT em
--    organization_members vem DEPOIS) e a org ainda está 'pending', então nenhuma
--    política de SELECT existente via a linha e o onboarding falhava em loop.
--    Solução: o criador sempre enxerga a própria organização.
create policy "orgs: criador vê a própria"
  on public.organizations
  for select to authenticated
  using (created_by = auth.uid());

-- 2) AVALIAÇÕES: a listagem pública de avaliações busca o nome do autor via embed
--    em profiles, mas a política "perfis: ler o próprio" impede que visitantes (e
--    outros usuários) leiam o perfil do autor — todas as avaliações apareciam como
--    "Hóspede". Em vez de abrir leitura pública de profiles (que carrega e-mail e
--    telefone), o nome do autor passa a ser gravado na própria avaliação.
alter table public.reviews
  add column if not exists author_name text not null default '';

-- Preenche o nome nas avaliações já existentes (no-op em base nova).
update public.reviews r
  set author_name = p.full_name
  from public.profiles p
  where p.id = r.author_id and r.author_name = '';

create or replace function public.fill_review_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_name is null or new.author_name = '' then
    select full_name into new.author_name
      from public.profiles where id = new.author_id;
  end if;
  return new;
end;
$$;

create trigger reviews_fill_author
  before insert on public.reviews
  for each row execute function public.fill_review_author();
