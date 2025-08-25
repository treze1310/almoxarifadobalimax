import { supabase } from '@/lib/supabase'

export class CodeGenerationService {
  /**
   * Obtém o próximo código sequencial baseado no maior código numérico existente
   */
  static async getNextSequentialCode(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .select('codigo')
        .neq('codigo', '')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar códigos:', error)
        throw error
      }

      // Encontrar o maior código numérico
      let maxNumericCode = 0
      
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

      // Se não há códigos numéricos, começar com 10000
      if (maxNumericCode === 0) {
        maxNumericCode = 9999
      }

      // Retornar próximo código formatado com 5 dígitos
      const nextCode = maxNumericCode + 1
      return nextCode.toString().padStart(5, '0')
    } catch (error) {
      console.error('Erro ao gerar próximo código:', error)
      // Fallback: usar timestamp como último recurso
      return Date.now().toString().slice(-5)
    }
  }

  /**
   * Gera múltiplos códigos sequenciais
   */
  static async getMultipleSequentialCodes(count: number): Promise<string[]> {
    const firstCode = await this.getNextSequentialCode()
    const firstNumber = parseInt(firstCode, 10)
    
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = (firstNumber + i).toString().padStart(5, '0')
      codes.push(code)
    }
    
    return codes
  }

  /**
   * Valida se um código já existe
   */
  static async validateCodeUniqueness(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .select('id')
        .eq('codigo', code)
        .limit(1)

      if (error) throw error
      
      return data.length === 0 // True se o código é único
    } catch (error) {
      console.error('Erro ao validar código:', error)
      return false
    }
  }

  /**
   * Corrige códigos existentes para serem sequenciais
   */
  static async fixExistingCodes(): Promise<{
    success: boolean
    updated: number
    errors: string[]
  }> {
    try {
      // Buscar todos os materiais sem código numérico sequencial
      const { data: materials, error } = await supabase
        .from('materiais_equipamentos')
        .select('id, codigo, nome, created_at')
        .order('created_at', { ascending: true })

      if (error) throw error

      const errors: string[] = []
      let updated = 0
      let nextSequentialNumber = 10000

      // Identificar materiais que precisam de novos códigos
      const materialsToUpdate: Array<{ id: string; currentCode: string; newCode: string }> = []

      for (const material of materials || []) {
        const currentCode = material.codigo
        
        // Se o código não é um número de 5 dígitos, precisa ser atualizado
        if (!/^\d{5}$/.test(currentCode)) {
          const newCode = nextSequentialNumber.toString().padStart(5, '0')
          materialsToUpdate.push({
            id: material.id,
            currentCode,
            newCode
          })
          nextSequentialNumber++
        } else {
          // Se já é um código válido, manter mas atualizar o próximo número
          const numericCode = parseInt(currentCode, 10)
          if (numericCode >= nextSequentialNumber) {
            nextSequentialNumber = numericCode + 1
          }
        }
      }

      console.log(`📋 ${materialsToUpdate.length} materiais precisam de novos códigos`)

      // Atualizar códigos em lotes
      for (const material of materialsToUpdate) {
        try {
          const { error: updateError } = await supabase
            .from('materiais_equipamentos')
            .update({ codigo: material.newCode })
            .eq('id', material.id)

          if (updateError) {
            errors.push(`Erro ao atualizar ${material.currentCode} → ${material.newCode}: ${updateError.message}`)
          } else {
            updated++
            console.log(`✅ ${material.currentCode} → ${material.newCode}`)
          }
        } catch (err) {
          errors.push(`Erro ao atualizar material ${material.id}: ${err}`)
        }
      }

      return {
        success: errors.length === 0,
        updated,
        errors
      }
    } catch (error) {
      return {
        success: false,
        updated: 0,
        errors: [`Erro geral: ${error}`]
      }
    }
  }
}
