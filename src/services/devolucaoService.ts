import { supabase } from '@/lib/supabase'

export interface StatusDevolucao {
  status: 'nao_devolvido' | 'parcialmente_devolvido' | 'totalmente_devolvido'
  percentualDevolvido: number
  quantidadeOriginal: number
  quantidadeDevolvida: number
  itensDevolvidos: Array<{
    material_id: string
    nome_material: string
    quantidade_original: number
    quantidade_devolvida: number
    percentual: number
  }>
}

export interface RomaneioComStatus {
  id: string
  numero: string
  tipo: string
  status: string
  data_romaneio: string
  statusDevolucao?: StatusDevolucao
  podeSerDevolvido: boolean
}

class DevolucaoService {
  /**
   * Calcula o status de devolução de um romaneio de entrada
   */
  async calcularStatusDevolucao(romaneioId: string): Promise<StatusDevolucao> {
    try {
      // Buscar o romaneio de entrada e seus itens
      const { data: romaneioOriginal, error: romaneioError } = await supabase
        .from('romaneios')
        .select(`
          id,
          numero,
          tipo,
          status,
          romaneios_itens (
            id,
            quantidade,
            material_equipamento_id,
            materiais_equipamentos (
              id,
              nome
            )
          )
        `)
        .eq('id', romaneioId)
        .eq('tipo', 'retirada')
        .in('status', ['aprovado', 'retirado'])
        .single()

      if (romaneioError || !romaneioOriginal) {
        throw new Error('Romaneio de entrada não encontrado ou não elegível para devolução')
      }

      // Buscar todas as devoluções deste romaneio
      const { data: devolucoes, error: devolucoesError } = await supabase
        .from('romaneios')
        .select(`
          id,
          status,
          romaneios_itens (
            quantidade,
            material_equipamento_id
          )
        `)
        .eq('romaneio_origem_id', romaneioId)
        .eq('tipo', 'devolucao')
        .in('status', ['aprovado', 'devolvido'])

      if (devolucoesError) {
        throw new Error('Erro ao buscar devoluções')
      }

      // Calcular quantidades devolvidas por material
      const devolucoesMap = new Map<string, number>()
      
      if (devolucoes && devolucoes.length > 0) {
        for (const devolucao of devolucoes) {
          for (const item of devolucao.romaneios_itens || []) {
            const materialId = item.material_equipamento_id
            const quantidadeAtual = devolucoesMap.get(materialId) || 0
            devolucoesMap.set(materialId, quantidadeAtual + item.quantidade)
          }
        }
      }

      // Calcular status para cada item
      const itensDevolvidos = []
      let quantidadeOriginalTotal = 0
      let quantidadeDevolvidaTotal = 0

      for (const item of romaneioOriginal.romaneios_itens || []) {
        const materialId = item.material_equipamento_id
        const quantidadeOriginal = item.quantidade
        const quantidadeDevolvida = devolucoesMap.get(materialId) || 0
        const percentual = quantidadeOriginal > 0 ? (quantidadeDevolvida / quantidadeOriginal) * 100 : 0

        itensDevolvidos.push({
          material_id: materialId,
          nome_material: item.materiais_equipamentos?.nome || 'Material não encontrado',
          quantidade_original: quantidadeOriginal,
          quantidade_devolvida: quantidadeDevolvida,
          percentual: Math.min(percentual, 100) // Limitar a 100%
        })

        quantidadeOriginalTotal += quantidadeOriginal
        quantidadeDevolvidaTotal += quantidadeDevolvida
      }

      // Calcular percentual geral
      const percentualDevolvido = quantidadeOriginalTotal > 0 
        ? (quantidadeDevolvidaTotal / quantidadeOriginalTotal) * 100 
        : 0

      // Determinar status
      let status: StatusDevolucao['status']
      if (percentualDevolvido === 0) {
        status = 'nao_devolvido'
      } else if (percentualDevolvido >= 100) {
        status = 'totalmente_devolvido'
      } else {
        status = 'parcialmente_devolvido'
      }

      return {
        status,
        percentualDevolvido: Math.min(percentualDevolvido, 100),
        quantidadeOriginal: quantidadeOriginalTotal,
        quantidadeDevolvida: quantidadeDevolvidaTotal,
        itensDevolvidos
      }

    } catch (error) {
      console.error('Erro ao calcular status de devolução:', error)
      return {
        status: 'nao_devolvido',
        percentualDevolvido: 0,
        quantidadeOriginal: 0,
        quantidadeDevolvida: 0,
        itensDevolvidos: []
      }
    }
  }

