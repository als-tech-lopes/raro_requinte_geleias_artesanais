-- Execute depois da migration 202610190005_catalogo_publico.sql.
-- Valida publicação, disponibilidade, sacola e isolamento dos dados privados.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('a4444444-4444-4444-8444-444444444444', 'catalogo-admin@teste.local', '{"name":"Admin Catalogo"}');
select set_config('request.jwt.claim.sub', 'a4444444-4444-4444-8444-444444444444', true);
update public.profiles set papel = 'ADMIN', ativo = true where id = 'a4444444-4444-4444-8444-444444444444';

do $$
declare
  v_categoria uuid;
  v_categoria_ingrediente uuid;
  v_ingrediente uuid;
  v_publicado uuid;
  v_oculto uuid;
  v_vencido uuid;
  v_receita uuid;
  v_producao uuid;
  v_resultado record;
  v_vendas integer;
  v_movimentos integer;
begin
  if to_regclass('public.catalogo_produtos') is null then raise exception 'View catalogo_produtos ausente'; end if;
  if to_regprocedure('public.catalogo_validar_sacola(jsonb)') is null then raise exception 'RPC catalogo_validar_sacola ausente'; end if;
  if has_table_privilege('anon', 'public.produtos', 'select') then raise exception 'Anonimo recebeu acesso direto a produtos'; end if;
  if has_table_privilege('anon', 'public.receitas', 'select') or has_table_privilege('anon', 'public.vendas', 'select') or has_table_privilege('anon', 'public.clientes', 'select') then raise exception 'Tabela privada exposta ao anonimo'; end if;
  if not has_table_privilege('anon', 'public.catalogo_produtos', 'select') then raise exception 'Anonimo nao pode consultar a interface publica'; end if;

  select id into v_categoria_ingrediente from public.categorias_ingredientes where slug = 'outros';
  insert into public.categorias_produtos(nome, slug) values ('Catalogo teste', 'catalogo-teste') returning id into v_categoria;
  insert into public.ingredientes(categoria_id, nome, unidade_estoque, quantidade_disponivel)
  values (v_categoria_ingrediente, 'Ingrediente catalogo teste', 'kg', 2) returning id into v_ingrediente;

  insert into public.produtos(categoria_id, nome, slug, descricao_curta, peso_liquido, unidade, preco_venda, quantidade_disponivel, status, publicado, destaque)
  values (v_categoria, 'Geleia publica teste', 'geleia-publica-teste', 'Produto publicado para validar o catalogo.', 250, 'g', 25, 3, 'ATIVO', true, true) returning id into v_publicado;
  insert into public.produtos(categoria_id, nome, slug, descricao_curta, peso_liquido, unidade, preco_venda, quantidade_disponivel, status, publicado)
  values (v_categoria, 'Geleia oculta teste', 'geleia-oculta-teste', 'Produto que nao pode aparecer publicamente.', 250, 'g', 30, 5, 'ATIVO', false) returning id into v_oculto;
  insert into public.produtos(categoria_id, nome, slug, descricao_curta, peso_liquido, unidade, preco_venda, quantidade_disponivel, status, publicado)
  values (v_categoria, 'Geleia vencida teste', 'geleia-vencida-teste', 'Produto com saldo apenas em lote vencido.', 250, 'g', 20, 10, 'ATIVO', true) returning id into v_vencido;

  v_receita := public.salvar_receita(null, 'Receita catalogo teste', v_vencido, null, null, 250, 250, null, true,
    jsonb_build_array(jsonb_build_object('ingrediente_id', v_ingrediente, 'quantidade', 0.1, 'unidade', 'kg')));
  insert into public.producoes(produto_id, receita_id, data_producao, quantidade_planejada, quantidade_produzida, lote, validade, status, criado_por, concluida_em)
  values (v_vencido, v_receita, current_date - 30, 10, 10, 'CAT-VENCIDO-01', current_date - 1, 'CONFIRMADA', auth.uid(), now()) returning id into v_producao;
  insert into public.lotes_produtos(producao_id, produto_id, codigo, data_producao, validade, quantidade_inicial, quantidade_disponivel)
  values (v_producao, v_vencido, 'CAT-VENCIDO-01', current_date - 30, current_date - 1, 10, 10);

  if not exists (select 1 from public.catalogo_produtos where id = v_publicado and disponivel) then raise exception 'Produto publicado nao apareceu'; end if;
  if exists (select 1 from public.catalogo_produtos where id = v_oculto) then raise exception 'Produto despublicado foi exposto'; end if;
  if not exists (select 1 from public.catalogo_produtos where id = v_vencido and not disponivel) then raise exception 'Lote vencido compôs disponibilidade'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'catalogo_produtos' and column_name in ('custo_estimado', 'quantidade_disponivel')) then raise exception 'Custo ou saldo interno foi exposto'; end if;

  select count(*) into v_vendas from public.vendas;
  select count(*) into v_movimentos from public.movimentacoes_estoque;
  select * into v_resultado from public.catalogo_validar_sacola(jsonb_build_array(jsonb_build_object('produto_id', v_publicado, 'quantidade', 2)));
  if not v_resultado.valido or v_resultado.preco_venda <> 25 then raise exception 'Validacao da sacola publica falhou'; end if;
  select * into v_resultado from public.catalogo_validar_sacola(jsonb_build_array(jsonb_build_object('produto_id', v_publicado, 'quantidade', 4)));
  if v_resultado.valido or v_resultado.motivo is null then raise exception 'Quantidade indisponivel nao foi bloqueada'; end if;
  select * into v_resultado from public.catalogo_validar_sacola(jsonb_build_array(jsonb_build_object('produto_id', v_oculto, 'quantidade', 1)));
  if v_resultado.valido then raise exception 'Produto despublicado permaneceu valido na sacola'; end if;
  update public.produtos set preco_venda = 27 where id = v_publicado;
  select * into v_resultado from public.catalogo_validar_sacola(jsonb_build_array(jsonb_build_object('produto_id', v_publicado, 'quantidade', 1)));
  if v_resultado.preco_venda <> 27 then raise exception 'Sacola nao retornou o preco atual'; end if;
  if (select count(*) from public.vendas) <> v_vendas or (select count(*) from public.movimentacoes_estoque) <> v_movimentos then raise exception 'Consulta da sacola alterou venda ou estoque'; end if;

  insert into public.depoimentos(nome_publico, comentario, nota, aprovado, autorizado_publicacao)
  values ('Cliente autorizado', 'Depoimento real autorizado para o teste.', 5, true, true),
         ('Cliente sem autorizacao', 'Este texto nao deve aparecer publicamente.', 5, true, false);
  if (select count(*) from public.catalogo_depoimentos where nome_publico like 'Cliente%') <> 1 then raise exception 'Filtro de depoimentos publicos falhou'; end if;

  if not exists (select 1 from public.catalogo_configuracoes where chave = 'catalogo.nome_comercial') then raise exception 'Configuracoes publicas ausentes'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_staff_insert' and roles @> array['authenticated']::name[]) then raise exception 'Politica de upload administrativo ausente'; end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd = 'INSERT' and roles @> array['anon']::name[]) then raise exception 'Upload anonimo permitido'; end if;

  update public.produtos set publicado = false where id = v_publicado;
  if exists (select 1 from public.catalogo_produtos where id = v_publicado) then raise exception 'Despublicacao nao removeu o produto'; end if;

  raise notice 'Catalogo publico test: OK';
end;
$$;

rollback;
