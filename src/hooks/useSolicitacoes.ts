import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SolicitacaoCompra } from '@/types'
import { useToast } from '@/components/ui/use-toast'

interface UseSolicitacoesReturn {
  solicitacoes: SolicitacaoCompra[]
  loading: boolean
  error: string | null
  fetchSolicitacoes: () => Promise<void>
  createSolicitacao: (solicitacao: Omit<SolicitacaoCompra, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateSolicitacao: (id: string, updates: Partial<SolicitacaoCompra>) => Promise<void>
  deleteSolicitacao: (id: string) => Promise<void>
  approveSolicitacao: (id: string) => Promise<void>
  rejectSolicitacao: (id: string, reason: string) => Promise<void>
  cancelSolicitacao: (id: string) => Promise<void>
  concludeSolicitacao: (id: string) => Promise<void>
}

export const useSolicitacoes = (): UseSolicitacoesReturn => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select(`
          *,
          solicitacoes_itens(
            id,
            material_equipamento_id,
            descricao_item,
            quantidade,
            observacoes,
            materiais_equipamentos(
              id,
              nome,
              unidade_medida,
              codigo
            )
          ),
          centro_custo:centros_custo!solicitacoes_centro_custo_id_fkey(
            id,
            codigo,
            descricao
          ),
          colaboradores(
            id,
            nome,
            matricula
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transformar os dados para o formato esperado  
      const solicitacoesFormatadas: SolicitacaoCompra[] = data?.map(item => ({
        id: item.numero || item.id, // usar numero como ID principal
        data: new Date(item.data_solicitacao),
        centroCustoOrigemId: item.centro_custo_id, // a tabela só tem um centro_custo_id
        centroCustoDestinoId: item.centro_custo_id, // usar o mesmo para ambos por enquanto
        prazoEntrega: 'Normal (3-5 dias úteis)' as any, // valor padrão
        colaborador_id: item.colaborador_id,
        solicitante_nome: item.colaboradores?.nome || item.solicitante_nome,
        status: item.status === 'pendente' ? 'Pendente' : 
                item.status === 'aprovada' ? 'Aprovada' :
                item.status === 'rejeitada' ? 'Rejeitada' :
                item.status === 'concluida' ? 'Concluída' :
                item.status === 'cancelada' ? 'Cancelada' : 'Pendente',
        rejectionReason: item.observacoes_aprovacao,
        approverId: item.aprovado_por,
        approvalTimestamp: item.data_aprovacao ? new Date(item.data_aprovacao) : undefined,
        itens: item.solicitacoes_itens?.map((subItem: any) => ({
          material_equipamento_id: subItem.material_equipamento_id,
          quantidade: subItem.quantidade,
          observacoes: subItem.observacoes,
          // Se não tem material_equipamento_id, é um item avulso
          item_avulso: !subItem.material_equipamento_id ? {
            descricao: subItem.descricao_item || 'Item avulso',
            unidade_medida: undefined,
            codigo: undefined
          } : undefined
        })) || []
      })) || []

      setSolicitacoes(solicitacoesFormatadas)
    } catch (err) {
      console.error('Erro ao buscar solicitações:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      toast({
        title: 'Erro ao carregar solicitações',
        description: 'Não foi possível carregar as solicitações de compra.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const createSolicitacao = useCallback(async (solicitacao: SolicitacaoCompra) => {
    try {
      // Buscar um colaborador padrão se não especificado
      let colaboradorId = solicitacao.colaborador_id
      if (!colaboradorId) {
        const { data: colaboradorDefault } = await supabase
          .from('colaboradores')
          .select('id')
          .limit(1)
          .single()
        colaboradorId = colaboradorDefault?.id
      }

      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({
          numero: solicitacao.id, // agora o id já vem preenchido com o código gerado
          data_solicitacao: solicitacao.data.toISOString(),
          centro_custo_id: solicitacao.centroCustoOrigemId,
          colaborador_id: colaboradorId,
          tipo: 'compra',
          status: solicitacao.status.toLowerCase(),
          descricao: 'Solicitação de compra'
        })
        .select()
        .single()

      if (error) throw error

      // Inserir itens da solicitação
      if (solicitacao.itens && solicitacao.itens.length > 0) {
        const itensParaInserir = solicitacao.itens.map(item => ({
          solicitacao_id: data.id,
          material_equipamento_id: item.material_equipamento_id || null,
          quantidade: item.quantidade,
          observacoes: item.observacoes,
          // Para itens avulsos, usar a descrição. Para materiais, usar descrição padrão
          descricao_item: item.item_avulso?.descricao || 'Item solicitado'
        }))
        
        const { error: itensError } = await supabase
          .from('solicitacoes_itens')
          .insert(itensParaInserir)

        if (itensError) throw itensError
      }

      toast({
        title: 'Solicitação criada',
        description: 'A solicitação de compra foi criada com sucesso.'
      })

      await fetchSolicitacoes()
    } catch (err) {
      console.error('Erro ao criar solicitação:', err)
      toast({
        title: 'Erro ao criar solicitação',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive'
      })
      throw err
    }
  }, [fetchSolicitacoes, toast])

  const updateSolicitacao = useCallback(async (id: string, updates: Partial<SolicitacaoCompra>) => {
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({
          ...(updates.data && { data_solicitacao: updates.data.toISOString() }),
          ...(updates.centroCustoOrigemId && { centro_custo_id: updates.centroCustoOrigemId }),
          ...(updates.colaborador_id !== undefined && { colaborador_id: updates.colaborador_id }),
          ...(updates.status && { status: updates.status.toLowerCase() }),
          ...(updates.rejectionReason !== undefined && { observacoes_aprovacao: updates.rejectionReason }),
          ...(updates.approverId && { aprovado_por: updates.approverId }),
          ...(updates.approvalTimestamp && { data_aprovacao: updates.approvalTimestamp.toISOString() })
        })
        .eq('numero', id)

      if (error) throw error

      toast({
        title: 'Solicitação atualizada',
        description: 'A solicitação foi atualizada com sucesso.'
      })

      await fetchSolicitacoes()
    } catch (err) {
      console.error('Erro ao atualizar solicitação:', err)
      toast({
        title: 'Erro ao atualizar solicitação',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive'
      })
      throw err
    }
  }, [fetchSolicitacoes, toast])

  const deleteSolicitacao = useCallback(async (id: string) => {
    try {
      // Buscar o ID interno da solicitação primeiro
      const { data: solicitacao, error: searchError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('numero', id)
        .single()

      if (searchError) throw searchError

      // Primeiro deletar os itens
      const { error: itensError } = await supabase
        .from('solicitacoes_itens')
        .delete()
        .eq('solicitacao_id', solicitacao.id)

      if (itensError) throw itensError

      // Depois deletar a solicitação
      const { error } = await supabase
        .from('solicitacoes')
        .delete()
        .eq('id', solicitacao.id)

      if (error) throw error

      toast({
        title: 'Solicitação excluída',
        description: 'A solicitação foi excluída permanentemente.'
      })

      await fetchSolicitacoes()
    } catch (err) {
      console.error('Erro ao excluir solicitação:', err)
      toast({
        title: 'Erro ao excluir solicitação',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive'
      })
      throw err
    }
  }, [fetchSolicitacoes, toast])

  const approveSolicitacao = useCallback(async (id: string) => {
    await updateSolicitacao(id, {
      status: 'Aprovada',
      approvalTimestamp: new Date(),
      // TODO: Pegar o ID do usuário atual quando implementar autenticação
      approverId: '328cc4e1-6f02-4a50-934d-c4fc90ae18e9' // UUID temporário válido
    })
  }, [updateSolicitacao])

  const rejectSolicitacao = useCallback(async (id: string, reason: string) => {
    await updateSolicitacao(id, {
      status: 'Rejeitada',
      rejectionReason: reason
    })
  }, [updateSolicitacao])

  const cancelSolicitacao = useCallback(async (id: string) => {
    await updateSolicitacao(id, {
      status: 'Cancelada',
      cancellationTimestamp: new Date(),
      // TODO: Pegar o ID do usuário atual quando implementar autenticação
      cancellerId: '328cc4e1-6f02-4a50-934d-c4fc90ae18e9' // UUID temporário válido
    })
  }, [updateSolicitacao])

  const concludeSolicitacao = useCallback(async (id: string) => {
    await updateSolicitacao(id, {
      status: 'Concluída'
    })
  }, [updateSolicitacao])

  return {
    solicitacoes,
    loading,
    error,
    fetchSolicitacoes,
    createSolicitacao,
    updateSolicitacao,
    deleteSolicitacao,
    approveSolicitacao,
    rejectSolicitacao,
    cancelSolicitacao,
    concludeSolicitacao
  }
}