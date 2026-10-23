begin;
alter table public.romaneios_itens add column if not exists material_excluido jsonb;
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
  select count(*) into v_solicitacoes
    from public.solicitacoes_itens where material_equipamento_id = p_material_id;

  -- Documento emitido não se reescreve: o item fica
  if v_romaneios > 0 or v_solicitacoes > 0 then
    raise exception
      'O item % (%) aparece em % romaneio(s) e % solicitacao(oes) e nao pode ser excluido. Marque como inativo para tira-lo do uso sem apagar o historico.',
      v_material.codigo, v_material.nome, v_romaneios, v_solicitacoes;
  end if;

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
    'romaneios_desvinculados', v_cancelados
  );
end $function$
;
CREATE OR REPLACE FUNCTION public.romaneios_protege_aprovado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    if not public.app_eh_admin() or current_setting('app.excluir_romaneio', true) is distinct from old.id::text then
      raise exception 'Somente administradores podem excluir romaneios pelo procedimento de exclusão. Para os demais perfis, utilize Cancelar.';
    end if;
    return old;
  end if;

  if old.status in ('aprovado', 'retirado', 'devolvido') then
    -- A unica alteracao permitida e o cancelamento com motivo
    if new.status = 'cancelado' then
      if coalesce(btrim(new.observacoes), '') = '' then
        raise exception 'Informe o motivo do cancelamento do romaneio %.', old.numero;
      end if;
      return new;
    end if;

    -- Transicao natural do fluxo (aprovado -> retirado -> devolvido) segue valida
    if new.status is distinct from old.status
       and new.status in ('retirado', 'devolvido') then
      return new;
    end if;

    -- Anexar a assinatura de recebimento (RF-09): so quando ainda nao ha
    -- assinatura, e desde que nenhum outro campo do documento mude.
    if old.assinatura_retirada is null
       and new.assinatura_retirada is not null
       and new.status is not distinct from old.status
       and new.numero is not distinct from old.numero
       and new.tipo is not distinct from old.tipo
       and new.colaborador_id is not distinct from old.colaborador_id
       and new.centro_custo_origem_id is not distinct from old.centro_custo_origem_id
       and new.centro_custo_destino_id is not distinct from old.centro_custo_destino_id
       and new.valor_total is not distinct from old.valor_total
       and new.data_romaneio is not distinct from old.data_romaneio
       and new.observacoes is not distinct from old.observacoes
       and new.responsavel_nome is not distinct from old.responsavel_nome
       and new.responsavel_retirada is not distinct from old.responsavel_retirada then
      return new;
    end if;

    -- Assinatura ja colhida nao se troca nem se apaga
    if old.assinatura_retirada is not null
       and new.assinatura_retirada is distinct from old.assinatura_retirada then
      raise exception 'O romaneio % ja esta assinado; a assinatura nao pode ser alterada.', old.numero;
    end if;

    raise exception 'Romaneio % esta % e nao pode ser editado. Cancele o documento informando o motivo.',
      old.numero, old.status;
  end if;

  return new;
end $function$
;

