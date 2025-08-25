import { useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

/**
 * 🔄 Hook para recuperação automática de autenticação
 * Monitora e restaura sessões perdidas durante operações longas
 */
export const useAuthRecovery = () => {
  const { user, session } = useAuth()

  // 🔄 Forçar refresh da sessão se necessário
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 Attempting to refresh session...')
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Session refresh failed:', error.message)
        return false
      }

      if (data.session) {
        console.log('✅ Session refreshed successfully')
        return true
      }

      console.warn('⚠️ No session returned from refresh')
      return false
    } catch (error) {
      console.error('❌ Unexpected error during session refresh:', error)
      return false
    }
  }, [])

  // 🔍 Verificar se a sessão está válida
  const isSessionValid = useCallback((): boolean => {
    if (!session) {
      console.warn('⚠️ No active session')
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at || 0

    if (now >= expiresAt) {
      console.warn('⚠️ Session expired')
      return false
    }

    const timeUntilExpiry = expiresAt - now
    if (timeUntilExpiry < 300) { // Menos de 5 minutos
      console.warn('⚠️ Session expires soon, should refresh')
      return false
    }

    return true
  }, [session])

  // 🚨 Recuperar sessão automaticamente se perdida
  const recoverSession = useCallback(async (): Promise<boolean> => {
    console.log('🚨 Attempting session recovery...')

    // Verificar se ainda temos um usuário mas sessão inválida
    if (user && !isSessionValid()) {
      const recovered = await refreshSession()
      if (recovered) {
        console.log('✅ Session recovered successfully')
        return true
      }
    }

    // Tentar recuperar sessão existente
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Failed to get session:', error.message)
        return false
      }

      if (data.session) {
        console.log('✅ Active session found')
        return true
      }

      console.warn('⚠️ No active session found')
      return false
    } catch (error) {
      console.error('❌ Session recovery failed:', error)
      return false
    }
  }, [user, isSessionValid, refreshSession])

  // 🔄 Auto-refresh preventivo da sessão
  useEffect(() => {
    if (!session) return

    const timeUntilExpiry = (session.expires_at || 0) - Math.floor(Date.now() / 1000)
    
    // Se expira em menos de 10 minutos, configurar refresh preventivo
    if (timeUntilExpiry > 0 && timeUntilExpiry < 600) {
      const refreshTime = Math.max(timeUntilExpiry - 300, 60) * 1000 // 5 min antes ou 1 min mínimo

      console.log(`🔄 Scheduling preventive session refresh in ${refreshTime/1000}s`)
      
      const timeoutId = setTimeout(() => {
        refreshSession()
      }, refreshTime)

      return () => clearTimeout(timeoutId)
    }
  }, [session, refreshSession])

  // 📡 Monitorar eventos de rede para reautenticação
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network restored, checking session...')
      recoverSession()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab became visible, checking session...')
        recoverSession()
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [recoverSession])

  return {
    isSessionValid,
    refreshSession,
    recoverSession,
    hasValidSession: !!session && isSessionValid()
  }
}

export default useAuthRecovery
