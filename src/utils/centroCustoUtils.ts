/**
 * Utilitários para trabalhar com centros de custo após remoção do campo 'nome'
 */

interface CentroCustoComEmpresa {
  codigo: string
  descricao?: string | null
  empresas?: { nome: string } | null
}

/**
 * Retorna o nome de exibição do centro de custo
 * Usa o nome da empresa se disponível, senão usa a descrição
 */
export function getCentroCustoDisplayName(centroCusto?: CentroCustoComEmpresa | null): string {
  if (!centroCusto) return 'N/A'
  
  // Se tem empresa vinculada, usa o nome da empresa
  if (centroCusto.empresas?.nome) {
    return centroCusto.empresas.nome
  }
  
  // Senão usa a descrição
  if (centroCusto.descricao) {
    return centroCusto.descricao
  }
  
  // Fallback para o código
  return centroCusto.codigo
}

/**
 * Retorna o texto completo do centro de custo (código + nome)
 */
export function getCentroCustoFullText(centroCusto?: CentroCustoComEmpresa | null): string {
  if (!centroCusto) return 'N/A'
  
  const displayName = getCentroCustoDisplayName(centroCusto)
  return `${centroCusto.codigo} - ${displayName}`
}

/**
 * Para compatibilidade com código antigo que espera um objeto com 'nome'
 */
export function mapCentroCustoToLegacyFormat(centroCusto?: CentroCustoComEmpresa | null) {
  if (!centroCusto) return null
  
  return {
    codigo: centroCusto.codigo,
    nome: getCentroCustoDisplayName(centroCusto),
    descricao: centroCusto.descricao
  }
}