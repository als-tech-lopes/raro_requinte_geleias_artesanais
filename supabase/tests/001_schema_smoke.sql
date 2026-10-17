do $$
declare
  nomes text[] := array[
    'profiles', 'fornecedores', 'categorias_produtos', 'produtos',
    'produto_imagens', 'ingredientes', 'receitas', 'receita_itens',
    'producoes', 'producao_itens', 'clientes', 'vendas', 'venda_itens',
    'movimentacoes_estoque', 'depoimentos', 'midias', 'configuracoes'
  ];
  nome text;
begin
  foreach nome in array nomes loop
    if to_regclass('public.' || nome) is null then
      raise exception 'Tabela ausente: %', nome;
    end if;
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = nome and c.relrowsecurity
    ) then
      raise exception 'RLS não habilitado: %', nome;
    end if;
  end loop;

  if to_regprocedure('public.registrar_producao(uuid,uuid,date,integer,integer,text,date,text)') is null then
    raise exception 'RPC registrar_producao ausente';
  end if;
  if to_regprocedure('public.registrar_venda(uuid,public.forma_pagamento,jsonb,numeric,text,public.venda_status)') is null then
    raise exception 'RPC registrar_venda ausente';
  end if;
  if to_regprocedure('public.cancelar_venda(uuid,text)') is null then
    raise exception 'RPC cancelar_venda ausente';
  end if;
  if to_regprocedure('public.ajustar_estoque(public.item_estoque_tipo,uuid,numeric,text)') is null then
    raise exception 'RPC ajustar_estoque ausente';
  end if;
  if public.converter_quantidade(1, 'kg', 'g') <> 1000 then
    raise exception 'Conversão kg/g inválida';
  end if;
  if public.converter_quantidade(1, 'L', 'ml') <> 1000 then
    raise exception 'Conversão L/ml inválida';
  end if;
  raise notice 'Schema smoke test: OK';
end;
$$;
