/**
 * Utilitários para verificação de status de calibração
 */

export type StatusCalibracao = 
  | 'nao_requer'
  | 'em_dia'
  | 'proxima_vencimento'  // próxima dos 30 dias
  | 'vencida'
  | 'sem_data'

export interface StatusCalibracaoInfo {
  status: StatusCalibracao
  diasRestantes?: number
  diasVencidos?: number
  mensagem: string
  cor: 'default' | 'secondary' | 'destructive' | 'warning'
  icone: string
}

/**
 * Verifica o status da calibração de um equipamento
 */
export function verificarStatusCalibracao(
  requerCalibracao: boolean,
  proximaCalibracao?: string | null,
  frequenciaMeses?: number | null
): StatusCalibracaoInfo {
  // Se não requer calibração
  if (!requerCalibracao) {
    return {
      status: 'nao_requer',
      mensagem: 'Não requer',
      cor: 'default',
      icone: '➖'
    }
  }

  // Se requer mas não tem data definida
  if (!proximaCalibracao) {
    return {
      status: 'sem_data',
      mensagem: 'Data não definida',
      cor: 'warning',
      icone: '⚠️'
    }
  }

  const hoje = new Date()
  const dataProxima = new Date(proximaCalibracao)
  
  // Calcular diferença em dias
  const diferencaMs = dataProxima.getTime() - hoje.getTime()
  const diferencaDias = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24))

  // Vencida (data já passou)
  if (diferencaDias < 0) {
    return {
      status: 'vencida',
      diasVencidos: Math.abs(diferencaDias),
      mensagem: `Vencida há ${Math.abs(diferencaDias)} dia${Math.abs(diferencaDias) !== 1 ? 's' : ''}`,
      cor: 'destructive',
      icone: '🔴'
    }
  }

  // Próxima do vencimento (30 dias ou menos)
  if (diferencaDias <= 30) {
    return {
      status: 'proxima_vencimento',
      diasRestantes: diferencaDias,
      mensagem: diferencaDias === 0 
        ? 'Vence hoje!' 
        : `Vence em ${diferencaDias} dia${diferencaDias !== 1 ? 's' : ''}`,
      cor: 'warning',
      icone: '🟡'
    }
  }

  // Em dia
  return {
    status: 'em_dia',
    diasRestantes: diferencaDias,
    mensagem: `Próxima: ${dataProxima.toLocaleDateString('pt-BR')}`,
    cor: 'secondary',
    icone: '🔧'
  }
}

/**
 * Gera uma nova data de calibração baseada na frequência
 */
export function calcularProximaCalibracao(
  ultimaCalibracao: string,
  frequenciaMeses: number
): string {
  const dataUltima = new Date(ultimaCalibracao)
  const dataProxima = new Date(dataUltima)
  dataProxima.setMonth(dataProxima.getMonth() + frequenciaMeses)
  
  return dataProxima.toISOString().split('T')[0] // Formato YYYY-MM-DD
}

/**
 * Formata data para exibição brasileira
 */
export function formatarDataBR(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR')
}










