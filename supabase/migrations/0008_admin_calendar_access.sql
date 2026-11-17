-- 0008 · Acesso de administração ao calendário de hospedagens
-- Promove as contas autorizadas pela operação. O painel admin já é protegido
-- por RLS através de public.is_admin(), portanto não amplia o acesso de fornecedores.

update public.profiles
set role = 'admin'
where lower(email) in ('admin', 'tiodrop22@gmail.com', 'vivanqueiroz022@gmail.com')
   or lower(full_name) = 'admin';
