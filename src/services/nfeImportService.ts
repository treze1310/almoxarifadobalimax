import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type NFEImportacao = Tables<'nfe_importacao'> & {
  fornecedores?: Tables<'fornecedores'> | null
  nfe_itens?: (Tables<'nfe_itens'> & {
    materiais_equipamentos?: Tables<'materiais_equipamentos'> | null
  })[]
}

export type NFEImportacaoUpdate = TablesUpdate<'nfe_importacao'>

export const nfeImportService = {
  // Buscar todas as importações com detalhes
  async getAll(): Promise<{ data: NFEImportacao[] | null; error: any }> {
    const { data, error } = await supabase
      .from('nfe_importacao')
      .select(`
        *,
        fornecedores:fornecedor_id (
          id,
          nome,
          cnpj,
          cpf,
          endereco,
          telefone,
          email,
          ativo
        ),
        nfe_itens (
          *,
          materiais_equipamentos:material_equipamento_id (
            id,
            codigo,
            nome,
            categoria,
            unidade_medida,
            estoque_atual,
            valor_unitario,
            ativo
          )
        )
      `)
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // Buscar importação por ID
  async getById(id: string): Promise<{ data: NFEImportacao | null; error: any }> {
    const { data, error } = await supabase
      .from('nfe_importacao')
      .select(`
        *,
        fornecedores:fornecedor_id (
          id,
          nome,
          cnpj,
          cpf,
          endereco,
          telefone,
          email,
          ativo
        ),
        nfe_itens (
          *,
          materiais_equipamentos:material_equipamento_id (
            id,
            codigo,
            nome,
            categoria,
            unidade_medida,
            estoque_atual,
            valor_unitario,
            ativo
          )
        )
      `)
      .eq('id', id)
      .single()

    return { data, error }
  },

  // Atualizar importação
  async update(id: string, updates: NFEImportacaoUpdate): Promise<{ data: NFEImportacao | null; error: any }> {
    const { data, error } = await supabase
      .from('nfe_importacao')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        fornecedores:fornecedor_id (
          id,
          nome,
          cnpj,
          cpf,
          endereco,
          telefone,
          email,
          ativo
        ),
        nfe_itens (
          *,
          materiais_equipamentos:material_equipamento_id (
            id,
            codigo,
            nome,
            categoria,
            unidade_medida,
            estoque_atual,
            valor_unitario,
            ativo
          )
        )
      `)
      .single()

    return { data, error }
  },

  // Excluir importação (preservando materiais criados)
  async delete(id: string): Promise<{ success: boolean; error: any }> {
    try {
      // 1. Primeiro, desvincular materiais dos itens NFe (preservar materiais)
      const { error: unlinkError } = await supabase
        .from('nfe_itens')
        .update({ material_equipamento_id: null })
        .eq('nfe_id', id)

      if (unlinkError) throw unlinkError

      // 2. Excluir itens da NFe (agora sem vínculos)
      const { error: deleteItensError } = await supabase
        .from('nfe_itens')
        .delete()
        .eq('nfe_id', id)

      if (deleteItensError) throw deleteItensError

      // 3. Excluir a importação
      const { error: deleteNfeError } = await supabase
        .from('nfe_importacao')
        .delete()
        .eq('id', id)

      if (deleteNfeError) throw deleteNfeError

      return { success: true, error: null }

    } catch (error) {
      return { success: false, error }
    }
  },

  // Reprocessar importação (recriar materiais)
  async reprocess(id: string): Promise<{ success: boolean; error: any }> {
    try {
      // Buscar dados da NFe
      const { data: nfeData, error: nfeError } = await this.getById(id)
      if (nfeError || !nfeData) throw nfeError || new Error('NFe não encontrada')

      // Marcar como reprocessando
      await this.update(id, { status: 'reprocessando' })

      // Aqui você pode implementar a lógica de reprocessamento
      // Por exemplo, recriar materiais que foram excluídos, etc.

      // Marcar como processado
      await this.update(id, { status: 'processado' })

      return { success: true, error: null }

    } catch (error) {
      // Em caso de erro, marcar como erro
      await this.update(id, { status: 'erro' })
      return { success: false, error }
    }
  },

  // Buscar estatísticas das importações
  async getStats(): Promise<{ 
    data: {
      total: number
      importadas: number
      processadas: number
      erros: number
      valorTotal: number
      materiaisCriados: number
    } | null
    error: any 
  }> {
    try {
      // Buscar contadores por status
      const { data: statusCount, error: statusError } = await supabase
        .from('nfe_importacao')
        .select('status, valor_total')

      if (statusError) throw statusError

      // Contar materiais criados a partir de NFe
      const { count: materiaisCount, error: materiaisError } = await supabase
        .from('nfe_itens')
        .select('*', { count: 'exact', head: true })
        .not('material_equipamento_id', 'is', null)

      if (materiaisError) throw materiaisError

      const stats = {
        total: statusCount?.length || 0,
        importadas: statusCount?.filter(item => item.status === 'importado').length || 0,
        processadas: statusCount?.filter(item => item.status === 'processado').length || 0,
        erros: statusCount?.filter(item => item.status === 'erro').length || 0,
        valorTotal: statusCount?.reduce((sum, item) => sum + (item.valor_total || 0), 0) || 0,
        materiaisCriados: materiaisCount || 0
      }

      return { data: stats, error: null }

    } catch (error) {
      return { data: null, error }
    }
  }
}