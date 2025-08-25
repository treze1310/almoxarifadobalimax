import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function useRobustSupabase() {
  const { toast } = useToast()

  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    showToast = true
  ): Promise<T> => {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        return result
      } catch (error: any) {
        lastError = error
        
        const isNetworkError = error?.message?.includes('Failed to fetch') ||
                              error?.message?.includes('Network') ||
                              error?.message?.includes('timeout') ||
                              error?.code === 'PGRST301'
        
        const isAuthError = error?.message?.includes('JWT') ||
                           error?.message?.includes('session') ||
                           error?.message?.includes('expired') ||
                           error?.code === 'PGRST102'
        
        if ((isNetworkError || isAuthError) && attempt < maxRetries) {
          console.log(`🔄 Operation retry ${attempt}/${maxRetries} (${isAuthError ? 'auth' : 'network'} error)...`)
          
          // Para erros de auth, tentar refresh da sessão
          if (isAuthError) {
            try {
              await supabase.auth.refreshSession()
              console.log('✅ Session refreshed, retrying operation...')
            } catch (refreshError) {
              console.warn('⚠️ Session refresh failed:', refreshError)
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          continue
        }
        
        // Se não é erro recuperável ou esgotaram as tentativas, relançar o erro
        break
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    if (showToast) {
      const isAuthError = lastError?.message?.includes('JWT') ||
                         lastError?.message?.includes('session') ||
                         lastError?.message?.includes('expired')
      
      toast({
        title: isAuthError ? 'Sessão expirada' : 'Erro de conectividade',
        description: isAuthError ? 'Faça login novamente para continuar.' : 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    }
    
    throw lastError
  }

  const query = async <T>(queryFn: () => Promise<{ data: T | null; error: any }>) => {
    return executeWithRetry(async () => {
      // Verificar se temos uma sessão válida antes de fazer a query
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('⚠️ No valid session found, attempting refresh...')
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Session expired - please login again')
        }
        
        console.log('✅ Session refreshed before query')
      }
      
      const result = await queryFn()
      if (result.error) throw result.error
      return result.data
    })
  }

  const mutate = async <T>(mutateFn: () => Promise<{ data: T | null; error: any }>) => {
    return executeWithRetry(async () => {
      // Verificar se temos uma sessão válida antes de fazer a mutação
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('⚠️ No valid session found for mutation, attempting refresh...')
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Session expired - please login again')
        }
        
        console.log('✅ Session refreshed before mutation')
      }
      
      const result = await mutateFn()
      if (result.error) throw result.error
      return result.data
    })
  }

  return {
    executeWithRetry,
    query,
    mutate,
    supabase
  }
}