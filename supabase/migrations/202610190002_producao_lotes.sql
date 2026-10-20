begin;

alter table public.producoes
  drop constraint producoes_validade_check,
  drop constraint producoes_quantidade_produzida_check;

alter table public.producoes
  alter column quantidade_produzida drop not null,
  alter column lote drop not null,
  alter column validade drop not null,
  add column multiplicador_receita integer not null default 1 check (multiplicador_receita > 0),
  add column peso_final_g numeric(14,3) check (peso_final_g is null or peso_final_g > 0),
  add column motivo_diferenca text,
  add column custo_ingredientes numeric(14,2) not null default 0 check (custo_ingredientes >= 0),
  add column custo_embalagens numeric(14,2) not null default 0 check (custo_embalagens >= 0),
  add column custo_por_pote numeric(14,4) check (custo_por_pote is null or custo_por_pote >= 0),
  add column concluida_em timestamptz,
  add column cancelada_em timestamptz,
  add column cancelada_por uuid references public.profiles(id) on delete restrict;

update public.producoes
set custo_ingredientes = custo_real,
    custo_por_pote = case when quantidade_produzida > 0 then round(custo_real / quantidade_produzida, 4) end,
    concluida_em = coalesce(updated_at, created_at)
where status = 'CONFIRMADA';

update public.producoes
set lote = null, concluida_em = null, cancelada_em = null, cancelada_por = null
where status = 'RASCUNHO';

update public.producoes
set concluida_em = null,
    cancelada_em = coalesce(cancelada_em, updated_at, created_at),
    cancelada_por = coalesce(cancelada_por, criado_por)
where status = 'CANCELADA';

alter table public.producoes
  add constraint producoes_validade_check check (validade is null or validade >= data_producao),
  add constraint producoes_quantidade_produzida_check check (quantidade_produzida is null or quantidade_produzida >= 0),
  add constraint producoes_estado_check check (
    (status = 'RASCUNHO' and lote is null and concluida_em is null and cancelada_em is null and cancelada_por is null)
    or (status = 'CONFIRMADA' and lote is not null and validade is not null and quantidade_produzida > 0 and concluida_em is not null and cancelada_em is null and cancelada_por is null)
    or (status = 'CANCELADA' and concluida_em is null and cancelada_em is not null and cancelada_por is not null)
  );

alter table public.producao_itens
  drop constraint producao_itens_quantidade_utilizada_check,
  add column updated_at timestamptz not null default now(),
  add column tipo_custo text not null default 'INGREDIENTE'
    check (tipo_custo in ('INGREDIENTE', 'EMBALAGEM')),
  add constraint producao_itens_quantidade_utilizada_check check (quantidade_utilizada >= 0);

create trigger producao_itens_set_updated_at
before update on public.producao_itens
for each row execute function public.set_updated_at();

create table public.lotes_produtos (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid not null unique references public.producoes(id) on delete restrict,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  codigo text not null unique check (char_length(codigo) between 8 and 40),
  data_producao date not null,
  validade date not null,
  quantidade_inicial integer not null check (quantidade_inicial > 0),
  quantidade_disponivel integer not null check (quantidade_disponivel >= 0 and quantidade_disponivel <= quantidade_inicial),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lotes_validade_check check (validade >= data_producao)
);

create table public.venda_item_lotes (
  id uuid primary key default gen_random_uuid(),
  venda_item_id uuid not null references public.venda_itens(id) on delete restrict,
  lote_produto_id uuid not null references public.lotes_produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  created_at timestamptz not null default now(),
  constraint venda_item_lotes_unique unique (venda_item_id, lote_produto_id)
);

alter table public.movimentacoes_estoque
  add column lote_produto_id uuid references public.lotes_produtos(id) on delete restrict;

