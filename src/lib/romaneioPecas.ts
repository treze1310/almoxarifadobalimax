/**
 * Uma linha de romaneio por peça.
 *
 * A tela agrupa as peças escolhidas num único item ("3 peças da
 * esmerilhadeira"), mas no banco cada peça é uma linha de quantidade 1 com o
 * seu `material_unidade_id`. É isso que faz a devolução item a item valer por
 * peça e o histórico dizer qual peça esteve com quem — com uma linha só de
 * quantidade 3 não há como saber qual das três voltou.
 */

export interface LinhaComPecas {
  material_equipamento_id: string
  quantidade: number
  valor_unitario?: number
  valor_total?: number
  observacoes?: string
  numero_serie?: string
  codigo_patrimonial?: string
  /** Peças escolhidas; vazio ou ausente em material de consumo */
  unidades?: string[]
  /** Campo só da tela, não vai para o banco */
  quantidadeOriginal?: number
}

export interface LinhaDoBanco {
  material_equipamento_id: string
  quantidade: number
  valor_unitario?: number
  valor_total?: number
  observacoes?: string
  numero_serie?: string
  codigo_patrimonial?: string
  material_unidade_id?: string
}

export const expandirItensPorPeca = (itens: LinhaComPecas[]): LinhaDoBanco[] =>
  itens.flatMap((item) => {
    const { unidades, quantidadeOriginal: _ignorado, ...linha } = item

    if (!unidades || unidades.length === 0) return [linha]

    return unidades.map((unidadeId) => ({
      ...linha,
      // Uma peça é uma peça: a quantidade da linha não é escolha do usuário
      quantidade: 1,
      material_unidade_id: unidadeId,
      valor_total: linha.valor_unitario,
    }))
  })
