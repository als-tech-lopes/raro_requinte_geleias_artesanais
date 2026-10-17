begin;

create extension if not exists pgcrypto;

create type public.perfil_papel as enum ('ADMIN', 'OPERADOR');
create type public.unidade_medida as enum ('kg', 'g', 'L', 'ml', 'unidade');
create type public.produto_status as enum ('ATIVO', 'INATIVO', 'ESGOTADO');
create type public.producao_status as enum ('RASCUNHO', 'CONFIRMADA', 'CANCELADA');
create type public.venda_status as enum ('PENDENTE', 'PAGA', 'CANCELADA');
create type public.forma_pagamento as enum ('PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA');
create type public.item_estoque_tipo as enum ('INGREDIENTE', 'PRODUTO');
create type public.movimentacao_tipo as enum ('ENTRADA', 'SAIDA', 'AJUSTE', 'PRODUCAO', 'VENDA', 'CANCELAMENTO');
create type public.movimentacao_origem as enum ('MANUAL', 'COMPRA', 'PRODUCAO', 'VENDA', 'CANCELAMENTO');
create type public.midia_tipo as enum ('BANNER', 'PRODUCAO', 'INSTITUCIONAL', 'DIVULGACAO');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  papel public.perfil_papel not null default 'OPERADOR',
  ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fornecedores_nome_unique unique (nome)
);

create table public.categorias_produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  descricao text,
  ordem integer not null default 0 check (ordem >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categorias_produtos_nome_unique unique (nome),
  constraint categorias_produtos_slug_unique unique (slug)
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_produtos(id) on delete restrict,
  nome text not null check (char_length(nome) between 3 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  descricao_curta text not null check (char_length(descricao_curta) between 10 and 180),
  descricao text,
  peso_liquido numeric(12,3) not null check (peso_liquido > 0),
  unidade public.unidade_medida not null,
  preco_venda numeric(12,2) not null check (preco_venda >= 0),
  custo_estimado numeric(12,2) not null default 0 check (custo_estimado >= 0),
  quantidade_disponivel integer not null default 0 check (quantidade_disponivel >= 0),
  status public.produto_status not null default 'INATIVO',
  destaque boolean not null default false,
  imagem_principal_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint produtos_slug_unique unique (slug),
  constraint produtos_esgotado_check check (status <> 'ESGOTADO' or quantidade_disponivel = 0)
);

create table public.produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  ordem integer not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint produto_imagens_storage_path_unique unique (storage_path),
  constraint produto_imagens_produto_ordem_unique unique (produto_id, ordem)
);

create table public.ingredientes (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  nome text not null check (char_length(nome) between 2 and 120),
  unidade_estoque public.unidade_medida not null,
  custo_medio numeric(14,4) not null default 0 check (custo_medio >= 0),
  quantidade_disponivel numeric(14,3) not null default 0 check (quantidade_disponivel >= 0),
  estoque_minimo numeric(14,3) not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredientes_nome_unique unique (nome)
);

create table public.receitas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete restrict,
  nome text not null check (char_length(nome) between 3 and 120),
  rendimento_potes integer not null check (rendimento_potes > 0),
  instrucoes text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receitas_produto_unique unique (produto_id)
);

create table public.receita_itens (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas(id) on delete cascade,
  ingrediente_id uuid not null references public.ingredientes(id) on delete restrict,
  quantidade numeric(14,3) not null check (quantidade > 0),
  unidade public.unidade_medida not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receita_itens_unique unique (receita_id, ingrediente_id)
);

create table public.producoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete restrict,
  receita_id uuid not null references public.receitas(id) on delete restrict,
  data_producao date not null default current_date,
  quantidade_planejada integer not null check (quantidade_planejada > 0),
  quantidade_produzida integer not null check (quantidade_produzida > 0),
  lote text not null,
  validade date not null,
  status public.producao_status not null default 'CONFIRMADA',
  custo_real numeric(14,2) not null default 0 check (custo_real >= 0),
  observacoes text,
  criado_por uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint producoes_lote_produto_unique unique (produto_id, lote),
  constraint producoes_validade_check check (validade >= data_producao)
);

