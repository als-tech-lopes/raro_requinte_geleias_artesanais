do $$
begin
  if to_regclass('public.categorias_ingredientes') is null then raise exception 'Tabela categorias_ingredientes ausente'; end if;
  if to_regclass('public.compras_ingredientes') is null then raise exception 'Tabela compras_ingredientes ausente'; end if;
  if to_regprocedure('public.cadastrar_ingrediente(text,uuid,public.unidade_medida,numeric,numeric,numeric,text)') is null then raise exception 'RPC cadastrar_ingrediente ausente'; end if;
  if to_regprocedure('public.registrar_compra_ingrediente(uuid,numeric,public.unidade_medida,numeric,date,text)') is null then raise exception 'RPC registrar_compra_ingrediente ausente'; end if;
  if to_regprocedure('public.ajustar_estoque_ingrediente(uuid,numeric,text,text)') is null then raise exception 'RPC ajustar_estoque_ingrediente ausente'; end if;
  if to_regprocedure('public.proteger_unidade_ingrediente()') is null then raise exception 'Protecao da unidade ausente'; end if;
  if exists (
    select 1 from public.movimentacoes_estoque
    where unidade_item is null or custo_unitario is null or valor_total is null
  ) then raise exception 'Backfill financeiro das movimentacoes incompleto'; end if;
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.movimentacoes_estoque'::regclass
      and tgname = 'movimentacoes_estoque_immutable'
      and tgenabled = 'O'
  ) then raise exception 'Trigger de imutabilidade nao foi reativado'; end if;
  if public.converter_quantidade(500, 'g', 'kg') <> 0.5 then raise exception 'Conversão g/kg inválida'; end if;
  if public.converter_quantidade(500, 'ml', 'L') <> 0.5 then raise exception 'Conversão ml/L inválida'; end if;
  raise notice 'Ingredientes schema test: OK';
end;
$$;
