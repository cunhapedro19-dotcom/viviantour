-- Funções usadas dentro das policies de RLS precisam de EXECUTE para quem consulta as tabelas.
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_org_member(uuid) to authenticated, anon;
grant execute on function public.my_org_ids() to authenticated, anon;
grant execute on function public.can_join_org(uuid) to authenticated;

-- Função de trigger não precisa ser executável por clientes
revoke execute on function public.protect_profile_role() from public, anon, authenticated;;
