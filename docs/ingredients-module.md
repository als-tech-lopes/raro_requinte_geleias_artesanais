# Modulo de ingredientes e estoque

## O que foi implementado

A rota administrativa `/ingredientes` permite cadastrar e editar ingredientes, buscar e filtrar a listagem, registrar compras, fazer ajustes manuais e consultar o historico imutavel de estoque.

O saldo e o custo medio nao sao gravados diretamente pelo navegador. Cadastro com estoque inicial, compra e ajuste usam funcoes PostgreSQL `security definer`, que verificam `is_staff()` antes de executar.

## Migration

A migration incremental e `supabase/migrations/202610180001_ingredientes_compras.sql`. Ela deve ser aplicada depois de `202610170001_initial_schema.sql`.

Ela adiciona:

- `categorias_ingredientes`, com as seis categorias iniciais;
- `compras_ingredientes`, que preserva quantidade e unidade informadas na compra e seus valores normalizados;
- categoria e observacoes em `ingredientes`;
- referencia da compra, unidade e valores historicos em `movimentacoes_estoque`;
- indices, constraints, triggers, RLS e permissoes;
- RPCs `cadastrar_ingrediente`, `registrar_compra_ingrediente` e `ajustar_estoque_ingrediente`.

## Regras de estoque

- O cadastro pode comecar sem estoque. Havendo quantidade inicial, o valor total pago e obrigatorio e uma movimentacao de entrada e criada.
- `kg/g` e `L/ml` sao convertidos automaticamente. Outras familias nao sao convertidas.
- Itens controlados por unidade aceitam somente quantidades inteiras.
- Compras usam media ponderada movel, com custo unitario e custo medio armazenados com quatro casas decimais. Valores totais usam duas casas e quantidades, tres.
- Se o saldo anterior for zero, o custo da compra passa a ser o novo custo medio.
- Ajustes preservam o custo medio vigente e nao aceitam saldo final negativo.
- A unidade de controle nao pode ser alterada depois do cadastro.
- Compras e movimentacoes sao imutaveis. Correcoes geram uma nova movimentacao.
- As linhas do ingrediente sao bloqueadas com `FOR UPDATE` durante compras e ajustes, impedindo perda de atualizacao em operacoes concorrentes.

## Aplicacao no Supabase

Com o projeto Supabase CLI ja vinculado, execute na raiz:

```powershell
npx supabase db push --dry-run
npx supabase db push
```

Como alternativa, copie todo o conteudo da migration para o SQL Editor do Supabase e execute uma unica vez. Nao execute `supabase/tests/support/supabase_stubs.sql` no Supabase; esse arquivo existe somente para PostgreSQL local puro.

## Testes SQL

No SQL Editor, execute nesta ordem:

1. `supabase/tests/002_ingredientes_schema.sql` — resultado esperado: `Ingredientes schema test: OK`.
2. `supabase/tests/003_ingredientes_flow.sql` — resultado esperado: `Ingredientes flow test: OK`.

O teste de fluxo abre uma transacao e termina com `rollback`, portanto nao deixa registros de teste. Ele cobre cadastro sem e com estoque, custo inicial, compra, media ponderada, conversao de gramas para quilos, perda, estoque zerado, saldo negativo, protecao contra CRUD direto, historico imutavel e usuario nao autorizado.

### Concorrencia

Para confirmar o bloqueio de linha, crie um ingrediente de teste e abra duas abas do SQL Editor. Nas duas transacoes, use `set_config('request.jwt.claim.sub', '<UUID_DO_ADMIN>', true)` antes da RPC. Na primeira aba, inicie uma transacao, registre uma compra e mantenha a transacao aberta. Na segunda, registre outra compra do mesmo ingrediente. A segunda chamada deve aguardar o `commit` da primeira; depois disso, deve recalcular usando o saldo ja atualizado, sem sobrescrever a compra anterior.

## Validacao manual da interface

1. Entre com um perfil `ADMIN` ativo e abra `/ingredientes`.
2. Cadastre um ingrediente sem estoque inicial e confirme saldo e custo zerados.
3. Cadastre Morango em `kg`, com 2 kg e R$ 20,00. Confirme custo medio de R$ 10,00/kg e a entrada no historico.
4. Registre 3 kg por R$ 36,00. Confirme saldo de 5 kg e custo medio de R$ 11,20/kg.
5. Registre 500 g por R$ 6,00 e confirme a conversao para 0,5 kg.
6. Ajuste o saldo por perda e confirme que o custo medio nao mudou.
7. Ajuste o saldo para zero e confirme o estado `Sem estoque`.
8. Teste busca, filtros, edicao e a visualizacao em largura de celular.
9. Desative o perfil em `profiles` e confirme que novas operacoes sao recusadas pelo banco.

