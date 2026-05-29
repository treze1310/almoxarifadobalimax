import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type CompanyWithLogo = Tables<'empresas'>

type QueryFunction = <T>(queryFn: () => PromiseLike<{ data: T | null; error: any }>) => Promise<T>

// 🔥 Cache para evitar múltiplas requisições simultâneas
class CompanyCache {
  private cache = new Map<string, { data: CompanyWithLogo; timestamp: number }>()
  private pendingRequests = new Map<string, Promise<CompanyWithLogo | null>>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TTL
  }

  get(key: string): CompanyWithLogo | null {
    const cached = this.cache.get(key)
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data
    }
    if (cached) {
      this.cache.delete(key) // Remove cache expirado
    }
    return null
  }

  set(key: string, data: CompanyWithLogo): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  getPendingRequest(key: string): Promise<CompanyWithLogo | null> | null {
    return this.pendingRequests.get(key) || null
  }

  setPendingRequest(key: string, promise: Promise<CompanyWithLogo | null>): void {
    this.pendingRequests.set(key, promise)
    // Auto cleanup quando a promise resolver
    promise.finally(() => {
      this.pendingRequests.delete(key)
    })
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }
}

const companyCache = new CompanyCache()

export const companyService = {
  async getActiveCompany(queryFn?: QueryFunction): Promise<CompanyWithLogo | null> {
    const cacheKey = 'active-company'
    
    // 🚀 Verificar cache primeiro
    const cached = companyCache.get(cacheKey)
    if (cached) {
      console.log('✅ Company cache hit')
      return cached
    }

    // 🔄 Verificar se já há uma requisição pendente
    const pending = companyCache.getPendingRequest(cacheKey)
    if (pending) {
      console.log('⏳ Company request already pending, waiting...')
      return pending
    }

    // 🔥 Criar nova requisição com timeout e retry
    const requestPromise = (async (): Promise<CompanyWithLogo | null> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      try {
        console.log('🔄 Fetching active company...')
        
        if (queryFn) {
          const data = await queryFn(() =>
            supabase
              .from('empresas')
              .select('*')
              .eq('ativo', true)
              .order('emitente', { ascending: false })
              .limit(1)
              .abortSignal(controller.signal)
              .single()
          )
          if (data) {
            companyCache.set(cacheKey, data)
            console.log('✅ Company loaded via queryFn and cached')
          }
          return data || null
        }

        const { data, error } = await supabase
          .from('empresas')
          .select('*')
          .eq('ativo', true)
          .order('emitente', { ascending: false })
          .limit(1)
          .abortSignal(controller.signal)
          .single()

        if (error || !data) {
          console.warn('⚠️ No active company found:', error?.message)
          return null
        }

        companyCache.set(cacheKey, data)
        console.log('✅ Company loaded and cached')
        return data
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('🚫 Company request timeout')
        } else {
          console.error('❌ Error fetching active company:', error)
        }
        return null
      } finally {
        clearTimeout(timeoutId)
      }
    })()

    companyCache.setPendingRequest(cacheKey, requestPromise)
    return requestPromise
  },

  async getCompanyById(id: string, queryFn?: QueryFunction): Promise<CompanyWithLogo | null> {
    try {
      if (queryFn) {
        const data = await queryFn(() =>
          supabase
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single()
        )
        return data || null
      }

      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar empresa por ID:', error)
      return null
    }
  },

  async getUserWithPhoto(userId: string, queryFn?: QueryFunction): Promise<{ nome: string; foto_url?: string } | null> {
    try {
      if (queryFn) {
        const data = await queryFn(() =>
          supabase
            .from('usuarios')
            .select('nome, foto_url')
            .eq('id', userId)
            .single()
        )
        return data || null
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('nome, foto_url')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar usuário com foto:', error)
      return null
    }
  },

  // 🧹 Método para limpar cache (útil quando dados da empresa são atualizados)
  clearCache(): void {
    companyCache.clear()
    console.log('🧹 Company cache cleared')
  }
}