-- Execute depois da migration 202610180003_excluir_ingrediente.sql.
-- Todo o cenario e revertido ao final.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '81111111-1111-4111-8111-111111111111',
  'exclusao-ingrediente@teste.local',
  '{"name":"Admin Exclusao"}'
);

select set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);

update public.profiles
set papel = 'ADMIN', ativo = true
where id = '81111111-1111-4111-8111-111111111111';

do $$
declare
  v_categoria uuid;
  v_sem_historico uuid;
  v_com_historico uuid;
begin
  select id into v_categoria
  from public.categorias_ingredientes
  where slug = 'outros';

  v_sem_historico := public.cadastrar_ingrediente(
    'Ingrediente descartavel teste', v_categoria, 'kg', 0, 0, 0, null
  );
  perform public.excluir_ingrediente(v_sem_historico);
  if exists (select 1 from public.ingredientes where id = v_sem_historico) then
    raise exception 'Ingrediente sem estoque e sem historico nao foi excluido';
  end if;

  v_com_historico := public.cadastrar_ingrediente(
    'Ingrediente historico teste', v_categoria, 'kg', 0, 1, 10, null
  );
  perform public.ajustar_estoque_ingrediente(v_com_historico, 0, 'Contagem de estoque', 'Preparacao do teste');

  begin
    perform public.excluir_ingrediente(v_com_historico);
    raise exception 'Ingrediente com historico deveria ter sido preservado';
  exception when others then
    if sqlerrm = 'Ingrediente com historico deveria ter sido preservado' then raise; end if;
  end;

  if not exists (select 1 from public.ingredientes where id = v_com_historico) then
    raise exception 'Ingrediente com historico foi removido indevidamente';
  end if;

  raise notice 'Excluir ingrediente test: OK';
end;
$$;

rollback;
