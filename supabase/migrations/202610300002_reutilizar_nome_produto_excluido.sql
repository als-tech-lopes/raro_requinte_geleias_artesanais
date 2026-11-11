begin;

-- Produtos excluidos logicamente continuam no banco para preservar o historico,
-- mas nao devem reservar o nome nem o endereco do catalogo.
alter table public.produtos
  drop constraint if exists produtos_slug_unique;

drop index if exists public.produtos_slug_unique;
drop index if exists public.produtos_nome_normalizado_unique;

create unique index produtos_slug_unique
  on public.produtos (slug)
  where deleted_at is null;

create unique index produtos_nome_normalizado_unique
  on public.produtos (lower(nome))
  where deleted_at is null;

commit;
