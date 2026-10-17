# Módulo Produtos

## Regras implementadas

- UUID como chave primária, `slug` único e status restrito a ativo, inativo ou esgotado.
- Peso, preço, custo e estoque não aceitam valores negativos.
- Imagens ficam no bucket `product-images`; o banco guarda apenas caminho e metadados.
- Visitantes anônimos leem somente produtos ativos e suas imagens.
- Usuários autenticados precisam constar em `admin_users` para gerenciar produtos.
- `updated_at` é atualizado por trigger.

## Ativação do Supabase

1. Crie um projeto no Supabase.
2. Execute a migration `supabase/migrations/202610170001_products.sql`.
3. Crie `.env.local` a partir de `.env.example`.
4. Cadastre o primeiro usuário no Supabase Auth.
5. Insira o UUID desse usuário em `public.admin_users` pelo SQL Editor.

Sem as variáveis, a tela opera em modo demonstração com dados locais.

## Teste manual

1. Abra `/produtos` em desktop e celular.
2. Busque por nome e filtre por status.
3. Cadastre um produto e valide mensagens de campos obrigatórios.
4. Edite preço e estoque.
5. Exclua um produto e confirme o diálogo de segurança.
6. Anexe duas imagens e confirme os arquivos no bucket `product-images` e os metadados em `product_images`.
7. Com Supabase configurado, recarregue a página e confirme a persistência.
8. Saia da sessão e confirme que `/produtos` redireciona para `/login`.
