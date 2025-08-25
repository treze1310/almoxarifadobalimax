import { supabase } from '@/lib/supabase'

interface CentroCustoInfo {
  id: string
  codigo: string
  created_at: string
}

interface RomaneioNumberData {
  centroCustoOrigemId?: string
  centroCustoDestinoId?: string
  tipo: 'entrada' | 'retirada' | 'devolucao'
}

/**
 * Serviço para geração de números de romaneios seguindo o padrão:
 * AAA-AL-[CODIGO_CC]-SSSS
 * 
 * Onde:
 * - AAA = Tipo de documento (ROM para entrada/retirada, RDV para devolução)
 * - AL = Almoxarifado/Suprimentos
 * - [CODIGO_CC] = Código existente do centro de custo:
 *   - Para RETIRADAS/ENTRADAS: usa centro de custo DE DESTINO
 *   - Para DEVOLUÇÕES: usa centro de custo DE ORIGEM
 * - SSSS = Número sequencial do documento (4 dígitos)
 * 
 * IMPORTANTE: Usa o código JÁ CADASTRADO do centro de custo, não gera um novo.
 */
class RomaneioNumberService {
  
  /**
   * Busca o código existente do centro de custo
   */
  private async obterCodigoCentroCusto(centroCustoId: string): Promise<string> {
    // Buscar o código existente do centro de custo
    const { data: centroCusto, error } = await supabase
      .from('centros_custo')
      .select('codigo')
      .eq('id', centroCustoId)
      .single()

    if (error || !centroCusto) {
      throw new Error(`Centro de custo não encontrado: ${centroCustoId}`)
    }

    if (!centroCusto.codigo) {
      throw new Error(`Centro de custo sem código definido: ${centroCustoId}`)
    }

    return centroCusto.codigo
  }

  /**
   * Gera o próximo número sequencial para o romaneio
   */
  private async gerarNumeroSequencial(centroCustoId: string, tipo: string): Promise<string> {
    const prefixo = tipo === 'devolucao' ? 'RDV' : 'ROM'
    
    // Buscar romaneios existentes que usam o mesmo centro de custo na nomenclatura
    let query = supabase
      .from('romaneios')
      .select('numero')
      .like('numero', `${prefixo}-AL-%`)
      .order('created_at', { ascending: false })
      .limit(10) // Pegar os últimos 10 para encontrar o maior número
    
    // Para devoluções: buscar por centro de custo de origem
    // Para retiradas/entradas: buscar por centro de custo de destino
    if (tipo === 'devolucao') {
      query = query.eq('centro_custo_origem_id', centroCustoId)
    } else {
      query = query.eq('centro_custo_destino_id', centroCustoId)
    }
    
    const { data: ultimosRomaneios, error } = await query

    if (error) {
      console.warn('Erro ao buscar últimos romaneios, iniciando sequência:', error)
      return '0001'
    }

    let maiorNumero = 0

    // Extrair números sequenciais dos romaneios existentes
    for (const romaneio of ultimosRomaneios || []) {
      const match = romaneio.numero?.match(/-(\d{4})$/)
      if (match) {
        const numero = parseInt(match[1], 10)
        if (numero > maiorNumero) {
          maiorNumero = numero
        }
      }
    }

    return (maiorNumero + 1).toString().padStart(4, '0')
  }

  /**
   * Gera o número completo do romaneio
   */
  async gerarNumeroRomaneio(data: RomaneioNumberData): Promise<string> {
    try {
      // Determinar prefixo baseado no tipo
      const prefixo = data.tipo === 'devolucao' ? 'RDV' : 'ROM'
      
      // Determinar qual centro de custo usar para nomenclatura
      let centroCustoParaNomenclatura: string
      if (data.tipo === 'devolucao') {
        // Para devoluções: usar centro de custo DE ORIGEM
        if (!data.centroCustoOrigemId) {
          throw new Error('Centro de custo de origem é obrigatório para devoluções')
        }
        centroCustoParaNomenclatura = data.centroCustoOrigemId
      } else {
        // Para retiradas/entradas: usar centro de custo DE DESTINO
        if (!data.centroCustoDestinoId) {
          throw new Error('Centro de custo de destino é obrigatório para retiradas/entradas')
        }
        centroCustoParaNomenclatura = data.centroCustoDestinoId
      }
      
      // Obter código existente do centro de custo
      const codigoCentroCusto = await this.obterCodigoCentroCusto(centroCustoParaNomenclatura)
      
      // Gerar número sequencial (sempre baseado no centro de custo usado na nomenclatura)
      const numeroSequencial = await this.gerarNumeroSequencial(centroCustoParaNomenclatura, data.tipo)
      
      // Montar número final
      const numeroCompleto = `${prefixo}-AL-${codigoCentroCusto}-${numeroSequencial}`
      
      return numeroCompleto
    } catch (error) {
      console.error('Erro ao gerar número do romaneio:', error)
      throw error
    }
  }

  /**
   * Valida se um número de romaneio está no formato correto
   */
  validarNumeroRomaneio(numero: string): boolean {
    // Formato: AAA-AL-[QUALQUER_CODIGO_CC]-SSSS
    const pattern = /^(ROM|RDV)-AL-.+-\d{4}$/
    return pattern.test(numero)
  }

  /**
   * Extrai informações de um número de romaneio
   */
  parseNumeroRomaneio(numero: string): {
    tipo: 'ROM' | 'RDV'
    codigoCentroCusto: string
    numeroSequencial: string
  } | null {
    const match = numero.match(/^(ROM|RDV)-AL-(.+)-(\d{4})$/)
    
    if (!match) return null

    const [, tipo, codigoCentroCusto, numeroSeq] = match

    return {
      tipo: tipo as 'ROM' | 'RDV',
      codigoCentroCusto: codigoCentroCusto,
      numeroSequencial: numeroSeq
    }
  }
}

export const romaneioNumberService = new RomaneioNumberService()












