-- Característica independente da categoria e da localização.
-- O padrão preserva os anúncios existentes sem classificá-los automaticamente.
alter table public.properties
  add column if not exists beachfront boolean not null default false;
