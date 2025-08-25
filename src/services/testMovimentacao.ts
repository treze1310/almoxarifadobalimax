import { supabase } from '@/lib/supabase'

// Função para testar valores válidos do tipo_movimentacao
export async function testarTiposMovimentacao() {
  const tiposPossiveis = [
    'entrada',
    'saida', 
    'ENTRADA',
    'SAIDA',
    'retirada',
    'devolucao',
    'RETIRADA',
    'DEVOLUCAO',
    'compra',
    'venda',
    'ajuste',
    'transferencia',
    'consumo',
    'producao'
  ]

  for (const tipo of tiposPossiveis) {
    try {
      const { data, error } = await supabase
        .from('movimentacao_estoque')
        .insert({
          material_equipamento_id: 'f81094ae-f93a-4769-b8bb-afcf62de050a', // ID de teste
          quantidade: 1,
          quantidade_anterior: 0,
          quantidade_atual: 1,
          tipo_movimentacao: tipo,
          usuario_id: '328cc4e1-6f02-4a50-934d-c4fc90ae18e9',
          motivo: `Teste - ${tipo}`,
          data_movimentacao: new Date().toISOString()
        })
        .select()
        .single()
      
      if (!error && data) {
        console.log(`✅ Tipo '${tipo}' é válido`)
        // Deletar o registro de teste
        await supabase
          .from('movimentacao_estoque')
          .delete()
          .eq('id', data.id)
      } else {
        console.log(`❌ Tipo '${tipo}' é inválido:`, error?.message)
      }
    } catch (err) {
      console.log(`❌ Tipo '${tipo}' causou erro:`, err)
    }
  }
}

// Função para consultar schema da tabela
export async function consultarSchemaMovimentacao() {
  try {
    // Consultar constraints da tabela
    const { data, error } = await supabase
      .rpc('get_table_constraints', { table_name: 'movimentacao_estoque' })
    
    if (error) {
      console.error('Erro ao consultar constraints:', error)
      return
    }
    
    console.log('Constraints da tabela movimentacao_estoque:', data)
  } catch (err) {
    console.error('Erro ao consultar schema:', err)
  }
}