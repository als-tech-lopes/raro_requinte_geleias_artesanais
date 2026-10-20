# Fundação da área administrativa

## Fluxo de acesso

1. `src/proxy.ts` renova a sessão do Supabase e protege todas as rotas administrativas.
2. O acesso exige um usuário autenticado e um registro correspondente em `public.profiles` com `ativo = true` e `papel = 'ADMIN'`.
3. O layout de `(admin)` executa uma segunda verificação no servidor antes de renderizar qualquer módulo.
4. O login valida o formulário com Zod e React Hook Form, autentica com senha e recusa perfis sem autorização.
5. O logout é uma Server Action que encerra a sessão e redireciona para `/login`.

Não existe cadastro público. A chave `service_role` não é usada pela aplicação.

## Variáveis de ambiente

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
```

Essas duas variáveis são públicas por definição e a segurança depende das políticas RLS. Nunca adicione `SUPABASE_SERVICE_ROLE_KEY` ao frontend ou a uma variável com prefixo `NEXT_PUBLIC_`.

## Primeiro administrador

1. No painel do Supabase, abra **Authentication > Users > Add user**.
2. Crie o usuário com e-mail e senha e marque o e-mail como confirmado quando apropriado.
3. O trigger da migration cria automaticamente um perfil inativo. No SQL Editor, execute:

```sql
update public.profiles p
set papel = 'ADMIN',
    ativo = true
from auth.users u
where p.id = u.id
  and u.email = 'admin@seu-dominio.com';
```

4. Confirme que exatamente uma linha foi alterada e entre em `/login`.

## Verificações manuais

- Sem sessão, abra `/dashboard` e confirme o redirecionamento para `/login`.
- Tente uma senha incorreta e confirme a mensagem sem revelar detalhes da conta.
- Crie um usuário comum e mantenha seu perfil inativo; confirme que o login administrativo é recusado.
- Ative o perfil como `OPERADOR`; confirme que ele continua sem acesso administrativo.
- Entre com o perfil `ADMIN` ativo e confira todas as rotas do menu em desktop e mobile.
- Recarregue `/dashboard` para conferir a persistência da sessão.
- Clique em sair e confirme que voltar pelo navegador não reabre uma rota protegida.
- Desative o perfil durante uma sessão e confirme que a próxima navegação solicita novo login.
- Verifique no DevTools que nenhuma chave `service_role` está presente nos arquivos ou requisições do navegador.
- Registre dados de venda, produção e estoque e confira os indicadores do dashboard sob as políticas RLS.
