type ItemHistorico = {
  materiais_equipamentos?: unknown
  material_excluido?: unknown
}

/** O cancelado mantém a identificação do item mesmo após excluir o cadastro. */
export function restaurarItensHistoricos<T extends { romaneios_itens?: ItemHistorico[] | null }>(romaneio: T): T {
  return {
    ...romaneio,
    romaneios_itens: romaneio.romaneios_itens?.map(item => {
      const snapshot = item.material_excluido
      if (item.materiais_equipamentos || !snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return item
      const dados = snapshot as Record<string, unknown>
      if (typeof dados.nome !== 'string') return item
      return { ...item, materiais_equipamentos: { ...dados, codigo_ncm: null, centros_custo: null } }
    }),
  }
}