create table public.producao_itens (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid not null references public.producoes(id) on delete restrict,
  ingrediente_id uuid not null references public.ingredientes(id) on delete restrict,
  quantidade_prevista numeric(14,3) not null check (quantidade_prevista > 0),
  quantidade_utilizada numeric(14,3) not null check (quantidade_utilizada > 0),
  unidade public.unidade_medida not null,
  custo_unitario numeric(14,4) not null check (custo_unitario >= 0),
  custo_total numeric(14,2) not null check (custo_total >= 0),
  created_at timestamptz not null default now(),
  constraint producao_itens_unique unique (producao_id, ingrediente_id)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text,
  whatsapp text,
  email text,
  cpf text,
  endereco text,
  cidade text,
  estado char(2),
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_cpf_unique unique (cpf),
  constraint clientes_email_check check (email is null or position('@' in email) > 1),
  constraint clientes_estado_check check (estado is null or estado ~ '^[A-Z]{2}$')
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  data_venda timestamptz not null default now(),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  desconto_total numeric(14,2) not null default 0 check (desconto_total >= 0),
  valor_total numeric(14,2) not null check (valor_total >= 0),
  forma_pagamento public.forma_pagamento not null,
  status public.venda_status not null default 'PENDENTE',
  observacoes text,
  cancelada_em timestamptz,
  cancelada_por uuid references public.profiles(id) on delete restrict,
  criado_por uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendas_desconto_check check (desconto_total <= subtotal),
  constraint vendas_total_check check (valor_total = subtotal - desconto_total),
  constraint vendas_cancelamento_check check (
    (status = 'CANCELADA' and cancelada_em is not null and cancelada_por is not null)
    or (status <> 'CANCELADA' and cancelada_em is null and cancelada_por is null)
  )
);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete restrict,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  produto_nome text not null,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  constraint venda_itens_unique unique (venda_id, produto_id),
  constraint venda_itens_calculo_check check (subtotal = (quantidade * preco_unitario) - desconto),
  constraint venda_itens_desconto_limite_check check (desconto <= quantidade * preco_unitario)
);

create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  origem public.movimentacao_origem not null,
  item_tipo public.item_estoque_tipo not null,
  ingrediente_id uuid references public.ingredientes(id) on delete restrict,
  produto_id uuid references public.produtos(id) on delete restrict,
  tipo public.movimentacao_tipo not null,
  quantidade numeric(14,3) not null check (quantidade <> 0),
  saldo_anterior numeric(14,3) not null check (saldo_anterior >= 0),
  saldo_posterior numeric(14,3) not null check (saldo_posterior >= 0),
  producao_id uuid references public.producoes(id) on delete restrict,
  venda_id uuid references public.vendas(id) on delete restrict,
  observacoes text,
  usuario_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint movimentacoes_saldo_check check (saldo_posterior = saldo_anterior + quantidade),
  constraint movimentacoes_item_check check (
    (item_tipo = 'INGREDIENTE' and ingrediente_id is not null and produto_id is null)
    or (item_tipo = 'PRODUTO' and produto_id is not null and ingrediente_id is null)
  ),
  constraint movimentacoes_produto_inteiro_check check (
    produto_id is null or (
      quantidade = trunc(quantidade)
      and saldo_anterior = trunc(saldo_anterior)
      and saldo_posterior = trunc(saldo_posterior)
    )
  ),
  constraint movimentacoes_referencia_check check (
    (origem = 'PRODUCAO' and producao_id is not null and venda_id is null)
    or (origem in ('VENDA', 'CANCELAMENTO') and venda_id is not null and producao_id is null)
    or (origem in ('MANUAL', 'COMPRA') and producao_id is null and venda_id is null)
  )
);

