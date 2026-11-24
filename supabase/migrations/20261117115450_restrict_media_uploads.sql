-- Só administradores, owners e providers enviam mídia (antes, qualquer usuário logado).
drop policy if exists "storage: autenticados enviam mídia" on storage.objects;
drop policy if exists "storage: equipe envia mídia" on storage.objects;
create policy "storage: equipe envia mídia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('owner','provider')
      )
    )
  );;
