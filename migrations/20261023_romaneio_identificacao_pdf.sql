begin;
alter table public.romaneios add column if not exists expedicao_nome text;
alter table public.romaneios add column if not exists fiscalizacao_nome text;
alter table public.romaneios add column if not exists transporte_nome text;
-- A identidade da expedição pertence à operação, não ao usuário que baixa o PDF.
create or replace function public.romaneio_registrar_expedicao()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' or (new.status='aprovado' and old.status is distinct from 'aprovado') then
   select nome into new.expedicao_nome from public.usuarios where id=public.app_usuario_id();
 else new.expedicao_nome := old.expedicao_nome;
 end if;
 return new;
end $$;
drop trigger if exists trg_romaneio_registrar_expedicao on public.romaneios;
create trigger trg_romaneio_registrar_expedicao before insert or update on public.romaneios
 for each row execute function public.romaneio_registrar_expedicao();
-- Para documentos anteriores, recuperar o conferente registrado sem alterar o documento.
create or replace function public.romaneio_dados_expedicao(p_romaneio_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_nome text;
begin
 if not public.app_tem_permissao('romaneios','read') then raise insufficient_privilege using message='Sem permissão para consultar romaneios'; end if;
 select coalesce(nullif(r.expedicao_nome,''), u.nome) into v_nome
 from public.romaneios r left join public.usuarios u on u.id=r.conferido_por or u.auth_user_id=r.conferido_por
 where r.id=p_romaneio_id limit 1;
 return jsonb_build_object('nome',v_nome);
end $$;
revoke all on function public.romaneio_dados_expedicao(uuid) from public, anon;
grant execute on function public.romaneio_dados_expedicao(uuid) to authenticated;
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
       and new.responsavel_retirada is not distinct from old.responsavel_retirada
       and new.expedicao_nome is not distinct from old.expedicao_nome
       and new.fiscalizacao_nome is not distinct from old.fiscalizacao_nome
       and new.transporte_nome is not distinct from old.transporte_nome then
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


notify pgrst, 'reload schema';
commit;
