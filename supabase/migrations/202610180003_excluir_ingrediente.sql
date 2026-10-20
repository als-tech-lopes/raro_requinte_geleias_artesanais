begin;

create or replace function public.excluir_ingrediente(p_ingrediente_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingrediente public.ingredientes%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Acesso negado';
  end if;

  select * into v_ingrediente
  from public.ingredientes
  where id = p_ingrediente_id
  for update;

  if not found then
    raise exception 'Ingrediente nao encontrado';
  end if;

  if v_ingrediente.quantidade_disponivel <> 0 then
    raise exception 'Somente ingredientes sem estoque podem ser excluidos';
  end if;

  if exists (select 1 from public.receita_itens where ingrediente_id = p_ingrediente_id)
     or exists (select 1 from public.producao_itens where ingrediente_id = p_ingrediente_id)
     or exists (select 1 from public.compras_ingredientes where ingrediente_id = p_ingrediente_id)
     or exists (select 1 from public.movimentacoes_estoque where ingrediente_id = p_ingrediente_id) then
    raise exception 'O ingrediente possui historico e nao pode ser excluido. Inative-o para preservar os registros.';
  end if;

  delete from public.ingredientes where id = p_ingrediente_id;
end;
$$;

revoke all on function public.excluir_ingrediente(uuid) from public, anon;
grant execute on function public.excluir_ingrediente(uuid) to authenticated;

commit;
