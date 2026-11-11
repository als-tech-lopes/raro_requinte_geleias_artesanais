begin;

insert into public.configuracoes (chave, valor, descricao, publica)
values
  (
    'catalogo.resumo_historia',
    to_jsonb('Uma história feita de afeto, receitas cuidadosas e do desejo de transformar frutas selecionadas em momentos especiais.'::text),
    'Resumo em destaque na página Sobre nós',
    true
  ),
  (
    'catalogo.video_institucional_path',
    to_jsonb(''::text),
    'Caminho do vídeo institucional no Storage',
    true
  )
on conflict (chave) do nothing;

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
where id = 'public-media';

commit;
