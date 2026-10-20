begin;

create table public.categorias_ingredientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ordem integer not null default 0 check (ordem >= 0),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categorias_ingredientes_nome_unique unique (nome),
  constraint categorias_ingredientes_slug_unique unique (slug)
);

insert into public.categorias_ingredientes (nome, slug, ordem) values
  ('Frutas', 'frutas', 10),
  ('Açúcares e adoçantes', 'acucares-e-adocantes', 20),
  ('Especiarias', 'especiarias', 30),
  ('Conservantes e acidulantes', 'conservantes-e-acidulantes', 40),
  ('Embalagens', 'embalagens', 50),
  ('Outros', 'outros', 60);

alter table public.ingredientes
  add column categoria_id uuid,
  add column observacoes text;

update public.ingredientes
set categoria_id = (select id from public.categorias_ingredientes where slug = 'outros')
where categoria_id is null;

alter table public.ingredientes
  alter column categoria_id set not null,
  add constraint ingredientes_categoria_id_fkey
    foreign key (categoria_id) references public.categorias_ingredientes(id) on delete restrict;

create table public.compras_ingredientes (
  id uuid primary key default gen_random_uuid(),
  ingrediente_id uuid not null references public.ingredientes(id) on delete restrict,
  quantidade_compra numeric(14,3) not null check (quantidade_compra > 0),
  unidade_compra public.unidade_medida not null,
  quantidade_estoque numeric(14,3) not null check (quantidade_estoque > 0),
  unidade_estoque public.unidade_medida not null,
  valor_total numeric(14,2) not null check (valor_total > 0),
  custo_unitario_estoque numeric(14,4) not null check (custo_unitario_estoque > 0),
  data_compra date not null default current_date,
  observacoes text,
  criado_por uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.movimentacoes_estoque
  add column compra_ingrediente_id uuid references public.compras_ingredientes(id) on delete restrict,
  add column unidade_item public.unidade_medida,
  add column custo_unitario numeric(14,4) check (custo_unitario is null or custo_unitario >= 0),
  add column valor_total numeric(14,2) check (valor_total is null or valor_total >= 0);

alter table public.movimentacoes_estoque drop constraint movimentacoes_referencia_check;
alter table public.movimentacoes_estoque add constraint movimentacoes_referencia_check check (
  (origem = 'PRODUCAO' and producao_id is not null and venda_id is null and compra_ingrediente_id is null)
  or (origem in ('VENDA', 'CANCELAMENTO') and venda_id is not null and producao_id is null and compra_ingrediente_id is null)
  or (origem = 'COMPRA' and compra_ingrediente_id is not null and producao_id is null and venda_id is null)
  or (origem = 'MANUAL' and producao_id is null and venda_id is null and compra_ingrediente_id is null)
);

-- A migration precisa completar os movimentos historicos com unidade e custo.
-- O trigger continua protegendo a tabela para todas as operacoes da aplicacao;
-- ele fica desabilitado apenas dentro deste backfill transacional.
alter table public.movimentacoes_estoque
  disable trigger movimentacoes_estoque_immutable;

update public.movimentacoes_estoque m
set unidade_item = i.unidade_estoque,
    custo_unitario = i.custo_medio,
    valor_total = round(abs(m.quantidade) * i.custo_medio, 2)
from public.ingredientes i
where m.ingrediente_id = i.id;

update public.movimentacoes_estoque m
set unidade_item = 'unidade',
    custo_unitario = p.custo_estimado,
    valor_total = round(abs(m.quantidade) * p.custo_estimado, 2)
from public.produtos p
where m.produto_id = p.id;

alter table public.movimentacoes_estoque
  enable trigger movimentacoes_estoque_immutable;

create index ingredientes_categoria_idx on public.ingredientes(categoria_id, ativo, nome);
create index compras_ingredientes_item_data_idx on public.compras_ingredientes(ingrediente_id, data_compra desc, created_at desc);
create index movimentacoes_compra_idx on public.movimentacoes_estoque(compra_ingrediente_id) where compra_ingrediente_id is not null;

create trigger categorias_ingredientes_set_updated_at
before update on public.categorias_ingredientes
for each row execute function public.set_updated_at();

create trigger compras_ingredientes_immutable
before update or delete on public.compras_ingredientes
for each row execute function public.bloquear_mutacao_movimentacao();

create trigger ingredientes_proteger_custo
before update of custo_medio on public.ingredientes
for each row when (old.custo_medio is distinct from new.custo_medio)
execute function public.proteger_saldo_estoque();

create or replace function public.proteger_unidade_ingrediente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'A unidade de estoque nao pode ser alterada depois do cadastro';
end;
$$;

create trigger ingredientes_proteger_unidade
before update of unidade_estoque on public.ingredientes
for each row when (old.unidade_estoque is distinct from new.unidade_estoque)
execute function public.proteger_unidade_ingrediente();

create or replace function public.preencher_valor_movimentacao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_unidade public.unidade_medida;
  v_custo numeric(14,4);
begin
  if new.item_tipo = 'INGREDIENTE' then
    select unidade_estoque, custo_medio into v_unidade, v_custo
    from public.ingredientes where id = new.ingrediente_id;
  else
    select 'unidade'::public.unidade_medida, custo_estimado into v_unidade, v_custo
    from public.produtos where id = new.produto_id;
  end if;
  new.unidade_item := coalesce(new.unidade_item, v_unidade);
  new.custo_unitario := coalesce(new.custo_unitario, v_custo, 0);
  new.valor_total := coalesce(new.valor_total, round(abs(new.quantidade) * new.custo_unitario, 2));
  return new;
end;
$$;

create trigger movimentacoes_preencher_valor
before insert on public.movimentacoes_estoque
for each row execute function public.preencher_valor_movimentacao();

create or replace function public.cadastrar_ingrediente(
  p_nome text,
  p_categoria_id uuid,
  p_unidade_estoque public.unidade_medida,
  p_estoque_minimo numeric default 0,
  p_quantidade_inicial numeric default 0,
  p_valor_total_inicial numeric default 0,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingrediente_id uuid;
  v_custo numeric(14,4) := 0;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_nome), '') is null or char_length(trim(p_nome)) < 2 then raise exception 'Informe o nome do ingrediente'; end if;
  if not exists (select 1 from public.categorias_ingredientes where id = p_categoria_id and ativa) then raise exception 'Categoria não encontrada ou inativa'; end if;
  if p_estoque_minimo < 0 or p_quantidade_inicial < 0 or p_valor_total_inicial < 0 then raise exception 'Quantidades e valores não podem ser negativos'; end if;
  if p_unidade_estoque = 'unidade' and (p_quantidade_inicial <> trunc(p_quantidade_inicial) or p_estoque_minimo <> trunc(p_estoque_minimo)) then raise exception 'Quantidade em unidades deve ser inteira'; end if;
  if p_quantidade_inicial = 0 and p_valor_total_inicial <> 0 then raise exception 'Informe uma quantidade inicial para o valor pago'; end if;
  if p_quantidade_inicial > 0 and p_valor_total_inicial <= 0 then raise exception 'Informe o valor pago pelo estoque inicial'; end if;
  if p_quantidade_inicial > 0 then v_custo := round(p_valor_total_inicial / p_quantidade_inicial, 4); end if;

  insert into public.ingredientes (
    categoria_id, nome, unidade_estoque, custo_medio, quantidade_disponivel,
    estoque_minimo, observacoes
  ) values (
    p_categoria_id, trim(p_nome), p_unidade_estoque, v_custo, p_quantidade_inicial,
    p_estoque_minimo, nullif(trim(p_observacoes), '')
  ) returning id into v_ingrediente_id;

  if p_quantidade_inicial > 0 then
    insert into public.movimentacoes_estoque (
      origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
      saldo_posterior, unidade_item, custo_unitario, valor_total, observacoes, usuario_id
    ) values (
      'MANUAL', 'INGREDIENTE', v_ingrediente_id, 'ENTRADA', p_quantidade_inicial, 0,
      p_quantidade_inicial, p_unidade_estoque, v_custo, p_valor_total_inicial,
      'Estoque inicial', auth.uid()
    );
  end if;
  return v_ingrediente_id;
