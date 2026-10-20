begin;

alter table public.lotes_produtos
  add column bloqueado boolean not null default false,
  add column motivo_bloqueio text;

alter table public.vendas
  drop constraint vendas_total_check,
  add column numero text,
  add column taxa_entrega numeric(12,2) not null default 0 check (taxa_entrega >= 0),
  add column chave_idempotencia uuid,
  add column entregue boolean not null default false;

with numeradas as (
  select id, 'VEN-' || to_char(data_venda at time zone 'America/Sao_Paulo', 'YYYYMMDD') || '-' ||
    lpad(row_number() over (partition by (data_venda at time zone 'America/Sao_Paulo')::date order by data_venda, id)::text, 3, '0') as numero
  from public.vendas
)
update public.vendas v set numero = n.numero from numeradas n where n.id = v.id;

alter table public.vendas
  alter column numero set not null,
  add constraint vendas_numero_unique unique (numero),
  add constraint vendas_chave_idempotencia_unique unique (chave_idempotencia),
  add constraint vendas_total_check check (valor_total = subtotal - desconto_total + taxa_entrega);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete restrict,
  valor numeric(14,2) not null check (valor > 0),
  forma_pagamento public.forma_pagamento not null,
  recebido_em timestamptz not null default now(),
  recebido_por uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pagamentos_venda_unique unique (venda_id)
);

create table public.estornos_financeiros (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete restrict,
  pagamento_id uuid references public.pagamentos(id) on delete restrict,
  valor numeric(14,2) not null check (valor > 0),
  status text not null check (status in ('PENDENTE', 'REALIZADO')),
  motivo text not null check (char_length(trim(motivo)) >= 3),
  realizado_em timestamptz,
  criado_por uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint estornos_venda_unique unique (venda_id),
  constraint estornos_realizado_check check ((status = 'REALIZADO' and realizado_em is not null) or (status = 'PENDENTE' and realizado_em is null))
);

insert into public.pagamentos (venda_id, valor, forma_pagamento, recebido_em, recebido_por)
select id, valor_total, forma_pagamento, data_venda, criado_por
from public.vendas
where status = 'PAGA' and valor_total > 0
on conflict (venda_id) do nothing;

insert into public.configuracoes (chave, valor, descricao, publica)
values ('negocio.fuso_horario', '"America/Sao_Paulo"'::jsonb, 'Fuso horário usado nas operações comerciais', false)
on conflict (chave) do nothing;

create index vendas_forma_data_idx on public.vendas(forma_pagamento, data_venda desc);
create index pagamentos_data_idx on public.pagamentos(recebido_em desc);
create index estornos_status_data_idx on public.estornos_financeiros(status, created_at desc);
create index lotes_venda_elegiveis_idx on public.lotes_produtos(produto_id, validade, created_at) where quantidade_disponivel > 0 and not bloqueado;

create or replace function public.data_operacao_local()
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_fuso text;
begin
  select valor #>> '{}' into v_fuso from public.configuracoes where chave = 'negocio.fuso_horario';
  return (now() at time zone coalesce(nullif(v_fuso, ''), 'America/Sao_Paulo'))::date;
