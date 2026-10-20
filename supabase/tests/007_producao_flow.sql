-- Execute depois da migration 202610190002_producao_lotes.sql.
-- Todo o cenário é revertido ao final.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('a1111111-1111-4111-8111-111111111111', 'producao-admin@teste.local', '{"name":"Admin Produção"}');
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
update public.profiles set papel = 'ADMIN', ativo = true where id = 'a1111111-1111-4111-8111-111111111111';

do $$
declare
  v_categoria_produto uuid;
  v_categoria_ingrediente uuid;
  v_categoria_embalagem uuid;
  v_produto uuid;
  v_fruta uuid;
  v_acucar uuid;
  v_pote uuid;
  v_receita uuid;
  v_producao uuid;
  v_insuficiente uuid;
  v_perda uuid;
  v_expirada uuid;
  v_venda uuid;
  v_resultado jsonb;
  v_saldo_fruta numeric;
  v_saldo_produto integer;
begin
  select id into v_categoria_ingrediente from public.categorias_ingredientes where slug = 'outros';
  select id into v_categoria_embalagem from public.categorias_ingredientes where slug = 'embalagens';
  insert into public.categorias_produtos (nome, slug) values ('Produção teste', 'producao-teste') returning id into v_categoria_produto;
  insert into public.produtos (categoria_id, nome, slug, descricao_curta, peso_liquido, unidade, preco_venda, status)
  values (v_categoria_produto, 'Geleia produção teste', 'geleia-producao-teste', 'Produto para validar o fluxo de produção.', 250, 'g', 20, 'ATIVO')
  returning id into v_produto;

  insert into public.ingredientes (categoria_id, nome, unidade_estoque, custo_medio, quantidade_disponivel, estoque_minimo)
  values (v_categoria_ingrediente, 'Fruta produção teste', 'kg', 12, 20, 1) returning id into v_fruta;
  insert into public.ingredientes (categoria_id, nome, unidade_estoque, custo_medio, quantidade_disponivel, estoque_minimo)
  values (v_categoria_ingrediente, 'Açúcar produção teste', 'kg', 4.5, 20, 1) returning id into v_acucar;
  insert into public.ingredientes (categoria_id, nome, unidade_estoque, custo_medio, quantidade_disponivel, estoque_minimo)
  values (v_categoria_embalagem, 'Pote produção teste', 'unidade', 1, 100, 10) returning id into v_pote;

  v_receita := public.salvar_receita(
    null, 'Receita produção teste', v_produto, null, null, 1500, 250, null, true,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade', 1.5, 'unidade', 'kg'),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade', 1, 'unidade', 'kg'),
      jsonb_build_object('ingrediente_id', v_pote, 'quantidade', 6, 'unidade', 'unidade')
    )
  );

  v_saldo_fruta := (select quantidade_disponivel from public.ingredientes where id = v_fruta);
  v_saldo_produto := (select quantidade_disponivel from public.produtos where id = v_produto);
  v_producao := public.salvar_producao_em_preparo(null, v_receita, 2, current_date, null, null, null, null, null, null);

  if (select status from public.producoes where id = v_producao) <> 'RASCUNHO' then raise exception 'Produção não foi salva em preparo'; end if;
  if (select quantidade_planejada from public.producoes where id = v_producao) <> 12 then raise exception 'Multiplicador da receita incorreto'; end if;
  if (select quantidade_prevista from public.producao_itens where producao_id = v_producao and ingrediente_id = v_fruta) <> 3 then raise exception 'Quantidade prevista incorreta'; end if;
  if (select quantidade_disponivel from public.ingredientes where id = v_fruta) <> v_saldo_fruta
     or (select quantidade_disponivel from public.produtos where id = v_produto) <> v_saldo_produto then
    raise exception 'Salvar em preparo alterou o estoque';
  end if;

  perform public.salvar_producao_em_preparo(
    v_producao, v_receita, 2, current_date, 11, current_date + 30, 2800,
    'Produção principal', 'Evaporação acima do esperado',
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade_utilizada', 2.8),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade_utilizada', 2),
      jsonb_build_object('ingrediente_id', v_pote, 'quantidade_utilizada', 11)
    )
  );
  v_resultado := public.concluir_producao(v_producao);

  if v_resultado ->> 'lote' is null then raise exception 'Código do lote não foi gerado'; end if;
  if (select quantidade_disponivel from public.ingredientes where id = v_fruta) <> 17.2 then raise exception 'Baixa do ingrediente incorreta'; end if;
  if (select quantidade_disponivel from public.produtos where id = v_produto) <> 11 then raise exception 'Entrada do produto incorreta'; end if;
  if (select custo_real from public.producoes where id = v_producao) <> 53.60 then raise exception 'Custo direto incorreto'; end if;
  if (select custo_ingredientes from public.producoes where id = v_producao) <> 42.60 then raise exception 'Custo dos ingredientes incorreto'; end if;
  if (select custo_embalagens from public.producoes where id = v_producao) <> 11 then raise exception 'Custo das embalagens incorreto'; end if;
  if (select count(*) from public.movimentacoes_estoque where producao_id = v_producao) <> 4 then raise exception 'Movimentações da produção incompletas'; end if;
  if not exists (select 1 from public.lotes_produtos where producao_id = v_producao and quantidade_disponivel = 11) then raise exception 'Saldo do lote não foi criado'; end if;

  begin
    perform public.concluir_producao(v_producao);
    raise exception 'Conclusão duplicada deveria falhar';
  exception when others then
    if sqlerrm = 'Conclusão duplicada deveria falhar' then raise; end if;
  end;
  if (select quantidade_disponivel from public.produtos where id = v_produto) <> 11 then raise exception 'Conclusão duplicada alterou o estoque'; end if;

  perform public.registrar_compra_ingrediente(v_fruta, 1, 'kg', 20, current_date, 'Mudança de custo após produção');
  if (select custo_unitario from public.producao_itens where producao_id = v_producao and ingrediente_id = v_fruta) <> 12 then
    raise exception 'Custo histórico foi sobrescrito';
  end if;
  begin
    update public.producoes set quantidade_produzida = 99 where id = v_producao;
    raise exception 'Histórico concluído deveria ser imutável';
  exception when others then
    if sqlerrm = 'Histórico concluído deveria ser imutável' then raise; end if;
  end;

  v_insuficiente := public.salvar_producao_em_preparo(
    null, v_receita, 1, current_date, 2, current_date + 20, null, null, null,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade_utilizada', 100),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade_utilizada', 1),
      jsonb_build_object('ingrediente_id', v_pote, 'quantidade_utilizada', 2)
    )
  );
  v_saldo_fruta := (select quantidade_disponivel from public.ingredientes where id = v_fruta);
  begin
    perform public.concluir_producao(v_insuficiente);
    raise exception 'Estoque insuficiente deveria bloquear a conclusão';
  exception when others then
    if sqlerrm = 'Estoque insuficiente deveria bloquear a conclusão' then raise; end if;
  end;
  if (select status from public.producoes where id = v_insuficiente) <> 'RASCUNHO'
     or (select quantidade_disponivel from public.ingredientes where id = v_fruta) <> v_saldo_fruta
     or exists (select 1 from public.movimentacoes_estoque where producao_id = v_insuficiente) then
    raise exception 'Falha de conclusão não realizou rollback completo';
  end if;
  perform public.cancelar_producao_em_preparo(v_insuficiente, 'Teste de cancelamento');
  if (select status from public.producoes where id = v_insuficiente) <> 'CANCELADA' then raise exception 'Cancelamento do preparo falhou'; end if;
  begin
    perform public.cancelar_producao_em_preparo(v_producao, 'Cancelamento indevido');
    raise exception 'Produção concluída não deveria ser cancelada';
  exception when others then
    if sqlerrm = 'Produção concluída não deveria ser cancelada' then raise; end if;
  end;

  v_perda := public.salvar_producao_em_preparo(
    null, v_receita, 1, current_date, 0, null, null, 'Teste de perda', 'Falha no preparo',
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade_utilizada', 0.2),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade_utilizada', 0.1),
      jsonb_build_object('ingrediente_id', v_pote, 'quantidade_utilizada', 0)
    )
  );
  v_saldo_produto := (select quantidade_disponivel from public.produtos where id = v_produto);
  perform public.registrar_perda_producao(v_perda, 'Falha no ponto da geleia');
  if (select status from public.producoes where id = v_perda) <> 'CANCELADA'
     or (select quantidade_produzida from public.producoes where id = v_perda) <> 0 then
    raise exception 'Registro de perda não preservou o resultado zero';
  end if;
  if (select quantidade_disponivel from public.produtos where id = v_produto) <> v_saldo_produto then
    raise exception 'Registro de perda adicionou produto acabado';
  end if;
  if (select count(*) from public.movimentacoes_estoque where producao_id = v_perda) <> 2 then
    raise exception 'Registro de perda não baixou os ingredientes usados';
  end if;

  -- Um lote vencido permanece rastreado, mas não pode ser usado em nova venda.
  v_expirada := public.salvar_producao_em_preparo(
    null, v_receita, 1, current_date - 10, 1, current_date - 1, null, null, null,
    jsonb_build_array(
      jsonb_build_object('ingrediente_id', v_fruta, 'quantidade_utilizada', 0.1),
      jsonb_build_object('ingrediente_id', v_acucar, 'quantidade_utilizada', 0),
      jsonb_build_object('ingrediente_id', v_pote, 'quantidade_utilizada', 0)
    )
  );
  perform public.concluir_producao(v_expirada);
  v_venda := public.registrar_venda(null, 'PIX', jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 11)), 0, null, 'PAGA');
  if (select count(*) from public.venda_item_lotes vil join public.venda_itens vi on vi.id = vil.venda_item_id where vi.venda_id = v_venda) = 0 then
    raise exception 'Venda não registrou a alocação FEFO';
  end if;
  begin
    perform public.registrar_venda(null, 'PIX', jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)), 0, null, 'PAGA');
    raise exception 'Venda de lote vencido deveria ser bloqueada';
  exception when others then
    if sqlerrm = 'Venda de lote vencido deveria ser bloqueada' then raise; end if;
  end;
  perform public.cancelar_venda(v_venda, 'Restaurar lote válido');
  if (select quantidade_disponivel from public.lotes_produtos where producao_id = v_producao) <> 11 then raise exception 'Cancelamento não restaurou o lote original'; end if;

  raise notice 'Produção flow test: OK';
end;
$$;

rollback;
