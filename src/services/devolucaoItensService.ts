import { supabase } from '@/lib/supabase'

interface ItemDevolucao {
  itemId: string
  quantidadeDevolvida: number
  dataDevolucao: string
}

/**
 * Serviço para gerenciar devoluções de itens específicos
 */
class DevolucaoItensService {
  
  /**
   * Marca itens como devolvidos com data de devolução
   */
  async marcarItensComoDevolvidos(itensDevolucao: ItemDevolucao[]): Promise<{ success: boolean; message: string }> {
    try {
      // Atualizar cada item com a data de devolução
      for (const item of itensDevolucao) {
        const { error } = await supabase
          .from('romaneios_itens')
          .update({ 
            data_devolucao: item.dataDevolucao 
          })
          .eq('id', item.itemId)

        if (error) {
          console.error(`Erro ao marcar item ${item.itemId} como devolvido:`, error)
          return {
            success: false,
            message: `Erro ao marcar item como devolvido: ${error.message}`
          }
        }
      }

      return {
        success: true,
        message: `${itensDevolucao.length} item(ns) marcado(s) como devolvido(s)`
      }
    } catch (error) {
      console.error('Erro geral ao marcar itens como devolvidos:', error)
      return {
        success: false,
        message: 'Erro interno ao processar devolução'
      }
    }
  }

  /**
   * Busca itens pendentes de um romaneio (não devolvidos)
   */
  async buscarItensPendentes(romaneioId: string) {
    try {
      const { data, error } = await supabase
        .from('romaneios_itens')
        .select(`
          id,
          quantidade,
          valor_unitario,
          valor_total,
          numero_serie,
          codigo_patrimonial,
          observacoes,
          data_devolucao,
          materiais_equipamentos:material_equipamento_id (
            id,
            codigo,
            nome,
            unidade_medida,
            codigo_ncm
          )
        `)
        .eq('romaneio_id', romaneioId)
        .is('data_devolucao', null) // Apenas itens não devolvidos

      if (error) {
        console.error('Erro ao buscar itens pendentes:', error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Erro geral ao buscar itens pendentes:', error)
      return { data: [], error }
    }
  }

  /**
   * Busca itens já devolvidos de um romaneio
   */
  async buscarItensDevolvidos(romaneioId: string) {
    try {
      const { data, error } = await supabase
        .from('romaneios_itens')
        .select(`
          id,
          quantidade,
          valor_unitario,
          valor_total,
          numero_serie,
          codigo_patrimonial,
          observacoes,
          data_devolucao,
          materiais_equipamentos:material_equipamento_id (
            id,
            codigo,
            nome,
            unidade_medida,
            codigo_ncm
          )
        `)
        .eq('romaneio_id', romaneioId)
        .not('data_devolucao', 'is', null) // Apenas itens devolvidos

      if (error) {
        console.error('Erro ao buscar itens devolvidos:', error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Erro geral ao buscar itens devolvidos:', error)
      return { data: [], error }
    }
  }

  /**
   * Calcula estatísticas de devolução de um romaneio
   */
  async calcularEstatisticasDevolucao(romaneioId: string) {
    try {
      const { data, error } = await supabase
        .from('romaneios_itens')
        .select(`
          quantidade,
          data_devolucao,
          materiais_equipamentos:material_equipamento_id (nome)
        `)
        .eq('romaneio_id', romaneioId)

      if (error) {
        console.error('Erro ao calcular estatísticas:', error)
        return {
          totalItens: 0,
          itensDevolvidos: 0,
          itensPendentes: 0,
          percentualDevolvido: 0,
          quantidadeTotal: 0,
          quantidadeDevolvida: 0,
          error
        }
      }

      const itens = data || []
      const totalItens = itens.length
      const itensDevolvidos = itens.filter(item => item.data_devolucao).length
      const itensPendentes = totalItens - itensDevolvidos
      const percentualDevolvido = totalItens > 0 ? (itensDevolvidos / totalItens) * 100 : 0
      
      const quantidadeTotal = itens.reduce((total, item) => total + item.quantidade, 0)
      const quantidadeDevolvida = itens
        .filter(item => item.data_devolucao)
        .reduce((total, item) => total + item.quantidade, 0)

      return {
        totalItens,
        itensDevolvidos,
        itensPendentes,
        percentualDevolvido: Math.round(percentualDevolvido * 10) / 10,
        quantidadeTotal,
        quantidadeDevolvida,
        error: null
      }
    } catch (error) {
      console.error('Erro geral ao calcular estatísticas:', error)
      return {
        totalItens: 0,
        itensDevolvidos: 0,
        itensPendentes: 0,
        percentualDevolvido: 0,
        quantidadeTotal: 0,
        quantidadeDevolvida: 0,
        error
      }
    }
  }

  /**
   * Remove data de devolução de um item (desfazer devolução)
   */
  async desfazerDevolucaoItem(itemId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('romaneios_itens')
        .update({ data_devolucao: null })
        .eq('id', itemId)

      if (error) {
        console.error('Erro ao desfazer devolução do item:', error)
        return {
          success: false,
          message: `Erro ao desfazer devolução: ${error.message}`
        }
      }

      return {
        success: true,
        message: 'Devolução desfeita com sucesso'
      }
    } catch (error) {
      console.error('Erro geral ao desfazer devolução:', error)
      return {
        success: false,
        message: 'Erro interno ao desfazer devolução'
      }
    }
  }
}

export const devolucaoItensService = new DevolucaoItensService()