create index producoes_status_data_idx on public.producoes(status, data_producao desc);
create index producoes_receita_data_idx on public.producoes(receita_id, data_producao desc);
create index lotes_produto_validade_idx on public.lotes_produtos(produto_id, validade, created_at) where quantidade_disponivel > 0;
create index lotes_validade_idx on public.lotes_produtos(validade, quantidade_disponivel) where quantidade_disponivel > 0;
create index venda_item_lotes_lote_idx on public.venda_item_lotes(lote_produto_id);
create index movimentacoes_lote_idx on public.movimentacoes_estoque(lote_produto_id) where lote_produto_id is not null;

create trigger lotes_produtos_set_updated_at
before update on public.lotes_produtos
for each row execute function public.set_updated_at();

insert into public.configuracoes (chave, valor, descricao, publica)
values ('estoque.dias_alerta_validade', '30'::jsonb, 'Dias para alertar sobre lotes próximos do vencimento', false)
on conflict (chave) do nothing;

create or replace function public.salvar_producao_em_preparo(
  p_producao_id uuid,
  p_receita_id uuid,
  p_multiplicador integer,
  p_data_producao date,
  p_quantidade_produzida integer default null,
  p_validade date default null,
  p_peso_final_g numeric default null,
  p_observacoes text default null,
  p_motivo_diferenca text default null,
  p_itens jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producao public.producoes%rowtype;
  v_receita record;
  v_producao_id uuid;
  v_item record;
  v_utilizada numeric;
  v_prevista numeric;
  v_tipo_custo text;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_multiplicador is null or p_multiplicador <= 0 then raise exception 'A quantidade de receitas deve ser um inteiro positivo'; end if;
  if p_data_producao is null then raise exception 'Informe a data da produção'; end if;
  if p_quantidade_produzida is not null and p_quantidade_produzida < 0 then raise exception 'A quantidade produzida não pode ser negativa'; end if;
  if p_peso_final_g is not null and p_peso_final_g <= 0 then raise exception 'O peso final deve ser positivo'; end if;
  if p_validade is not null and p_validade < p_data_producao then raise exception 'A validade não pode anteceder a produção'; end if;

  select r.id, r.produto_id, r.rendimento_potes, r.ativa, p.status as produto_status
  into v_receita
  from public.receitas r
  left join public.produtos p on p.id = r.produto_id
  where r.id = p_receita_id;
  if not found or not v_receita.ativa then raise exception 'Receita ativa não encontrada'; end if;
  if v_receita.produto_id is null then raise exception 'Associe um produto à receita antes de iniciar a produção'; end if;
  if v_receita.produto_status = 'INATIVO' then raise exception 'O produto associado está inativo'; end if;
  if not exists (select 1 from public.receita_itens where receita_id = p_receita_id) then raise exception 'A receita não possui ingredientes'; end if;

  if p_itens is not null then
    if jsonb_typeof(p_itens) <> 'array' then raise exception 'Formato inválido para os ingredientes'; end if;
    if (select count(*) from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade_utilizada numeric)) <>
       (select count(distinct ingrediente_id) from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade_utilizada numeric)) then
      raise exception 'Não repita ingredientes na produção';
    end if;
    if (select count(*) from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade_utilizada numeric)) <>
       (select count(*) from public.receita_itens where receita_id = p_receita_id) then
      raise exception 'Informe todos os ingredientes da receita';
    end if;
  end if;

  perform set_config('app.operacao_producao', 'permitida', true);
  if p_producao_id is null then
    insert into public.producoes (
      produto_id, receita_id, data_producao, multiplicador_receita,
      quantidade_planejada, quantidade_produzida, validade, status,
      peso_final_g, observacoes, motivo_diferenca, criado_por
    ) values (
      v_receita.produto_id, p_receita_id, p_data_producao, p_multiplicador,
      v_receita.rendimento_potes * p_multiplicador, p_quantidade_produzida,
      p_validade, 'RASCUNHO', p_peso_final_g, nullif(trim(p_observacoes), ''),
      nullif(trim(p_motivo_diferenca), ''), auth.uid()
    ) returning id into v_producao_id;
  else
    select * into v_producao from public.producoes where id = p_producao_id for update;
    if not found then raise exception 'Produção não encontrada'; end if;
    if v_producao.status <> 'RASCUNHO' then raise exception 'Somente produções em preparo podem ser alteradas'; end if;
    update public.producoes
    set produto_id = v_receita.produto_id, receita_id = p_receita_id,
        data_producao = p_data_producao, multiplicador_receita = p_multiplicador,
        quantidade_planejada = v_receita.rendimento_potes * p_multiplicador,
        quantidade_produzida = p_quantidade_produzida, validade = p_validade,
        peso_final_g = p_peso_final_g, observacoes = nullif(trim(p_observacoes), ''),
        motivo_diferenca = nullif(trim(p_motivo_diferenca), '')
    where id = p_producao_id;
    delete from public.producao_itens where producao_id = p_producao_id;
    v_producao_id := p_producao_id;
  end if;

  for v_item in
    select ri.ingrediente_id, ri.quantidade, ri.unidade,
           i.unidade_estoque, ci.slug as categoria_slug
    from public.receita_itens ri
    join public.ingredientes i on i.id = ri.ingrediente_id
    join public.categorias_ingredientes ci on ci.id = i.categoria_id
    where ri.receita_id = p_receita_id
    order by ri.ingrediente_id
  loop
    if not exists (
      select 1 from public.ingredientes
      where id = v_item.ingrediente_id and ativo
    ) then raise exception 'A receita possui ingrediente inativo'; end if;
    v_prevista := round(public.converter_quantidade(v_item.quantidade, v_item.unidade, v_item.unidade_estoque) * p_multiplicador, 3);
    if p_itens is null then
      v_utilizada := v_prevista;
    else
      select x.quantidade_utilizada into v_utilizada
      from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade_utilizada numeric)
      where x.ingrediente_id = v_item.ingrediente_id;
      if not found then raise exception 'Ingrediente da receita ausente na produção'; end if;
    end if;
    if v_utilizada is null or v_utilizada < 0 then raise exception 'A quantidade utilizada não pode ser negativa'; end if;
    if v_item.unidade_estoque = 'unidade' and v_utilizada <> trunc(v_utilizada) then raise exception 'Quantidade em unidades deve ser inteira'; end if;
    v_tipo_custo := case when v_item.categoria_slug = 'embalagens' then 'EMBALAGEM' else 'INGREDIENTE' end;
    insert into public.producao_itens (
      producao_id, ingrediente_id, quantidade_prevista, quantidade_utilizada,
      unidade, custo_unitario, custo_total, tipo_custo
    ) values (
      v_producao_id, v_item.ingrediente_id, v_prevista, round(v_utilizada, 3),
      v_item.unidade_estoque, 0, 0, v_tipo_custo
    );
  end loop;
  perform set_config('app.operacao_producao', '', true);
  return v_producao_id;
