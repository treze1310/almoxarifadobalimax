import { supabase } from '@/lib/supabase'

export const CodeGenerationService = {
  /**
   * Obtém o maior código numérico atual
   */
  async getLatestNumericCode(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .select('codigo')
        .neq('codigo', '')

      if (error) {
        console.error('Erro ao buscar códigos:', error)
        return 10039 // Fallback para o último código conhecido
      }

      // Encontrar o maior código numérico
      let maxNumericCode = 10039 // Base atual conhecida
      
      if (data && data.length > 0) {
        data.forEach(item => {
          const code = item.codigo
          // Verificar se é um código puramente numérico
          if (/^\d+$/.test(code)) {
            const numericCode = parseInt(code, 10)
            if (numericCode > maxNumericCode) {
              maxNumericCode = numericCode
            }
          }
        })
      }

      console.log(`📊 Maior código encontrado: ${maxNumericCode}`)
      return maxNumericCode
    } catch (error) {
      console.error('Erro ao obter último código:', error)
      return 10039
    }
  },

  /**
   * Gera o próximo código sequencial
   */
  async getNextSequentialCode(): Promise<string> {
    try {
      const maxCode = await this.getLatestNumericCode()
      const nextCode = maxCode + 1
      return nextCode.toString().padStart(5, '0')
    } catch (error) {
      console.error('Erro ao gerar próximo código:', error)
      // Fallback: usar próximo após o último conhecido
      return '10040'
    }
  },

  /**
   * Gera múltiplos códigos sequenciais
   */
  async getMultipleSequentialCodes(count: number): Promise<string[]> {
    try {
      const maxCode = await this.getLatestNumericCode()
      
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        const code = (maxCode + 1 + i).toString().padStart(5, '0')
        codes.push(code)
      }
      
      console.log(`📋 Códigos gerados (${count}): ${codes.join(', ')}`)
      return codes
    } catch (error) {
      console.error('Erro ao gerar códigos múltiplos:', error)
      // Fallback: gerar códigos baseados no último conhecido
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        codes.push((10040 + i).toString().padStart(5, '0'))
      }
      return codes
    }
  },

  /**
   * Valida se um código é único
   */
  async validateCodeUniqueness(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .select('id')
        .eq('codigo', code)
        .maybeSingle()

      if (error) {
        console.error('Erro ao validar unicidade:', error)
        return false
      }

      return !data // Retorna true se não existe material com este código
    } catch (error) {
      console.error('Erro na validação de unicidade:', error)
      return false
    }
  },

  /**
   * Corrige códigos não sequenciais no banco
   */
  async fixNonSequentialCodes(): Promise<{
    fixed: number
    errors: string[]
  }> {
    try {
      console.log('🔧 Iniciando correção de códigos não sequenciais...')
      
      // Buscar materiais com códigos não sequenciais
      const { data: materials, error } = await supabase
        .from('materiais_equipamentos')
        .select('id, codigo, nome, created_at')
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      if (!materials || materials.length === 0) {
        return { fixed: 0, errors: ['Nenhum material encontrado'] }
      }

      let fixedCount = 0
      const errors: string[] = []

      // Aplicar códigos sequenciais baseados na ordem de criação
      for (let i = 0; i < materials.length; i++) {
        const material = materials[i]
        const newCode = (10000 + i).toString().padStart(5, '0')
        
        // Só atualizar se o código for diferente
        if (material.codigo !== newCode) {
          const { error: updateError } = await supabase
            .from('materiais_equipamentos')
            .update({ codigo: newCode })
            .eq('id', material.id)

          if (updateError) {
            errors.push(`Erro ao atualizar ${material.nome}: ${updateError.message}`)
          } else {
            console.log(`✅ ${material.codigo} → ${newCode}: ${material.nome}`)
            fixedCount++
          }
        }
      }

      console.log(`🎉 Correção concluída: ${fixedCount} códigos corrigidos`)
      return { fixed: fixedCount, errors }
    } catch (error) {
      console.error('Erro na correção de códigos:', error)
      return { 
        fixed: 0, 
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'] 
      }
    }
  }
}