create or replace function public.excluir_romaneio(p_romaneio_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_doc public.romaneios%rowtype;
  v_mov record;
  v_peca record;
  v_anterior record;
  v_pecas uuid[];
  v_saldo integer;
  v_ultimo integer;
  v_dados jsonb;
begin
  if auth.uid() is null or not public.app_eh_admin() or not public.app_tem_permissao('romaneios', 'delete') then
    raise exception 'Somente administradores podem excluir romaneios.' using errcode = '42501';
  end if;
  lock table public.romaneios, public.romaneios_itens, public.material_unidades,
    public.materiais_equipamentos, public.movimentacao_estoque in share row exclusive mode;
  select * into v_doc from public.romaneios where id = p_romaneio_id for update;
  if not found then raise exception 'Romaneio não encontrado ou já excluído.'; end if;
  if exists(select 1 from public.romaneios where romaneio_origem_id = p_romaneio_id) then
    raise exception 'Exclua primeiro as devoluções vinculadas a este romaneio.';
  end if;
  if exists(select 1 from public.movimentacao_estoque posterior join
    (select material_equipamento_id, min(created_at) as inicio from public.movimentacao_estoque
      where romaneio_id = p_romaneio_id group by material_equipamento_id) propria
      on propria.material_equipamento_id = posterior.material_equipamento_id
    where posterior.romaneio_id is distinct from p_romaneio_id and posterior.created_at >= propria.inicio) then
    raise exception 'Há movimentações posteriores dos mesmos materiais. Desfaça primeiro os documentos mais recentes.';
  end if;
  if exists(select 1 from public.romaneios_itens propria join public.romaneios_itens posterior
    on posterior.material_unidade_id = propria.material_unidade_id
    where propria.romaneio_id = p_romaneio_id and posterior.romaneio_id is distinct from p_romaneio_id
      and posterior.created_at >= propria.created_at) then
    raise exception 'Uma peça possui documento posterior. Exclua primeiro esse documento.';
  end if;
  if exists(select 1 from public.movimentacao_estoque where romaneio_id = p_romaneio_id
    and (quantidade_anterior is null or quantidade_atual is null)) then
    raise exception 'O histórico de estoque está incompleto. Confira as movimentações antes de excluir.';
  end if;
  v_dados := jsonb_build_object('romaneio', to_jsonb(v_doc),
    'itens', coalesce((select jsonb_agg(to_jsonb(i)) from public.romaneios_itens i where i.romaneio_id = p_romaneio_id), '[]'::jsonb),
    'movimentacoes', coalesce((select jsonb_agg(to_jsonb(m)) from public.movimentacao_estoque m where m.romaneio_id = p_romaneio_id), '[]'::jsonb));
  select array_agg(distinct material_unidade_id) filter (where material_unidade_id is not null)
    into v_pecas from public.romaneios_itens where romaneio_id = p_romaneio_id;
  for v_mov in select material_equipamento_id, sum(quantidade_atual - quantidade_anterior) as delta
    from public.movimentacao_estoque where romaneio_id = p_romaneio_id group by material_equipamento_id
  loop
    select coalesce(estoque_atual, 0) into v_saldo from public.materiais_equipamentos where id = v_mov.material_equipamento_id;
    select quantidade_atual into v_ultimo from public.movimentacao_estoque
      where romaneio_id = p_romaneio_id and material_equipamento_id = v_mov.material_equipamento_id
      order by created_at desc, id desc limit 1;
    if v_saldo is distinct from v_ultimo or v_saldo - v_mov.delta < 0 then
      raise exception 'O saldo foi alterado após o documento. Confira o estoque antes de excluir.';
    end if;
    update public.materiais_equipamentos set estoque_atual = v_saldo - v_mov.delta,
      centro_custo_id = case when centro_custo_id = v_doc.centro_custo_destino_id and v_doc.centro_custo_origem_id is not null
        then v_doc.centro_custo_origem_id else centro_custo_id end where id = v_mov.material_equipamento_id;
  end loop;
  if v_doc.tipo = 'devolucao' and v_doc.romaneio_origem_id is not null then
    update public.romaneios_itens origem set data_devolucao = null
      where origem.romaneio_id = v_doc.romaneio_origem_id
        and exists(select 1 from public.romaneios_itens atual where atual.romaneio_id = p_romaneio_id
          and atual.material_equipamento_id = origem.material_equipamento_id
          and (origem.material_unidade_id is null or atual.material_unidade_id = origem.material_unidade_id))
        and not exists(select 1 from public.romaneios outra join public.romaneios_itens oi on oi.romaneio_id = outra.id
          where outra.romaneio_origem_id = v_doc.romaneio_origem_id and outra.id <> p_romaneio_id
          and coalesce(outra.status, '') <> 'cancelado' and oi.material_equipamento_id = origem.material_equipamento_id
          and (origem.material_unidade_id is null or oi.material_unidade_id = origem.material_unidade_id));
    update public.romaneios set status = 'retirado' where id = v_doc.romaneio_origem_id and status = 'devolvido';
  end if;
  delete from public.movimentacao_estoque where romaneio_id = p_romaneio_id;
  delete from public.romaneios_itens where romaneio_id = p_romaneio_id;
  perform set_config('app.excluir_romaneio', p_romaneio_id::text, true);
  delete from public.romaneios where id = p_romaneio_id;
  perform set_config('app.excluir_romaneio', '', true);
  for v_peca in select id from public.material_unidades where id = any(v_pecas)
  loop
    select r.tipo, r.status, r.colaborador_id, i.data_devolucao into v_anterior
      from public.romaneios_itens i join public.romaneios r on r.id = i.romaneio_id
      where i.material_unidade_id = v_peca.id and coalesce(r.status, '') <> 'cancelado'
      order by i.created_at desc, i.id desc limit 1;
    update public.material_unidades set
      status = case when v_anterior.tipo = 'retirada' and v_anterior.data_devolucao is null and v_anterior.status <> 'devolvido' then 'em_uso' else 'disponivel' end,
      colaborador_id = case when v_anterior.tipo = 'retirada' and v_anterior.data_devolucao is null and v_anterior.status <> 'devolvido' then v_anterior.colaborador_id else null end
      where id = v_peca.id and status in ('disponivel', 'em_uso');
  end loop;
  insert into public.log_sistema(usuario_id, acao, tabela, registro_id, dados_anteriores)
    values(public.app_usuario_id(), 'romaneio.excluir', 'romaneios', p_romaneio_id, v_dados);
end;
$$;
revoke all on function public.excluir_romaneio(uuid) from public, anon;
grant execute on function public.excluir_romaneio(uuid) to authenticated;
commit;
