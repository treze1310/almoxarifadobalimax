begin;
alter table public.solicitacoes_itens add column if not exists material_excluido jsonb;
CREATE OR REPLACE FUNCTION public.excluir_material(p_material_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_material record;
  v_romaneios int;
  v_solicitacoes int;
  v_nfe int;
  v_unidades int;
  v_movimentacoes int;
  v_epi int;
  v_cancelados int;
begin
  if not public.app_tem_permissao('materiais', 'delete') then
    raise exception 'Sem permissao para excluir material';
  end if;

  lock table public.romaneios, public.romaneios_itens, public.solicitacoes_itens, public.material_unidades, public.materiais_equipamentos, public.movimentacao_estoque in share row exclusive mode;

  select id, codigo, nome, unidade_medida into v_material
    from public.materiais_equipamentos
   where id = p_material_id
   for update;

  if not found then
    raise exception 'Material nao encontrado';
  end if;

  select count(*) into v_romaneios
    from public.romaneios_itens i left join public.romaneios r on r.id = i.romaneio_id
   where (i.material_equipamento_id = p_material_id or i.material_unidade_id in
     (select id from public.material_unidades where material_equipamento_id = p_material_id))
     and coalesce(r.status, '') <> 'cancelado';
  if v_romaneios > 0 then
    raise exception 'O item % (%) aparece em % romaneio(s) nao cancelado(s).',
      v_material.codigo, v_material.nome, v_romaneios;
  end if;

  -- A solicitação permanece com quantidade, status e identificação histórica.
  update public.solicitacoes_itens
     set material_excluido = jsonb_build_object('id', v_material.id, 'codigo', v_material.codigo,
           'nome', v_material.nome, 'unidade_medida', v_material.unidade_medida),
         descricao_item = case when nullif(btrim(descricao_item), '') is null
           or descricao_item = 'Item solicitado' then v_material.nome else descricao_item end,
         material_equipamento_id = null
   where material_equipamento_id = p_material_id;
  get diagnostics v_solicitacoes = row_count;

  -- Preserva o documento cancelado com os dados históricos do item.
  update public.romaneios_itens i
     set material_excluido = jsonb_build_object('id', v_material.id, 'codigo', v_material.codigo,
         'nome', v_material.nome, 'unidade_medida', v_material.unidade_medida),
         material_unidade_id = null, material_equipamento_id = null
    from public.romaneios r
   where i.romaneio_id = r.id and r.status = 'cancelado'
     and (i.material_equipamento_id = p_material_id or i.material_unidade_id in
       (select id from public.material_unidades where material_equipamento_id = p_material_id));
  get diagnostics v_cancelados = row_count;

  -- A nota continua como foi emitida; perde só o vínculo com o cadastro
  update public.nfe_itens
     set material_equipamento_id = null
   where material_equipamento_id = p_material_id;
  get diagnostics v_nfe = row_count;

  delete from public.material_unidades where material_equipamento_id = p_material_id;
  get diagnostics v_unidades = row_count;

  delete from public.movimentacao_estoque where material_equipamento_id = p_material_id;
  get diagnostics v_movimentacoes = row_count;

  delete from public.epi_atribuicoes where material_equipamento_id = p_material_id;
  get diagnostics v_epi = row_count;

  insert into public.log_sistema(usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
  values(public.app_usuario_id(), 'material.excluir', 'materiais_equipamentos', p_material_id,
    to_jsonb(v_material), jsonb_build_object('romaneios_cancelados_preservados', v_cancelados));
  delete from public.materiais_equipamentos where id = p_material_id;

  return jsonb_build_object(
    'codigo', v_material.codigo,
    'nome', v_material.nome,
    'nfe_desvinculados', v_nfe,
    'unidades_removidas', v_unidades,
    'movimentacoes_removidas', v_movimentacoes,
    'epi_removidos', v_epi,
    'solicitacoes_desvinculadas', v_solicitacoes,
    'romaneios_desvinculados', v_cancelados
  );
end $function$
;
commit;
