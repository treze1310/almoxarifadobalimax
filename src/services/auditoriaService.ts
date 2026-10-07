import { supabase } from '@/lib/supabase'

/**
 * Trilha de auditoria (tabela `log_sistema`).
 *
 * Registra quem fez o quê nas ações sensíveis do sistema. A tabela é
 * append-only: as policies permitem INSERT e SELECT, mas nenhum UPDATE ou
 * DELETE via API.
 *
 * O registro nunca deve interromper a operação principal — se o log falhar,
 * apenas avisa no console.
 */
export type AcaoAuditavel =
  | 'solicitacao.aprovar'
  | 'solicitacao.rejeitar'
  | 'solicitacao.concluir'
  | 'solicitacao.cancelar'
  | 'solicitacao.excluir'
  | 'material.criar'
  | 'material.editar'
  | 'material.excluir'
  | 'estoque.movimentar'
  | 'usuario.criar'
  | 'usuario.excluir'
  | 'usuario.perfil_alterado'
  | 'usuario.senha_redefinida'
  | 'usuario.status_alterado'
  | 'perfil.permissoes_alteradas'
  | 'seguranca.acesso_negado'
  | 'colaborador.cpf_consultado'
  | 'romaneio.cancelar'
  | 'nfe.conferir'
  | 'nfe.lancar_estoque'
  | 'romaneio.retirada_assistida'
  | 'material.importar_csv'
  | 'solicitacoes.reposicao_automatica'

interface RegistroAuditoria {
  acao: AcaoAuditavel
  tabela?: string
  registroId?: string
  dadosAnteriores?: unknown
  dadosNovos?: unknown
}

/** Resolve o id do usuário logado na tabela `usuarios` (cacheado na sessão) */
let usuarioIdCache: { authId: string; usuarioId: string | null } | null = null

const resolverUsuarioId = async (): Promise<string | null> => {
  const { data: auth } = await supabase.auth.getUser()
  const authId = auth?.user?.id
  if (!authId) return null

  if (usuarioIdCache?.authId === authId) return usuarioIdCache.usuarioId

  const { data } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_user_id', authId)
    .maybeSingle()

  usuarioIdCache = { authId, usuarioId: data?.id ?? null }
  return usuarioIdCache.usuarioId
}

export const registrarAuditoria = async (registro: RegistroAuditoria): Promise<void> => {
  try {
    const usuarioId = await resolverUsuarioId()

    const { error } = await supabase.from('log_sistema').insert({
      usuario_id: usuarioId,
      acao: registro.acao,
      tabela: registro.tabela ?? null,
      registro_id: registro.registroId ?? null,
      dados_anteriores: (registro.dadosAnteriores as never) ?? null,
      dados_novos: (registro.dadosNovos as never) ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })

    if (error) throw error
  } catch (error) {
    // Auditoria nunca deve quebrar a operação que o usuário pediu
    console.warn('[auditoria] falha ao registrar ação', registro.acao, error)
  }
}

export interface EntradaAuditoria {
  id: string
  acao: string
  tabela: string | null
  registro_id: string | null
  dados_anteriores: unknown
  dados_novos: unknown
  timestamp: string
  usuarios?: { nome: string; email: string } | null
}

export interface ConsultaAuditoria {
  pagina?: number
  porPagina?: number
  /** Prefixo da ação, como "romaneio" ou "usuario" */
  modulo?: string
  /** Período, em data ISO (yyyy-mm-dd) */
  de?: string
  ate?: string
}

/**
 * Consulta a trilha (requer permissão de leitura no módulo "usuarios").
 *
 * Esta é a única listagem do sistema que cresce sem parar — um registro por
 * ação sensível, para sempre — então a paginação e os filtros acontecem no
 * banco (RNF-01), e não trazendo tudo para o navegador.
 */
export const consultarAuditoria = async (consulta: ConsultaAuditoria = {}) => {
  const pagina = Math.max(1, consulta.pagina ?? 1)
  const porPagina = consulta.porPagina ?? 50
  const inicio = (pagina - 1) * porPagina

  let query = supabase
    .from('log_sistema')
    .select(
      'id, acao, tabela, registro_id, dados_anteriores, dados_novos, timestamp, usuarios:usuario_id(nome, email)',
      { count: 'exact' },
    )
    .order('timestamp', { ascending: false })
    .range(inicio, inicio + porPagina - 1)

  if (consulta.modulo) query = query.like('acao', `${consulta.modulo}.%`)

  // O `timestamp` é timestamptz e o banco roda em UTC. Mandar "2026-10-07"
  // cru faria o banco cortar o dia às 21h daqui (UTC-3) — uma retirada do fim
  // da tarde sumiria do filtro. Por isso o limite vai como instante, montado
  // no fuso de quem está olhando.
  if (consulta.de) {
    query = query.gte('timestamp', new Date(`${consulta.de}T00:00:00`).toISOString())
  }
  if (consulta.ate) {
    query = query.lte('timestamp', new Date(`${consulta.ate}T23:59:59.999`).toISOString())
  }

  const { data, error, count } = await query

  if (error) return { data: [] as EntradaAuditoria[], total: 0, error: error.message }
  return {
    data: (data as unknown as EntradaAuditoria[]) || [],
    total: count ?? 0,
    error: null,
  }
}
