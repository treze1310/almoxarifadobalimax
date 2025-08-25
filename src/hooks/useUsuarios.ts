import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          perfil_personalizado:perfis_acesso(nome, descricao)
        `)
        .order('nome')

      if (error) throw error

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
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.senha,
          options: {
            data: {
              nome: userData.nome,
              perfil: userData.perfil
            }
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

      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: userData.nome,
          perfil: userData.perfil,
          perfil_acesso_id: (userData as any).perfil_acesso_id || null,
          centro_custo_id: userData.centro_custo_id || null,
        })
        .eq('id', id)

      if (error) throw error

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
      const { data: usuario, error: fetchError } = await supabase
        .from('usuarios')
        .select('auth_user_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Deletar da tabela de usuários
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Se tiver auth_user_id, deletar do Auth também
      if (usuario.auth_user_id) {
        await supabase.auth.admin.deleteUser(usuario.auth_user_id)
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

      const { error } = await supabase
        .from('usuarios')
        .update({ ativo })
        .eq('id', id)

      if (error) throw error

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
      const { data: usuario, error: fetchError } = await supabase
        .from('usuarios')
        .select('email, nome, perfil')
        .eq('id', userId)
        .single()

      if (fetchError || !usuario) {
        throw new Error('Usuário não encontrado')
      }

      // Criar usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: usuario.email,
        password: password,
        options: {
          data: {
            nome: usuario.nome,
            perfil: usuario.perfil
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Vincular o auth_user_id ao usuário existente
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ auth_user_id: authData.user.id })
          .eq('id', userId)

        if (updateError) throw updateError

        // Em desenvolvimento, confirmar email automaticamente
        if (import.meta.env.DEV) {
          try {
            await supabase.rpc('confirm_user_email', { 
              user_email: usuario.email 
            })
          } catch (emailError) {
            // Se a função não existir, tentar update direto na tabela auth.users
            try {
              await supabase
                .from('auth.users')
                .update({ email_confirmed_at: new Date().toISOString() })
                .eq('email', usuario.email)
            } catch (directUpdateError) {
              console.warn('Não foi possível confirmar email automaticamente:', directUpdateError)
            }
          }
        }
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