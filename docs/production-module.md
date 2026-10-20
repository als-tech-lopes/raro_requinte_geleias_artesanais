# Módulo de produção

## Fluxo implementado

O módulo usa o fluxo **Escolher receita → Conferir ingredientes → Informar resultado → Concluir**.

- Uma produção pode ser salva como `RASCUNHO` (Em preparo) sem movimentar estoque.
- Ao concluir, a RPC bloqueia os saldos, consulta os custos médios atuais, baixa ingredientes, adiciona produtos acabados, gera o lote e grava os snapshots históricos.
- Um resultado com zero potes pode ser cancelado sem estoque ou registrado como perda, baixando somente os ingredientes efetivamente consumidos.
- Produções concluídas e perdas são historicamente imutáveis.
- Produções concluídas não podem ser canceladas pelo fluxo comum; um estorno futuro exigirá uma rotina administrativa própria.

## Migration

```text
supabase/migrations/202610190002_producao_lotes.sql
```

Principais RPCs:

- `salvar_producao_em_preparo`
- `concluir_producao`
- `cancelar_producao_em_preparo`
- `registrar_perda_producao`
- `obter_dias_alerta_validade`

A função legada `registrar_producao` foi mantida como compatibilidade e passou a usar o novo fluxo transacional.

## Lotes e validade

`lotes_produtos` guarda o saldo rastreável de cada lote sem substituir `produtos.quantidade_disponivel`, que continua sendo o saldo consolidado.

Novas vendas de produtos rastreados por lote são alocadas em `venda_item_lotes` por FEFO, usando primeiro o lote válido que vence antes. Lotes vencidos não podem atender novas vendas. Produtos legados que ainda não possuem nenhum lote continuam usando o saldo consolidado até receberem a primeira produção rastreada.

O alerta de proximidade usa a configuração privada:

```text
estoque.dias_alerta_validade = 30
```

O valor é consultado pela RPC protegida `obter_dias_alerta_validade`.

## Aplicação e teste

No PowerShell:

```powershell
npx.cmd supabase db push
```

No SQL Editor do Supabase, execute:

```text
supabase/tests/007_producao_flow.sql
```

Resultado esperado:

```text
Produção flow test: OK
```

O teste termina com `rollback` e valida rascunho, multiplicador, consumo real, custos, conclusão, lote, movimentações, idempotência, falta de estoque, rollback, perda, cancelamento, histórico, validade e FEFO.

## Teste manual

1. Cadastre estoque suficiente para os ingredientes de uma receita ativa associada a um produto.
2. Em `/producao`, escolha **Nova produção**.
3. Selecione a receita, use multiplicador `2` e confira os valores previstos.
4. Altere o consumo real de um ingrediente.
5. Salve em preparo e confirme que nenhum estoque mudou.
6. Retome o registro, informe potes e validade e conclua.
7. Confira as baixas em Ingredientes e a entrada em Produtos.
8. Abra os detalhes e confira lote, custos históricos e movimentações.
9. Tente concluir novamente: a operação deve ser recusada.
10. Crie outro preparo, informe zero potes e teste **Registrar perda**.

## Limitação deliberada

O estorno de uma produção concluída permanece bloqueado. Ele exige validar o saldo integral do lote e possíveis vendas antes de reverter qualquer movimento; isso deve ser implementado como operação administrativa específica, nunca por edição manual de saldos.
