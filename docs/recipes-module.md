# Módulo de receitas

## O que foi implementado

- listagem, busca, ficha técnica, edição, duplicação e inativação;
- formulário visual em três etapas;
- conversões `kg ↔ g` e `L ↔ ml`, sem conversão entre peso, volume e unidade;
- custos calculados com o custo médio atual dos ingredientes;
- rendimento em potes completos, sobra, custo por pote e custo por 100 g;
- impressão da ficha técnica em A4;
- gravação atômica da receita e dos itens pela RPC `salvar_receita`;
- versionamento automático quando uma receita já usada em produção é editada;
- nenhuma movimentação de estoque durante cadastro ou edição.

## Aplicar a migration

Na raiz do projeto, com o Supabase CLI vinculado ao projeto correto:

```bash
npx supabase db push
```

A migration incremental aplicada será:

```text
supabase/migrations/202610190001_receitas_fichas.sql
```

Ela altera as tabelas existentes, cria os índices necessários e disponibiliza as RPCs `salvar_receita` e `inativar_receita`. As políticas RLS administrativas existentes continuam protegendo `receitas` e `receita_itens`; gravações diretas pelo papel `authenticated` são removidas para que receita e itens sejam salvos juntos.

## Teste SQL

No SQL Editor do Supabase, execute o conteúdo de:

```text
supabase/tests/006_receitas_flow.sql
```

Resultado esperado:

```text
Receitas flow test: OK
```

O teste usa uma transação e termina com `rollback`, portanto não deixa registros de teste. Ele cobre criação, edição, duplicação, inativação, conversões, ingrediente sem custo, atualização do custo médio, associação com produto, versionamento e preservação dos estoques.

## Teste manual

1. Cadastre ingredientes ativos em `/ingredientes`, incluindo ao menos um com estoque em `kg`.
2. Acesse `/receitas` e clique em **Nova receita**.
3. Informe rendimento de `1500 g` e pote de `250 g`; confira `6` potes completos.
4. Selecione o ingrediente em `kg`, informe `500 g` e confira a conversão do custo.
5. Tente repetir o ingrediente e confirme a validação.
6. Tente misturar uma unidade de volume com ingrediente de peso e confirme o bloqueio.
7. Salve, abra a ficha técnica e use **Imprimir em A4**.
8. Edite e duplique a receita; depois inative a cópia.
9. Confirme em `/ingredientes` que os saldos não foram alterados.

Para validar o projeto localmente:

```bash
npm run lint
npx tsc --noEmit
npm run build
```
