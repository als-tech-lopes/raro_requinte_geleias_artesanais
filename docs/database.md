# Modelo de dados inicial

## Diagrama textual

```text
auth.users 1──1 profiles

fornecedores 1──N ingredientes

categorias_produtos 1──N produtos 1──N produto_imagens
                             │
                             ├──1 receitas 1──N receita_itens N──1 ingredientes
                             │
                             ├──1 producoes 1──N producao_itens N──1 ingredientes
                             │
                             └──N venda_itens N──1 vendas N──0..1 clientes

produtos     1──N movimentacoes_estoque
ingredientes 1──N movimentacoes_estoque
producoes    1──N movimentacoes_estoque
vendas       1──N movimentacoes_estoque
profiles     1──N producoes, vendas e movimentacoes_estoque

clientes 0..1──N depoimentos

midias          (acervo institucional independente)
configuracoes   (chave/valor JSON, com exposição pública explícita)
```

## Decisões de modelagem

### Uma tabela de movimentações

Foi escolhida uma única `movimentacoes_estoque`. Ingredientes e produtos compartilham os mesmos conceitos de auditoria: quantidade, saldo anterior/posterior, origem, usuário e momento. Duas tabelas duplicariam consultas, índices e regras.

A tabela não usa uma FK polimórfica genérica. Ela possui `ingrediente_id` e `produto_id`, e uma constraint exige exatamente um deles conforme `item_tipo`. Referências a produção e venda também são FKs reais. Assim, o histórico unificado não sacrifica integridade referencial.

`quantidade` é assinada. Uma produção gera uma saída negativa para cada ingrediente e uma entrada positiva para o produto acabado. O saldo posterior precisa ser exatamente `saldo_anterior + quantidade`.

### Tabela adicional

`fornecedores` foi adicionada porque vários ingredientes podem compartilhar o mesmo fornecedor. Guardar o nome repetidamente em `ingredientes` criaria duplicação e dificultaria manutenção. Não foram criadas tabelas separadas de lote, pagamento, endereço ou saldo nesta etapa.

## Integridade principal

- UUIDs em todas as entidades e FKs com comportamento de exclusão explícito.
- Slugs, nomes naturais e caminhos de Storage únicos quando aplicável.
- Valores monetários e saldos nunca negativos.
- Itens de receita, produção e venda não podem se repetir no mesmo documento.
- Produto esgotado precisa ter saldo zero.
- Validade do lote não pode anteceder a produção.
- Venda cancelada precisa registrar usuário e instante do cancelamento.
- Movimentações são imutáveis: não podem ser editadas ou excluídas.
- Saldos não podem ser alterados diretamente; um trigger aceita mudanças somente dentro das RPCs.
- Preços, nomes e custos relevantes são copiados para itens transacionais como snapshots históricos.
- Conversões aceitas: `kg ↔ g` e `L ↔ ml`; unidades incompatíveis geram erro.

## Operações atômicas

| RPC | Efeito transacional |
|---|---|
| `registrar_producao` | bloqueia ingredientes/produto, valida disponibilidade, baixa insumos, cria snapshots, aumenta produto e registra o custo real |
| `registrar_venda` | bloqueia produtos, valida estoque, congela preços, baixa saldos e registra movimentos |
| `cancelar_venda` | bloqueia a venda, impede segundo cancelamento, restaura produtos e registra a reversão |
| `ajustar_estoque` | bloqueia um item, calcula a diferença e registra saldo anterior/posterior |

Todas usam `security definer`, `search_path` vazio, verificam `auth.uid()` por `is_staff()` e são concedidas apenas ao papel `authenticated`.

## Como aplicar no Supabase

### Opção recomendada: CLI

1. Instale e autentique a CLI:

   ```bash
   npx supabase login
   ```

2. Vincule o repositório ao projeto remoto:

   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

3. Confira o plano antes de aplicar:

   ```bash
   npx supabase db push --dry-run
   ```

4. Aplique a migration:

   ```bash
   npx supabase db push
   ```

5. Gere os tipos TypeScript:

   ```bash
   npx supabase gen types typescript --linked > src/types/database.ts
   ```

### Alternativa: SQL Editor

Em um projeto vazio, abra **SQL Editor**, copie integralmente `supabase/migrations/202610170001_initial_schema.sql` e execute uma única vez. A CLI continua sendo preferível porque mantém o histórico de migrations sincronizado.

## Como testar

1. Execute o teste estrutural no SQL Editor copiando `supabase/tests/001_schema_smoke.sql`. O resultado esperado é `Schema smoke test: OK`.
2. Em **Authentication → Users**, crie o usuário administrativo.
3. No SQL Editor, substitua o UUID e ative o perfil:

   ```sql
   update public.profiles
   set papel = 'ADMIN', ativo = true
   where id = 'UUID_DO_USUARIO';
   ```

4. Entre na aplicação com esse usuário.
5. Cadastre categoria, produto, ingredientes e receita com estoque inicial zero.
6. Use `ajustar_estoque` para carregar os ingredientes. Confirme uma linha por ajuste em `movimentacoes_estoque`.
7. Execute `registrar_producao`. Confirme, na mesma operação: baixa dos ingredientes, aumento do produto, `producao_itens` e movimentos com saldos encadeados.
8. Execute `registrar_venda`. Confirme a redução do produto e os preços congelados em `venda_itens`.
9. Execute `cancelar_venda` duas vezes. A primeira deve restaurar o saldo; a segunda deve falhar sem criar novo movimento.
10. Tente atualizar `quantidade_disponivel` diretamente. A operação deve falhar com a mensagem de uso obrigatório das funções transacionais.
11. Faça uma requisição sem login às views `catalogo_*`. Confirme que os dados publicados aparecem e que uma consulta direta a `clientes`, `ingredientes` ou `vendas` é negada.

Para um banco local, use `npx supabase start`, `npx supabase db reset` e então execute o smoke test com o cliente SQL do ambiente local.
