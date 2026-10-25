alter table public.clientes
  add column if not exists rede_social text,
  add column if not exists origem text;

alter table public.clientes
  add constraint clientes_rede_social_tamanho_check
    check (rede_social is null or char_length(rede_social) <= 120),
  add constraint clientes_origem_check
    check (origem is null or origem in ('INDICACAO', 'INSTAGRAM', 'WHATSAPP', 'FEIRA_EVENTO', 'CATALOGO_SITE', 'OUTRO'));
