import { supabase } from '@/lib/supabase'

/**
 * Códigos (TAG) de material, usados pela importação de NF-e.
 *
 * A versão anterior buscava todos os códigos para achar o maior, mas a API
 * corta a resposta em 1.000 linhas (a tabela tem 2.215) e a consulta não tinha
 * ordenação: nenhuma das linhas devolvidas tinha código alto, então ela caía
 * num 10039 fixo e gerava 10040, 10041… que já existiam. O primeiro item da
 * nota entrava e os demais falhavam por código duplicado — era essa a causa de
 * só um produto aparecer no histórico.
 *
 * Agora a conta é feita no banco, sobre a tabela inteira, e cada código é
 * conferido antes de ser devolvido.
 */
export const CodeGenerationService = {
  /** Próximo código livre, na sequência do cadastro */
  async getNextSequentialCode(): Promise<string> {
    const { data, error } = await supabase.rpc('proximo_codigo_material')
    if (error || !data) {
      throw new Error(error?.message ?? 'Não foi possível gerar o código do material')
    }
    return String(data)
  },

  /**
   * Vários códigos livres de uma vez, na ordem.
   *
   * Sem fallback inventado: se o banco não responder, a importação precisa
   * parar e avisar, em vez de gravar material com código que já é de outro.
   */
  async getMultipleSequentialCodes(count: number): Promise<string[]> {
    if (count < 1) return []

    const { data, error } = await supabase.rpc('proximos_codigos_material', {
      quantidade: count,
    })

    if (error || !Array.isArray(data) || data.length < count) {
      throw new Error(
        error?.message ?? `Não foi possível gerar ${count} código(s) de material`,
      )
    }

    return data.map(String)
  },

  /** `true` quando o código ainda não está em uso */
  async validateCodeUniqueness(codigo: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('materiais_equipamentos')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle()

    if (error) {
      console.error('Erro ao validar código de material:', error)
      return false
    }

    return data === null
  },
}
