# Módulo Produtos

## Regras implementadas

- UUID como chave primária, `slug` único e status restrito a ativo, inativo ou esgotado.
- Peso, preço, custo e estoque não aceitam valores negativos.
- Imagens ficam no bucket `product-images`; o banco guarda apenas caminho e metadados.
- Visitantes anônimos leem somente produtos ativos e suas imagens.
- Usuários autenticados precisam constar em `admin_users` para gerenciar produtos.
- `updated_at` é atualizado por trigger.
- A opção **Arquivar sem afetar relatórios** muda o produto para inativo, remove sua publicação e destaque, mas preserva o cadastro e todos os vínculos históricos.
- A exclusão definitiva só é permitida quando o produto não possui receitas, produções, vendas ou movimentações de estoque vinculadas.
- O endereço do catálogo (`slug`) é gerado automaticamente a partir do nome; a descrição curta é opcional.
- Cada produto pode possuir no máximo duas imagens.

## Ativação do Supabase

1. Crie um projeto no Supabase.
2. Execute as migrations da pasta `supabase/migrations` na ordem dos nomes dos arquivos.
3. Crie `.env.local` a partir de `.env.example`.
4. Cadastre o primeiro usuário no Supabase Auth.
5. Insira o UUID desse usuário em `public.admin_users` pelo SQL Editor.

Sem as variáveis, a tela opera em modo demonstração com dados locais.

## Teste manual

1. Abra `/produtos` em desktop e celular.
2. Busque por nome e filtre por status.
3. Cadastre um produto e valide mensagens de campos obrigatórios.
4. Edite preço e estoque.
5. Arquive um produto com histórico e confirme que ele sai da visão operacional e do catálogo, mas continua nos relatórios e no filtro de arquivados.
6. Tente excluir definitivamente um produto com histórico e confirme que a operação é bloqueada.
7. Anexe duas imagens e confirme os arquivos no bucket `product-images` e os metadados em `product_images`.
8. Com Supabase configurado, recarregue a página e confirme a persistência.
9. Saia da sessão e confirme que `/produtos` redireciona para `/login`.
