import { supabase } from '@/lib/supabase'

export interface MaterialDependency {
  type:
    | 'nfe_itens'
    | 'romaneios_itens'
    | 'solicitacoes_itens'
    | 'movimentacao_estoque'
    | 'material_unidades'
  count: number
  blockingCount?: number
  details: any[]
}

/**
 * O que impede de verdade a exclusão: documento emitido que aponta para o
 * item. Romaneio assinado e solicitação de compra não podem ficar apontando
 * para o nada.
 *
 * Movimentação de estoque e peças são o histórico do próprio item: vão junto
 * com ele. A tela dizia "dependências críticas" para uma única movimentação de
 * ajuste manual e não oferecia saída nenhuma.
 */
export const DEPENDENCIAS_QUE_IMPEDEM: MaterialDependency['type'][] = [
  'romaneios_itens',
  'solicitacoes_itens',
]

export interface MaterialDependencies {
  material_id: string
  canDelete: boolean
  /** Falso quando há documento apontando para o item */
  podeExcluirComHistorico: boolean
  dependencies: MaterialDependency[]
  totalReferences: number
}

export function contarRomaneiosBloqueantes(itens: Array<{ romaneios?: { status?: string | null } | { status?: string | null }[] | null }>): number {
  return itens.filter(item => {
    const doc = Array.isArray(item.romaneios) ? item.romaneios[0] : item.romaneios
    return doc?.status !== 'cancelado'
  }).length
}

