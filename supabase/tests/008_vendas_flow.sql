-- Execute depois da migration 202610190003_vendas_pagamentos.sql.
-- O cenario valida atomicidade, FEFO, idempotencia, pagamentos e cancelamentos.
-- Todos os dados sao revertidos ao final.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('a3333333-3333-4333-8333-333333333333', 'vendas-admin@teste.local', '{"name":"Admin Vendas"}');
select set_config('request.jwt.claim.sub', 'a3333333-3333-4333-8333-333333333333', true);
update public.profiles set papel = 'ADMIN', ativo = true where id = 'a3333333-3333-4333-8333-333333333333';

do $$
declare
  v_categoria uuid;
  v_categoria_ingrediente uuid;
  v_ingrediente uuid;
  v_produto_lotes uuid;
  v_produto_simples uuid;
  v_receita uuid;
  v_producao_1 uuid;
  v_producao_2 uuid;
  v_producao_vencida uuid;
  v_producao_bloqueada uuid;
  v_cliente uuid;
  v_resultado jsonb;
  v_venda_1 uuid;
  v_venda_2 uuid;
  v_venda_3 uuid;
  v_chave_1 uuid := '10000000-0000-4000-8000-000000000001';
  v_chave_2 uuid := '10000000-0000-4000-8000-000000000002';
  v_chave_3 uuid := '10000000-0000-4000-8000-000000000003';
  v_chave_falha uuid := '10000000-0000-4000-8000-000000000004';
  v_movimentos integer;