end;
$$;

create or replace function public.registrar_compra_ingrediente(
  p_ingrediente_id uuid,
  p_quantidade numeric,
  p_unidade public.unidade_medida,
  p_valor_total numeric,
  p_data_compra date default current_date,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingrediente public.ingredientes%rowtype;
  v_quantidade_estoque numeric(14,3);
  v_novo_saldo numeric(14,3);
  v_custo_compra numeric(14,4);
  v_novo_custo numeric(14,4);
  v_compra_id uuid;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_quantidade <= 0 or p_valor_total <= 0 then raise exception 'Quantidade e valor da compra devem ser maiores que zero'; end if;
  if p_data_compra is null or p_data_compra > current_date then raise exception 'A data da compra não pode estar no futuro'; end if;
  select * into v_ingrediente from public.ingredientes where id = p_ingrediente_id and ativo for update;
  if not found then raise exception 'Ingrediente não encontrado ou inativo'; end if;
  if p_unidade = 'unidade' and p_quantidade <> trunc(p_quantidade) then raise exception 'Quantidade em unidades deve ser inteira'; end if;

  v_quantidade_estoque := round(public.converter_quantidade(p_quantidade, p_unidade, v_ingrediente.unidade_estoque), 3);
  if v_quantidade_estoque <= 0 then raise exception 'Quantidade convertida inválida'; end if;
  v_novo_saldo := v_ingrediente.quantidade_disponivel + v_quantidade_estoque;
  v_custo_compra := round(p_valor_total / v_quantidade_estoque, 4);
  if v_ingrediente.quantidade_disponivel = 0 then
    v_novo_custo := v_custo_compra;
  else
    v_novo_custo := round(((v_ingrediente.quantidade_disponivel * v_ingrediente.custo_medio) + p_valor_total) / v_novo_saldo, 4);
  end if;

  insert into public.compras_ingredientes (
    ingrediente_id, quantidade_compra, unidade_compra, quantidade_estoque,
    unidade_estoque, valor_total, custo_unitario_estoque, data_compra,
    observacoes, criado_por
  ) values (
    p_ingrediente_id, p_quantidade, p_unidade, v_quantidade_estoque,
    v_ingrediente.unidade_estoque, p_valor_total, v_custo_compra, p_data_compra,
    nullif(trim(p_observacoes), ''), auth.uid()
  ) returning id into v_compra_id;

  perform set_config('app.operacao_estoque', 'permitida', true);
  update public.ingredientes
  set quantidade_disponivel = v_novo_saldo, custo_medio = v_novo_custo
  where id = p_ingrediente_id;
  insert into public.movimentacoes_estoque (
    origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
    saldo_posterior, compra_ingrediente_id, unidade_item, custo_unitario,
    valor_total, observacoes, usuario_id
  ) values (
    'COMPRA', 'INGREDIENTE', p_ingrediente_id, 'ENTRADA', v_quantidade_estoque,
    v_ingrediente.quantidade_disponivel, v_novo_saldo, v_compra_id,
    v_ingrediente.unidade_estoque, v_custo_compra, p_valor_total,
    p_observacoes, auth.uid()
  );
  perform set_config('app.operacao_estoque', '', true);
  return v_compra_id;
end;
$$;

create or replace function public.ajustar_estoque_ingrediente(
  p_ingrediente_id uuid,
  p_novo_saldo numeric,
  p_motivo text,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingrediente public.ingredientes%rowtype;
  v_diferenca numeric(14,3);
  v_movimentacao_id uuid;
  v_texto text;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_novo_saldo < 0 then raise exception 'O novo saldo não pode ser negativo'; end if;
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo do ajuste'; end if;
  select * into v_ingrediente from public.ingredientes where id = p_ingrediente_id for update;
  if not found then raise exception 'Ingrediente não encontrado'; end if;
  if v_ingrediente.unidade_estoque = 'unidade' and p_novo_saldo <> trunc(p_novo_saldo) then raise exception 'Quantidade em unidades deve ser inteira'; end if;
  v_diferenca := round(p_novo_saldo - v_ingrediente.quantidade_disponivel, 3);
  if v_diferenca = 0 then raise exception 'O novo saldo é igual ao saldo atual'; end if;
  v_texto := concat(trim(p_motivo), case when nullif(trim(p_observacoes), '') is null then '' else ': ' || trim(p_observacoes) end);

  perform set_config('app.operacao_estoque', 'permitida', true);
  update public.ingredientes set quantidade_disponivel = p_novo_saldo where id = p_ingrediente_id;
  insert into public.movimentacoes_estoque (
    origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
    saldo_posterior, unidade_item, custo_unitario, valor_total, observacoes, usuario_id
  ) values (
    'MANUAL', 'INGREDIENTE', p_ingrediente_id, 'AJUSTE', v_diferenca,
    v_ingrediente.quantidade_disponivel, p_novo_saldo, v_ingrediente.unidade_estoque,
    v_ingrediente.custo_medio, round(abs(v_diferenca) * v_ingrediente.custo_medio, 2),
    v_texto, auth.uid()
  ) returning id into v_movimentacao_id;
  perform set_config('app.operacao_estoque', '', true);
  return v_movimentacao_id;
end;
$$;

alter table public.categorias_ingredientes enable row level security;
alter table public.compras_ingredientes enable row level security;

grant select, insert, update, delete on public.categorias_ingredientes to authenticated;
grant select on public.compras_ingredientes to authenticated;
revoke insert, delete on public.ingredientes from authenticated;

create policy categorias_ingredientes_staff on public.categorias_ingredientes
for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy compras_ingredientes_read_staff on public.compras_ingredientes
for select to authenticated using (public.is_staff());

revoke all on function public.cadastrar_ingrediente(text, uuid, public.unidade_medida, numeric, numeric, numeric, text) from public, anon;
revoke all on function public.registrar_compra_ingrediente(uuid, numeric, public.unidade_medida, numeric, date, text) from public, anon;
revoke all on function public.ajustar_estoque_ingrediente(uuid, numeric, text, text) from public, anon;
revoke all on function public.preencher_valor_movimentacao() from public, anon, authenticated;
revoke all on function public.proteger_unidade_ingrediente() from public, anon, authenticated;
grant execute on function public.cadastrar_ingrediente(text, uuid, public.unidade_medida, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.registrar_compra_ingrediente(uuid, numeric, public.unidade_medida, numeric, date, text) to authenticated;
grant execute on function public.ajustar_estoque_ingrediente(uuid, numeric, text, text) to authenticated;

commit;
