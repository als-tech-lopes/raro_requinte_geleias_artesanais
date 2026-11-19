begin;

-- Produtos que já possuem lotes podem receber ajustes manuais pelo cadastro.
-- A parte do saldo consolidado que não pertence a nenhum lote é estoque manual
-- comercializável; lotes vencidos ou bloqueados continuam fora do saldo elegível.
create or replace function public.estoque_elegivel_produto(p_produto_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce((
      select sum(lp.quantidade_disponivel)
      from public.lotes_produtos lp
      where lp.produto_id = p.id
        and lp.quantidade_disponivel > 0
        and not lp.bloqueado
        and lp.validade >= public.data_operacao_local()
    ), 0)
    + greatest(
        coalesce(p.quantidade_disponivel, 0)
        - coalesce((
            select sum(lp.quantidade_disponivel)
            from public.lotes_produtos lp
            where lp.produto_id = p.id
          ), 0),
        0
      )
  )::integer
  from public.produtos p
  where p.id = p_produto_id;
$$;

revoke all on function public.estoque_elegivel_produto(uuid) from public, anon, authenticated;

create or replace view public.catalogo_produtos
with (security_barrier = true) as
select
  p.id, p.categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
  p.nome, p.slug, p.descricao_curta, p.descricao,
  v.peso_liquido, v.unidade, v.preco_venda,
  coalesce(vs.variacoes, '[]'::jsonb) as variacoes,
  p.destaque, p.imagem_principal_path, p.ingredientes_publicos,
  p.conservacao, p.alergenos, p.observacoes_rotulagem,
  (
    coalesce((
      select sum(lp.quantidade_disponivel)
      from public.lotes_produtos lp
      where lp.produto_id = p.id
        and lp.quantidade_disponivel > 0
        and not lp.bloqueado
        and lp.validade >= public.data_operacao_local()
    ), 0)
    + greatest(
        p.quantidade_disponivel
        - coalesce((
            select sum(lp.quantidade_disponivel)
            from public.lotes_produtos lp
            where lp.produto_id = p.id
          ), 0),
        0
      )
  ) > 0 as disponivel
from public.produtos p
join public.categorias_produtos c on c.id = p.categoria_id
join lateral (
  select pv.peso_liquido, pv.unidade, pv.preco_venda
  from public.produto_variacoes pv
  where pv.produto_id = p.id
  order by pv.ordem
  limit 1
) v on true
join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', pv.id,
    'peso_liquido', pv.peso_liquido,
    'unidade', pv.unidade,
    'preco_venda', pv.preco_venda
  ) order by pv.ordem) as variacoes
  from public.produto_variacoes pv
  where pv.produto_id = p.id
) vs on true
where p.status <> 'INATIVO' and p.publicado and c.ativo;

revoke all on public.catalogo_produtos from public;
grant select on public.catalogo_produtos to anon, authenticated;