end;
$$;

create or replace function public.concluir_producao(p_producao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producao public.producoes%rowtype;
  v_produto public.produtos%rowtype;
  v_item record;
  v_saldo numeric;
  v_custo numeric(14,2);
  v_custo_ingredientes numeric(14,2) := 0;
  v_custo_embalagens numeric(14,2) := 0;
  v_custo_total numeric(14,2) := 0;
  v_codigo text;
  v_prefixo text;
  v_sequencia integer;
  v_lote_id uuid;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select * into v_producao from public.producoes where id = p_producao_id for update;
  if not found then raise exception 'Produção não encontrada'; end if;
  if v_producao.status = 'CONFIRMADA' then raise exception 'Essa produção já foi concluída e não pode ser finalizada novamente'; end if;
  if v_producao.status = 'CANCELADA' then raise exception 'Uma produção cancelada não pode ser concluída'; end if;
  if v_producao.quantidade_produzida is null or v_producao.quantidade_produzida <= 0 then raise exception 'Informe ao menos um pote produzido ou cancele a produção'; end if;
  if v_producao.validade is null then raise exception 'Informe a data de validade'; end if;
  if v_producao.validade < v_producao.data_producao then raise exception 'A validade não pode anteceder a produção'; end if;
  if not exists (select 1 from public.producao_itens where producao_id = p_producao_id and quantidade_utilizada > 0) then raise exception 'Informe o consumo real dos ingredientes'; end if;

  select * into v_produto from public.produtos where id = v_producao.produto_id for update;
  if not found or v_produto.status = 'INATIVO' then raise exception 'Produto não encontrado ou inativo'; end if;
  perform set_config('app.operacao_estoque', 'permitida', true);
  perform set_config('app.operacao_producao', 'permitida', true);

  for v_item in
    select pi.*, i.nome as ingrediente_nome, i.quantidade_disponivel, i.custo_medio, i.ativo
    from public.producao_itens pi
    join public.ingredientes i on i.id = pi.ingrediente_id
    where pi.producao_id = p_producao_id
    order by i.id
    for update of i
  loop
    if not v_item.ativo then raise exception 'O ingrediente % está inativo', v_item.ingrediente_nome; end if;
    if v_item.quantidade_disponivel < v_item.quantidade_utilizada then
      raise exception 'Estoque insuficiente: faltam % % de %',
        round(v_item.quantidade_utilizada - v_item.quantidade_disponivel, 3), v_item.unidade, v_item.ingrediente_nome;
    end if;
    v_custo := round(v_item.quantidade_utilizada * v_item.custo_medio, 2);
    update public.producao_itens
    set custo_unitario = v_item.custo_medio, custo_total = v_custo
    where id = v_item.id;
    if v_item.quantidade_utilizada > 0 then
      v_saldo := v_item.quantidade_disponivel;
      update public.ingredientes
      set quantidade_disponivel = quantidade_disponivel - v_item.quantidade_utilizada
      where id = v_item.ingrediente_id;
      insert into public.movimentacoes_estoque (
        origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
        saldo_posterior, producao_id, usuario_id
      ) values (
        'PRODUCAO', 'INGREDIENTE', v_item.ingrediente_id, 'PRODUCAO', -v_item.quantidade_utilizada,
        v_saldo, v_saldo - v_item.quantidade_utilizada, p_producao_id, auth.uid()
      );
    end if;
    if v_item.tipo_custo = 'EMBALAGEM' then v_custo_embalagens := v_custo_embalagens + v_custo;
    else v_custo_ingredientes := v_custo_ingredientes + v_custo; end if;
  end loop;
  v_custo_total := v_custo_ingredientes + v_custo_embalagens;

  perform pg_advisory_xact_lock(hashtext('lote:' || v_producao.data_producao::text));
  v_prefixo := substring(regexp_replace(upper(v_produto.nome), '[^A-Z0-9]', '', 'g') from 1 for 3);
  v_prefixo := rpad(coalesce(nullif(v_prefixo, ''), 'LOT'), 3, 'X');
  select count(*) + 1 into v_sequencia from public.lotes_produtos where data_producao = v_producao.data_producao;
  v_codigo := v_prefixo || '-' || to_char(v_producao.data_producao, 'YYYYMMDD') || '-' || lpad(v_sequencia::text, 3, '0');

  insert into public.lotes_produtos (
    producao_id, produto_id, codigo, data_producao, validade,
    quantidade_inicial, quantidade_disponivel
  ) values (
    p_producao_id, v_producao.produto_id, v_codigo, v_producao.data_producao,
    v_producao.validade, v_producao.quantidade_produzida, v_producao.quantidade_produzida
  ) returning id into v_lote_id;

  v_saldo := v_produto.quantidade_disponivel;
  update public.produtos
  set quantidade_disponivel = quantidade_disponivel + v_producao.quantidade_produzida,
      custo_estimado = round(v_custo_total / v_producao.quantidade_produzida, 2),
      status = case when status = 'ESGOTADO' then 'ATIVO' else status end
  where id = v_producao.produto_id;
  insert into public.movimentacoes_estoque (
    origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior,
    saldo_posterior, producao_id, lote_produto_id, usuario_id
  ) values (
    'PRODUCAO', 'PRODUTO', v_producao.produto_id, 'PRODUCAO', v_producao.quantidade_produzida,
    v_saldo, v_saldo + v_producao.quantidade_produzida, p_producao_id, v_lote_id, auth.uid()
  );
  update public.producoes
  set lote = v_codigo, status = 'CONFIRMADA', custo_real = v_custo_total,
      custo_ingredientes = v_custo_ingredientes, custo_embalagens = v_custo_embalagens,
      custo_por_pote = round(v_custo_total / quantidade_produzida, 4), concluida_em = now()
  where id = p_producao_id;
  perform set_config('app.operacao_estoque', '', true);
  perform set_config('app.operacao_producao', '', true);
  return jsonb_build_object('producao_id', p_producao_id, 'lote', v_codigo, 'quantidade_produzida', v_producao.quantidade_produzida);
end;
$$;

create or replace function public.cancelar_producao_em_preparo(p_producao_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_status public.producao_status;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo do cancelamento'; end if;
  select status into v_status from public.producoes where id = p_producao_id for update;
  if not found then raise exception 'Produção não encontrada'; end if;
  if v_status = 'CONFIRMADA' then raise exception 'Produções concluídas exigem uma rotina específica de estorno'; end if;
  if v_status = 'CANCELADA' then raise exception 'Produção já cancelada'; end if;
  perform set_config('app.operacao_producao', 'permitida', true);
  update public.producoes
  set status = 'CANCELADA', cancelada_em = now(), cancelada_por = auth.uid(),
      observacoes = concat_ws(E'\n', observacoes, 'Cancelamento: ' || trim(p_motivo))
  where id = p_producao_id;
  perform set_config('app.operacao_producao', '', true);
end;
$$;

create or replace function public.registrar_perda_producao(p_producao_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producao public.producoes%rowtype;
  v_item record;
  v_saldo numeric;
  v_custo numeric(14,2);
  v_custo_ingredientes numeric(14,2) := 0;
  v_custo_embalagens numeric(14,2) := 0;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo da perda'; end if;
  select * into v_producao from public.producoes where id = p_producao_id for update;
  if not found then raise exception 'Produção não encontrada'; end if;
  if v_producao.status <> 'RASCUNHO' then raise exception 'Somente uma produção em preparo pode ser registrada como perda'; end if;
  if not exists (select 1 from public.producao_itens where producao_id = p_producao_id and quantidade_utilizada > 0) then raise exception 'Informe os ingredientes efetivamente perdidos'; end if;
  perform set_config('app.operacao_estoque', 'permitida', true);
  perform set_config('app.operacao_producao', 'permitida', true);
  for v_item in
    select pi.*, i.nome as ingrediente_nome, i.quantidade_disponivel, i.custo_medio, i.ativo
    from public.producao_itens pi
    join public.ingredientes i on i.id = pi.ingrediente_id
    where pi.producao_id = p_producao_id
    order by i.id
    for update of i
  loop
    if not v_item.ativo then raise exception 'O ingrediente % está inativo', v_item.ingrediente_nome; end if;
    if v_item.quantidade_disponivel < v_item.quantidade_utilizada then
      raise exception 'Estoque insuficiente: faltam % % de %', round(v_item.quantidade_utilizada - v_item.quantidade_disponivel, 3), v_item.unidade, v_item.ingrediente_nome;
    end if;
    v_custo := round(v_item.quantidade_utilizada * v_item.custo_medio, 2);
    update public.producao_itens set custo_unitario = v_item.custo_medio, custo_total = v_custo where id = v_item.id;
    if v_item.quantidade_utilizada > 0 then
      v_saldo := v_item.quantidade_disponivel;
      update public.ingredientes set quantidade_disponivel = quantidade_disponivel - v_item.quantidade_utilizada where id = v_item.ingrediente_id;
      insert into public.movimentacoes_estoque (
        origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
        saldo_posterior, producao_id, observacoes, usuario_id
      ) values (
        'PRODUCAO', 'INGREDIENTE', v_item.ingrediente_id, 'SAIDA', -v_item.quantidade_utilizada,
        v_saldo, v_saldo - v_item.quantidade_utilizada, p_producao_id, 'Perda de produção: ' || trim(p_motivo), auth.uid()
      );
    end if;
    if v_item.tipo_custo = 'EMBALAGEM' then v_custo_embalagens := v_custo_embalagens + v_custo;
    else v_custo_ingredientes := v_custo_ingredientes + v_custo; end if;
  end loop;
  update public.producoes
  set status = 'CANCELADA', quantidade_produzida = 0,
      custo_real = v_custo_ingredientes + v_custo_embalagens,
      custo_ingredientes = v_custo_ingredientes, custo_embalagens = v_custo_embalagens,
      custo_por_pote = null, cancelada_em = now(), cancelada_por = auth.uid(),
      motivo_diferenca = trim(p_motivo),
      observacoes = concat_ws(E'\n', observacoes, 'Perda de produção: ' || trim(p_motivo))
  where id = p_producao_id;
  perform set_config('app.operacao_estoque', '', true);
  perform set_config('app.operacao_producao', '', true);
end;
$$;

create or replace function public.obter_dias_alerta_validade()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_dias integer;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select (valor #>> '{}')::integer into v_dias
  from public.configuracoes where chave = 'estoque.dias_alerta_validade';
  return greatest(coalesce(v_dias, 30), 0);
exception when invalid_text_representation then
  return 30;
end;
$$;

create or replace function public.proteger_producao_historica()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_status public.producao_status;
begin
  if current_setting('app.operacao_producao', true) = 'permitida' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name = 'producao_itens' then
    select status into v_status from public.producoes where id = coalesce(new.producao_id, old.producao_id);
  else v_status := old.status; end if;
  if v_status in ('CONFIRMADA', 'CANCELADA') then raise exception 'O histórico da produção é imutável'; end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger producoes_proteger_historico
before update or delete on public.producoes
for each row execute function public.proteger_producao_historica();
create trigger producao_itens_proteger_historico
before update or delete on public.producao_itens
for each row execute function public.proteger_producao_historica();

-- Compatibilidade com integrações antigas: o lote informado deixa de ser necessário.
create or replace function public.registrar_producao(
  p_produto_id uuid, p_receita_id uuid, p_data_producao date,
  p_quantidade_planejada integer, p_quantidade_produzida integer,
  p_lote text, p_validade date, p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_rendimento integer; v_multiplicador integer;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select rendimento_potes into v_rendimento from public.receitas where id = p_receita_id and produto_id = p_produto_id and ativa;
  if not found then raise exception 'Receita ativa não encontrada para o produto'; end if;
  v_multiplicador := greatest(1, ceil(p_quantidade_planejada::numeric / v_rendimento)::integer);
  v_id := public.salvar_producao_em_preparo(null, p_receita_id, v_multiplicador, p_data_producao, p_quantidade_produzida, p_validade, null, p_observacoes, null, null);
  perform public.concluir_producao(v_id);
  return v_id;
end;
$$;

-- As vendas passam a consumir lotes válidos em FEFO quando o produto já é
-- rastreado por lote. Produtos legados sem lotes continuam compatíveis.
create or replace function public.registrar_venda(
  p_cliente_id uuid,
  p_forma_pagamento public.forma_pagamento,
  p_itens jsonb,
  p_desconto_total numeric default 0,
  p_observacoes text default null,
  p_status public.venda_status default 'PAGA'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda_id uuid;
  v_venda_item_id uuid;
  v_item jsonb;
  v_produto record;
  v_lote record;
  v_quantidade integer;
  v_restante integer;
  v_usar integer;
  v_preco numeric(12,2);
  v_desconto_item numeric(12,2);
  v_subtotal_item numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_tem_lotes boolean;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_status = 'CANCELADA' then raise exception 'Uma venda nova não pode nascer cancelada'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Informe ao menos um item'; end if;
  if p_desconto_total < 0 then raise exception 'Desconto total inválido'; end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <>
     (select count(distinct value ->> 'produto_id') from jsonb_array_elements(p_itens)) then
    raise exception 'Não repita o mesmo produto nos itens';
  end if;
  if p_cliente_id is not null and not exists (select 1 from public.clientes where id = p_cliente_id and ativo) then
    raise exception 'Cliente não encontrado ou inativo';
  end if;

  insert into public.vendas (cliente_id, subtotal, desconto_total, valor_total, forma_pagamento, status, observacoes, criado_por)
  values (p_cliente_id, 0, 0, 0, p_forma_pagamento, p_status, p_observacoes, auth.uid())
  returning id into v_venda_id;

  perform set_config('app.operacao_estoque', 'permitida', true);
  for v_item in select value from jsonb_array_elements(p_itens) order by value ->> 'produto_id'
  loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_quantidade <= 0 then raise exception 'Quantidade de venda inválida'; end if;
    select id, nome, preco_venda, quantidade_disponivel, status into v_produto
    from public.produtos where id = (v_item ->> 'produto_id')::uuid for update;
    if not found or v_produto.status <> 'ATIVO' then raise exception 'Produto indisponível'; end if;
    if v_produto.quantidade_disponivel < v_quantidade then raise exception 'Estoque insuficiente para %', v_produto.nome; end if;

    select exists (select 1 from public.lotes_produtos where produto_id = v_produto.id) into v_tem_lotes;
    if v_tem_lotes then
      v_restante := v_quantidade;
      for v_lote in
        select id, quantidade_disponivel
        from public.lotes_produtos
        where produto_id = v_produto.id and quantidade_disponivel > 0 and validade >= current_date
        order by validade, created_at, id
        for update
      loop
        exit when v_restante = 0;
        v_usar := least(v_restante, v_lote.quantidade_disponivel);
        update public.lotes_produtos set quantidade_disponivel = quantidade_disponivel - v_usar where id = v_lote.id;
        v_restante := v_restante - v_usar;
      end loop;
      if v_restante > 0 then raise exception 'Estoque em lotes válidos insuficiente para %', v_produto.nome; end if;
    end if;

    v_preco := coalesce((v_item ->> 'preco_unitario')::numeric, v_produto.preco_venda);
    v_desconto_item := coalesce((v_item ->> 'desconto')::numeric, 0);
    v_subtotal_item := round((v_quantidade * v_preco) - v_desconto_item, 2);
    if v_preco < 0 or v_desconto_item < 0 or v_subtotal_item < 0 then raise exception 'Preço ou desconto de item inválido'; end if;
    insert into public.venda_itens (venda_id, produto_id, produto_nome, quantidade, preco_unitario, desconto, subtotal)
    values (v_venda_id, v_produto.id, v_produto.nome, v_quantidade, v_preco, v_desconto_item, v_subtotal_item)
    returning id into v_venda_item_id;

    if v_tem_lotes then
      -- Reconstrói as alocações com base na diferença entre o saldo anterior
      -- bloqueado e o saldo atual, mantendo o mesmo ordenamento FEFO.
      v_restante := v_quantidade;
      for v_lote in
        select id, quantidade_inicial, quantidade_disponivel
        from public.lotes_produtos
        where produto_id = v_produto.id and validade >= current_date
        order by validade, created_at, id
      loop
        exit when v_restante = 0;
        v_usar := least(v_restante, greatest(v_lote.quantidade_inicial - v_lote.quantidade_disponivel - coalesce((
          select sum(vil.quantidade)
          from public.venda_item_lotes vil
          join public.venda_itens vi on vi.id = vil.venda_item_id
          join public.vendas v on v.id = vi.venda_id
          where vil.lote_produto_id = v_lote.id and v.status <> 'CANCELADA'
        ), 0), 0));
        if v_usar > 0 then
          insert into public.venda_item_lotes (venda_item_id, lote_produto_id, quantidade)
          values (v_venda_item_id, v_lote.id, v_usar);
          v_restante := v_restante - v_usar;
        end if;
      end loop;
      if v_restante > 0 then raise exception 'Não foi possível registrar a rastreabilidade dos lotes'; end if;
    end if;

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
  if p_desconto_total > v_subtotal then raise exception 'Desconto total superior ao subtotal'; end if;
  update public.vendas set subtotal = v_subtotal, desconto_total = p_desconto_total, valor_total = v_subtotal - p_desconto_total where id = v_venda_id;
  perform set_config('app.operacao_estoque', '', true);
  return v_venda_id;
end;
$$;

create or replace function public.cancelar_venda(p_venda_id uuid, p_observacoes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas%rowtype;
  v_item record;
  v_alocacao record;
  v_saldo integer;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_venda.status = 'CANCELADA' then raise exception 'Venda já cancelada'; end if;
  perform set_config('app.operacao_estoque', 'permitida', true);
  for v_item in select id, produto_id, quantidade from public.venda_itens where venda_id = p_venda_id order by produto_id
  loop
    for v_alocacao in
      select lote_produto_id, quantidade from public.venda_item_lotes where venda_item_id = v_item.id order by lote_produto_id
    loop
      perform 1 from public.lotes_produtos where id = v_alocacao.lote_produto_id for update;
      update public.lotes_produtos set quantidade_disponivel = quantidade_disponivel + v_alocacao.quantidade where id = v_alocacao.lote_produto_id;
    end loop;
    select quantidade_disponivel into v_saldo from public.produtos where id = v_item.produto_id for update;
    update public.produtos
    set quantidade_disponivel = quantidade_disponivel + v_item.quantidade,
        status = case when status = 'ESGOTADO' then 'ATIVO' else status end
    where id = v_item.produto_id;
    insert into public.movimentacoes_estoque (
      origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior,
      saldo_posterior, venda_id, observacoes, usuario_id
    ) values (
      'CANCELAMENTO', 'PRODUTO', v_item.produto_id, 'CANCELAMENTO', v_item.quantidade,
      v_saldo, v_saldo + v_item.quantidade, p_venda_id, p_observacoes, auth.uid()
    );
  end loop;
  update public.vendas
  set status = 'CANCELADA', cancelada_em = now(), cancelada_por = auth.uid(),
      observacoes = concat_ws(E'\n', observacoes, p_observacoes)
  where id = p_venda_id;
  perform set_config('app.operacao_estoque', '', true);
end;
$$;

alter table public.lotes_produtos enable row level security;
alter table public.venda_item_lotes enable row level security;
grant select on public.lotes_produtos, public.venda_item_lotes to authenticated;
create policy lotes_produtos_read_staff on public.lotes_produtos for select to authenticated using (public.is_staff());
create policy venda_item_lotes_read_staff on public.venda_item_lotes for select to authenticated using (public.is_staff());
revoke all on public.lotes_produtos, public.venda_item_lotes from anon;
revoke insert, update, delete on public.producoes, public.producao_itens, public.lotes_produtos, public.venda_item_lotes from authenticated;

revoke all on function public.salvar_producao_em_preparo(uuid, uuid, integer, date, integer, date, numeric, text, text, jsonb) from public, anon;
revoke all on function public.concluir_producao(uuid) from public, anon;
revoke all on function public.cancelar_producao_em_preparo(uuid, text) from public, anon;
revoke all on function public.registrar_perda_producao(uuid, text) from public, anon;
revoke all on function public.obter_dias_alerta_validade() from public, anon;
revoke all on function public.proteger_producao_historica() from public, anon, authenticated;
grant execute on function public.salvar_producao_em_preparo(uuid, uuid, integer, date, integer, date, numeric, text, text, jsonb) to authenticated;
grant execute on function public.concluir_producao(uuid) to authenticated;
grant execute on function public.cancelar_producao_em_preparo(uuid, text) to authenticated;
grant execute on function public.registrar_perda_producao(uuid, text) to authenticated;
grant execute on function public.obter_dias_alerta_validade() to authenticated;

commit;
