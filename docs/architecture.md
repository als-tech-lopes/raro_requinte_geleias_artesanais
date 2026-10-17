# Arquitetura da aplicação

## Princípios

- App Router para rotas, layouts, Server Components e Route Handlers.
- Supabase acessado diretamente pelo Next.js com a chave pública (`anon`/publishable).
- Operações simples de cadastro ficam em serviços por domínio.
- Operações que alteram mais de uma tabela ou qualquer saldo de estoque usam RPC PostgreSQL.
- Zod valida a entrada na borda da aplicação; constraints e funções validam novamente no banco.
- Tipos gerados pelo Supabase representam o banco. Tipos de tela ficam separados quando houver adaptação.

## Estrutura

```text
src/
├── app/
│   ├── (public)/                 # catálogo, produto/[slug], sobre, contato
│   ├── (admin)/                  # dashboard e módulos protegidos
│   ├── login/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # componentes visuais reutilizáveis
│   ├── auth/
│   └── products/                 # componentes específicos do domínio
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser Client
│       └── server.ts             # Server Client com cookies
├── services/
│   ├── products.ts               # consultas e comandos simples
│   └── inventory.ts              # chamadas às RPCs de estoque
├── schemas/
│   └── product.ts                # schemas Zod e tipos inferidos
└── types/
    ├── database.ts               # gerado pela CLI do Supabase
    └── product.ts                # tipos adaptados para a interface

supabase/
├── migrations/                   # esquema versionado
└── tests/                        # testes estruturais SQL
```

As pastas `services` e `schemas` são mantidas rasas enquanto houver poucos arquivos. Subpastas por domínio só devem ser criadas quando um módulo tiver vários serviços ou schemas.

## Responsabilidades

| Camada | Responsabilidade | Não deve conter |
|---|---|---|
| `app` | composição de páginas, layouts e limites server/client | SQL e regras transacionais |
| `components` | apresentação, interação e formulários | acesso direto espalhado ao banco |
| `lib` | clientes e utilidades técnicas | regras de negócio |
| `services` | consultas, CRUD e invocação de RPCs | JSX |
| `schemas` | validação de entradas | acesso a dados |
| `types` | contratos TypeScript | comportamento |

## Autenticação e autorização

O navegador recebe somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. A autorização efetiva está no PostgreSQL por RLS. Nenhuma tela administrativa depende apenas de redirecionamento no Next.js. A `service_role` não pertence ao frontend, a variáveis `NEXT_PUBLIC_*` ou ao repositório.

Contas novas recebem um `profile` inativo. Um administrador precisa ativar a conta e definir seu papel. Isso impede que um cadastro público se torne operador automaticamente.

## Dados públicos

As tabelas-base não concedem leitura ao papel `anon`. O catálogo acessa somente estas views:

- `catalogo_categorias`
- `catalogo_produtos`
- `catalogo_produto_imagens`
- `catalogo_depoimentos`
- `catalogo_midias`
- `catalogo_configuracoes`

As views omitem custo, estoque interno, clientes, usuários e metadados operacionais.
