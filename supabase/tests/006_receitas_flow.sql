-- Execute depois da migration 202610190001_receitas_fichas.sql.
-- Todo o cenário é revertido ao final.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '91111111-1111-4111-8111-111111111111',
  'receitas-admin@teste.local',
  '{"name":"Admin Receitas"}'
);

select set_config(
  'request.jwt.claim.sub',
  '91111111-1111-4111-8111-111111111111',
  true
);

update public.profiles
set papel = 'ADMIN', ativo = true
where id = '91111111-1111-4111-8111-111111111111';

do $$
declare
  v_categoria_ingrediente uuid;
  v_categoria_produto uuid;
  v_produto uuid;
  v_fruta uuid;
  v_acucar uuid;
  v_liquido uuid;
  v_receita uuid;
  v_copia uuid;
  v_nova_versao uuid;
  v_saldo_fruta numeric;
  v_saldo_acucar numeric;
  v_saldo_liquido numeric;
begin
  select id into v_categoria_ingrediente
  from public.categorias_ingredientes
  where slug = 'outros';

  insert into public.categorias_produtos (nome, slug, descricao)
  values ('Categoria receita teste', 'categoria-receita-teste', 'Categoria temporária para o teste')
  returning id into v_categoria_produto;

  insert into public.produtos (
    categoria_id, nome, slug, descricao_curta, peso_liquido, unidade,
    preco_venda, custo_estimado, quantidade_disponivel, status
  ) values (
    v_categoria_produto, 'Geleia receita teste', 'geleia-receita-teste',
    'Produto temporário usado no teste de receitas.', 250, 'g', 20, 0, 0, 'ATIVO'
  ) returning id into v_produto;

  insert into public.ingredientes (
    categoria_id, nome, unidade_estoque, custo_medio,
    quantidade_disponivel, estoque_minimo, ativo
  ) values
    (v_categoria_ingrediente, 'Fruta receita teste', 'kg', 12, 10, 1, true)
  returning id into v_fruta;

  insert into public.ingredientes (
    categoria_id, nome, unidade_estoque, custo_medio,
    quantidade_disponivel, estoque_minimo, ativo
  ) values
    (v_categoria_ingrediente, 'Açúcar receita teste', 'kg', 8, 10, 1, true)
  returning id into v_acucar;

  insert into public.ingredientes (
    categoria_id, nome, unidade_estoque, custo_medio,
    quantidade_disponivel, estoque_minimo, ativo
  ) values
    (v_categoria_ingrediente, 'Suco receita teste', 'L', 0, 0, 0, true)
  returning id into v_liquido;

  select quantidade_disponivel into v_saldo_fruta from public.ingredientes where id = v_fruta;
  select quantidade_disponivel into v_saldo_acucar from public.ingredientes where id = v_acucar;
  select quantidade_disponivel into v_saldo_liquido from public.ingredientes where id = v_liquido;

  v_receita := public.salvar_receita(
    null,
    'Receita teste de morango',
    v_produto,
    'Receita criada pelo teste automatizado.',
    'Misture os ingredientes e cozinhe.',
    1500,
    250,
    'Sem movimentar estoque.',
    true,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade', 500, 'unidade', 'g'),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade', 0.5, 'unidade', 'kg'),
      jsonb_build_object('ingrediente_id', v_liquido, 'quantidade', 250, 'unidade', 'ml')
    )
  );

  if (select rendimento_potes from public.receitas where id = v_receita) <> 6 then
    raise exception 'Cálculo do número de potes incorreto';
  end if;
  if (select count(*) from public.receita_itens where receita_id = v_receita) <> 3 then
    raise exception 'Itens da receita não foram gravados';
  end if;
  if (select quantidade_disponivel from public.ingredientes where id = v_fruta) <> v_saldo_fruta
     or (select quantidade_disponivel from public.ingredientes where id = v_acucar) <> v_saldo_acucar
     or (select quantidade_disponivel from public.ingredientes where id = v_liquido) <> v_saldo_liquido then
    raise exception 'Salvar receita não pode alterar o estoque';
  end if;
  if public.converter_quantidade(250, 'ml', 'L') <> 0.25 then
    raise exception 'Conversão de ml para L incorreta';
  end if;

  -- O ingrediente sem custo pode ser usado. Uma compra posterior altera o
  -- custo atual do ingrediente, sem modificar os componentes da receita.
  perform public.registrar_compra_ingrediente(v_liquido, 2, 'L', 20, current_date, 'Atualização de custo');
  if (select custo_medio from public.ingredientes where id = v_liquido) <> 10 then
    raise exception 'Custo médio atual não foi atualizado';
  end if;
  if not exists (select 1 from public.receita_itens where receita_id = v_receita and ingrediente_id = v_liquido) then
    raise exception 'Mudança de custo comprometeu a composição da receita';
  end if;
  select quantidade_disponivel into v_saldo_liquido from public.ingredientes where id = v_liquido;

  if public.salvar_receita(
    v_receita, 'Receita teste editada', v_produto, null, 'Novo preparo',
    2000, 250, null, true,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade', 1, 'unidade', 'kg'),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade', 600, 'unidade', 'g')
    )
  ) <> v_receita then
    raise exception 'Receita sem produção deveria ser atualizada no mesmo registro';
  end if;

  v_copia := public.salvar_receita(
    null, 'Receita teste duplicada', null, null, null, 1000, 200, null, true,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade', 500, 'unidade', 'g')
    )
  );
  if v_copia = v_receita then raise exception 'Duplicação reutilizou o registro original'; end if;

  begin
    perform public.salvar_receita(
      null, 'Receita sem itens', null, null, null, 1000, 250, null, true, '[]'::jsonb
    );
    raise exception 'Receita vazia deveria ter sido recusada';
  exception when others then
    if sqlerrm = 'Receita vazia deveria ter sido recusada' then raise; end if;
  end;

  insert into public.producoes (
    produto_id, receita_id, quantidade_planejada, quantidade_produzida,
    lote, validade, status, custo_real, criado_por
  ) values (
    v_produto, v_receita, 8, 8, 'RECEITA-TESTE-01', current_date + 30,
    'CONFIRMADA', 0, '91111111-1111-4111-8111-111111111111'
  );

  v_nova_versao := public.salvar_receita(
    v_receita, 'Receita teste editada', v_produto, null, 'Preparo versionado',
    2250, 250, null, true,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade', 1.2, 'unidade', 'kg'),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade', 700, 'unidade', 'g')
    )
  );

  if v_nova_versao = v_receita then raise exception 'Edição após produção deveria criar nova versão'; end if;
  if (select ativa from public.receitas where id = v_receita) then raise exception 'Versão anterior deveria ser inativada'; end if;
  if (select versao from public.receitas where id = v_nova_versao) <> 2 then raise exception 'Número da nova versão incorreto'; end if;
  if (select receita_origem_id from public.receitas where id = v_nova_versao) <> v_receita then raise exception 'Origem da versão não foi preservada'; end if;

  perform public.inativar_receita(v_copia);
  if (select ativa from public.receitas where id = v_copia) then raise exception 'Inativação da receita falhou'; end if;

  if (select quantidade_disponivel from public.ingredientes where id = v_fruta) <> v_saldo_fruta
     or (select quantidade_disponivel from public.ingredientes where id = v_acucar) <> v_saldo_acucar
     or (select quantidade_disponivel from public.ingredientes where id = v_liquido) <> v_saldo_liquido then
    raise exception 'Operações da ficha técnica alteraram o estoque';
  end if;

  raise notice 'Receitas flow test: OK';
end;
$$;

rollback;
