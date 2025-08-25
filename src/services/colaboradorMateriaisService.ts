import { supabase } from '@/lib/supabase'

export interface MaterialEquipamentoVinculado {
  romaneio_id: string
  romaneio_numero: string
  romaneio_data: string
  romaneio_tipo: string
  item_id: string
  quantidade: number
  material_nome: string
  material_codigo: string
  material_categoria: string | null
  valor_unitario: number | null
  valor_total: number | null
  numero_serie: string | null
  codigo_patrimonial: string | null
  observacoes: string | null
  data_devolucao: string | null
  status: 'retirado' | 'devolvido' | 'parcialmente_devolvido'
}

export const colaboradorMateriaisService = {
  /**
   * Busca todos os materiais/equipamentos (excluindo EPIs) vinculados a um colaborador através de romaneios
   */
  async getMateriaisEquipamentosVinculados(colaboradorId: string): Promise<{
    data: MaterialEquipamentoVinculado[] | null
    error: any
  }> {
    try {
      console.log('🔍 Buscando materiais/equipamentos para colaborador:', colaboradorId)
      
      const { data, error } = await supabase
        .from('romaneios')
        .select(`
          id,
          numero,
          data_romaneio,
          tipo,
          romaneios_itens!inner(
            id,
            quantidade,
            valor_unitario,
            valor_total,
            numero_serie,
            codigo_patrimonial,
            observacoes,
            data_devolucao,
            materiais_equipamentos!inner(
              codigo,
              nome,
              categoria,
              is_epi
            )
          )
        `)
        .eq('colaborador_id', colaboradorId)
        .eq('tipo', 'retirada')
        .order('data_romaneio', { ascending: false })

      if (error) throw error

      console.log('📋 Dados brutos dos romaneios:', data)

      const materiaisFormatados: MaterialEquipamentoVinculado[] = []
      
      data?.forEach(romaneio => {
        console.log('📦 Processando romaneio:', romaneio.numero, 'com', romaneio.romaneios_itens?.length, 'itens')
        
        romaneio.romaneios_itens?.forEach(item => {
          console.log('🔧 Item:', item.materiais_equipamentos?.nome, 'is_epi:', item.materiais_equipamentos?.is_epi)
          
          // Incluir apenas materiais/equipamentos que NÃO são EPIs
          if (!item.materiais_equipamentos?.is_epi) {
            const status = item.data_devolucao 
              ? 'devolvido' 
              : 'retirado' as 'retirado' | 'devolvido' | 'parcialmente_devolvido'

            console.log('✅ Adicionando material:', item.materiais_equipamentos?.nome)

            materiaisFormatados.push({
              romaneio_id: romaneio.id,
              romaneio_numero: romaneio.numero,
              romaneio_data: romaneio.data_romaneio,
              romaneio_tipo: romaneio.tipo,
              item_id: item.id,
              quantidade: item.quantidade,
              material_nome: item.materiais_equipamentos.nome,
              material_codigo: item.materiais_equipamentos.codigo,
              material_categoria: item.materiais_equipamentos.categoria,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              numero_serie: item.numero_serie,
              codigo_patrimonial: item.codigo_patrimonial,
              observacoes: item.observacoes,
              data_devolucao: item.data_devolucao,
              status
            })
          }
        })
      })

      console.log('📊 Total de materiais/equipamentos encontrados:', materiaisFormatados.length)

      return { data: materiaisFormatados, error: null }
    } catch (error) {
      console.error('❌ Erro ao buscar materiais/equipamentos vinculados:', error)
      return { data: null, error }
    }
  },

  /**
   * Busca estatísticas de materiais/equipamentos vinculados ao colaborador
   */
  async getEstatisticasMateriaisColaborador(colaboradorId: string): Promise<{
    data: {
      total: number
      retirados: number
      devolvidos: number
      categorias: { [key: string]: number }
    } | null
    error: any
  }> {
    try {
      const { data: materiais, error } = await this.getMateriaisEquipamentosVinculados(colaboradorId)
      
      if (error) throw error
      if (!materiais) return { data: null, error: null }

      const estatisticas = {
        total: materiais.length,
        retirados: materiais.filter(m => m.status === 'retirado').length,
        devolvidos: materiais.filter(m => m.status === 'devolvido').length,
        categorias: materiais.reduce((acc, material) => {
          const categoria = material.material_categoria || 'Sem categoria'
          acc[categoria] = (acc[categoria] || 0) + 1
          return acc
        }, {} as { [key: string]: number })
      }

      return { data: estatisticas, error: null }
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas de materiais:', error)
      return { data: null, error }
    }
  }
}
