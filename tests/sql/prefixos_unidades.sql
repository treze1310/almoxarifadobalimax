-- Dados sintéticos: nenhuma mudança persiste.
begin;
do $$
declare
 v_pai uuid := gen_random_uuid();
 v_peca uuid := gen_random_uuid();
 v_prefixo text := '__PREFIXO_' || substr(v_pai::text,1,8);
 v_antes jsonb;
 v_depois jsonb;
begin
 insert into public.materiais_equipamentos(id,codigo,nome,estoque_atual,reposicao_automatica)
 values(v_pai,v_prefixo,'Teste sincronização de código',0,false);
 insert into public.material_unidades(id,material_equipamento_id,codigo,sequencia,patrimonio_anterior,observacoes,status)
 values(v_peca,v_pai,'PREFIXO_INCORRETO',1,'ANTIGO-123','Preservar observação','disponivel');
 if (select codigo from public.material_unidades where id=v_peca) <> v_prefixo || '-1' then
   raise exception 'Inserção deixou prefixo incorreto.';
 end if;
 select to_jsonb(u)-'codigo'-'updated_at' into v_antes from public.material_unidades u where id=v_peca;
 update public.materiais_equipamentos set codigo=v_prefixo || '_NOVO' where id=v_pai;
 if (select codigo from public.material_unidades where id=v_peca) <> v_prefixo || '_NOVO-1' then
   raise exception 'Alteração do pai não propagou para a peça.';
 end if;
 select to_jsonb(u)-'codigo'-'updated_at' into v_depois from public.material_unidades u where id=v_peca;
 if v_antes is distinct from v_depois then raise exception 'Alterou identidade ou histórico da peça.'; end if;
 perform * from public.criar_unidades_material(v_pai,2);
 if (select array_agg(sequencia order by sequencia) from public.material_unidades where material_equipamento_id=v_pai) <> array[1,2,3] then
   raise exception 'Geração perdeu a sequência existente.';
 end if;
 if exists(select 1 from public.material_unidades where material_equipamento_id=v_pai and codigo<>v_prefixo || '_NOVO-' || sequencia::text) then
   raise exception 'Geração usou código antigo.';
 end if;
 update public.material_unidades set codigo='ERRO' where id=v_peca;
 if (select codigo from public.material_unidades where id=v_peca) <> v_prefixo || '_NOVO-1' then
   raise exception 'Atualização direta quebrou consistência.';
 end if;
end $$;
rollback;
