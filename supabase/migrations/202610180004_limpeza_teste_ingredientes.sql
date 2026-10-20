begin;

do $$
declare
  v_movimentacoes integer;
  v_compras integer;
  v_producao_itens integer;
  v_receita_itens integer;
  v_ingredientes integer;
begin
  -- Movimentacoes e compras sao imutaveis durante o uso normal. Os triggers
  -- ficam suspensos somente nesta limpeza administrativa e transacional.
  alter table public.movimentacoes_estoque
    disable trigger movimentacoes_estoque_immutable;

  delete from public.movimentacoes_estoque
  where ingrediente_id is not null;
  get diagnostics v_movimentacoes = row_count;

  alter table public.movimentacoes_estoque
    enable trigger movimentacoes_estoque_immutable;

  alter table public.compras_ingredientes
    disable trigger compras_ingredientes_immutable;

  delete from public.compras_ingredientes;
  get diagnostics v_compras = row_count;

  alter table public.compras_ingredientes
    enable trigger compras_ingredientes_immutable;

  delete from public.producao_itens;
  get diagnostics v_producao_itens = row_count;

  delete from public.receita_itens;
  get diagnostics v_receita_itens = row_count;

  delete from public.ingredientes;
  get diagnostics v_ingredientes = row_count;

  raise notice 'Limpeza: % ingredientes, % compras, % movimentos, % itens de receita e % itens de producao removidos',
    v_ingredientes, v_compras, v_movimentacoes, v_receita_itens, v_producao_itens;
end;
$$;

do $$
declare
  v_usuario_id uuid;
  v_categoria_id uuid;
  v_ingrediente_id uuid;
  v_indice integer;
  v_nomes text[] := array[
    'Morango teste CRUD',
    'Acucar teste CRUD',
    'Limao teste CRUD',
    'Canela teste CRUD',
    'Pote teste CRUD'
  ];
  v_unidades public.unidade_medida[] := array[
    'kg'::public.unidade_medida,
    'kg'::public.unidade_medida,
    'unidade'::public.unidade_medida,
    'g'::public.unidade_medida,
    'unidade'::public.unidade_medida
  ];
begin
  select id into v_usuario_id
  from public.profiles
  where ativo and papel in ('ADMIN', 'OPERADOR')
  order by created_at, id
  limit 1;

  if v_usuario_id is null then
    raise exception 'Nenhum usuario administrativo ativo disponivel para o teste CRUD';
  end if;

  select id into v_categoria_id
  from public.categorias_ingredientes
  where slug = 'outros' and ativa;

  if v_categoria_id is null then
    raise exception 'Categoria Outros nao encontrada para o teste CRUD';
  end if;

  perform set_config('request.jwt.claim.sub', v_usuario_id::text, true);

  for v_indice in 1..array_length(v_nomes, 1) loop
    -- Cadastro sem estoque ou historico, como realizado pelo formulario.
    v_ingrediente_id := public.cadastrar_ingrediente(
      v_nomes[v_indice],
      v_categoria_id,
      v_unidades[v_indice],
      v_indice,
      0,
      0,
      'Cadastro temporario do teste CRUD'
    );

    if not exists (
      select 1 from public.ingredientes
      where id = v_ingrediente_id
        and nome = v_nomes[v_indice]
        and quantidade_disponivel = 0
    ) then
      raise exception 'Falha ao cadastrar ingrediente de teste %', v_indice;
    end if;

    -- Edicao dos mesmos campos permitidos pelo modulo administrativo.
    update public.ingredientes
    set nome = v_nomes[v_indice] || ' Editado',
        estoque_minimo = v_indice + 1,
        observacoes = 'Edicao validada pelo teste CRUD'
    where id = v_ingrediente_id;

    if not exists (
      select 1 from public.ingredientes
      where id = v_ingrediente_id
        and nome = v_nomes[v_indice] || ' Editado'
        and estoque_minimo = v_indice + 1
        and observacoes = 'Edicao validada pelo teste CRUD'
    ) then
      raise exception 'Falha ao editar ingrediente de teste %', v_indice;
    end if;

    -- Exclusao pela mesma RPC utilizada na interface.
    perform public.excluir_ingrediente(v_ingrediente_id);

    if exists (select 1 from public.ingredientes where id = v_ingrediente_id) then
      raise exception 'Falha ao excluir ingrediente de teste %', v_indice;
    end if;
  end loop;

  if exists (select 1 from public.ingredientes) then
    raise exception 'O teste terminou com ingredientes residuais';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  raise notice 'CRUD de 5 ingredientes: OK';
end;
$$;

commit;