create or replace function public.catalogo_validar_sacola(p_itens jsonb)
returns table (
  produto_id uuid, variacao_id uuid, nome text, slug text, peso_liquido numeric,
  unidade public.unidade_medida, preco_venda numeric, imagem_principal_path text,
  quantidade_solicitada integer, valido boolean, motivo text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then raise exception 'Formato inválido para a sacola'; end if;
  if jsonb_array_length(p_itens) > 50 then raise exception 'A sacola excede o limite de itens'; end if;

  return query
  with solicitados as (
    select x.produto_id, x.variacao_id, x.quantidade
    from jsonb_to_recordset(p_itens) as x(produto_id uuid, variacao_id uuid, quantidade integer)
  ), dados as (
    select
      s.produto_id solicitado_id,
      coalesce(s.variacao_id, padrao.id) solicitado_variacao_id,
      s.quantidade,
      p.id, p.nome, p.slug, pv.peso_liquido, pv.unidade, pv.preco_venda,
      p.imagem_principal_path, p.status, p.publicado, c.ativo categoria_ativa,
      coalesce(public.estoque_elegivel_produto(p.id), 0) estoque_elegivel
    from solicitados s
    left join public.produtos p on p.id = s.produto_id
    left join public.categorias_produtos c on c.id = p.categoria_id
    left join lateral (
      select pv0.id
      from public.produto_variacoes pv0
      where pv0.produto_id = p.id
      order by pv0.ordem
      limit 1
    ) padrao on true
    left join public.produto_variacoes pv
      on pv.id = coalesce(s.variacao_id, padrao.id) and pv.produto_id = p.id
  )
  select
    d.solicitado_id, d.solicitado_variacao_id, d.nome, d.slug,
    d.peso_liquido, d.unidade, d.preco_venda, d.imagem_principal_path, d.quantidade,
    d.id is not null and d.peso_liquido is not null and d.status = 'ATIVO'
      and d.publicado and d.categoria_ativa and d.quantidade > 0
      and d.estoque_elegivel >= d.quantidade,
    case
      when d.id is null or not coalesce(d.publicado, false) or d.status = 'INATIVO'
        or not coalesce(d.categoria_ativa, false) then 'Produto não está mais disponível no catálogo'
      when d.status <> 'ATIVO' then 'Produto temporariamente esgotado'
      when d.peso_liquido is null then 'Tamanho não está mais disponível'
      when d.quantidade is null or d.quantidade <= 0 then 'Quantidade inválida'
      when d.estoque_elegivel < d.quantidade then 'Quantidade solicitada indisponível'
      else null
    end
  from dados d;
end;
$$;

create or replace function public.registrar_venda_segura(
  p_chave_idempotencia uuid,
  p_cliente_id uuid,
  p_forma_pagamento public.forma_pagamento,
  p_itens jsonb,
  p_desconto_total numeric default 0,
  p_taxa_entrega numeric default 0,
  p_observacoes text default null,
  p_status public.venda_status default 'PAGA'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda_id uuid;
  v_venda_item_id uuid;
  v_existente record;
  v_item jsonb;
  v_produto record;
  v_lote record;
  v_quantidade integer;
  v_restante integer;
  v_usar integer;
  v_estoque_elegivel integer;
  v_subtotal_item numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_total numeric(14,2);
  v_numero text;
  v_sequencia integer;
  v_data_local date := public.data_operacao_local();
  v_fuso text;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_chave_idempotencia is null then raise exception 'Identificador da operação ausente'; end if;
  perform pg_advisory_xact_lock(hashtext('venda-idempotencia:' || p_chave_idempotencia::text));
  select id, numero, valor_total, status into v_existente
  from public.vendas where chave_idempotencia = p_chave_idempotencia;
  if found then
    return jsonb_build_object('venda_id', v_existente.id, 'numero', v_existente.numero,
      'valor_total', v_existente.valor_total, 'status', v_existente.status, 'duplicada', true);
  end if;
  if p_status not in ('PAGA', 'PENDENTE') then raise exception 'Status inicial inválido'; end if;
  if p_desconto_total < 0 or p_taxa_entrega < 0 then raise exception 'Desconto e entrega não podem ser negativos'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Adicione ao menos um produto'; end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <>
     (select count(distinct value ->> 'produto_id') from jsonb_array_elements(p_itens)) then
    raise exception 'Não repita o mesmo produto';
  end if;
  if p_cliente_id is not null and not exists (
    select 1 from public.clientes where id = p_cliente_id and ativo
  ) then raise exception 'Cliente não encontrado ou inativo'; end if;

  select valor #>> '{}' into v_fuso from public.configuracoes where chave = 'negocio.fuso_horario';
  v_fuso := coalesce(nullif(v_fuso, ''), 'America/Sao_Paulo');
  perform pg_advisory_xact_lock(hashtext('venda:' || v_data_local::text));
  select count(*) + 1 into v_sequencia
  from public.vendas where (data_venda at time zone v_fuso)::date = v_data_local;
  v_numero := 'VEN-' || to_char(v_data_local, 'YYYYMMDD') || '-' || lpad(v_sequencia::text, 3, '0');
  insert into public.vendas (
    numero, chave_idempotencia, cliente_id, subtotal, desconto_total, taxa_entrega,
    valor_total, forma_pagamento, status, observacoes, criado_por
  ) values (
    v_numero, p_chave_idempotencia, p_cliente_id, 0, 0, 0, 0,
    p_forma_pagamento, p_status, nullif(trim(p_observacoes), ''), auth.uid()
  ) returning id into v_venda_id;

  perform set_config('app.operacao_estoque', 'permitida', true);
  for v_item in select value from jsonb_array_elements(p_itens) order by value ->> 'produto_id'
  loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_quantidade <= 0 then raise exception 'A quantidade deve ser um número inteiro positivo'; end if;
    select id, nome, preco_venda, quantidade_disponivel, status into v_produto
    from public.produtos where id = (v_item ->> 'produto_id')::uuid for update;
    if not found or v_produto.status <> 'ATIVO' then raise exception 'Produto indisponível'; end if;

    v_estoque_elegivel := coalesce(public.estoque_elegivel_produto(v_produto.id), 0);
    if v_estoque_elegivel < v_quantidade then
      raise exception 'Estoque elegível insuficiente para %. Disponível: % potes',
        v_produto.nome, v_estoque_elegivel;
    end if;

    v_subtotal_item := round(v_quantidade * v_produto.preco_venda, 2);
    insert into public.venda_itens (
      venda_id, produto_id, produto_nome, quantidade, preco_unitario, desconto, subtotal
    ) values (
      v_venda_id, v_produto.id, v_produto.nome, v_quantidade,
      v_produto.preco_venda, 0, v_subtotal_item
    ) returning id into v_venda_item_id;

    v_restante := v_quantidade;
    for v_lote in
      select id, quantidade_disponivel
      from public.lotes_produtos
      where produto_id = v_produto.id and quantidade_disponivel > 0
        and not bloqueado and validade >= v_data_local
      order by validade, created_at, id
      for update
    loop
      exit when v_restante = 0;
      v_usar := least(v_restante, v_lote.quantidade_disponivel);
      update public.lotes_produtos
      set quantidade_disponivel = quantidade_disponivel - v_usar
      where id = v_lote.id;
      insert into public.venda_item_lotes(venda_item_id, lote_produto_id, quantidade)
      values (v_venda_item_id, v_lote.id, v_usar);
      v_restante := v_restante - v_usar;
    end loop;
    -- O restante, quando houver, pertence ao saldo manual sem lote.

    update public.produtos
    set quantidade_disponivel = quantidade_disponivel - v_quantidade,
        status = case when quantidade_disponivel - v_quantidade = 0 then 'ESGOTADO' else status end
    where id = v_produto.id;
    insert into public.movimentacoes_estoque (
      origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior,
      saldo_posterior, venda_id, usuario_id
    ) values (
      'VENDA', 'PRODUTO', v_produto.id, 'VENDA', -v_quantidade,
      v_produto.quantidade_disponivel, v_produto.quantidade_disponivel - v_quantidade,
      v_venda_id, auth.uid()
    );
    v_subtotal := v_subtotal + v_subtotal_item;
  end loop;

  if p_desconto_total > v_subtotal then raise exception 'O desconto não pode ser maior que o subtotal'; end if;
  v_total := round(v_subtotal - p_desconto_total + p_taxa_entrega, 2);
  update public.vendas
  set subtotal = v_subtotal, desconto_total = p_desconto_total,
      taxa_entrega = p_taxa_entrega, valor_total = v_total
  where id = v_venda_id;
  if p_status = 'PAGA' and v_total > 0 then
    insert into public.pagamentos(venda_id, valor, forma_pagamento, recebido_por)
    values (v_venda_id, v_total, p_forma_pagamento, auth.uid());
  end if;
  perform set_config('app.operacao_estoque', '', true);
  return jsonb_build_object('venda_id', v_venda_id, 'numero', v_numero,
    'valor_total', v_total, 'status', p_status, 'duplicada', false);
end;
$$;

-- Repara registros antigos caso tenham sido deixados como esgotados por uma
-- versão anterior do formulário. A restrição atual normalmente já impede isso.
update public.produtos
set status = 'ATIVO'
where status = 'ESGOTADO' and quantidade_disponivel > 0;

commit;
