import { supabase } from '@/lib/supabase'

/**
 * Código (TAG) de material e equipamento.
 *
 * Dois itens podem ter exatamente o mesmo nome — é o código que os distingue,
 * e só ele é único no banco. Por isso ele é mostrado e pode ser editado tanto
 * no cadastro novo quanto na edição.
 */

export interface MaterialCodeInfo {
  codigo: string
}

/**
 * Próximo código livre, calculado no banco (`proximo_codigo_material`).
 *
 * Antes o formulário sorteava um número de 5 dígitos entre 10000 e 99999: não
 * seguia a sequência do cadastro (00001 a 02370) e dois sorteios podiam cair
 * no mesmo número, derrubando o cadastro com erro de chave duplicada.
 */
export async function generateMaterialCode(): Promise<MaterialCodeInfo> {
  const { data, error } = await supabase.rpc('proximo_codigo_material')

  if (error || !data) {
    console.error('Erro ao gerar código de material:', error)
    throw new Error(error?.message ?? 'Não foi possível gerar o código')
  }

  return { codigo: String(data) }
}

/**
 * Nome do item que já usa este código, ou `null` se estiver livre.
 *
 * `ignorarId` é o próprio item na edição — senão ele acusaria conflito consigo
 * mesmo ao salvar sem mudar o código.
 */
export async function codigoEmUso(codigo: string, ignorarId?: string): Promise<string | null> {
  let consulta = supabase
    .from('materiais_equipamentos')
    .select('id, nome')
    .eq('codigo', codigo)
    .limit(1)

  if (ignorarId) consulta = consulta.neq('id', ignorarId)

  const { data, error } = await consulta.maybeSingle()

  if (error) {
    console.error('Erro ao verificar código de material:', error)
    // Na dúvida, deixa seguir: o banco ainda barra a duplicidade
    return null
  }

  return data?.nome ?? null
}