exception when others then return (now() at time zone 'America/Sao_Paulo')::date;
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
  -- Serializa reenvios simultaneos da mesma requisicao antes da consulta.
  perform pg_advisory_xact_lock(hashtext('venda-idempotencia:' || p_chave_idempotencia::text));
  select id, numero, valor_total, status into v_existente from public.vendas where chave_idempotencia = p_chave_idempotencia;
  if found then return jsonb_build_object('venda_id', v_existente.id, 'numero', v_existente.numero, 'valor_total', v_existente.valor_total, 'status', v_existente.status, 'duplicada', true); end if;
  if p_status not in ('PAGA', 'PENDENTE') then raise exception 'Status inicial inválido'; end if;
  if p_desconto_total < 0 or p_taxa_entrega < 0 then raise exception 'Desconto e entrega não podem ser negativos'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Adicione ao menos um produto'; end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <> (select count(distinct value ->> 'produto_id') from jsonb_array_elements(p_itens)) then raise exception 'Não repita o mesmo produto'; end if;
  if p_cliente_id is not null and not exists (select 1 from public.clientes where id = p_cliente_id and ativo) then raise exception 'Cliente não encontrado ou inativo'; end if;

  select valor #>> '{}' into v_fuso from public.configuracoes where chave = 'negocio.fuso_horario';
  v_fuso := coalesce(nullif(v_fuso, ''), 'America/Sao_Paulo');
  perform pg_advisory_xact_lock(hashtext('venda:' || v_data_local::text));
  select count(*) + 1 into v_sequencia from public.vendas where (data_venda at time zone v_fuso)::date = v_data_local;
  v_numero := 'VEN-' || to_char(v_data_local, 'YYYYMMDD') || '-' || lpad(v_sequencia::text, 3, '0');
  insert into public.vendas (numero, chave_idempotencia, cliente_id, subtotal, desconto_total, taxa_entrega, valor_total, forma_pagamento, status, observacoes, criado_por)
  values (v_numero, p_chave_idempotencia, p_cliente_id, 0, 0, 0, 0, p_forma_pagamento, p_status, nullif(trim(p_observacoes), ''), auth.uid())
  returning id into v_venda_id;

  perform set_config('app.operacao_estoque', 'permitida', true);
  for v_item in select value from jsonb_array_elements(p_itens) order by value ->> 'produto_id'
  loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_quantidade <= 0 then raise exception 'A quantidade deve ser um número inteiro positivo'; end if;
    select id, nome, preco_venda, quantidade_disponivel, status into v_produto
    from public.produtos where id = (v_item ->> 'produto_id')::uuid for update;
    if not found or v_produto.status <> 'ATIVO' then raise exception 'Produto indisponível'; end if;
    if v_produto.quantidade_disponivel < v_quantidade then raise exception 'Estoque insuficiente para %. Disponível: % potes', v_produto.nome, v_produto.quantidade_disponivel; end if;
    v_subtotal_item := round(v_quantidade * v_produto.preco_venda, 2);
    insert into public.venda_itens (venda_id, produto_id, produto_nome, quantidade, preco_unitario, desconto, subtotal)
    values (v_venda_id, v_produto.id, v_produto.nome, v_quantidade, v_produto.preco_venda, 0, v_subtotal_item)
    returning id into v_venda_item_id;

    if exists (select 1 from public.lotes_produtos where produto_id = v_produto.id) then
      v_restante := v_quantidade;
      for v_lote in
        select id, quantidade_disponivel from public.lotes_produtos
        where produto_id = v_produto.id and quantidade_disponivel > 0 and not bloqueado and validade >= v_data_local
        order by validade, created_at, id for update
      loop
        exit when v_restante = 0;
        v_usar := least(v_restante, v_lote.quantidade_disponivel);
        update public.lotes_produtos set quantidade_disponivel = quantidade_disponivel - v_usar where id = v_lote.id;
        insert into public.venda_item_lotes(venda_item_id, lote_produto_id, quantidade) values (v_venda_item_id, v_lote.id, v_usar);
        v_restante := v_restante - v_usar;
      end loop;
      if v_restante > 0 then raise exception 'Estoque elegível insuficiente para %. Verifique lotes vencidos ou bloqueados', v_produto.nome; end if;
    end if;
    update public.produtos set quantidade_disponivel = quantidade_disponivel - v_quantidade,
      status = case when quantidade_disponivel - v_quantidade = 0 then 'ESGOTADO' else status end where id = v_produto.id;
    insert into public.movimentacoes_estoque (origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, venda_id, usuario_id)
    values ('VENDA', 'PRODUTO', v_produto.id, 'VENDA', -v_quantidade, v_produto.quantidade_disponivel, v_produto.quantidade_disponivel - v_quantidade, v_venda_id, auth.uid());
    v_subtotal := v_subtotal + v_subtotal_item;
  end loop;
  if p_desconto_total > v_subtotal then raise exception 'O desconto não pode ser maior que o subtotal'; end if;
  v_total := round(v_subtotal - p_desconto_total + p_taxa_entrega, 2);
  update public.vendas set subtotal = v_subtotal, desconto_total = p_desconto_total, taxa_entrega = p_taxa_entrega, valor_total = v_total where id = v_venda_id;
  if p_status = 'PAGA' and v_total > 0 then
    insert into public.pagamentos(venda_id, valor, forma_pagamento, recebido_por) values (v_venda_id, v_total, p_forma_pagamento, auth.uid());
  end if;
  perform set_config('app.operacao_estoque', '', true);
  return jsonb_build_object('venda_id', v_venda_id, 'numero', v_numero, 'valor_total', v_total, 'status', p_status, 'duplicada', false);
end;
$$;

create or replace function public.registrar_pagamento_venda(p_venda_id uuid, p_forma_pagamento public.forma_pagamento)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_venda public.vendas%rowtype; v_id uuid;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_venda.status = 'CANCELADA' then raise exception 'Venda cancelada não pode receber pagamento'; end if;
  if v_venda.status = 'PAGA' or exists (select 1 from public.pagamentos where venda_id = p_venda_id) then raise exception 'O pagamento desta venda já foi registrado'; end if;
  insert into public.pagamentos(venda_id, valor, forma_pagamento, recebido_por)
  values (p_venda_id, v_venda.valor_total, p_forma_pagamento, auth.uid()) returning id into v_id;
  update public.vendas set status = 'PAGA', forma_pagamento = p_forma_pagamento where id = p_venda_id;
  return v_id;
end;
$$;

