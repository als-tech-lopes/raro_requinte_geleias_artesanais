begin;

create table public.produto_variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  peso_liquido numeric(12,3) not null check (peso_liquido > 0),
  unidade public.unidade_medida not null,
  preco_venda numeric(12,2) not null check (preco_venda >= 0),
  ordem integer not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (produto_id, peso_liquido, unidade) deferrable initially deferred,
  unique (produto_id, ordem) deferrable initially deferred
);

insert into public.produto_variacoes (produto_id, peso_liquido, unidade, preco_venda, ordem)
select id, peso_liquido, unidade, preco_venda, 0 from public.produtos;

create trigger produto_variacoes_updated_at before update on public.produto_variacoes
for each row execute function public.set_updated_at();

alter table public.produto_variacoes enable row level security;
grant select, insert, update, delete on public.produto_variacoes to authenticated;
create policy produto_variacoes_staff on public.produto_variacoes for all to authenticated
using (public.is_staff()) with check (public.is_staff());

drop view public.catalogo_produtos;
create view public.catalogo_produtos
with (security_barrier = true) as
select
  p.id, p.categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
  p.nome, p.slug, p.descricao_curta, p.descricao,
  v.peso_liquido, v.unidade, v.preco_venda,
  coalesce(vs.variacoes, '[]'::jsonb) as variacoes,
  p.destaque, p.imagem_principal_path, p.ingredientes_publicos,
  p.conservacao, p.alergenos, p.observacoes_rotulagem,
  case
    when exists (select 1 from public.lotes_produtos lx where lx.produto_id = p.id)
      then coalesce((select sum(lp.quantidade_disponivel) from public.lotes_produtos lp
        where lp.produto_id = p.id and lp.quantidade_disponivel > 0 and not lp.bloqueado
          and lp.validade >= public.data_operacao_local()), 0) > 0
    else p.quantidade_disponivel > 0
  end as disponivel
from public.produtos p
join public.categorias_produtos c on c.id = p.categoria_id
join lateral (select pv.peso_liquido, pv.unidade, pv.preco_venda from public.produto_variacoes pv where pv.produto_id = p.id order by pv.ordem limit 1) v on true
join lateral (select jsonb_agg(jsonb_build_object('id', pv.id, 'peso_liquido', pv.peso_liquido, 'unidade', pv.unidade, 'preco_venda', pv.preco_venda) order by pv.ordem) as variacoes from public.produto_variacoes pv where pv.produto_id = p.id) vs on true
where p.status <> 'INATIVO' and p.publicado and c.ativo;

revoke all on public.catalogo_produtos from public;
grant select on public.catalogo_produtos to anon, authenticated;

drop function public.catalogo_validar_sacola(jsonb);
create function public.catalogo_validar_sacola(p_itens jsonb)
returns table (
  produto_id uuid, variacao_id uuid, nome text, slug text, peso_liquido numeric,
  unidade public.unidade_medida, preco_venda numeric, imagem_principal_path text,
  quantidade_solicitada integer, valido boolean, motivo text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then raise exception 'Formato inválido para a sacola'; end if;
  if jsonb_array_length(p_itens) > 50 then raise exception 'A sacola excede o limite de itens'; end if;
  return query
  with solicitados as (
    select x.produto_id, x.variacao_id, x.quantidade
    from jsonb_to_recordset(p_itens) as x(produto_id uuid, variacao_id uuid, quantidade integer)
  ), dados as (
    select s.produto_id solicitado_id, coalesce(s.variacao_id, padrao.id) solicitado_variacao_id, s.quantidade,
      p.id, p.nome, p.slug, pv.peso_liquido, pv.unidade, pv.preco_venda, p.imagem_principal_path,
      p.status, p.publicado, c.ativo categoria_ativa,
      case when exists (select 1 from public.lotes_produtos lx where lx.produto_id = p.id)
        then coalesce((select sum(lp.quantidade_disponivel) from public.lotes_produtos lp where lp.produto_id = p.id and lp.quantidade_disponivel > 0 and not lp.bloqueado and lp.validade >= public.data_operacao_local()), 0)
        else coalesce(p.quantidade_disponivel, 0) end estoque_elegivel
    from solicitados s
    left join public.produtos p on p.id = s.produto_id
    left join public.categorias_produtos c on c.id = p.categoria_id
    left join lateral (select pv0.id from public.produto_variacoes pv0 where pv0.produto_id = p.id order by pv0.ordem limit 1) padrao on true
    left join public.produto_variacoes pv on pv.id = coalesce(s.variacao_id, padrao.id) and pv.produto_id = p.id
  )
  select d.solicitado_id, d.solicitado_variacao_id, d.nome, d.slug, d.peso_liquido, d.unidade,
    d.preco_venda, d.imagem_principal_path, d.quantidade,
    d.id is not null and d.peso_liquido is not null and d.status = 'ATIVO' and d.publicado and d.categoria_ativa and d.quantidade > 0 and d.estoque_elegivel >= d.quantidade,
    case when d.id is null or not coalesce(d.publicado, false) or d.status = 'INATIVO' or not coalesce(d.categoria_ativa, false) then 'Produto não está mais disponível no catálogo'
      when d.peso_liquido is null then 'Tamanho não está mais disponível'
      when d.quantidade is null or d.quantidade <= 0 then 'Quantidade inválida'
      when d.estoque_elegivel < d.quantidade then 'Quantidade solicitada indisponível' else null end
  from dados d;
end;
$$;

revoke all on function public.catalogo_validar_sacola(jsonb) from public;
grant execute on function public.catalogo_validar_sacola(jsonb) to anon, authenticated;

commit;