export const materialDependencyService = {
  // Verificar todas as dependências de um material
  async checkDependencies(materialId: string): Promise<{ data: MaterialDependencies | null; error: any }> {
    try {
      const dependencies: MaterialDependency[] = []
      let totalReferences = 0

      // 1. Verificar vínculos com NFe itens
      const { data: nfeItens, error: nfeError } = await supabase
        .from('nfe_itens')
        .select(`
          id,
          codigo_produto,
          descricao_produto,
          quantidade,
          valor_total,
          nfe_importacao:nfe_id (
            numero_nfe,
            serie_nfe,
            data_emissao,
            fornecedores:fornecedor_id (nome)
          )
        `)
        .eq('material_equipamento_id', materialId)

      if (nfeError) throw nfeError

      if (nfeItens && nfeItens.length > 0) {
        dependencies.push({
          type: 'nfe_itens',
          count: nfeItens.length,
          details: nfeItens
        })
        totalReferences += nfeItens.length
      }

      // 2. Verificar vínculos com romaneios
      const { data: romaneiosItens, error: romaneiosError } = await supabase
        .from('romaneios_itens')
        .select(`
          id,
          quantidade,
          observacoes,
          romaneios:romaneio_id (
            numero,
            tipo,
            status,
            data_romaneio,
            colaboradores:colaborador_id (nome)
          )
        `)
        .eq('material_equipamento_id', materialId)

      if (romaneiosError) throw romaneiosError

      if (romaneiosItens && romaneiosItens.length > 0) {
        dependencies.push({
          type: 'romaneios_itens',
          count: romaneiosItens.length,
          blockingCount: contarRomaneiosBloqueantes(romaneiosItens),
          details: romaneiosItens
        })
        totalReferences += romaneiosItens.length
      }

      // 3. Verificar movimentações de estoque
      const { data: movimentacoes, error: movError } = await supabase
        .from('movimentacao_estoque')
        .select(`
          id,
          tipo_movimentacao,
          quantidade_anterior,
          quantidade_atual,
          motivo,
          created_at
        `)
        .eq('material_equipamento_id', materialId)

      if (movError) throw movError

      if (movimentacoes && movimentacoes.length > 0) {
        dependencies.push({
          type: 'movimentacao_estoque',
          count: movimentacoes.length,
          details: movimentacoes
        })
        totalReferences += movimentacoes.length
      }

      // 4. Solicitações de compra (bloqueiam: é documento)
      const { data: solicitacoesItens, error: solError } = await supabase
        .from('solicitacoes_itens')
        .select(
          `id, quantidade, solicitacoes:solicitacao_id (numero, status, data_solicitacao)`,
        )
        .eq('material_equipamento_id', materialId)

      if (solError) throw solError

      if (solicitacoesItens && solicitacoesItens.length > 0) {
        dependencies.push({
          type: 'solicitacoes_itens',
          count: solicitacoesItens.length,
          details: solicitacoesItens,
        })
        totalReferences += solicitacoesItens.length
      }

      // 5. Peças do item (vão junto; são dele)
      const { data: unidades, error: uniError } = await supabase
        .from('material_unidades')
        .select('id, codigo, status, numero_serie')
        .eq('material_equipamento_id', materialId)
        .order('sequencia')

      if (uniError) throw uniError

      if (unidades && unidades.length > 0) {
        dependencies.push({
          type: 'material_unidades',
          count: unidades.length,
          details: unidades,
        })
        totalReferences += unidades.length
      }

      const impedem = dependencies.filter((d) => DEPENDENCIAS_QUE_IMPEDEM.includes(d.type) && (d.blockingCount ?? d.count) > 0)

      const result: MaterialDependencies = {
        material_id: materialId,
        canDelete: totalReferences === 0,
        podeExcluirComHistorico: impedem.length === 0,
        dependencies,
        totalReferences
      }

      return { data: result, error: null }

    } catch (error) {
      return { data: null, error }
    }
  },

  // Remover vínculo específico de NFe item
  async unlinkFromNFeItem(nfeItemId: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('nfe_itens')
        .update({ material_equipamento_id: null })
        .eq('id', nfeItemId)

      if (error) throw error

      return { success: true, error: null }

    } catch (error) {
      return { success: false, error }
    }
  },

  // Remover todos os vínculos de NFe de um material
  async unlinkAllFromNFe(materialId: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('nfe_itens')
        .update({ material_equipamento_id: null })
        .eq('material_equipamento_id', materialId)

      if (error) throw error

      return { success: true, error: null }

    } catch (error) {
      return { success: false, error }
    }
  },

  /**
   * Excluir o item junto com o histórico que é dele.
   *
   * Feito numa chamada só no banco (`excluir_material`), em transação: ou o
   * item some com as peças, as movimentações e os vínculos de NF-e, ou nada
   * muda. Fazendo isso em etapas pelo navegador, uma falha no meio deixava o
   * item sem histórico e ainda cadastrado.
   */
  async forceDelete(materialId: string): Promise<{ success: boolean; error: any; warnings: string[] }> {
    try {
      const { data, error } = await supabase.rpc('excluir_material', {
        p_material_id: materialId,
      })

      if (error) throw error

      const resumo = (data ?? {}) as Record<string, number>
      const warnings: string[] = []
      if (resumo.romaneios_desvinculados > 0) {
        warnings.push(`${resumo.romaneios_desvinculados} vínculo(s) com romaneios cancelados removido(s); os documentos e seus dados históricos foram preservados`)
      }
      if (resumo.nfe_desvinculados > 0) {
        warnings.push(`${resumo.nfe_desvinculados} item(ns) de NF-e desvinculado(s); as notas continuam no histórico`)
      }
      if (resumo.unidades_removidas > 0) {
        warnings.push(`${resumo.unidades_removidas} peça(s) numerada(s) removida(s)`)
      }
      if (resumo.movimentacoes_removidas > 0) {
        warnings.push(`${resumo.movimentacoes_removidas} movimentação(ões) de estoque removida(s)`)
      }
      if (resumo.epi_removidos > 0) {
        warnings.push(`${resumo.epi_removidos} atribuição(ões) de EPI removida(s)`)
      }

      return { success: true, error: null, warnings }
    } catch (error) {
      return { success: false, error, warnings: [] }
    }
  },
}