-- Execute depois da migration 202610180002_nomes_unicos.sql.
-- Todo o cenario e revertido ao final.
begin;

do $$
declare
  v_categoria_produto uuid;
  v_categoria_ingrediente uuid;
  v_produto_id uuid;
  v_ingrediente_id uuid;
begin
  select id into v_categoria_produto
  from public.categorias_produtos
  order by created_at
  limit 1;

  if v_categoria_produto is null then
    insert into public.categorias_produtos (nome, slug)
    values ('Categoria teste de nomes', 'categoria-teste-de-nomes')
    returning id into v_categoria_produto;
  end if;

  select id into v_categoria_ingrediente
  from public.categorias_ingredientes
  where slug = 'outros';

  insert into public.produtos (
    categoria_id, nome, slug, descricao_curta, peso_liquido,
    unidade, preco_venda, status
  ) values (
    v_categoria_produto, '  Produto   Case Teste  ', 'produto-case-teste-1',
    'Produto criado para testar nomes.', 250, 'g', 10, 'INATIVO'
  ) returning id into v_produto_id;

  if (select nome from public.produtos where id = v_produto_id) <> 'Produto Case Teste' then
    raise exception 'Normalizacao do nome do produto falhou';
  end if;

  begin
    insert into public.produtos (
      categoria_id, nome, slug, descricao_curta, peso_liquido,
      unidade, preco_venda, status
    ) values (
      v_categoria_produto, 'produto case teste', 'produto-case-teste-2',
      'Produto duplicado para teste.', 250, 'g', 10, 'INATIVO'
    );
    raise exception 'Produto duplicado deveria ter sido bloqueado';
  exception when unique_violation then
    null;
  end;

  insert into public.ingredientes (
    categoria_id, nome, unidade_estoque
  ) values (
    v_categoria_ingrediente, '  Ingrediente   Case Teste  ', 'kg'
  ) returning id into v_ingrediente_id;

  if (select nome from public.ingredientes where id = v_ingrediente_id) <> 'Ingrediente Case Teste' then
    raise exception 'Normalizacao do nome do ingrediente falhou';
  end if;

  begin
    insert into public.ingredientes (
      categoria_id, nome, unidade_estoque
    ) values (
      v_categoria_ingrediente, 'INGREDIENTE CASE TESTE', 'kg'
    );
    raise exception 'Ingrediente duplicado deveria ter sido bloqueado';
  exception when unique_violation then
    null;
  end;

  raise notice 'Nomes unicos test: OK';
end;
$$;

rollback;
