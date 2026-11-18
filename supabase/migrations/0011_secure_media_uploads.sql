-- Mídia de rascunhos: cada arquivo novo pertence à pasta do usuário autenticado.
-- Mantém a leitura pública do bucket e as políticas de edição já existentes.
drop policy if exists "storage: equipe envia mídia" on storage.objects;
create policy "storage: equipe envia mídia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('owner', 'provider')
    ))
  );
