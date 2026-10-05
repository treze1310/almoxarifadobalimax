import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { registrarAuditoria } from '@/services/auditoriaService'

export interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
  perfil_acesso_id: string | null
  centro_custo_id: string | null
  auth_user_id: string | null
  ultimo_acesso: string | null
  perfis_acesso?: { nome: string } | null
  centros_custo?: { codigo: string; descricao: string } | null
}

export interface NovoUsuarioInput {
  nome: string
  email: string
  senha: string
  perfil_acesso_id: string
  centro_custo_id?: string | null
}

/**
 * Gestão de usuários pelo administrador. As operações que exigem chave de
 * serviço (criar login, redefinir senha, excluir) passam pela Edge Function
 * `admin-usuarios`, que revalida no servidor se quem chamou é administrador.
 */
export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select(
          'id, nome, email, perfil, ativo, perfil_acesso_id, centro_custo_id, auth_user_id, ultimo_acesso, perfis_acesso:perfil_acesso_id(nome), centros_custo:centro_custo_id(codigo, descricao)'
        )
        .order('nome')

      if (fetchError) throw fetchError
      setUsuarios((data as unknown as UsuarioAdmin[]) || [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      console.error('Erro ao buscar usuários:', e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const invocar = async (body: Record<string, unknown>) => {
    const { data, error: fnError } = await supabase.functions.invoke('admin-usuarios', { body })
    if (fnError) {
      // A função devolve a mensagem de erro no corpo da resposta
      let mensagem = fnError.message
      try {
        const contexto = (fnError as any).context
        if (contexto?.json) {
          const corpo = await contexto.json()
          mensagem = corpo?.error || mensagem
        }
      } catch {
        /* mantém a mensagem original */
      }
      return { error: mensagem }
    }
    if ((data as any)?.error) return { error: (data as any).error }
    return { error: null }
  }

  const criarUsuario = async (input: NovoUsuarioInput, perfilLegado: string) => {
    const resultado = await invocar({
      action: 'create',
      nome: input.nome,
      email: input.email.trim().toLowerCase(),
      senha: input.senha,
      perfil: perfilLegado,
      perfil_acesso_id: input.perfil_acesso_id,
      centro_custo_id: input.centro_custo_id || null,
    })
    if (!resultado.error) {
      await registrarAuditoria({
        acao: 'usuario.criar',
        tabela: 'usuarios',
        dadosNovos: { nome: input.nome, email: input.email, perfil: perfilLegado }
      })
      await fetchUsuarios()
    }
    return resultado
  }

  const redefinirSenha = async (usuarioId: string, senha: string) => {
    const resultado = await invocar({ action: 'reset_password', usuario_id: usuarioId, senha })
    if (!resultado.error) {
      // Nunca registrar a senha, apenas o fato de ter sido redefinida
      await registrarAuditoria({
        acao: 'usuario.senha_redefinida',
        tabela: 'usuarios',
        registroId: usuarioId
      })
      await fetchUsuarios()
    }
    return resultado
  }

  const excluirUsuario = async (usuarioId: string) => {
    const resultado = await invocar({ action: 'delete', usuario_id: usuarioId })
    if (!resultado.error) {
      await registrarAuditoria({
        acao: 'usuario.excluir',
        tabela: 'usuarios',
        registroId: usuarioId
      })
      await fetchUsuarios()
    }
    return resultado
  }

  /** Atribui o perfil de acesso (e espelha na coluna legada `perfil`) */
  const atualizarUsuario = async (
    usuarioId: string,
    dados: { perfil_acesso_id?: string | null; perfil?: string; centro_custo_id?: string | null; ativo?: boolean }
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq('id', usuarioId)

      if (updateError) throw updateError

      if (dados.perfil_acesso_id !== undefined || dados.perfil !== undefined) {
        await registrarAuditoria({
          acao: 'usuario.perfil_alterado',
          tabela: 'usuarios',
          registroId: usuarioId,
          dadosNovos: { perfil: dados.perfil, perfil_acesso_id: dados.perfil_acesso_id }
        })
      }
      if (dados.ativo !== undefined) {
        await registrarAuditoria({
          acao: 'usuario.status_alterado',
          tabela: 'usuarios',
          registroId: usuarioId,
          dadosNovos: { ativo: dados.ativo }
        })
      }

      await fetchUsuarios()
      return { error: null }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      return { error: msg }
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios,
    criarUsuario,
    atualizarUsuario,
    redefinirSenha,
    excluirUsuario,
  }
}
