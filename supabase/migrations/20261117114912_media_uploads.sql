-- Limites do bucket de mídia: só imagem/vídeo e até 50 MB por arquivo.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
where id = 'media';

-- Imóveis passam a aceitar vídeo (passeios já tinham service_media.type).
alter table public.property_photos
  add column if not exists type text not null default 'image';
alter table public.property_photos drop constraint if exists property_photos_type_check;
alter table public.property_photos
  add constraint property_photos_type_check check (type in ('image','video'));

-- Admin também remove arquivos enviados por fornecedores (a policy existente só deixa o dono).
drop policy if exists "storage: admin remove" on storage.objects;
create policy "storage: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());;
