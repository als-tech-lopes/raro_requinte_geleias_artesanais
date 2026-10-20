begin;

alter table public.produtos
  add column if not exists publicado boolean not null default false,
  add column if not exists ingredientes_publicos text,
  add column if not exists conservacao text,
  add column if not exists alergenos text,
  add column if not exists observacoes_rotulagem text;

alter table public.depoimentos
  add column if not exists autorizado_publicacao boolean not null default false;

create index if not exists produtos_catalogo_idx
  on public.produtos(categoria_id, destaque, nome)
  where publicado and status <> 'INATIVO';

drop view if exists public.catalogo_produto_imagens;
drop view if exists public.catalogo_produtos;
drop view if exists public.catalogo_depoimentos;

create view public.catalogo_produtos
with (security_barrier = true) as
select
  p.id,
  p.categoria_id,
  c.nome as categoria_nome,
  c.slug as categoria_slug,
  p.nome,
  p.slug,
  p.descricao_curta,
  p.descricao,
  p.peso_liquido,
  p.unidade,
  p.preco_venda,
  p.destaque,
  p.imagem_principal_path,
  p.ingredientes_publicos,
  p.conservacao,
  p.alergenos,
  p.observacoes_rotulagem,
  case
    when exists (select 1 from public.lotes_produtos lx where lx.produto_id = p.id)
      then coalesce((
        select sum(lp.quantidade_disponivel)
        from public.lotes_produtos lp
        where lp.produto_id = p.id
          and lp.quantidade_disponivel > 0
          and not lp.bloqueado
          and lp.validade >= public.data_operacao_local()
      ), 0) > 0
    else p.quantidade_disponivel > 0
  end as disponivel
from public.produtos p
join public.categorias_produtos c on c.id = p.categoria_id
where p.status <> 'INATIVO' and p.publicado and c.ativo;

create view public.catalogo_produto_imagens
with (security_barrier = true) as
select pi.id, pi.produto_id, pi.storage_path, pi.alt_text, pi.ordem
from public.produto_imagens pi
join public.produtos p on p.id = pi.produto_id
where p.status <> 'INATIVO' and p.publicado;

create view public.catalogo_depoimentos
with (security_barrier = true) as
select id, nome_publico, comentario, nota, foto_path, destaque, data_depoimento
from public.depoimentos
where aprovado and autorizado_publicacao;

insert into public.configuracoes (chave, valor, descricao, publica)
values
  ('catalogo.nome_comercial', '"RR Geleias Artesanais"'::jsonb, 'Nome exibido no catálogo', true),
  ('catalogo.descricao_curta', '"Sabores artesanais feitos com carinho, frutas selecionadas e receitas especiais."'::jsonb, 'Descrição curta da marca', true),
  ('catalogo.mensagem_principal', '"Geleias artesanais para transformar pequenos momentos em lembranças deliciosas."'::jsonb, 'Mensagem do banner principal', true),
  ('catalogo.historia', '"Produzimos geleias artesanais em pequenos lotes, respeitando o tempo de cada receita e o sabor das frutas."'::jsonb, 'História pública da marca', true),
  ('catalogo.whatsapp', '""'::jsonb, 'WhatsApp comercial', true),
  ('catalogo.instagram', '""'::jsonb, 'Perfil do Instagram', true),
  ('catalogo.cidade', '""'::jsonb, 'Cidade de atendimento', true),
  ('catalogo.estado', '""'::jsonb, 'Estado de atendimento', true),
  ('catalogo.atendimento', '"Atendimento e entregas combinados pelo WhatsApp."'::jsonb, 'Informações de atendimento', true),
  ('catalogo.cor_primaria', '"#315c3e"'::jsonb, 'Cor principal do catálogo', true),
  ('catalogo.cor_secundaria', '"#9c2348"'::jsonb, 'Cor secundária do catálogo', true),
  ('catalogo.logo_path', '""'::jsonb, 'Caminho do logotipo no Storage', true),
  ('catalogo.banner_path', '""'::jsonb, 'Caminho da imagem principal no Storage', true),
  ('catalogo.imagem_institucional_path', '""'::jsonb, 'Caminho da imagem institucional', true),
  ('catalogo.exibir_esgotados', 'true'::jsonb, 'Exibir produtos publicados sem estoque elegível', true),
  ('catalogo.exibir_precos', 'true'::jsonb, 'Exibir preços no catálogo', true),
  ('catalogo.whatsapp_ativo', 'true'::jsonb, 'Ativar pedidos pelo WhatsApp', true),
  ('catalogo.exibir_depoimentos', 'true'::jsonb, 'Exibir depoimentos aprovados', true),
  ('catalogo.exibir_galeria', 'true'::jsonb, 'Exibir galeria pública', true)
on conflict (chave) do nothing;

create or replace function public.catalogo_validar_sacola(p_itens jsonb)
returns table (
  produto_id uuid,
  nome text,
  slug text,
  peso_liquido numeric,
  unidade public.unidade_medida,
  preco_venda numeric,
  imagem_principal_path text,
  quantidade_solicitada integer,
  valido boolean,
  motivo text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Formato inválido para a sacola';
  end if;
  if jsonb_array_length(p_itens) > 50 then
    raise exception 'A sacola excede o limite de itens';
  end if;

  return query
  with solicitados as (
    select x.produto_id, x.quantidade
    from jsonb_to_recordset(p_itens) as x(produto_id uuid, quantidade integer)
  ), dados as (
    select
      s.produto_id as solicitado_id,
      s.quantidade,
      p.id,
      p.nome,
      p.slug,
      p.peso_liquido,
      p.unidade,
      p.preco_venda,
      p.imagem_principal_path,
      p.status,
      p.publicado,
      c.ativo as categoria_ativa,
      case
        when exists (select 1 from public.lotes_produtos lx where lx.produto_id = p.id)
          then coalesce((select sum(lp.quantidade_disponivel) from public.lotes_produtos lp
            where lp.produto_id = p.id and lp.quantidade_disponivel > 0 and not lp.bloqueado
              and lp.validade >= public.data_operacao_local()), 0)
        else coalesce(p.quantidade_disponivel, 0)
      end as estoque_elegivel
    from solicitados s
    left join public.produtos p on p.id = s.produto_id
    left join public.categorias_produtos c on c.id = p.categoria_id
  )
  select
    d.solicitado_id,
    d.nome,
    d.slug,
    d.peso_liquido,
    d.unidade,
    d.preco_venda,
    d.imagem_principal_path,
    d.quantidade,
    d.id is not null and d.status = 'ATIVO' and d.publicado and d.categoria_ativa
      and d.quantidade > 0 and d.estoque_elegivel >= d.quantidade,
    case
      when d.id is null or not coalesce(d.publicado, false) or d.status = 'INATIVO' or not coalesce(d.categoria_ativa, false) then 'Produto não está mais disponível no catálogo'
      when d.quantidade is null or d.quantidade <= 0 then 'Quantidade inválida'
      when d.estoque_elegivel < d.quantidade then 'Quantidade solicitada indisponível'
      else null
    end
  from dados d;
end;
$$;

revoke all on public.catalogo_produtos, public.catalogo_produto_imagens, public.catalogo_depoimentos from public;
grant select on public.catalogo_produtos, public.catalogo_produto_imagens, public.catalogo_depoimentos to anon, authenticated;
grant execute on function public.data_operacao_local() to anon;
revoke all on function public.catalogo_validar_sacola(jsonb) from public;
grant execute on function public.catalogo_validar_sacola(jsonb) to anon, authenticated;

commit;
