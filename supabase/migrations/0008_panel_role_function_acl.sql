-- Funções auxiliares de RLS são internas: não devem se tornar endpoints RPC
-- públicos. Policies as executam para sessões autenticadas.
revoke execute on function public.is_host_manager(uuid) from public, anon;
revoke execute on function public.is_operator_manager(uuid) from public, anon;
grant execute on function public.is_host_manager(uuid) to authenticated;
grant execute on function public.is_operator_manager(uuid) to authenticated;
