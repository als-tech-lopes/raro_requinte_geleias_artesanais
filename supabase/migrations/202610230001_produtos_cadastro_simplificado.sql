-- Simplifica o cadastro de produtos e limita a galeria a duas imagens.

alter table public.produtos
  drop constraint if exists produtos_descricao_curta_check;

alter table public.produtos
  add constraint produtos_descricao_curta_check
  check (char_length(descricao_curta) <= 180);

create or replace function public.limitar_imagens_produto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- O bloqueio do produto serializa inclusões concorrentes na mesma galeria.
  perform 1
  from public.produtos
  where id = new.produto_id
  for update;

  if (
    select count(*)
    from public.produto_imagens
    where produto_id = new.produto_id
      and id <> new.id
  ) >= 2 then
    raise exception 'Cada produto pode ter no máximo 2 imagens.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists produto_imagens_limite on public.produto_imagens;
create trigger produto_imagens_limite
before insert or update of produto_id on public.produto_imagens
for each row execute function public.limitar_imagens_produto();
