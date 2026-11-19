insert into public.categories (slug, label, kind, icon, sort) values
  ('quadriciclo', 'Quadriciclo', 'tour', 'mountain', 16),
  ('jet-ski-casal', 'Jet ski casal', 'tour', 'waves', 17),
  ('jet-ski-individual', 'Jet ski individual', 'tour', 'waves', 18),
  ('buggy-arubinha', 'Buggy Arubinha', 'tour', 'car', 19),
  ('buggy-arraial-do-cabo', 'Buggy Arraial do Cabo', 'tour', 'car', 20),
  ('paramotor', 'Paramotor', 'tour', 'wind', 21),
  ('mergulho-de-cilindro', 'Mergulho de cilindro', 'tour', 'droplet', 22)
on conflict (slug) do update set
  label = excluded.label,
  kind = excluded.kind,
  icon = excluded.icon,
  sort = excluded.sort;
