import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRobustSupabase } from '@/hooks/useRobustSupabase'
import { User, UserProfile } from '@/types/auth'

interface UsuarioFormData {
  nome: string
  email: string
  perfil: UserProfile
  centro_custo_id?: string
  senha?: string
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { query, mutate } = useRobustSupabase()

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await query(() =>
        supabase
          .from('usuarios')
          .select(`
            *,
            centros_custo:centro_custo_id(codigo, descricao),
            perfil_personalizado:perfis_acesso(nome, descricao, permissoes)
          `)
          .order('nome')
      )

      setUsuarios(data || [])
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const createUsuario = async (userData: UsuarioFormData) => {
    try {
      setError(null)

      // Primeiro criar o usuário no Auth do Supabase
      if (userData.senha) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.senha,
          email_confirm: true,
          user_metadata: {
            nome: userData.nome,
            perfil: userData.perfil
          }
        })

        if (authError) throw authError

        // O usuário será criado automaticamente na tabela usuarios pelo trigger
        await fetchUsuarios()
        return { error: null }
      } else {
        // Criar usuário diretamente na tabela (para casos especiais)
        const { error } = await supabase
          .from('usuarios')
          .insert([{
            email: userData.email,
            nome: userData.nome,
            perfil: userData.perfil,
            perfil_acesso_id: (userData as any).perfil_acesso_id || null,
            centro_custo_id: userData.centro_custo_id || null,
            ativo: true
          }])

        if (error) throw error

        await fetchUsuarios()
        return { error: null }
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const updateUsuario = async (id: string, userData: Partial<UsuarioFormData>) => {
    try {
      setError(null)

      await mutate(() =>
        supabase
          .from('usuarios')
          .update({
            nome: userData.nome,
            perfil: userData.perfil,
            perfil_acesso_id: (userData as any).perfil_acesso_id || null,
            centro_custo_id: userData.centro_custo_id || null,
          })
          .eq('id', id)
      )

      await fetchUsuarios()
      return { error: null }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const deleteUsuario = async (id: string) => {
    try {
      setError(null)

      // Primeiro buscar o auth_user_id
      const usuario = await query(() =>
        supabase
          .from('usuarios')
          .select('auth_user_id')
          .eq('id', id)
          .single()
      )

      // Deletar da tabela de usuários
      await mutate(() =>
        supabase
          .from('usuarios')
          .delete()
          .eq('id', id)
      )

      // Se tiver auth_user_id, deletar do Auth também
      if (usuario?.auth_user_id) {
        try {
          await supabase.auth.admin.deleteUser(usuario.auth_user_id)
        } catch (authError) {
          console.warn('Erro ao deletar usuário do Auth:', authError)
        }
      }

      await fetchUsuarios()
      return { error: null }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const toggleUsuarioStatus = async (id: string, ativo: boolean) => {
    try {
      setError(null)

      await mutate(() =>
        supabase
          .from('usuarios')
          .update({ ativo })
          .eq('id', id)
      )

      await fetchUsuarios()
      return { error: null }
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const createAuthForUser = async (userId: string, password: string) => {
    try {
      setError(null)

      // Buscar dados do usuário
      const usuario = await query(() =>
        supabase
          .from('usuarios')
          .select('email, nome, perfil')
          .eq('id', userId)
          .single()
      )

      if (!usuario) {
        throw new Error('Usuário não encontrado')
      }

      // Criar usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: usuario.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nome: usuario.nome,
          perfil: usuario.perfil
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Vincular o auth_user_id ao usuário existente
        await mutate(() =>
          supabase
            .from('usuarios')
            .update({ auth_user_id: authData.user.id })
            .eq('id', userId)
        )
      }

      await fetchUsuarios()
      return { error: null, authUser: authData.user }
    } catch (error) {
      console.error('Erro ao criar autenticação para usuário:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioStatus,
    createAuthForUser,
  }
}