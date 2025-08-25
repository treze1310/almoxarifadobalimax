import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PerfilAcesso, PerfilFormData } from '@/types/perfil'

export function usePerfisAcesso() {
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPerfis = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('perfis_acesso')
        .select('*')
        .order('nome')

      if (error) throw error

      setPerfis(data || [])
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const createPerfil = async (perfilData: PerfilFormData) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('perfis_acesso')
        .insert([{
          nome: perfilData.nome,
          descricao: perfilData.descricao,
          permissoes: perfilData.permissoes,
          ativo: perfilData.ativo,
          sistema: false // Perfis criados pela interface nunca são do sistema
        }])
        .select()
        .single()

      if (error) throw error

      await fetchPerfis()
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao criar perfil:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const updatePerfil = async (id: string, perfilData: Partial<PerfilFormData>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('perfis_acesso')
        .update({
          nome: perfilData.nome,
          descricao: perfilData.descricao,
          permissoes: perfilData.permissoes,
          ativo: perfilData.ativo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchPerfis()
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  const deletePerfil = async (id: string) => {
    try {
      setError(null)

      // Verificar se o perfil pode ser excluído (não é do sistema)
      const perfil = perfis.find(p => p.id === id)
      if (perfil?.sistema) {
        throw new Error('Perfis do sistema não podem ser excluídos')
      }

      // Verificar se há usuários usando este perfil
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('perfil_acesso_id', id)
        .eq('ativo', true)

      if (usuariosError) throw usuariosError

      if (usuarios && usuarios.length > 0) {
        throw new Error(`Este perfil não pode ser excluído pois está sendo usado por ${usuarios.length} usuário(s)`)
      }

      const { error } = await supabase
        .from('perfis_acesso')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchPerfis()
      return { error: null }
    } catch (error) {
      console.error('Erro ao deletar perfil:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const togglePerfilStatus = async (id: string, ativo: boolean) => {
    try {
      setError(null)

      const { error } = await supabase
        .from('perfis_acesso')
        .update({ 
          ativo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      await fetchPerfis()
      return { error: null }
    } catch (error) {
      console.error('Erro ao alterar status do perfil:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const duplicatePerfil = async (id: string, novoNome: string) => {
    try {
      setError(null)

      const perfilOriginal = perfis.find(p => p.id === id)
      if (!perfilOriginal) {
        throw new Error('Perfil não encontrado')
      }

      const { data, error } = await supabase
        .from('perfis_acesso')
        .insert([{
          nome: novoNome,
          descricao: `Cópia de ${perfilOriginal.descricao || perfilOriginal.nome}`,
          permissoes: perfilOriginal.permissoes,
          ativo: true,
          sistema: false
        }])
        .select()
        .single()

      if (error) throw error

      await fetchPerfis()
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao duplicar perfil:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }

  useEffect(() => {
    fetchPerfis()
  }, [])

  return {
    perfis,
    loading,
    error,
    fetchPerfis,
    createPerfil,
    updatePerfil,
    deletePerfil,
    togglePerfilStatus,
    duplicatePerfil,
  }
}