begin
  if to_regclass('public.pagamentos') is null or to_regclass('public.estornos_financeiros') is null then
    raise exception 'Tabelas financeiras do modulo de vendas ausentes';
  end if;
  if to_regprocedure('public.registrar_venda_segura(uuid,uuid,public.forma_pagamento,jsonb,numeric,numeric,text,public.venda_status)') is null then
    raise exception 'RPC registrar_venda_segura ausente';
  end if;

  select id into v_categoria_ingrediente from public.categorias_ingredientes where slug = 'outros';
  insert into public.categorias_produtos (nome, slug) values ('Vendas teste', 'vendas-teste') returning id into v_categoria;
  insert into public.ingredientes (categoria_id, nome, unidade_estoque, quantidade_disponivel)
  values (v_categoria_ingrediente, 'Ingrediente vendas teste', 'kg', 10) returning id into v_ingrediente;

  insert into public.produtos (categoria_id, nome, slug, descricao_curta, peso_liquido, unidade, preco_venda, quantidade_disponivel, status)
  values (v_categoria, 'Geleia com lotes teste', 'geleia-com-lotes-teste', 'Produto rastreado por lotes para testar vendas.', 250, 'g', 12.50, 15, 'ATIVO')
  returning id into v_produto_lotes;
  insert into public.produtos (categoria_id, nome, slug, descricao_curta, peso_liquido, unidade, preco_venda, quantidade_disponivel, status)
  values (v_categoria, 'Geleia simples teste', 'geleia-simples-teste', 'Produto sem lotes anteriores para testar vendas.', 250, 'g', 20, 10, 'ATIVO')
  returning id into v_produto_simples;

  v_receita := public.salvar_receita(null, 'Receita vendas teste', v_produto_lotes, null, null, 250, 250, null, true,
    jsonb_build_array(jsonb_build_object('ingrediente_id', v_ingrediente, 'quantidade', 0.1, 'unidade', 'kg')));

  insert into public.producoes (produto_id, receita_id, data_producao, quantidade_planejada, quantidade_produzida, lote, validade, status, criado_por, concluida_em)
  values (v_produto_lotes, v_receita, current_date - 4, 2, 2, 'VEN-LOTE-01', current_date + 10, 'CONFIRMADA', auth.uid(), now()) returning id into v_producao_1;
  insert into public.producoes (produto_id, receita_id, data_producao, quantidade_planejada, quantidade_produzida, lote, validade, status, criado_por, concluida_em)
  values (v_produto_lotes, v_receita, current_date - 3, 3, 3, 'VEN-LOTE-02', current_date + 20, 'CONFIRMADA', auth.uid(), now()) returning id into v_producao_2;
  insert into public.producoes (produto_id, receita_id, data_producao, quantidade_planejada, quantidade_produzida, lote, validade, status, criado_por, concluida_em)
  values (v_produto_lotes, v_receita, current_date - 30, 4, 4, 'VEN-LOTE-VENCIDO', current_date - 1, 'CONFIRMADA', auth.uid(), now()) returning id into v_producao_vencida;
  insert into public.producoes (produto_id, receita_id, data_producao, quantidade_planejada, quantidade_produzida, lote, validade, status, criado_por, concluida_em)
  values (v_produto_lotes, v_receita, current_date - 2, 6, 6, 'VEN-LOTE-BLOQUEADO', current_date + 30, 'CONFIRMADA', auth.uid(), now()) returning id into v_producao_bloqueada;

  insert into public.lotes_produtos (producao_id, produto_id, codigo, data_producao, validade, quantidade_inicial, quantidade_disponivel)
  values (v_producao_1, v_produto_lotes, 'VEN-LOTE-01', current_date - 4, current_date + 10, 2, 2),
         (v_producao_2, v_produto_lotes, 'VEN-LOTE-02', current_date - 3, current_date + 20, 3, 3),
         (v_producao_vencida, v_produto_lotes, 'VEN-LOTE-VENCIDO', current_date - 30, current_date - 1, 4, 4);
  insert into public.lotes_produtos (producao_id, produto_id, codigo, data_producao, validade, quantidade_inicial, quantidade_disponivel, bloqueado, motivo_bloqueio)
  values (v_producao_bloqueada, v_produto_lotes, 'VEN-LOTE-BLOQUEADO', current_date - 2, current_date + 30, 6, 6, true, 'Bloqueio de teste');
  insert into public.clientes (nome, telefone) values ('Cliente vendas teste', '11999990000') returning id into v_cliente;

  -- Venda paga sem cliente: preco vem do banco, FEFO ignora lote vencido/bloqueado.
  v_resultado := public.registrar_venda_segura(v_chave_1, null, 'PIX',
    jsonb_build_array(
      jsonb_build_object('produto_id', v_produto_lotes, 'quantidade', 4),
      jsonb_build_object('produto_id', v_produto_simples, 'quantidade', 2)
    ), 5, 3, 'Venda paga de teste', 'PAGA');
  v_venda_1 := (v_resultado ->> 'venda_id')::uuid;

  if (v_resultado ->> 'numero') !~ '^VEN-[0-9]{8}-[0-9]{3}$' then raise exception 'Numero da venda invalido'; end if;
  if (v_resultado ->> 'valor_total')::numeric <> 88 then raise exception 'Total calculado no servidor incorreto'; end if;
  if (select count(*) from public.pagamentos where venda_id = v_venda_1) <> 1 then raise exception 'Pagamento da venda paga nao foi criado'; end if;
  if (select quantidade_disponivel from public.lotes_produtos where codigo = 'VEN-LOTE-01') <> 0 then raise exception 'FEFO nao consumiu o primeiro lote'; end if;
  if (select quantidade_disponivel from public.lotes_produtos where codigo = 'VEN-LOTE-02') <> 1 then raise exception 'FEFO nao completou pelo segundo lote'; end if;
  if (select quantidade_disponivel from public.lotes_produtos where codigo = 'VEN-LOTE-VENCIDO') <> 4
     or (select quantidade_disponivel from public.lotes_produtos where codigo = 'VEN-LOTE-BLOQUEADO') <> 6 then
    raise exception 'Lote vencido ou bloqueado foi consumido';
  end if;

  -- Reenvio com a mesma chave deve retornar a venda original sem efeitos duplicados.
  v_resultado := public.registrar_venda_segura(v_chave_1, v_cliente, 'DINHEIRO', jsonb_build_array(jsonb_build_object('produto_id', v_produto_simples, 'quantidade', 1)), 0, 0, null, 'PAGA');
  if (v_resultado ->> 'venda_id')::uuid <> v_venda_1 or not (v_resultado ->> 'duplicada')::boolean then raise exception 'Idempotencia da venda falhou'; end if;
  if (select count(*) from public.pagamentos where venda_id = v_venda_1) <> 1
     or (select quantidade_disponivel from public.produtos where id = v_produto_simples) <> 8 then raise exception 'Reenvio duplicou pagamento ou estoque'; end if;

  update public.produtos set preco_venda = 99 where id = v_produto_lotes;
  if (select preco_unitario from public.venda_itens where venda_id = v_venda_1 and produto_id = v_produto_lotes) <> 12.50 then raise exception 'Preco historico da venda foi alterado'; end if;

  -- O cancelamento com retorno restaura exatamente os lotes e deixa o estorno pendente.
  perform public.cancelar_venda_segura(v_venda_1, 'Cliente desistiu antes da retirada', true, false);
  if (select quantidade_disponivel from public.produtos where id = v_produto_lotes) <> 15
     or (select quantidade_disponivel from public.produtos where id = v_produto_simples) <> 10 then raise exception 'Retorno de estoque consolidado incorreto'; end if;
  if (select quantidade_disponivel from public.lotes_produtos where codigo = 'VEN-LOTE-01') <> 2
     or (select quantidade_disponivel from public.lotes_produtos where codigo = 'VEN-LOTE-02') <> 3 then raise exception 'Retorno aos lotes originais incorreto'; end if;
  if not exists (select 1 from public.estornos_financeiros where venda_id = v_venda_1 and status = 'PENDENTE') then raise exception 'Estorno pendente nao foi registrado'; end if;
  perform public.confirmar_estorno_financeiro(v_venda_1);
  if not exists (select 1 from public.estornos_financeiros where venda_id = v_venda_1 and status = 'REALIZADO' and realizado_em is not null) then raise exception 'Confirmacao posterior do estorno falhou'; end if;

  -- Venda pendente com cliente e posterior recebimento.
  v_resultado := public.registrar_venda_segura(v_chave_2, v_cliente, 'TRANSFERENCIA', jsonb_build_array(jsonb_build_object('produto_id', v_produto_simples, 'quantidade', 1)), 0, 0, null, 'PENDENTE');
  v_venda_2 := (v_resultado ->> 'venda_id')::uuid;
  if exists (select 1 from public.pagamentos where venda_id = v_venda_2) then raise exception 'Venda pendente criou pagamento'; end if;
  perform public.registrar_pagamento_venda(v_venda_2, 'DINHEIRO');
  if (select status from public.vendas where id = v_venda_2) <> 'PAGA'
     or not exists (select 1 from public.pagamentos where venda_id = v_venda_2 and forma_pagamento = 'DINHEIRO') then raise exception 'Recebimento posterior falhou'; end if;
  begin
    perform public.registrar_pagamento_venda(v_venda_2, 'PIX');
    raise exception 'Pagamento duplicado deveria falhar';
  exception when others then if sqlerrm = 'Pagamento duplicado deveria falhar' then raise; end if; end;
  perform public.cancelar_venda_segura(v_venda_2, 'Produto saiu e nao retornou', false, true);
  if (select quantidade_disponivel from public.produtos where id = v_produto_simples) <> 9 then raise exception 'Cancelamento sem retorno alterou o estoque'; end if;
  if not exists (select 1 from public.estornos_financeiros where venda_id = v_venda_2 and status = 'REALIZADO') then raise exception 'Estorno realizado nao foi registrado'; end if;

  -- Retorno de lote posteriormente bloqueado deve falhar sem cancelar a venda.
  v_resultado := public.registrar_venda_segura(v_chave_3, null, 'PIX', jsonb_build_array(jsonb_build_object('produto_id', v_produto_lotes, 'quantidade', 4)), 0, 0, null, 'PAGA');
  v_venda_3 := (v_resultado ->> 'venda_id')::uuid;
  update public.lotes_produtos set bloqueado = true, motivo_bloqueio = 'Avaria identificada depois da venda'
  where id in (select vil.lote_produto_id from public.venda_item_lotes vil join public.venda_itens vi on vi.id = vil.venda_item_id where vi.venda_id = v_venda_3);
  begin
    perform public.cancelar_venda_segura(v_venda_3, 'Tentativa de retorno inseguro', true, false);
    raise exception 'Retorno de lote bloqueado deveria falhar';
  exception when others then if sqlerrm = 'Retorno de lote bloqueado deveria falhar' then raise; end if; end;
  if (select status from public.vendas where id = v_venda_3) = 'CANCELADA' then raise exception 'Falha de retorno nao realizou rollback'; end if;
  perform public.cancelar_venda_segura(v_venda_3, 'Cancelamento sem retorno do lote avariado', false, false);

  -- Falha de estoque elegivel deve reverter venda, itens e movimentacoes.
  select count(*) into v_movimentos from public.movimentacoes_estoque;
  begin
    perform public.registrar_venda_segura(v_chave_falha, null, 'PIX', jsonb_build_array(jsonb_build_object('produto_id', v_produto_lotes, 'quantidade', 2)), 0, 0, null, 'PAGA');
    raise exception 'Estoque elegivel insuficiente deveria falhar';
  exception when others then if sqlerrm = 'Estoque elegivel insuficiente deveria falhar' then raise; end if; end;
  if exists (select 1 from public.vendas where chave_idempotencia = v_chave_falha)
     or (select count(*) from public.movimentacoes_estoque) <> v_movimentos then raise exception 'Falha da venda nao realizou rollback completo'; end if;

  update public.produtos set status = 'INATIVO' where id = v_produto_simples;
  begin
    perform public.registrar_venda_segura('10000000-0000-4000-8000-000000000005', null, 'PIX', jsonb_build_array(jsonb_build_object('produto_id', v_produto_simples, 'quantidade', 1)), 0, 0, null, 'PAGA');
    raise exception 'Produto inativo deveria ser bloqueado';
  exception when others then if sqlerrm = 'Produto inativo deveria ser bloqueado' then raise; end if; end;

  -- Usuario sem perfil administrativo nao pode executar as RPCs.
  perform set_config('request.jwt.claim.sub', 'b3333333-3333-4333-8333-333333333333', true);
  begin
    perform public.registrar_venda_segura('10000000-0000-4000-8000-000000000006', null, 'PIX', jsonb_build_array(jsonb_build_object('produto_id', v_produto_simples, 'quantidade', 1)), 0, 0, null, 'PAGA');
    raise exception 'Usuario nao autorizado deveria ser bloqueado';
  exception when others then if sqlerrm = 'Usuario nao autorizado deveria ser bloqueado' then raise; end if; end;

  raise notice 'Vendas flow test: OK';
end;
$$;

rollback;
