# Módulo de catálogo online

## Arquitetura

O catálogo reutiliza `produtos`, `produto_imagens`, `categorias_produtos`, `depoimentos`, `midias` e `configuracoes`. Não existe uma segunda tabela de produtos.

- Conteúdo informativo usa Server Components e revalidação de 60 segundos.
- Filtros, seleção de quantidade, menu móvel e sacola usam Client Components.
- A sacola salva no `localStorage` somente `productId` e quantidade.
- Preços e disponibilidade são consultados novamente pela RPC antes de abrir o WhatsApp.
- Abrir o WhatsApp não cria vendas, clientes, pagamentos, reservas ou movimentos de estoque.

## Migration e segurança

Migration incremental:

```text
supabase/migrations/202610190005_catalogo_publico.sql
```

A versão `202610190004` já existia no histórico remoto e foi preservada localmente
como marcador. A implementação deste módulo começa na versão `202610190005`.

Ela adiciona aos produtos:

- `publicado`;
- `ingredientes_publicos`;
- `conservacao`;
- `alergenos`;
- `observacoes_rotulagem`.

Também adiciona `autorizado_publicacao` aos depoimentos, cria as configurações iniciais e restringe as interfaces públicas.

O acesso anônimo ocorre somente por:

- `catalogo_produtos`;
- `catalogo_produto_imagens`;
- `catalogo_categorias`;
- `catalogo_depoimentos`;
- `catalogo_midias`;
- `catalogo_configuracoes`;
- RPC `catalogo_validar_sacola`.

As tabelas privadas continuam sem `SELECT` para `anon`. A interface pública não retorna custos, receitas, margens, fornecedores, quantidades por lote, clientes, vendas ou movimentos.

## Disponibilidade

Quando o produto possui lotes, a disponibilidade considera somente lotes:

- com saldo;
- não bloqueados;
- não vencidos na data local configurada.

Produtos legados sem nenhum lote usam o saldo consolidado. O visitante recebe apenas um indicador de disponibilidade; a RPC valida se a quantidade solicitada pode ser atendida sem revelar o saldo interno.

## Rotas públicas

- `/`
- `/catalogo`
- `/catalogo/[slug]`
- `/sobre`
- `/depoimentos`
- `/contato`
- `/sacola`
- `/sitemap.xml`
- `/robots.txt`

Como `/depoimentos` passou a ser público, a administração dos depoimentos está em `/admin/depoimentos`. As demais rotas administrativas continuam protegidas.

## Administração

- `/configuracoes/catalogo`: marca, textos, contatos, cores, imagens e opções de exibição.
- `/produtos`: publicação, destaque, textos públicos de rotulagem e galeria de imagens.
- `/admin/depoimentos`: cadastro, edição, aprovação e autorização de publicação.
- `/midias`: upload, publicação, ordenação e remoção de banners e fotos da galeria.

## Storage

- `product-images`: galeria pública dos produtos, limite de 5 MB por arquivo.
- `public-media`: logotipo, banners, imagens institucionais, galeria e fotos de depoimentos, limite de 10 MB.

Os buckets já existiam e foram reutilizados. Leitura é pública; escrita e exclusão exigem usuário administrativo autorizado. Tipos aceitos: JPEG, PNG e WebP.

## Aplicação e teste

No PowerShell:

```powershell
npx.cmd supabase link --project-ref SEU_PROJECT_REF
npx.cmd supabase db push
```

Depois execute no SQL Editor:

```text
supabase/tests/009_catalogo_publico.sql
```

Resultado esperado:

```text
Catalogo publico test: OK
```

O teste termina com `rollback` e valida publicação/despublicação, produto esgotado por validade, preço atual, sacola, depoimentos autorizados, privilégios públicos, políticas de upload e ausência de alterações em vendas e estoque.

## Variáveis de ambiente

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com.br
```

Não use `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## Publicação

1. Aplique a migration no Supabase de produção.
2. Configure `NEXT_PUBLIC_SITE_URL` com o domínio final.
3. Cadastre marca e contato em `/configuracoes/catalogo`.
4. Publique pelo menos um produto em `/produtos`.
5. Envie imagens pelos módulos administrativos.
6. Execute `npm.cmd run build` no ambiente de deploy.
7. Publique o projeto Next.js/Vinext no provedor escolhido e associe o domínio.
8. Confirme `/robots.txt`, `/sitemap.xml` e o compartilhamento de uma página de produto.

## Testes manuais

1. Abra `/` e `/catalogo` em janela anônima.
2. Confirme que `/dashboard` redireciona para login.
3. Publique e despublique um produto e aguarde até 60 segundos.
4. Coloque um produto na sacola, recarregue e altere a quantidade.
5. Altere o preço no painel e confirme a atualização da sacola.
6. Despublique um produto que já estava na sacola e confira o aviso.
7. Tente uma quantidade acima do estoque elegível.
8. Confira a mensagem e o número normalizado do WhatsApp.
9. Confirme no banco que nenhuma venda ou movimentação foi criada.
10. Teste navegação em largura de celular e compartilhamento da página de produto.

## Limitações conhecidas

- O pedido é apenas uma mensagem no WhatsApp, sem persistência ou acompanhamento.
- Não há checkout, pagamento online, reserva de estoque ou cálculo de entrega.
- As imagens têm validação de formato e tamanho, mas não recebem redimensionamento automático; prefira WebP já otimizado.
- Substituir imagens institucionais pode deixar o arquivo anterior no Storage para remoção manual.
- A atualização pública usa revalidação de até 60 segundos.
