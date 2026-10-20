begin;

alter table public.receitas
  drop constraint receitas_produto_unique,
  alter column produto_id drop not null;

alter table public.receitas
  rename column instrucoes to modo_preparo;

alter table public.receitas
  add column descricao text,
  add column rendimento_estimado_g numeric(14,3),
  add column peso_pote_g numeric(14,3),
  add column observacoes text,
  add column versao integer not null default 1 check (versao > 0),
  add column receita_origem_id uuid references public.receitas(id) on delete restrict;

update public.receitas r
set peso_pote_g = case
      when p.unidade = 'g' then p.peso_liquido
      when p.unidade = 'kg' then p.peso_liquido * 1000
      else 250
    end,
    rendimento_estimado_g = r.rendimento_potes * case
      when p.unidade = 'g' then p.peso_liquido
      when p.unidade = 'kg' then p.peso_liquido * 1000
      else 250
    end
from public.produtos p
where p.id = r.produto_id;

update public.receitas
set peso_pote_g = coalesce(peso_pote_g, 250),
    rendimento_estimado_g = coalesce(rendimento_estimado_g, rendimento_potes * 250);

alter table public.receitas
  alter column rendimento_estimado_g set not null,
  alter column peso_pote_g set not null,
  add constraint receitas_rendimento_estimado_check check (rendimento_estimado_g > 0),
  add constraint receitas_peso_pote_check check (peso_pote_g > 0),
  add constraint receitas_potes_calculo_check check (
    rendimento_potes = floor(rendimento_estimado_g / peso_pote_g)::integer
    and rendimento_potes > 0
  );

create index receitas_nome_versao_idx
  on public.receitas (lower(nome), versao);
create index receitas_produto_ativa_idx
  on public.receitas (produto_id, ativa, updated_at desc);
create index receitas_origem_versao_idx
  on public.receitas (receita_origem_id, versao desc)
  where receita_origem_id is not null;

create or replace function public.salvar_receita(
  p_receita_id uuid,
  p_nome text,
  p_produto_id uuid,
  p_descricao text,
  p_modo_preparo text,
  p_rendimento_estimado_g numeric,
  p_peso_pote_g numeric,
  p_observacoes text,
  p_ativa boolean,
  p_itens jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receita_atual public.receitas%rowtype;
  v_receita_id uuid;
  v_rendimento_potes integer;
  v_versao integer := 1;
  v_origem_id uuid;
  v_item record;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_nome), '') is null or char_length(trim(p_nome)) < 3 then raise exception 'Informe o nome da receita'; end if;
  if p_rendimento_estimado_g <= 0 or p_peso_pote_g <= 0 then raise exception 'Rendimento e peso por pote devem ser positivos'; end if;
  v_rendimento_potes := floor(p_rendimento_estimado_g / p_peso_pote_g)::integer;
  if v_rendimento_potes < 1 then raise exception 'O rendimento deve completar pelo menos um pote'; end if;
  if p_produto_id is not null and not exists (select 1 from public.produtos where id = p_produto_id) then raise exception 'Produto nao encontrado'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Adicione pelo menos um ingrediente'; end if;
  if (
    select count(*) <> count(distinct ingrediente_id)
    from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade numeric, unidade public.unidade_medida)
  ) then raise exception 'O mesmo ingrediente nao pode ser adicionado duas vezes'; end if;

  for v_item in
    select x.ingrediente_id, x.quantidade, x.unidade, i.unidade_estoque
    from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade numeric, unidade public.unidade_medida)
    left join public.ingredientes i on i.id = x.ingrediente_id and i.ativo
  loop
    if v_item.ingrediente_id is null or v_item.unidade_estoque is null then raise exception 'Ingrediente nao encontrado ou inativo'; end if;
    if v_item.quantidade is null or v_item.quantidade <= 0 then raise exception 'A quantidade dos ingredientes deve ser positiva'; end if;
    if v_item.unidade = 'unidade' and v_item.quantidade <> trunc(v_item.quantidade) then raise exception 'Quantidade em unidades deve ser inteira'; end if;
    perform public.converter_quantidade(v_item.quantidade, v_item.unidade, v_item.unidade_estoque);
  end loop;

  if p_receita_id is not null then
    select * into v_receita_atual from public.receitas where id = p_receita_id for update;
    if not found then raise exception 'Receita nao encontrada'; end if;
  end if;

  if p_receita_id is not null and exists (select 1 from public.producoes where receita_id = p_receita_id) then
    v_origem_id := coalesce(v_receita_atual.receita_origem_id, v_receita_atual.id);
    perform pg_advisory_xact_lock(hashtext(v_origem_id::text));
    select coalesce(max(versao), 0) + 1 into v_versao
    from public.receitas
    where id = v_origem_id or receita_origem_id = v_origem_id;
    update public.receitas set ativa = false where id = p_receita_id;
    p_receita_id := null;
  elsif p_receita_id is not null then
    update public.receitas
    set nome = trim(p_nome), produto_id = p_produto_id, descricao = nullif(trim(p_descricao), ''),
        modo_preparo = nullif(trim(p_modo_preparo), ''), rendimento_estimado_g = p_rendimento_estimado_g,
        peso_pote_g = p_peso_pote_g, rendimento_potes = v_rendimento_potes,
        observacoes = nullif(trim(p_observacoes), ''), ativa = p_ativa
    where id = p_receita_id;
    delete from public.receita_itens where receita_id = p_receita_id;
    v_receita_id := p_receita_id;
  end if;

  if p_receita_id is null then
    insert into public.receitas (
      nome, produto_id, descricao, modo_preparo, rendimento_estimado_g,
      peso_pote_g, rendimento_potes, observacoes, ativa, versao, receita_origem_id
    ) values (
      trim(p_nome), p_produto_id, nullif(trim(p_descricao), ''), nullif(trim(p_modo_preparo), ''),
      p_rendimento_estimado_g, p_peso_pote_g, v_rendimento_potes,
      nullif(trim(p_observacoes), ''), p_ativa, v_versao, v_origem_id
    ) returning id into v_receita_id;
  end if;

  insert into public.receita_itens (receita_id, ingrediente_id, quantidade, unidade)
  select v_receita_id, x.ingrediente_id, x.quantidade, x.unidade
  from jsonb_to_recordset(p_itens) as x(ingrediente_id uuid, quantidade numeric, unidade public.unidade_medida);

  return v_receita_id;
end;
$$;

create or replace function public.inativar_receita(p_receita_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  update public.receitas set ativa = false where id = p_receita_id;
  if not found then raise exception 'Receita nao encontrada'; end if;
end;
$$;

revoke insert, update, delete on public.receitas, public.receita_itens from authenticated;
revoke all on function public.salvar_receita(uuid, text, uuid, text, text, numeric, numeric, text, boolean, jsonb) from public, anon;
revoke all on function public.inativar_receita(uuid) from public, anon;
grant execute on function public.salvar_receita(uuid, text, uuid, text, text, numeric, numeric, text, boolean, jsonb) to authenticated;
grant execute on function public.inativar_receita(uuid) to authenticated;

commit;
