import { supabase } from '@/lib/supabase'

export interface CentroCustoCodeInfo {
  codigo: string
  nextSequence: number
}

/**
 * Próximo código de centro de custo, no padrão AAMMDD + sequência.
 *
 * O cálculo acontece no banco (`proximo_codigo_centro_custo`). Antes era
 * feito aqui, buscando o "maior código" com `order('codigo')` — ordenação de
 * texto, em que o maior é "TI", porque letra vem depois de número. O
 * `parseInt` disso dava `NaN` e a função caía num 1495 escrito à mão no
 * código, ignorando a sequência real (1612).
 *
 * No banco a conta considera só o formato atual e descarta o que não é
 * sequência: códigos antigos de 9 dígitos com zero à esquerda
 * (0211029941 = 0 + 211029 + 941), números de contrato do cliente
 * (4600009381) e os departamentos internos (TI, RH, ALMOXARIFADO).
 */
export async function generateCentroCustoCode(): Promise<CentroCustoCodeInfo> {
  const { data, error } = await supabase.rpc('proximo_codigo_centro_custo')

  if (error || !data) {
    console.error('Erro ao gerar código de centro de custo:', error)
    throw new Error(error?.message ?? 'Não foi possível gerar o código')
  }

  const codigo = String(data)
  return {
    codigo,
    // A sequência são os dígitos depois da data, para quem precisar exibir
    nextSequence: Number(codigo.slice(6)) || 0,
  }
}

export async function validateCentroCustoCode(codigo: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('centros_custo')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle()

    if (error) {
      console.error('Erro ao validar código de centro de custo:', error)
      return false
    }

    // Sem registro, o código está livre
    return data === null
  } catch (error) {
    console.error('Erro ao validar código de centro de custo:', error)
    return false
  }
}
