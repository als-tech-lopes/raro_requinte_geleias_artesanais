begin;

alter table public.produtos
  add column if not exists deleted_at timestamptz;

comment on column public.produtos.deleted_at is
  'Data da exclusao logica. O registro e mantido para preservar vendas, producoes, estoque e relatorios historicos.';

create or replace function public.excluir_produto_seguro(p_produto_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_possui_historico boolean;
begin
  if not public.is_staff() then
    raise exception 'Acesso negado';
  end if;

  perform 1
  from public.produtos
  where id = p_produto_id
  for update;

  if not found then
    raise exception 'Produto nao encontrado';
  end if;

  select
    exists (select 1 from public.receitas where produto_id = p_produto_id)
    or exists (select 1 from public.producoes where produto_id = p_produto_id)
    or exists (select 1 from public.lotes_produtos where produto_id = p_produto_id)
    or exists (select 1 from public.venda_itens where produto_id = p_produto_id)
    or exists (select 1 from public.movimentacoes_estoque where produto_id = p_produto_id)
  into v_possui_historico;

  if v_possui_historico then
    update public.produtos
    set status = 'INATIVO',
        publicado = false,
        destaque = false,
        deleted_at = coalesce(deleted_at, now())
    where id = p_produto_id;

    return 'ARQUIVADO';
  end if;

  delete from public.produtos where id = p_produto_id;
  return 'EXCLUIDO';
end;
$$;

revoke all on function public.excluir_produto_seguro(uuid) from public, anon;
grant execute on function public.excluir_produto_seguro(uuid) to authenticated;

commit;
