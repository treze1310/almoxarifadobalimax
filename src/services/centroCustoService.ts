import { supabase } from '@/lib/supabase'

export interface CentroCustoCodeInfo {
  codigo: string
  nextSequence: number
}

export async function generateCentroCustoCode(): Promise<CentroCustoCodeInfo> {
  const today = new Date()
  const year = today.getFullYear().toString().slice(-2) // Last 2 digits of year
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  const datePrefix = `${year}${month}${day}`
  
  try {
    // Get the highest sequence number for today's date
    const { data: existingCodes, error } = await supabase
      .from('centros_custo')
      .select('codigo')
      .like('codigo', `${datePrefix}%`)
      .order('codigo', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error fetching existing cost center codes:', error)
      throw new Error('Failed to generate cost center code')
    }
    
    let nextSequence = 1495 // Starting from the current sequence + 1
    
    // If there are existing codes for today, extract the sequence and increment
    if (existingCodes && existingCodes.length > 0) {
      const latestCode = existingCodes[0].codigo
      // Extract the last 4 digits (sequence) from the code
      const currentSequence = parseInt(latestCode.slice(-4), 10)
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1
      }
    } else {
      // If no codes for today, check the global highest sequence
      const { data: allCodes, error: allError } = await supabase
        .from('centros_custo')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1)
      
      if (allError) {
        console.error('Error fetching all cost center codes:', allError)
        throw new Error('Failed to generate cost center code')
      }
      
      if (allCodes && allCodes.length > 0) {
        const latestGlobalCode = allCodes[0].codigo
        const globalSequence = parseInt(latestGlobalCode.slice(-4), 10)
        if (!isNaN(globalSequence)) {
          nextSequence = globalSequence + 1
        }
      }
    }
    
    // Generate the new code: AAMMDDXXXX
    const newCode = `${datePrefix}${nextSequence.toString().padStart(4, '0')}`
    
    return {
      codigo: newCode,
      nextSequence
    }
  } catch (error) {
    console.error('Error generating cost center code:', error)
    throw new Error('Failed to generate cost center code')
  }
}

export async function validateCentroCustoCode(codigo: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('centros_custo')
      .select('id')
      .eq('codigo', codigo)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // No matching rows found - code is available
      return true
    }
    
    if (error) {
      console.error('Error validating cost center code:', error)
      return false
    }
    
    // Code already exists
    return false
  } catch (error) {
    console.error('Error validating cost center code:', error)
    return false
  }
}