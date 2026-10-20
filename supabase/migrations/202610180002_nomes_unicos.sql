begin;

-- A constraint antiga diferencia maiusculas e minusculas e precisa sair antes
-- da normalizacao dos dados existentes.
alter table public.ingredientes
  drop constraint ingredientes_nome_unique;

-- Uniformiza os registros existentes sem modificar maiusculas, minusculas ou acentos.
update public.produtos
set nome = regexp_replace(btrim(nome), '[[:space:]]+', ' ', 'g')
where nome is distinct from regexp_replace(btrim(nome), '[[:space:]]+', ' ', 'g');

update public.ingredientes
set nome = regexp_replace(btrim(nome), '[[:space:]]+', ' ', 'g')
where nome is distinct from regexp_replace(btrim(nome), '[[:space:]]+', ' ', 'g');

-- Preserva todos os IDs e historicos existentes. Em cada grupo duplicado, o
-- cadastro mais antigo conserva o nome; os demais ficam claramente marcados
-- para revisao posterior pelo administrador.
with produtos_repetidos as (
  select
    id,
    nome,
    row_number() over (
      partition by lower(nome)
      order by created_at, id
    ) as posicao
  from public.produtos
)
update public.produtos p
set nome = left(r.nome, 70) || ' (duplicado ' || r.id::text || ')'
from produtos_repetidos r
where p.id = r.id
  and r.posicao > 1;

with ingredientes_repetidos as (
  select
    id,
    nome,
    row_number() over (
      partition by lower(nome)
      order by created_at, id
    ) as posicao
  from public.ingredientes
)
update public.ingredientes i
set nome = left(r.nome, 70) || ' (duplicado ' || r.id::text || ')'
from ingredientes_repetidos r
where i.id = r.id
  and r.posicao > 1;

create or replace function public.normalizar_nome_cadastro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nome := regexp_replace(btrim(new.nome), '[[:space:]]+', ' ', 'g');
  if new.nome = '' then
    raise exception 'O nome nao pode ficar vazio';
  end if;
  return new;
end;
$$;

create trigger produtos_normalizar_nome
before insert or update of nome on public.produtos
for each row execute function public.normalizar_nome_cadastro();

create trigger ingredientes_normalizar_nome
before insert or update of nome on public.ingredientes
for each row execute function public.normalizar_nome_cadastro();

create unique index produtos_nome_normalizado_unique
  on public.produtos (lower(nome));

create unique index ingredientes_nome_normalizado_unique
  on public.ingredientes (lower(nome));

revoke all on function public.normalizar_nome_cadastro() from public, anon, authenticated;

commit;
