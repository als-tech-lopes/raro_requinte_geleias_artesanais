-- Execute depois das migrations. Tudo e revertido ao final.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '71111111-1111-4111-8111-111111111111',
  'ingredientes-admin@teste.local',
  '{"name":"Admin Ingredientes"}'
);

select set_config(
  'request.jwt.claim.sub',
  '71111111-1111-4111-8111-111111111111',
  true
);

update public.profiles
set papel = 'ADMIN', ativo = true
where id = '71111111-1111-4111-8111-111111111111';

do $$
declare
  v_categoria uuid;
  v_sem_estoque uuid;
  v_morango uuid;
begin
  select id into v_categoria
  from public.categorias_ingredientes
  where slug = 'frutas';

  -- Cadastro sem estoque inicial.
  v_sem_estoque := public.cadastrar_ingrediente(
    'Ingrediente sem estoque - teste', v_categoria, 'kg', 1, 0, 0, null
  );
  if (select quantidade_disponivel from public.ingredientes where id = v_sem_estoque) <> 0 then
    raise exception 'Cadastro sem estoque inicial falhou';
  end if;

  -- Cadastro com 2 kg por R$ 20,00: custo inicial de R$ 10,00/kg.
  v_morango := public.cadastrar_ingrediente(
    'Morango - teste de estoque', v_categoria, 'kg', 1, 2, 20, 'Lote inicial'
  );
  if (select custo_medio from public.ingredientes where id = v_morango) <> 10 then
    raise exception 'Custo inicial incorreto';
  end if;

  -- Compra de 3 kg por R$ 36,00: 5 kg com custo medio de R$ 11,20/kg.
  perform public.registrar_compra_ingrediente(v_morango, 3, 'kg', 36, current_date, 'Compra em kg');
  if (select quantidade_disponivel from public.ingredientes where id = v_morango) <> 5
     or (select custo_medio from public.ingredientes where id = v_morango) <> 11.2 then
    raise exception 'Media ponderada da compra em kg incorreta';
  end if;

  -- Compra conversivel: 500 g viram 0,5 kg.
  perform public.registrar_compra_ingrediente(v_morango, 500, 'g', 6, current_date, 'Compra em gramas');
  if (select quantidade_disponivel from public.ingredientes where id = v_morango) <> 5.5 then
    raise exception 'Conversao de g para kg incorreta';
  end if;
  if (select custo_medio from public.ingredientes where id = v_morango) <> 11.2727 then
    raise exception 'Media ponderada apos conversao incorreta';
  end if;

  -- Perda e estoque zerado preservam o custo medio vigente.
  perform public.ajustar_estoque_ingrediente(v_morango, 4, 'Perda ou desperdicio', 'Teste de perda');
  if (select custo_medio from public.ingredientes where id = v_morango) <> 11.2727 then
    raise exception 'Ajuste alterou o custo medio';
  end if;
  perform public.ajustar_estoque_ingrediente(v_morango, 0, 'Contagem de estoque', 'Estoque zerado');

  -- Valores negativos devem ser recusados.
  begin
    perform public.ajustar_estoque_ingrediente(v_morango, -1, 'Teste negativo', null);
    raise exception 'Saldo negativo deveria ter sido bloqueado';
  exception when others then
    if sqlerrm = 'Saldo negativo deveria ter sido bloqueado' then raise; end if;
  end;

  -- Saldo e custo nao podem ser alterados por CRUD comum.
  begin
    update public.ingredientes set quantidade_disponivel = 9 where id = v_morango;
    raise exception 'Atualizacao direta de saldo deveria ter sido bloqueada';
  exception when others then
    if sqlerrm = 'Atualizacao direta de saldo deveria ter sido bloqueada' then raise; end if;
  end;
  begin
    update public.ingredientes set custo_medio = 9 where id = v_morango;
    raise exception 'Atualizacao direta de custo deveria ter sido bloqueada';
  exception when others then
    if sqlerrm = 'Atualizacao direta de custo deveria ter sido bloqueada' then raise; end if;
  end;
  begin
    update public.ingredientes set unidade_estoque = 'g' where id = v_morango;
    raise exception 'Alteracao da unidade deveria ter sido bloqueada';
  exception when others then
    if sqlerrm = 'Alteracao da unidade deveria ter sido bloqueada' then raise; end if;
  end;

  -- 1 estoque inicial + 2 compras + 2 ajustes.
  if (select count(*) from public.movimentacoes_estoque where ingrediente_id = v_morango) <> 5 then
    raise exception 'Historico de movimentacoes incompleto';
  end if;

  -- O historico e imutavel.
  begin
    delete from public.movimentacoes_estoque where ingrediente_id = v_morango;
    raise exception 'Exclusao de movimento deveria ter sido bloqueada';
  exception when others then
    if sqlerrm = 'Exclusao de movimento deveria ter sido bloqueada' then raise; end if;
  end;

  -- Um usuario sem perfil administrativo nao executa as RPCs.
  perform set_config('request.jwt.claim.sub', '79999999-9999-4999-8999-999999999999', true);
  begin
    perform public.registrar_compra_ingrediente(v_morango, 1, 'kg', 10, current_date, null);
    raise exception 'Usuario nao autorizado deveria ter sido bloqueado';
  exception when others then
    if sqlerrm = 'Usuario nao autorizado deveria ter sido bloqueado' then raise; end if;
  end;

  raise notice 'Ingredientes flow test: OK';
end;
$$;

rollback;
