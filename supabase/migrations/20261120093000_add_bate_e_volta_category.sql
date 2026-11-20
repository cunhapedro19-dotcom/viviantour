-- Categoria para excursões com transporte ida e volta, podendo incluir
-- passeio, alimentação e outros itens no mesmo anúncio.
insert into public.categories (slug, label, kind, icon, sort, active)
values ('bate-e-volta', 'Bate e volta', 'tour', 'bus', 14, true)
on conflict (slug) do update
set label = excluded.label,
    kind = excluded.kind,
    icon = excluded.icon,
    sort = excluded.sort,
    active = true;
