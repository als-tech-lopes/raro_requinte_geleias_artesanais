-- Somente para validar migrations históricas em PostgreSQL local descartável.
insert into auth.users (id, email, raw_user_meta_data)
values ('61111111-1111-4111-8111-111111111111', 'migration-admin@teste.local', '{"name":"Migration Admin"}');
update public.profiles set papel = 'ADMIN', ativo = true
where id = '61111111-1111-4111-8111-111111111111';
