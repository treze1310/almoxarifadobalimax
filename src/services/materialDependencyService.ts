import { supabase } from '@/lib/supabase'

export interface MaterialDependency {
  type: 'nfe_itens' | 'romaneios_itens' | 'movimentacao_estoque'
  count: number
  details: any[]
}

export interface MaterialDependencies {
  material_id: string
  canDelete: boolean
  dependencies: MaterialDependency[]
  totalReferences: number
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

      const result: MaterialDependencies = {
        material_id: materialId,
        canDelete: totalReferences === 0,
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

  // Excluir material forçadamente (removendo vínculos primeiro)
  async forceDelete(materialId: string): Promise<{ success: boolean; error: any; warnings: string[] }> {
    try {
      const warnings: string[] = []

      // 1. Verificar dependências primeiro
      const { data: deps, error: depsError } = await this.checkDependencies(materialId)
      if (depsError) throw depsError

      if (!deps) throw new Error('Erro ao verificar dependências')

      // 2. Remover vínculos de NFe (mantém histórico, apenas remove vínculo)
      const nfeDep = deps.dependencies.find(d => d.type === 'nfe_itens')
      if (nfeDep && nfeDep.count > 0) {
        const { success, error } = await this.unlinkAllFromNFe(materialId)
        if (!success) throw error
        warnings.push(`${nfeDep.count} item(ns) de NFe desvinculado(s)`)
      }

      // 3. Verificar se ainda há dependências críticas (romaneios, movimentações)
      const criticalDeps = deps.dependencies.filter(d => d.type !== 'nfe_itens')
      if (criticalDeps.length > 0) {
        const criticalCount = criticalDeps.reduce((sum, dep) => sum + dep.count, 0)
        return {
          success: false,
          error: {
            message: `Não é possível excluir. Material possui ${criticalCount} dependência(s) crítica(s) (romaneios ou movimentações).`,
            code: 'CRITICAL_DEPENDENCIES'
          },
          warnings
        }
      }

      // 4. Agora pode excluir o material
      const { error: deleteError } = await supabase
        .from('materiais_equipamentos')
        .delete()
        .eq('id', materialId)

      if (deleteError) throw deleteError

      return { success: true, error: null, warnings }

    } catch (error) {
      return { success: false, error, warnings: [] }
    }
  }
}