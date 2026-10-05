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

/** Consulta a trilha (requer permissão de leitura no módulo "usuarios") */
export const consultarAuditoria = async (limite = 100) => {
  const { data, error } = await supabase
    .from('log_sistema')
    .select('id, acao, tabela, registro_id, dados_anteriores, dados_novos, timestamp, usuarios:usuario_id(nome, email)')
    .order('timestamp', { ascending: false })
    .limit(limite)

  if (error) return { data: [] as EntradaAuditoria[], error: error.message }
  return { data: (data as unknown as EntradaAuditoria[]) || [], error: null }
}
