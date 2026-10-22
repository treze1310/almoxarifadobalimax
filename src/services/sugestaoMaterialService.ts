import { supabase } from '@/lib/supabase'
import type { MatchedMaterial } from '@/components/nfe/MaterialSearchDialog'

/**
 * Sugestão de material já cadastrado para cada item da NF-e.
 *
 * A descrição da nota quase nunca é igual à do cadastro ("PARAFUSO SEXT M8 X
 * 1.1/4 ZINC" contra "PARAFUSO SEXTAVADO - 1/4"), então quem compara é o
 * banco, por trigramas e por palavras em comum (`sugerir_materiais`). Os
 * limiares são baixos de propósito: é melhor mostrar a melhor opção com o
 * quanto ela se parece e deixar o almoxarife conferir do que não sugerir nada.
 *
 * Medido no catálogo atual (2.224 itens): sugestão certa em primeiro lugar em
 * 198 de 200 descrições, e nas três primeiras em 200 de 200; 70 ms para uma
 * nota de 30 itens.
 */

export interface SugestaoMaterial extends MatchedMaterial {
  /** 0 a 1; acima de 0.8 é praticamente o mesmo item */
  similaridade: number
  motivo: 'codigo igual' | 'mesmas palavras' | 'descricao parecida' | string
  exige_identificacao_individual: boolean
}

export interface ItemParaSugerir {
  /** Código do item na nota, usado como chave do resultado */
  code: string
  description: string
}

/** code -> sugestões, da mais parecida para a menos */
export type SugestoesPorItem = Record<string, SugestaoMaterial[]>

/** Quanto de parecença já justifica marcar o vínculo sozinho */
export const LIMIAR_VINCULO_AUTOMATICO = 0.8

export const buscarSugestoes = async (
  itens: ItemParaSugerir[],
  porItem = 3,
): Promise<SugestoesPorItem> => {
  const comDescricao = itens.filter((i) => (i.description ?? '').trim())
  if (comDescricao.length === 0) return {}

  const { data, error } = await supabase.rpc('sugerir_materiais', {
    p_descricoes: comDescricao.map((i) => i.description),
    p_codigos: comDescricao.map((i) => i.code ?? ''),
    p_por_descricao: porItem,
  })

  if (error) throw error

  return agruparSugestoes((data ?? []) as LinhaSugestao[], comDescricao)
}

/** Uma linha como o banco devolve: uma sugestão para uma descrição */
export interface LinhaSugestao {
  descricao: string
  material_id: string
  codigo: string
  nome: string
  estoque_atual: number | string | null
  unidade_medida: string | null
  tipo: string | null
  categoria: string | null
  exige_identificacao_individual: boolean | null
  similaridade: number | string | null
  motivo: string
}

/**
 * Passa do "por descrição" que o banco devolve para o "por item da nota".
 *
 * Uma nota pode repetir a mesma descrição em itens de códigos diferentes, e
 * nesse caso as duas linhas recebem as mesmas sugestões.
 */
export const agruparSugestoes = (
  linhas: LinhaSugestao[],
  itens: ItemParaSugerir[],
): SugestoesPorItem => {
  const porDescricao = new Map<string, SugestaoMaterial[]>()
  for (const linha of linhas) {
    const lista = porDescricao.get(linha.descricao) ?? []
    lista.push({
      id: linha.material_id,
      codigo: linha.codigo,
      nome: linha.nome,
      estoque_atual: Number(linha.estoque_atual ?? 0),
      unidade_medida: linha.unidade_medida,
      tipo: linha.tipo,
      categoria: linha.categoria,
      exige_identificacao_individual: !!linha.exige_identificacao_individual,
      similaridade: Number(linha.similaridade ?? 0),
      motivo: linha.motivo,
    })
    porDescricao.set(linha.descricao, lista)
  }

  const resultado: SugestoesPorItem = {}
  for (const item of itens) {
    if (!(item.description ?? '').trim()) continue
    resultado[item.code] = porDescricao.get(item.description) ?? []
  }
  return resultado
}

/** Como mostrar o quanto a sugestão se parece, sem falar em trigrama */
export const forcaDaSugestao = (
  similaridade: number,
): { rotulo: string; tom: 'alta' | 'media' | 'baixa' } => {
  if (similaridade >= LIMIAR_VINCULO_AUTOMATICO) {
    return { rotulo: 'quase certo', tom: 'alta' }
  }
  if (similaridade >= 0.45) return { rotulo: 'parecido', tom: 'media' }
  return { rotulo: 'pouco parecido', tom: 'baixa' }
}
