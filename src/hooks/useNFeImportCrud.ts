import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { nfeImportService, type NFEImportacao, type NFEImportacaoUpdate } from '@/services/nfeImportService'

export function useNFeImportCrud() {
  const [loading, setLoading] = useState(false)
  const [importacoes, setImportacoes] = useState<NFEImportacao[]>([])
  const [importacaoSelecionada, setImportacaoSelecionada] = useState<NFEImportacao | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    importadas: 0,
    processadas: 0,
    erros: 0,
    valorTotal: 0,
    materiaisCriados: 0
  })
  const { toast } = useToast()

  // Buscar todas as importações
  const fetchImportacoes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await nfeImportService.getAll()
      
      if (error) {
        console.error('Erro ao buscar importações:', error)
        toast({
          title: 'Erro',
          description: 'Erro ao carregar importações NFe',
          variant: 'destructive'
        })
        return
      }

      setImportacoes(data || [])

    } catch (error: any) {
      console.error('Erro ao buscar importações:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar importações',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Buscar importação por ID
  const fetchImportacaoById = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { data, error } = await nfeImportService.getById(id)
      
      if (error) {
        console.error('Erro ao buscar importação:', error)
        toast({
          title: 'Erro',
          description: 'Erro ao carregar detalhes da importação',
          variant: 'destructive'
        })
        return null
      }

      setImportacaoSelecionada(data)
      return data

    } catch (error: any) {
      console.error('Erro ao buscar importação:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar importação',
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Atualizar importação
  const updateImportacao = useCallback(async (id: string, updates: NFEImportacaoUpdate) => {
    setLoading(true)
    try {
      const { data, error } = await nfeImportService.update(id, updates)
      
      if (error) {
        console.error('Erro ao atualizar importação:', error)
        toast({
          title: 'Erro',
          description: 'Erro ao atualizar importação NFe',
          variant: 'destructive'
        })
        return { success: false, error }
      }

      // Atualizar lista local
      setImportacoes(prev => 
        prev.map(imp => imp.id === id ? data! : imp)
      )

      // Atualizar selecionada se for a mesma
      if (importacaoSelecionada?.id === id) {
        setImportacaoSelecionada(data)
      }

      toast({
        title: 'Sucesso',
        description: 'Importação atualizada com sucesso'
      })

      return { success: true, data }

    } catch (error: any) {
      console.error('Erro ao atualizar importação:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao atualizar importação',
        variant: 'destructive'
      })
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [toast, importacaoSelecionada])

  // Excluir importação
  const deleteImportacao = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { success, error } = await nfeImportService.delete(id)
      
      if (!success) {
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao excluir importação NFe',
          variant: 'destructive'
        })
        return { success: false, error }
      }

      // Remover da lista local
      setImportacoes(prev => prev.filter(imp => imp.id !== id))

      // Limpar selecionada se for a mesma
      if (importacaoSelecionada?.id === id) {
        setImportacaoSelecionada(null)
      }

      toast({
        title: 'Sucesso',
        description: 'Importação excluída com sucesso'
      })

      return { success: true }

    } catch (error: any) {
      console.error('Erro ao excluir importação:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao excluir importação',
        variant: 'destructive'
      })
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [toast, importacaoSelecionada])

  // Reprocessar importação
  const reprocessImportacao = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { success, error } = await nfeImportService.reprocess(id)
      
      if (!success) {
        toast({
          title: 'Erro',
          description: 'Erro ao reprocessar importação NFe',
          variant: 'destructive'
        })
        return { success: false, error }
      }

      toast({
        title: 'Sucesso',
        description: 'Importação reprocessada com sucesso'
      })

      // Recarregar dados
      await fetchImportacoes()

      return { success: true }

    } catch (error: any) {
      console.error('Erro ao reprocessar importação:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao reprocessar importação',
        variant: 'destructive'
      })
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchImportacoes])

  // Buscar estatísticas
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await nfeImportService.getStats()
      
      if (error) {
        console.error('Erro ao buscar estatísticas:', error)
        return
      }

      if (data) {
        setStats(data)
      }

    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }, [])

  return {
    loading,
    importacoes,
    importacaoSelecionada,
    stats,
    setImportacaoSelecionada,
    fetchImportacoes,
    fetchImportacaoById,
    updateImportacao,
    deleteImportacao,
    reprocessImportacao,
    fetchStats
  }
}