create or replace function public.registrar_venda(
  p_cliente_id uuid, p_forma_pagamento public.forma_pagamento, p_itens jsonb,
  p_desconto_total numeric default 0, p_observacoes text default null,
  p_status public.venda_status default 'PAGA'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_resultado jsonb;
begin
  v_resultado := public.registrar_venda_segura(public.gen_random_uuid(), p_cliente_id, p_forma_pagamento, p_itens, p_desconto_total, 0, p_observacoes, p_status);
  return (v_resultado ->> 'venda_id')::uuid;
end;
$$;

create or replace function public.cancelar_venda_segura(
  p_venda_id uuid, p_motivo text, p_retornar_estoque boolean default false, p_estorno_realizado boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_venda public.vendas%rowtype; v_item record; v_lote record; v_saldo integer; v_pagamento uuid;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo do cancelamento'; end if;
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_venda.status = 'CANCELADA' then raise exception 'Esta venda já foi cancelada'; end if;
  perform set_config('app.operacao_estoque', 'permitida', true);
  if p_retornar_estoque then
    for v_lote in
      select lp.id, lp.validade, lp.bloqueado, vil.quantidade
      from public.venda_item_lotes vil join public.venda_itens vi on vi.id = vil.venda_item_id
      join public.lotes_produtos lp on lp.id = vil.lote_produto_id
      where vi.venda_id = p_venda_id order by lp.id for update of lp
    loop
      if v_lote.validade < public.data_operacao_local() or v_lote.bloqueado then raise exception 'O lote não está apto para retornar ao estoque comercializável'; end if;
      update public.lotes_produtos set quantidade_disponivel = quantidade_disponivel + v_lote.quantidade where id = v_lote.id;
    end loop;
    for v_item in select produto_id, quantidade from public.venda_itens where venda_id = p_venda_id order by produto_id
    loop
      select quantidade_disponivel into v_saldo from public.produtos where id = v_item.produto_id for update;
      update public.produtos set quantidade_disponivel = quantidade_disponivel + v_item.quantidade,
        status = case when status = 'ESGOTADO' then 'ATIVO' else status end where id = v_item.produto_id;
      insert into public.movimentacoes_estoque(origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, venda_id, observacoes, usuario_id)
      values ('CANCELAMENTO', 'PRODUTO', v_item.produto_id, 'CANCELAMENTO', v_item.quantidade, v_saldo, v_saldo + v_item.quantidade, p_venda_id, trim(p_motivo), auth.uid());
    end loop;
  end if;
  select id into v_pagamento from public.pagamentos where venda_id = p_venda_id;
  if v_pagamento is not null then
    insert into public.estornos_financeiros(venda_id, pagamento_id, valor, status, motivo, realizado_em, criado_por)
    values (p_venda_id, v_pagamento, v_venda.valor_total, case when p_estorno_realizado then 'REALIZADO' else 'PENDENTE' end,
      trim(p_motivo), case when p_estorno_realizado then now() else null end, auth.uid());
  end if;
  update public.vendas set status = 'CANCELADA', cancelada_em = now(), cancelada_por = auth.uid(),
    observacoes = concat_ws(E'\n', observacoes, 'Cancelamento: ' || trim(p_motivo)) where id = p_venda_id;
  perform set_config('app.operacao_estoque', '', true);
end;
$$;

create or replace function public.cancelar_venda(p_venda_id uuid, p_observacoes text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin perform public.cancelar_venda_segura(p_venda_id, coalesce(nullif(trim(p_observacoes), ''), 'Cancelamento solicitado'), false, false); end;
$$;

create or replace function public.confirmar_estorno_financeiro(p_venda_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_estorno public.estornos_financeiros%rowtype;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select * into v_estorno from public.estornos_financeiros where venda_id = p_venda_id for update;
  if not found then raise exception 'Estorno financeiro nao encontrado'; end if;
  if v_estorno.status = 'REALIZADO' then raise exception 'Este estorno ja foi confirmado'; end if;
  update public.estornos_financeiros set status = 'REALIZADO', realizado_em = now() where id = v_estorno.id;
end;
$$;

alter table public.pagamentos enable row level security;
alter table public.estornos_financeiros enable row level security;
grant select on public.pagamentos, public.estornos_financeiros to authenticated;
create policy pagamentos_read_staff on public.pagamentos for select to authenticated using (public.is_staff());
create policy estornos_read_staff on public.estornos_financeiros for select to authenticated using (public.is_staff());
revoke all on public.pagamentos, public.estornos_financeiros from anon;
revoke insert, update, delete on public.vendas, public.venda_itens, public.venda_item_lotes, public.pagamentos, public.estornos_financeiros from authenticated;
revoke all on function public.registrar_venda_segura(uuid, uuid, public.forma_pagamento, jsonb, numeric, numeric, text, public.venda_status) from public, anon;
revoke all on function public.registrar_pagamento_venda(uuid, public.forma_pagamento) from public, anon;
revoke all on function public.cancelar_venda_segura(uuid, text, boolean, boolean) from public, anon;
revoke all on function public.confirmar_estorno_financeiro(uuid) from public, anon;
revoke all on function public.data_operacao_local() from public, anon;
grant execute on function public.registrar_venda_segura(uuid, uuid, public.forma_pagamento, jsonb, numeric, numeric, text, public.venda_status) to authenticated;
grant execute on function public.registrar_pagamento_venda(uuid, public.forma_pagamento) to authenticated;
grant execute on function public.cancelar_venda_segura(uuid, text, boolean, boolean) to authenticated;
grant execute on function public.confirmar_estorno_financeiro(uuid) to authenticated;
grant execute on function public.data_operacao_local() to authenticated;

commit;
