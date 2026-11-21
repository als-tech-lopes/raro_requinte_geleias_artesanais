begin;

-- Padronização solicitada para o estoque atual: todos os lotes cadastrados
-- passam a vencer no último dia de dezembro de 2027. A produção vinculada é
-- atualizada junto com o lote para que as duas fontes permaneçam consistentes.
select set_config('app.operacao_producao', 'permitida', true);

update public.producoes p
set validade = date '2027-12-31'
from public.lotes_produtos lp
where lp.producao_id = p.id
  and p.validade is distinct from date '2027-12-31';

update public.lotes_produtos
set validade = date '2027-12-31'
where validade is distinct from date '2027-12-31';

select set_config('app.operacao_producao', '', true);

commit;