create table public.depoimentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  nome_publico text not null check (char_length(nome_publico) between 2 and 80),
  comentario text not null check (char_length(comentario) between 10 and 1000),
  nota smallint not null check (nota between 1 and 5),
  foto_path text,
  aprovado boolean not null default false,
  destaque boolean not null default false,
  data_depoimento date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.midias (
  id uuid primary key default gen_random_uuid(),
  tipo public.midia_tipo not null,
  titulo text not null,
  storage_path text not null,
  alt_text text,
  metadados jsonb not null default '{}'::jsonb,
  publico boolean not null default false,
  ordem integer not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint midias_storage_path_unique unique (storage_path),
  constraint midias_metadados_object_check check (jsonb_typeof(metadados) = 'object')
);

create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null check (chave ~ '^[a-z0-9_.-]+$'),
  valor jsonb not null,
  descricao text,
  publica boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configuracoes_chave_unique unique (chave)
);

create index produtos_categoria_idx on public.produtos(categoria_id);
create index produtos_status_idx on public.produtos(status);
create index produtos_destaque_idx on public.produtos(destaque) where destaque;
create index produto_imagens_produto_idx on public.produto_imagens(produto_id, ordem);
create index ingredientes_fornecedor_idx on public.ingredientes(fornecedor_id);
create index ingredientes_estoque_baixo_idx on public.ingredientes(quantidade_disponivel, estoque_minimo) where ativo;
create index receita_itens_receita_idx on public.receita_itens(receita_id);
create index receita_itens_ingrediente_idx on public.receita_itens(ingrediente_id);
create index producoes_data_idx on public.producoes(data_producao desc);
create index producoes_produto_idx on public.producoes(produto_id, data_producao desc);
create index producao_itens_producao_idx on public.producao_itens(producao_id);
create index clientes_nome_idx on public.clientes(lower(nome));
create index clientes_whatsapp_idx on public.clientes(whatsapp) where whatsapp is not null;
create index vendas_data_idx on public.vendas(data_venda desc);
create index vendas_cliente_idx on public.vendas(cliente_id, data_venda desc) where cliente_id is not null;
create index vendas_status_idx on public.vendas(status, data_venda desc);
create index venda_itens_venda_idx on public.venda_itens(venda_id);
create index venda_itens_produto_idx on public.venda_itens(produto_id);
create index movimentacoes_ingrediente_idx on public.movimentacoes_estoque(ingrediente_id, created_at desc) where ingrediente_id is not null;
create index movimentacoes_produto_idx on public.movimentacoes_estoque(produto_id, created_at desc) where produto_id is not null;
create index movimentacoes_producao_idx on public.movimentacoes_estoque(producao_id) where producao_id is not null;
create index movimentacoes_venda_idx on public.movimentacoes_estoque(venda_id) where venda_id is not null;
create index depoimentos_publicos_idx on public.depoimentos(destaque, data_depoimento desc) where aprovado;
create index midias_publicas_idx on public.midias(tipo, ordem) where publico;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare tabela text;
begin
  foreach tabela in array array[
    'profiles', 'fornecedores', 'categorias_produtos', 'produtos',
    'produto_imagens', 'ingredientes', 'receitas', 'receita_itens',
    'producoes', 'clientes', 'vendas', 'depoimentos', 'midias', 'configuracoes'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      tabela,
      tabela
    );
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ativo and papel in ('ADMIN', 'OPERADOR')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ativo and papel = 'ADMIN'
  );
$$;

