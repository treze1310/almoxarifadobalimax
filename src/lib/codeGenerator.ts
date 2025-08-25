import { DocumentType, IssuingUnit } from '@/types'
import { supabase } from '@/lib/supabase'

// Real function to get the next sequential number from the database
// This ensures uniqueness by checking existing records
const getNextSequence = async (documentType: DocumentType): Promise<number> => {
  try {
    // Buscar o último número usado para este tipo de documento
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('numero')
      .ilike('numero', `${documentType}-%`)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Erro ao buscar sequência:', error)
      // Em caso de erro, começar do 1
      return 1
    }

    if (!data || data.length === 0) {
      // Primeira solicitação deste tipo
      return 1
    }

    // Extrair o número sequencial do último código
    const lastNumber = data[0].numero
    const parts = lastNumber.split('-')
    if (parts.length >= 4) {
      const lastSequence = parseInt(parts[3])
      return isNaN(lastSequence) ? 1 : lastSequence + 1
    }

    return 1
  } catch (error) {
    console.error('Erro na função getNextSequence:', error)
    return 1
  }
}

/**
 * Generates a standardized document code.
 * Format: AAA-AL-XX-YYYY
 * @param documentType - The type of the document (e.g., 'SCO').
 * @param issuingUnit - The issuing unit ('matriz', 'parauapebas', 'contract').
 * @param costCenter - The cost center, required if issuingUnit is 'contract'.
 * @returns A promise that resolves to the generated document code.
 */
export const generateDocumentCode = async (
  documentType: DocumentType,
  issuingUnit: IssuingUnit,
  costCenter?: string,
): Promise<string> => {
  // 1. AAA: Document Type Acronym
  const aaa = documentType

  // 2. AL: Responsible Sector (Hardcoded)
  const al = 'AL'

  // 3. XX: Issuing Unit or Cost Center
  let xx = ''
  if (issuingUnit === 'matriz') {
    xx = '00'
  } else if (issuingUnit === 'parauapebas') {
    xx = '01'
  } else if (
    issuingUnit === 'contract' &&
    costCenter &&
    costCenter.length >= 4
  ) {
    xx = costCenter.slice(-4)
  } else {
    // Handle error or default case if cost center is invalid for contract
    xx = 'XX' // Placeholder for invalid state
  }

  // 4. YYYY: Sequential Number
  const sequence = await getNextSequence(documentType)
  const yyyy = String(sequence).padStart(4, '0')

  return `${aaa}-${al}-${xx}-${yyyy}`
}

/**
 * Generates a standardized code for purchase requisitions.
 * Format: SCO-AL-[CC_DESTINO]-[SEQUENCIA]
 * @param centroCustoDestinoId - The destination cost center ID or code
 * @returns A promise that resolves to the generated purchase requisition code.
 */
export const generatePurchaseRequisitionCode = async (
  centroCustoDestinoId: string
): Promise<string> => {
  try {
    // 1. SCO: Fixed document type for purchase requisitions
    const sco = 'SCO'

    // 2. AL: Responsible Sector (Hardcoded)
    const al = 'AL'

    // 3. Buscar o código do centro de custo se foi passado um UUID
    let centroCustoCodigo = centroCustoDestinoId
    
    // Se parece com UUID (tem hífens), buscar o código no banco
    if (centroCustoDestinoId.includes('-')) {
      const { data: centroCusto } = await supabase
        .from('centros_custo')
        .select('codigo')
        .eq('id', centroCustoDestinoId)
        .single()
      
      centroCustoCodigo = centroCusto?.codigo || '0000'
    }

    // 4. CC_DESTINO: Last 4 digits of destination cost center code
    const ccDestino = centroCustoCodigo && centroCustoCodigo.length >= 4 
      ? centroCustoCodigo.slice(-4)
      : centroCustoCodigo?.padStart(4, '0') || '0000'

    // 5. SEQUENCIA: Sequential Number específico para este centro de custo
    const pattern = `${sco}-${al}-${ccDestino}-%`
    
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('numero')
      .ilike('numero', pattern)
      .order('created_at', { ascending: false })
      .limit(1)

    let sequence = 1
    if (!error && data && data.length > 0) {
      const lastNumber = data[0].numero
      const parts = lastNumber.split('-')
      if (parts.length >= 4) {
        const lastSequence = parseInt(parts[3])
        sequence = isNaN(lastSequence) ? 1 : lastSequence + 1
      }
    }

    const sequencia = String(sequence).padStart(4, '0')
    return `${sco}-${al}-${ccDestino}-${sequencia}`
  } catch (error) {
    console.error('Erro ao gerar código de requisição:', error)
    // Fallback: usar timestamp para garantir unicidade
    const timestamp = Date.now().toString().slice(-4)
    return `SCO-AL-0000-${timestamp}`
  }
}
