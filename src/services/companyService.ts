import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export interface CompanyWithLogo extends Tables<'empresas'> {
  logo_url?: string
}

export const companyService = {
  async getActiveCompany(): Promise<CompanyWithLogo | null> {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('ativo', true)
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data
  },

  async getCompanyById(id: string): Promise<CompanyWithLogo | null> {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return data
  },

  async getUserWithPhoto(userId: string): Promise<{ nome: string; foto_url?: string } | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('nome, foto_url')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data
  }
}