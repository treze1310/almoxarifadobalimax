// Utilitário temporário para testar geração de códigos
import { CodeGenerationService } from '@/services/codeGenerationService'

export async function testCodeGeneration() {
  try {
    console.log('🧪 Testando geração de códigos...')
    
    // Testar próximo código
    const nextCode = await CodeGenerationService.getNextSequentialCode()
    console.log('📋 Próximo código:', nextCode)
    
    // Testar múltiplos códigos
    const multipleCodes = await CodeGenerationService.getMultipleSequentialCodes(3)
    console.log('📋 Múltiplos códigos:', multipleCodes)
    
    // Validar unicidade
    const isUnique = await CodeGenerationService.validateCodeUniqueness(nextCode)
    console.log('✅ Código único?', isUnique)
    
    return {
      nextCode,
      multipleCodes,
      isUnique
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error)
    return null
  }
}