create or replace function public.converter_quantidade(
  p_quantidade numeric,
  p_unidade_origem public.unidade_medida,
  p_unidade_destino public.unidade_medida
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_quantidade <= 0 then
    raise exception 'A quantidade deve ser positiva';
  end if;
  if p_unidade_origem = p_unidade_destino then return p_quantidade; end if;
  if p_unidade_origem = 'kg' and p_unidade_destino = 'g' then return p_quantidade * 1000; end if;
  if p_unidade_origem = 'g' and p_unidade_destino = 'kg' then return p_quantidade / 1000; end if;
  if p_unidade_origem = 'L' and p_unidade_destino = 'ml' then return p_quantidade * 1000; end if;
  if p_unidade_origem = 'ml' and p_unidade_destino = 'L' then return p_quantidade / 1000; end if;
  raise exception 'Conversão incompatível: % para %', p_unidade_origem, p_unidade_destino;
end;
$$;

create or replace function public.proteger_saldo_estoque()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.operacao_estoque', true) is distinct from 'permitida' then
    raise exception 'O saldo de estoque só pode ser alterado pelas funções transacionais';
  end if;
  return new;
end;
$$;

create trigger produtos_proteger_saldo
before update of quantidade_disponivel on public.produtos
for each row when (old.quantidade_disponivel is distinct from new.quantidade_disponivel)
execute function public.proteger_saldo_estoque();

create trigger ingredientes_proteger_saldo
before update of quantidade_disponivel on public.ingredientes
for each row when (old.quantidade_disponivel is distinct from new.quantidade_disponivel)
execute function public.proteger_saldo_estoque();

create or replace function public.bloquear_mutacao_movimentacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Movimentações de estoque são imutáveis';
end;
$$;

create trigger movimentacoes_estoque_immutable
before update or delete on public.movimentacoes_estoque
for each row execute function public.bloquear_mutacao_movimentacao();

create or replace function public.registrar_producao(
  p_produto_id uuid,
  p_receita_id uuid,
  p_data_producao date,
  p_quantidade_planejada integer,
  p_quantidade_produzida integer,
  p_lote text,
  p_validade date,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producao_id uuid;
  v_rendimento integer;
  v_fator numeric;
  v_necessario numeric;
  v_saldo_anterior numeric;
  v_saldo_produto integer;
  v_custo_total numeric(14,2) := 0;
  v_item record;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_quantidade_planejada <= 0 or p_quantidade_produzida <= 0 then raise exception 'Quantidades de produção devem ser positivas'; end if;
  if p_validade < p_data_producao then raise exception 'A validade não pode anteceder a produção'; end if;
  if nullif(trim(p_lote), '') is null then raise exception 'Informe o lote da produção'; end if;

  select rendimento_potes into v_rendimento
  from public.receitas
  where id = p_receita_id and produto_id = p_produto_id and ativa;
  if not found then raise exception 'Receita ativa não encontrada para o produto'; end if;
  if exists (
    select 1 from public.receita_itens ri
    join public.ingredientes i on i.id = ri.ingrediente_id
    where ri.receita_id = p_receita_id and not i.ativo
  ) then
    raise exception 'A receita possui ingrediente inativo';
  end if;

  perform 1 from public.produtos where id = p_produto_id for update;
  if not found then raise exception 'Produto não encontrado'; end if;

  insert into public.producoes (
    produto_id, receita_id, data_producao, quantidade_planejada,
    quantidade_produzida, lote, validade, status, observacoes, criado_por
  ) values (
    p_produto_id, p_receita_id, p_data_producao, p_quantidade_planejada,
    p_quantidade_produzida, trim(p_lote), p_validade, 'CONFIRMADA', p_observacoes, auth.uid()
  ) returning id into v_producao_id;

  v_fator := p_quantidade_produzida::numeric / v_rendimento;
  perform set_config('app.operacao_estoque', 'permitida', true);

  for v_item in
    select ri.ingrediente_id, ri.quantidade, ri.unidade,
           i.unidade_estoque, i.quantidade_disponivel, i.custo_medio
    from public.receita_itens ri
    join public.ingredientes i on i.id = ri.ingrediente_id
    where ri.receita_id = p_receita_id and i.ativo
    order by i.id
    for update of i
  loop
    v_necessario := round(public.converter_quantidade(v_item.quantidade, v_item.unidade, v_item.unidade_estoque) * v_fator, 3);
    if v_item.quantidade_disponivel < v_necessario then
      raise exception 'Estoque insuficiente para o ingrediente %', v_item.ingrediente_id;
    end if;
    v_saldo_anterior := v_item.quantidade_disponivel;
    update public.ingredientes set quantidade_disponivel = quantidade_disponivel - v_necessario where id = v_item.ingrediente_id;
    insert into public.producao_itens (
      producao_id, ingrediente_id, quantidade_prevista, quantidade_utilizada,
      unidade, custo_unitario, custo_total
    ) values (
      v_producao_id, v_item.ingrediente_id, v_necessario, v_necessario,
      v_item.unidade_estoque, v_item.custo_medio, round(v_necessario * v_item.custo_medio, 2)
    );
    insert into public.movimentacoes_estoque (
      origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
      saldo_posterior, producao_id, usuario_id
    ) values (
      'PRODUCAO', 'INGREDIENTE', v_item.ingrediente_id, 'PRODUCAO', -v_necessario,
      v_saldo_anterior, v_saldo_anterior - v_necessario, v_producao_id, auth.uid()
    );
    v_custo_total := v_custo_total + round(v_necessario * v_item.custo_medio, 2);
  end loop;

  if not exists (select 1 from public.producao_itens where producao_id = v_producao_id) then
    raise exception 'A receita não possui ingredientes ativos';
  end if;

  select quantidade_disponivel into v_saldo_produto from public.produtos where id = p_produto_id;
  update public.produtos
  set quantidade_disponivel = quantidade_disponivel + p_quantidade_produzida,
      custo_estimado = round(v_custo_total / p_quantidade_produzida, 2),
      status = case when status = 'ESGOTADO' then 'ATIVO' else status end
  where id = p_produto_id;
  insert into public.movimentacoes_estoque (
    origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior,
    saldo_posterior, producao_id, usuario_id
  ) values (
    'PRODUCAO', 'PRODUTO', p_produto_id, 'PRODUCAO', p_quantidade_produzida,
    v_saldo_produto, v_saldo_produto + p_quantidade_produzida, v_producao_id, auth.uid()
  );
  update public.producoes set custo_real = v_custo_total where id = v_producao_id;
  perform set_config('app.operacao_estoque', '', true);
  return v_producao_id;
end;
$$;

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
  v_item jsonb;
  v_produto record;
  v_quantidade integer;
  v_preco numeric(12,2);
  v_desconto_item numeric(12,2);
  v_subtotal_item numeric(14,2);
  v_subtotal numeric(14,2) := 0;
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

  insert into public.vendas (
    cliente_id, subtotal, desconto_total, valor_total, forma_pagamento,
    status, observacoes, criado_por
  ) values (
    p_cliente_id, 0, 0, 0, p_forma_pagamento, p_status, p_observacoes, auth.uid()
  ) returning id into v_venda_id;

  perform set_config('app.operacao_estoque', 'permitida', true);
  for v_item in select value from jsonb_array_elements(p_itens) order by value ->> 'produto_id'
  loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_quantidade <= 0 then raise exception 'Quantidade de venda inválida'; end if;
    select id, nome, preco_venda, quantidade_disponivel, status
    into v_produto
    from public.produtos
    where id = (v_item ->> 'produto_id')::uuid
    for update;
    if not found or v_produto.status <> 'ATIVO' then raise exception 'Produto indisponível'; end if;
    if v_produto.quantidade_disponivel < v_quantidade then raise exception 'Estoque insuficiente para %', v_produto.nome; end if;
    v_preco := coalesce((v_item ->> 'preco_unitario')::numeric, v_produto.preco_venda);
    v_desconto_item := coalesce((v_item ->> 'desconto')::numeric, 0);
    v_subtotal_item := round((v_quantidade * v_preco) - v_desconto_item, 2);
    if v_preco < 0 or v_desconto_item < 0 or v_subtotal_item < 0 then raise exception 'Preço ou desconto de item inválido'; end if;
    insert into public.venda_itens (venda_id, produto_id, produto_nome, quantidade, preco_unitario, desconto, subtotal)
    values (v_venda_id, v_produto.id, v_produto.nome, v_quantidade, v_preco, v_desconto_item, v_subtotal_item);
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
  update public.vendas
  set subtotal = v_subtotal,
      desconto_total = p_desconto_total,
      valor_total = v_subtotal - p_desconto_total
  where id = v_venda_id;
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
  v_saldo integer;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_venda.status = 'CANCELADA' then raise exception 'Venda já cancelada'; end if;
  perform set_config('app.operacao_estoque', 'permitida', true);
  for v_item in select produto_id, quantidade from public.venda_itens where venda_id = p_venda_id order by produto_id
  loop
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

create or replace function public.ajustar_estoque(
  p_item_tipo public.item_estoque_tipo,
  p_item_id uuid,
  p_novo_saldo numeric,
  p_observacoes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movimentacao_id uuid;
  v_saldo_anterior numeric;
  v_diferenca numeric;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if p_novo_saldo < 0 then raise exception 'O novo saldo não pode ser negativo'; end if;
  if nullif(trim(p_observacoes), '') is null then raise exception 'Informe o motivo do ajuste'; end if;
  perform set_config('app.operacao_estoque', 'permitida', true);
  if p_item_tipo = 'INGREDIENTE' then
    select quantidade_disponivel into v_saldo_anterior from public.ingredientes where id = p_item_id for update;
    if not found then raise exception 'Ingrediente não encontrado'; end if;
    update public.ingredientes set quantidade_disponivel = p_novo_saldo where id = p_item_id;
    v_diferenca := p_novo_saldo - v_saldo_anterior;
    if v_diferenca = 0 then raise exception 'O novo saldo é igual ao saldo atual'; end if;
    insert into public.movimentacoes_estoque (
      origem, item_tipo, ingrediente_id, tipo, quantidade, saldo_anterior,
      saldo_posterior, observacoes, usuario_id
    ) values (
      'MANUAL', 'INGREDIENTE', p_item_id, 'AJUSTE', v_diferenca,
      v_saldo_anterior, p_novo_saldo, p_observacoes, auth.uid()
    ) returning id into v_movimentacao_id;
  else
    if p_novo_saldo <> trunc(p_novo_saldo) then raise exception 'O saldo de produto deve ser inteiro'; end if;
    select quantidade_disponivel into v_saldo_anterior from public.produtos where id = p_item_id for update;
    if not found then raise exception 'Produto não encontrado'; end if;
    update public.produtos
    set quantidade_disponivel = p_novo_saldo::integer,
        status = case when p_novo_saldo = 0 and status = 'ATIVO' then 'ESGOTADO' when p_novo_saldo > 0 and status = 'ESGOTADO' then 'ATIVO' else status end
    where id = p_item_id;
    v_diferenca := p_novo_saldo - v_saldo_anterior;
    if v_diferenca = 0 then raise exception 'O novo saldo é igual ao saldo atual'; end if;
    insert into public.movimentacoes_estoque (
      origem, item_tipo, produto_id, tipo, quantidade, saldo_anterior,
      saldo_posterior, observacoes, usuario_id
    ) values (
      'MANUAL', 'PRODUTO', p_item_id, 'AJUSTE', v_diferenca,
      v_saldo_anterior, p_novo_saldo, p_observacoes, auth.uid()
    ) returning id into v_movimentacao_id;
  end if;
  perform set_config('app.operacao_estoque', '', true);
  return v_movimentacao_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.fornecedores enable row level security;
alter table public.categorias_produtos enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_imagens enable row level security;
alter table public.ingredientes enable row level security;
alter table public.receitas enable row level security;
alter table public.receita_itens enable row level security;
alter table public.producoes enable row level security;
alter table public.producao_itens enable row level security;
alter table public.clientes enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.depoimentos enable row level security;
alter table public.midias enable row level security;
alter table public.configuracoes enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.fornecedores,
  public.categorias_produtos, public.produtos, public.produto_imagens,
  public.ingredientes, public.receitas, public.receita_itens, public.clientes,
  public.depoimentos, public.midias, public.configuracoes to authenticated;
grant select on public.producoes, public.producao_itens, public.vendas,
  public.venda_itens, public.movimentacoes_estoque to authenticated;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy fornecedores_staff on public.fornecedores for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy categorias_staff on public.categorias_produtos for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy produtos_staff on public.produtos for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy produto_imagens_staff on public.produto_imagens for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy ingredientes_staff on public.ingredientes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy receitas_staff on public.receitas for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy receita_itens_staff on public.receita_itens for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy clientes_staff on public.clientes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy depoimentos_staff on public.depoimentos for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy midias_staff on public.midias for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy configuracoes_admin on public.configuracoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy producoes_read_staff on public.producoes for select to authenticated using (public.is_staff());
create policy producao_itens_read_staff on public.producao_itens for select to authenticated using (public.is_staff());
create policy vendas_read_staff on public.vendas for select to authenticated using (public.is_staff());
create policy venda_itens_read_staff on public.venda_itens for select to authenticated using (public.is_staff());
create policy movimentacoes_read_staff on public.movimentacoes_estoque for select to authenticated using (public.is_staff());

create view public.catalogo_categorias
with (security_barrier = true) as
select id, nome, slug, descricao, ordem
from public.categorias_produtos
where ativo;

create view public.catalogo_produtos
with (security_barrier = true) as
select p.id, p.categoria_id, p.nome, p.slug, p.descricao_curta, p.descricao,
       p.peso_liquido, p.unidade, p.preco_venda, p.destaque, p.imagem_principal_path
from public.produtos p
join public.categorias_produtos c on c.id = p.categoria_id
where p.status = 'ATIVO' and c.ativo;

create view public.catalogo_produto_imagens
with (security_barrier = true) as
select pi.id, pi.produto_id, pi.storage_path, pi.alt_text, pi.ordem
from public.produto_imagens pi
join public.produtos p on p.id = pi.produto_id
where p.status = 'ATIVO';

create view public.catalogo_depoimentos
with (security_barrier = true) as
select id, nome_publico, comentario, nota, foto_path, destaque, data_depoimento
from public.depoimentos
where aprovado;

create view public.catalogo_midias
with (security_barrier = true) as
select id, tipo, titulo, storage_path, alt_text, metadados, ordem
from public.midias
where publico;

create view public.catalogo_configuracoes
with (security_barrier = true) as
select chave, valor
from public.configuracoes
where publica;

revoke all on public.profiles, public.fornecedores, public.categorias_produtos,
  public.produtos, public.produto_imagens, public.ingredientes, public.receitas,
  public.receita_itens, public.producoes, public.producao_itens, public.clientes,
  public.vendas, public.venda_itens, public.movimentacoes_estoque,
  public.depoimentos, public.midias, public.configuracoes from anon;

grant select on public.catalogo_categorias, public.catalogo_produtos,
  public.catalogo_produto_imagens, public.catalogo_depoimentos,
  public.catalogo_midias, public.catalogo_configuracoes to anon, authenticated;

revoke all on function public.registrar_producao(uuid, uuid, date, integer, integer, text, date, text) from public, anon;
revoke all on function public.registrar_venda(uuid, public.forma_pagamento, jsonb, numeric, text, public.venda_status) from public, anon;
revoke all on function public.cancelar_venda(uuid, text) from public, anon;
revoke all on function public.ajustar_estoque(public.item_estoque_tipo, uuid, numeric, text) from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.proteger_saldo_estoque() from public, anon, authenticated;
revoke all on function public.bloquear_mutacao_movimentacao() from public, anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.registrar_producao(uuid, uuid, date, integer, integer, text, date, text) to authenticated;
grant execute on function public.registrar_venda(uuid, public.forma_pagamento, jsonb, numeric, text, public.venda_status) to authenticated;
grant execute on function public.cancelar_venda(uuid, text) to authenticated;
grant execute on function public.ajustar_estoque(public.item_estoque_tipo, uuid, numeric, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('public-media', 'public-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy storage_public_read on storage.objects for select to anon, authenticated
using (bucket_id in ('product-images', 'public-media'));
create policy storage_staff_insert on storage.objects for insert to authenticated
with check (bucket_id in ('product-images', 'public-media') and public.is_staff());
create policy storage_staff_update on storage.objects for update to authenticated
using (bucket_id in ('product-images', 'public-media') and public.is_staff())
with check (bucket_id in ('product-images', 'public-media') and public.is_staff());
create policy storage_staff_delete on storage.objects for delete to authenticated
using (bucket_id in ('product-images', 'public-media') and public.is_staff());

commit;
