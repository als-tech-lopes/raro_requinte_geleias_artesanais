begin;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-4111-8111-111111111111', 'admin@teste.local', '{"name":"Admin Teste"}');

update public.profiles
set papel = 'ADMIN', ativo = true
where id = '11111111-1111-4111-8111-111111111111';

insert into public.categorias_produtos (id, nome, slug)
values ('22222222-2222-4222-8222-222222222222', 'Clássicas', 'classicas');

insert into public.produtos (
  id, categoria_id, nome, slug, descricao_curta, peso_liquido,
  unidade, preco_venda, status
) values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'Geleia de Morango', 'geleia-de-morango',
  'Geleia artesanal de morangos maduros.', 250, 'g', 25, 'ATIVO'
);

insert into public.ingredientes (id, nome, unidade_estoque, custo_medio)
values
  ('44444444-4444-4444-8444-444444444444', 'Morango', 'kg', 12),
  ('55555555-5555-4555-8555-555555555555', 'Açúcar', 'g', 0.006);

insert into public.receitas (id, produto_id, nome, rendimento_potes)
values (
  '66666666-6666-4666-8666-666666666666',
  '33333333-3333-4333-8333-333333333333',
  'Receita base de morango', 10
);

insert into public.receita_itens (receita_id, ingrediente_id, quantidade, unidade)
values
  ('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 1, 'kg'),
  ('66666666-6666-4666-8666-666666666666', '55555555-5555-4555-8555-555555555555', 500, 'g');

select public.ajustar_estoque('INGREDIENTE', '44444444-4444-4444-8444-444444444444', 5, 'Carga inicial de teste');
select public.ajustar_estoque('INGREDIENTE', '55555555-5555-4555-8555-555555555555', 5000, 'Carga inicial de teste');

select public.registrar_producao(
  '33333333-3333-4333-8333-333333333333',
  '66666666-6666-4666-8666-666666666666',
  current_date, 10, 10, 'LOTE-TESTE', current_date + 90, null
);

do $$
declare
  v_venda uuid;
begin
  if (select quantidade_disponivel from public.produtos where id = '33333333-3333-4333-8333-333333333333') <> 10 then
    raise exception 'Produção não incrementou o produto';
  end if;
  if (select quantidade_disponivel from public.ingredientes where id = '44444444-4444-4444-8444-444444444444') <> 4 then
    raise exception 'Produção não baixou o morango';
  end if;

  v_venda := public.registrar_venda(
    null,
    'PIX',
    '[{"produto_id":"33333333-3333-4333-8333-333333333333","quantidade":2}]'::jsonb,
    0,
    'Venda de teste',
    'PAGA'
  );
  if (select quantidade_disponivel from public.produtos where id = '33333333-3333-4333-8333-333333333333') <> 8 then
    raise exception 'Venda não baixou o produto';
  end if;

  perform public.cancelar_venda(v_venda, 'Cancelamento de teste');
  if (select quantidade_disponivel from public.produtos where id = '33333333-3333-4333-8333-333333333333') <> 10 then
    raise exception 'Cancelamento não restaurou o produto';
  end if;

  begin
    perform public.cancelar_venda(v_venda, 'Segundo cancelamento');
    raise exception 'Segundo cancelamento deveria falhar';
  exception when others then
    if sqlerrm = 'Segundo cancelamento deveria falhar' then raise; end if;
  end;

  begin
    update public.produtos set quantidade_disponivel = 99
    where id = '33333333-3333-4333-8333-333333333333';
    raise exception 'Atualização direta deveria falhar';
  exception when others then
    if sqlerrm = 'Atualização direta deveria falhar' then raise; end if;
  end;

  if (select count(*) from public.movimentacoes_estoque) <> 7 then
    raise exception 'Quantidade inesperada de movimentos';
  end if;
  raise notice 'Inventory flow test: OK';
end;
$$;

rollback;
