# Módulo de vendas

## Fluxo implementado

O módulo usa o fluxo **Selecionar produtos → Informar pagamento → Finalizar venda** nas rotas `/vendas` e `/vendas/nova`.

- Cliente opcional, com cadastro rápido por nome e telefone.
- Produtos ativos com estoque elegível, foto, preço, peso e controle de quantidade inteira.
- Desconto em reais, taxa de entrega e prévia do total no formulário.
- Preços e totais recalculados no banco; o valor exibido pelo navegador não é fonte de verdade.
- Venda paga ou pendente, com pagamento integral posterior.
- Indicadores de venda, recebimento, produtos, total vendido e valor a receber.
- Detalhes com preços históricos, lotes, responsável, comprovante não fiscal e resumo para WhatsApp.

## Migration e RPCs

Migration incremental:

```text
supabase/migrations/202610190003_vendas_pagamentos.sql
```

Principais RPCs:

- `registrar_venda_segura`: valida acesso, bloqueia estoque, recalcula preços, aplica FEFO, grava venda, itens, lotes, movimentos e pagamento na mesma transação.
- `registrar_pagamento_venda`: registra uma única quitação integral para uma venda pendente.
- `cancelar_venda_segura`: exige motivo e decisão explícita sobre retorno ao estoque e estorno financeiro.
- `confirmar_estorno_financeiro`: conclui posteriormente um estorno que ficou pendente.
- `data_operacao_local`: usa `negocio.fuso_horario` para validade e numeração diária.

As funções legadas `registrar_venda` e `cancelar_venda` foram mantidas como wrappers compatíveis. O frontend utiliza apenas a chave pública/anon e as RPCs autorizadas; nenhuma `service_role` é necessária.

## Regras de estoque e financeiro

- A seleção de lotes é FEFO e ignora lotes vencidos, bloqueados ou sem saldo.
- A baixa consolidada e a baixa por lote acontecem na mesma transação.
- Produtos que ainda não possuem lote usam temporariamente o saldo consolidado legado.
- A chave UUID de idempotência é bloqueada antes da consulta, protegendo também reenvios simultâneos.
- O número `VEN-AAAAMMDD-NNN` é gerado sob bloqueio transacional por data local.
- Cancelar não devolve estoque automaticamente. O operador precisa declarar que os itens continuam aptos e sob controle da empresa.
- Um lote vencido ou bloqueado não pode retornar ao estoque comercializável pelo cancelamento.
- Cancelar uma venda paga cria estorno financeiro pendente ou realizado sem presumir que o dinheiro já foi devolvido.
- Pagamentos, estornos, itens, lotes e movimentos permanecem como histórico.

## Aplicação

Na raiz do projeto, confira o vínculo do Supabase CLI e aplique as migrations:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref SEU_PROJECT_REF
npx.cmd supabase db push
```

Se o projeto já estiver vinculado, somente `npx.cmd supabase db push` é necessário. A migration não exige variável de ambiente nova.

Depois, no SQL Editor do Supabase, copie e execute:

```text
supabase/tests/008_vendas_flow.sql
```

Resultado esperado:

```text
Vendas flow test: OK
```

O teste termina com `rollback`; ele não preserva os dados criados. Ele valida venda com e sem cliente, um e vários produtos, desconto/entrega, pagamento imediato e posterior, histórico de preço, idempotência, FEFO em dois lotes, bloqueios de validade/estoque/produto, devolução segura, estornos, autorização e rollback.

## Testes manuais recomendados

1. Produza um item com dois lotes válidos e datas de validade diferentes.
2. Em `/vendas/nova`, faça uma venda que consuma os dois lotes e confira a distribuição nos detalhes.
3. Repita com venda sem cliente e depois com cliente criado pelo atalho.
4. Marque uma venda como pendente e use **Registrar pagamento** na listagem.
5. Abra os detalhes, imprima o comprovante e teste o WhatsApp com e sem telefone válido.
6. Cancele uma venda paga sem devolver estoque; confira o estorno pendente e depois confirme sua realização.
7. Cancele outra venda antes da retirada, autorizando o retorno, e confira produto, lotes e movimentos.
8. Bloqueie ou vença o lote após uma venda e confirme que o retorno comercializável é recusado.
9. Para concorrência real, deixe somente um pote elegível e finalize o mesmo produto em dois navegadores ao mesmo tempo: apenas uma venda deve concluir.
10. Dê dois cliques rápidos em **Finalizar venda** ou repita a requisição: deve existir uma única venda e uma única baixa.

## Limitações deliberadas do MVP

- Pagamento apenas integral; sem parcelamento, pagamento parcial ou gateway.
- O comprovante não é documento fiscal e não emite NFC-e/NF-e.
- Não há fluxo de inspeção/reentrada para mercadoria que voltou da posse do cliente; nesse caso o cancelamento deve permanecer sem retorno ao estoque.
- Produtos legados sem lotes continuam pelo saldo consolidado até a primeira produção rastreada.
- A concorrência entre sessões deve ser validada manualmente contra o projeto Supabase; o teste SQL automatizado valida os bloqueios, idempotência sequencial e rollback, mas não abre duas conexões simultâneas.
