-- Somente dados sintéticos; todos os registros e as operações são revertidos.
begin;
do $$
declare
  v_admin uuid;
  v_mat uuid := gen_random_uuid();
  v_doc uuid := gen_random_uuid();
  v_ativo uuid := gen_random_uuid();
  v_item uuid := gen_random_uuid();
  v_ok boolean;
  v_snapshot jsonb;
  v_novo uuid;
  v_sol uuid := gen_random_uuid();
begin
  select u.auth_user_id into v_admin from public.usuarios u
    left join public.perfis_acesso p on p.id = u.perfil_acesso_id
    where u.auth_user_id is not null and u.ativo is not false
      and (u.perfil = 'administrador' or p.nome = 'Administrador') limit 1;
  if v_admin is null then raise exception 'Teste requer administrador existente.'; end if;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  insert into public.materiais_equipamentos(id, codigo, nome, estoque_atual, reposicao_automatica)
    values(v_mat, '__TESTE_' || substr(v_mat::text, 1, 8), 'Material teste cancelado', 0, false);
  insert into public.romaneios(id, numero, tipo, status)
    values(v_doc, '__TESTE_' || v_doc::text, 'retirada', 'cancelado');
  insert into public.romaneios_itens(id, romaneio_id, material_equipamento_id, quantidade)
    values(v_item, v_doc, v_mat, 1);
  insert into public.solicitacoes(id, numero, tipo, status)
    values(v_sol, '__TESTE_' || v_sol::text, 'compra', 'pendente');
  insert into public.solicitacoes_itens(solicitacao_id, material_equipamento_id, descricao_item, quantidade)
    values(v_sol, v_mat, 'Item solicitado', 3);
  perform public.excluir_material(v_mat);
  if not exists(select 1 from public.solicitacoes_itens where solicitacao_id = v_sol
    and material_equipamento_id is null and quantidade = 3
    and descricao_item = 'Material teste cancelado' and material_excluido ->> 'nome' = 'Material teste cancelado')
    then raise exception 'Solicitação bloqueou exclusão ou perdeu identificação.'; end if;
  if not exists(select 1 from public.solicitacoes where id = v_sol and status = 'pendente')
    then raise exception 'Solicitação não foi preservada.'; end if;

  if exists(select 1 from public.materiais_equipamentos where id = v_mat) then raise exception 'Material cancelado permaneceu.'; end if;
  select material_excluido into v_snapshot from public.romaneios_itens where id = v_item and material_equipamento_id is null;
  if v_snapshot ->> 'nome' is distinct from 'Material teste cancelado' then raise exception 'Identificação histórica perdida.'; end if;
  if not exists(select 1 from public.romaneios where id = v_doc and status = 'cancelado') then raise exception 'Documento cancelado perdido.'; end if;

  -- Um vínculo cancelado não libera o material se houver outro ainda ativo.
  insert into public.materiais_equipamentos(id, nome, estoque_atual, reposicao_automatica)
    values(v_mat, 'Material teste misto', 0, false);
  insert into public.romaneios(id, numero, tipo, status)
    values(v_ativo, '__TESTE_' || v_ativo::text, 'retirada', 'pendente');
  insert into public.romaneios_itens(romaneio_id, material_equipamento_id, quantidade)
    values(v_doc, v_mat, 1), (v_ativo, v_mat, 1);
  v_ok := false;
  begin perform public.excluir_material(v_mat);
  exception when others then v_ok := true; end;
  if not v_ok then raise exception 'Material com vínculo ativo foi excluído.'; end if;
  if (select count(*) from public.romaneios_itens where material_equipamento_id = v_mat) <> 2 then raise exception 'Falha causou alteração parcial.'; end if;

  -- Mesmo um usuário autenticado não administrador não consegue usar o RPC.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  v_ok := false;
  begin perform public.excluir_romaneio(v_ativo);
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'Exclusão de romaneio não exigiu administrador.'; end if;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  -- Chamadas diretas de DELETE também não podem ignorar o procedimento.
  v_ok := false;
  begin delete from public.romaneios where id = v_ativo;
  exception when others then v_ok := true; end;
  if not v_ok then raise exception 'DELETE direto ignorou proteção transacional.'; end if;

  -- Administrador pode excluir documento pendente, com auditoria.
  perform public.excluir_romaneio(v_ativo);
  if exists(select 1 from public.romaneios where id = v_ativo) then raise exception 'Admin não excluiu pendente.'; end if;
  if not exists(select 1 from public.log_sistema where registro_id = v_ativo and acao = 'romaneio.excluir') then raise exception 'Exclusão sem auditoria.'; end if;

  -- Duas linhas do mesmo item: estorna o delta agregado, não um saldo antigo.
  v_novo := gen_random_uuid();
  update public.materiais_equipamentos set estoque_atual = 8 where id = v_mat;
  insert into public.romaneios(id, numero, tipo, status)
    values(v_novo, '__TESTE_' || v_novo::text, 'retirada', 'aprovado');
  insert into public.romaneios_itens(romaneio_id, material_equipamento_id, quantidade)
    values(v_novo, v_mat, 1), (v_novo, v_mat, 1);
  insert into public.movimentacao_estoque(material_equipamento_id, romaneio_id, tipo_movimentacao, quantidade, quantidade_anterior, quantidade_atual, created_at)
    values(v_mat, v_novo, 'saida', -1, 10, 9, now() - interval '2 seconds'),
          (v_mat, v_novo, 'saida', -1, 9, 8, now() - interval '1 second');
  perform public.excluir_romaneio(v_novo);
  if (select estoque_atual from public.materiais_equipamentos where id = v_mat) <> 10 then raise exception 'Estorno agregado incorreto.'; end if;

  -- Havendo outra movimentação posterior, nada pode ser removido ou estornado.
  v_novo := gen_random_uuid();
  insert into public.romaneios(id, numero, tipo, status)
    values(v_novo, '__TESTE_' || v_novo::text, 'retirada', 'aprovado');
  insert into public.movimentacao_estoque(material_equipamento_id, romaneio_id, tipo_movimentacao, quantidade, quantidade_anterior, quantidade_atual, created_at)
    values(v_mat, v_novo, 'saida', -1, 10, 9, now() - interval '1 second'),
          (v_mat, null, 'entrada', 1, 9, 10, now());
  v_ok := false;
  begin perform public.excluir_romaneio(v_novo);
  exception when others then v_ok := true; end;
  if not v_ok or not exists(select 1 from public.romaneios where id = v_novo)
    or (select estoque_atual from public.materiais_equipamentos where id = v_mat) <> 10 then
    raise exception 'Bloqueio de movimentação posterior deixou alteração parcial.';
  end if;
end;
$$;
rollback;