  /**
   * Verifica se um romaneio de devolução pode ser finalizado novamente
   */
  async verificarPodeFinalizarDevolucao(romaneioId: string): Promise<boolean> {
    try {
      const { data: romaneio, error } = await supabase
        .from('romaneios')
        .select('status, tipo')
        .eq('id', romaneioId)
        .eq('tipo', 'devolucao')
        .single()

      if (error || !romaneio) {
        return false
      }

      // Romaneios de devolução já finalizados (aprovado/devolvido) não podem ser finalizados novamente
      return !['aprovado', 'devolvido'].includes(romaneio.status || '')

    } catch (error) {
      console.error('Erro ao verificar se devolução pode ser finalizada:', error)
      return false
    }
  }

  /**
   * Verifica se um romaneio tem devoluções pendentes (aguardando aprovação)
   */
  async verificarDevolucoesPendentes(romaneioId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('romaneios')
        .select('id')
        .eq('romaneio_origem_id', romaneioId)
        .eq('tipo', 'devolucao')
        .eq('status', 'pendente')

      if (error) {
        console.error('Erro ao verificar devoluções pendentes:', error)
        return false
      }

      return (data || []).length > 0

    } catch (error) {
      console.error('Erro ao verificar devoluções pendentes:', error)
      return false
    }
  }

  /**
   * Busca romaneios com status de devolução calculado
   */
  async buscarRomaneiosComStatusDevolucao(): Promise<RomaneioComStatus[]> {
    try {
      // Buscar romaneios de retirada aprovados/retirados
      const { data: romaneios, error } = await supabase
        .from('romaneios')
        .select(`
          id,
          numero,
          tipo,
          status,
          data_romaneio
        `)
        .eq('tipo', 'retirada')
        .in('status', ['aprovado', 'retirado'])
        .order('created_at', { ascending: false })

      if (error || !romaneios) {
        return []
      }

      // Calcular status de devolução para cada romaneio
      const romaneiosComStatus: RomaneioComStatus[] = []

      for (const romaneio of romaneios) {
        const statusDevolucao = await this.calcularStatusDevolucao(romaneio.id)
        
        romaneiosComStatus.push({
          ...romaneio,
          statusDevolucao,
          podeSerDevolvido: statusDevolucao.status !== 'totalmente_devolvido'
        })
      }

      return romaneiosComStatus

    } catch (error) {
      console.error('Erro ao buscar romaneios com status de devolução:', error)
      return []
    }
  }

  /**
   * Impede que romaneios de devolução sejam finalizados mais de uma vez
   */
  async validarFinalizacaoDevolucao(romaneioId: string): Promise<{ valido: boolean; motivo?: string }> {
    try {
      const podeFinalize = await this.verificarPodeFinalizarDevolucao(romaneioId)
      
      if (!podeFinalize) {
        return {
          valido: false,
          motivo: 'Este romaneio de devolução já foi finalizado e não pode ser processado novamente.'
        }
      }

      return { valido: true }

    } catch (error) {
      console.error('Erro ao validar finalização de devolução:', error)
      return {
        valido: false,
        motivo: 'Erro interno ao validar a devolução.'
      }
    }
  }
}

export const devolucaoService = new DevolucaoService()
export default devolucaoService