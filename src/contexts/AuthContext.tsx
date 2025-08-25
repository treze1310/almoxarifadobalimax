import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User, UserProfile, UserPermissions, PROFILE_PERMISSIONS } from '@/types/auth'
import { PermissoesPerfil } from '@/types/perfil'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

interface AuthContextType {
  user: SupabaseUser | null
  usuario: User | null
  session: Session | null
  loading: boolean
  connectionError: boolean
  retryAttempts: number
  
  // Permissões
  permissions: UserPermissions
  hasPermission: (permission: keyof UserPermissions) => boolean
  isAdmin: boolean
  isAlmoxarife: boolean
  isSupervisor: boolean
  
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, nome: string, perfil?: UserProfile) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  refreshUsuario: () => Promise<void>
  updateLastAccess: () => Promise<void>
  testConnection: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Função para converter permissões do perfil personalizado para UserPermissions
const convertCustomPermissions = (customPermissions: PermissoesPerfil): UserPermissions => {
  return {
    // Dashboard
    dashboard_view: customPermissions.dashboard?.read || false,
    
    // Materiais e Equipamentos
    materiais_view: customPermissions.materiais?.read || false,
    materiais_create: customPermissions.materiais?.create || false,
    materiais_edit: customPermissions.materiais?.update || false,
    materiais_delete: customPermissions.materiais?.delete || false,
    materiais_export: customPermissions.materiais?.export || false,
    
    // Estoque
    estoque_view: customPermissions.estoque?.read || false,
    estoque_movimentar: customPermissions.estoque?.create || false,
    estoque_ajustar: customPermissions.estoque?.update || false,
    estoque_inventario: customPermissions.estoque?.manage || false,
    
    // Romaneios
    romaneios_view: customPermissions.romaneios?.read || false,
    romaneios_create: customPermissions.romaneios?.create || false,
    romaneios_edit: customPermissions.romaneios?.update || false,
    romaneios_delete: customPermissions.romaneios?.delete || false,
    romaneios_approve: customPermissions.romaneios?.approve || false,
    romaneios_receive: customPermissions.romaneios?.manage || false,
    
    // Solicitações
    solicitacoes_view: customPermissions.solicitacoes?.read || false,
    solicitacoes_create: customPermissions.solicitacoes?.create || false,
    solicitacoes_edit: customPermissions.solicitacoes?.update || false,
    solicitacoes_delete: customPermissions.solicitacoes?.delete || false,
    solicitacoes_approve: customPermissions.solicitacoes?.approve || false,
    
    // Relatórios
    relatorios_view: customPermissions.relatorios?.read || false,
    relatorios_export: customPermissions.relatorios?.export || false,
    relatorios_financeiros: customPermissions.relatorios?.manage || false,
    
    // Cadastros Auxiliares
    cadastros_view: (customPermissions.empresas?.read || customPermissions.fornecedores?.read || customPermissions.colaboradores?.read) || false,
    cadastros_edit: (customPermissions.empresas?.update || customPermissions.fornecedores?.update || customPermissions.colaboradores?.update) || false,
    
    // Usuários e Configurações
    usuarios_view: customPermissions.usuarios?.read || false,
    usuarios_create: customPermissions.usuarios?.create || false,
    usuarios_edit: customPermissions.usuarios?.update || false,
    usuarios_delete: customPermissions.usuarios?.delete || false,
    configuracoes_edit: customPermissions.configuracoes?.update || false,
    
    // Aprovações
    aprovacoes_compras: customPermissions.materiais?.approve || false,
    aprovacoes_descarte: customPermissions.materiais?.manage || false,
    
    // Auditorias
    auditoria_view: customPermissions.relatorios?.manage || false,
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [usuario, setUsuario] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [retryAttempts, setRetryAttempts] = useState(0)

  // Função simplificada para testar conectividade apenas quando necessário
  const testConnection = async (): Promise<boolean> => {
    try {
      // Fazer uma query simples e rápida
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const isConnected = response.status < 500 // Qualquer coisa exceto erro de servidor
      
      if (isConnected) {
        setConnectionError(false)
      }
      
      return isConnected
    } catch (error: any) {
      console.debug('🔗 Connection test failed, but continuing...', error.message)
      
      // Para qualquer erro, deixar o Supabase lidar com retry interno
      // Não marcar como erro de conexão para não confundir o usuário
      return true
    }
  }

  // Função para buscar usuário por email (para casos sem auth)
  const loadUsuarioByEmail = async (email: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('usuarios').select(`
        *,
        centros_custo:centro_custo_id (
          id,
          codigo,
          descricao
        ),
        perfil_personalizado:perfis_acesso(nome, descricao, permissoes)
      `).eq('email', email).eq('ativo', true).single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error)
      return null
    }
  }

  const loadUsuarioFromDatabase = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('👤 Loading user profile...')
      
      // Primeiro tentar buscar por auth_user_id
      let { data, error } = await supabase.from('usuarios').select(`
        *,
        centros_custo:centro_custo_id (
          id,
          codigo,
          descricao
        ),
        perfil_personalizado:perfis_acesso(nome, descricao, permissoes)
      `).eq('auth_user_id', authUser.id).eq('ativo', true).single()

      // Se não encontrou por auth_user_id, tentar por email
      if (error || !data) {
        console.log('🔍 Trying to find user by email...')
        const userData = await loadUsuarioByEmail(authUser.email!)
        if (userData) {
          // Atualizar o auth_user_id do usuário encontrado
          await supabase.from('usuarios')
            .update({ auth_user_id: authUser.id })
            .eq('id', userData.id)
          
          console.log('✅ User linked to auth')
          return { ...userData, auth_user_id: authUser.id }
        }
      } else {
        console.log('✅ User profile loaded')
        return data
      }

      // Se não encontrou o usuário, retornar null em vez de criar
      if (error || !data) {
        console.log('❌ User not found in database')
        return null
      }

      return data
    } catch (error) {
      console.error('⚠️ User profile load failed:', error)
      return null
    }
  }

  const refreshUsuario = async () => {
    if (user) {
      const usuario = await loadUsuarioFromDatabase(user)
      setUsuario(usuario)
    }
  }

  // Função para verificar e restaurar sessão expirada
  const restoreSession = async (): Promise<boolean> => {
    try {
      console.log('🔄 Attempting to restore session...')
      
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error || !session) {
        console.log('❌ Session restore failed:', error?.message)
        return false
      }
      
      console.log('✅ Session restored successfully')
      setSession(session)
      setUser(session.user)
      setConnectionError(false)
      
      if (session.user) {
        const usuario = await loadUsuarioFromDatabase(session.user)
        setUsuario(usuario)
      }
      
      return true
    } catch (error) {
      console.error('💥 Session restore error:', error)
      return false
    }
  }

  const updateLastAccess = async () => {
    if (user) {
      try {
        await supabase.rpc('update_user_last_access', { user_id: user.id })
      } catch (error) {
        console.error('Erro ao atualizar último acesso:', error)
      }
    }
  }

  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const maxRetries = 3
    const controller = new AbortController()
    let connectionMonitor: NodeJS.Timeout | null = null
    
    const initializeAuth = async () => {
      if (!isMounted) return
      
      try {
        console.log('🚀 Initializing authentication...')
        
        // Não testar conectividade na inicialização - confiar no Supabase
        // O teste de conexão será feito apenas durante o monitoramento
        
        // Debug: listar todas as chaves de auth no localStorage
        const allKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'))
        console.log('🗂️ All auth keys:', allKeys)
        
        // Tentar usar a sessão existente
        let sessionResult
        try {
          console.log('🔐 Getting current session...')
          sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Auth timeout')), 10000)
            )
          ]) as any
          
          console.log('📋 Session result:', {
            hasSession: !!sessionResult?.data?.session,
            hasUser: !!sessionResult?.data?.session?.user,
            hasAccessToken: !!sessionResult?.data?.session?.access_token,
            error: sessionResult?.error?.message
          })
        } catch (authError) {
          console.log('🔄 Session recovery failed, trying again...')
          if (retryCount < maxRetries) {
            retryCount++
            setRetryAttempts(retryCount)
            setTimeout(initializeAuth, 2000 * retryCount)
            return
          }
          throw authError
        }
        
        let { data: { session }, error } = sessionResult
        
        if (!isMounted || controller.signal.aborted) return
        
        if (error && error.message !== 'Auth timeout') {
          console.error('❌ Auth error:', error)
        }
        
        // Verificar se a sessão é válida (não expirada)
        if (session) {
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = session.expires_at || 0
          
          if (expiresAt <= now) {
            console.log('⏰ Session is expired, attempting refresh...')
            const restored = await restoreSession()
            if (!restored) {
              console.log('❌ Could not restore expired session')
              setSession(null)
              setUser(null)
              setUsuario(null)
              setLoading(false)
              setConnectionError(true)
              return
            }
            // Se restaurou com sucesso, usar a nova sessão
            const { data: { session: newSession } } = await supabase.auth.getSession()
            session = newSession
          }
        }

        console.log('📋 Session status:', session ? '✅ Active' : '❌ None')
        setSession(session)
        setUser(session?.user ?? null)
        setConnectionError(false)
        setRetryAttempts(0)
        
        if (session?.user && isMounted) {
          try {
            const usuario = await loadUsuarioFromDatabase(session.user)
            
            if (isMounted && !controller.signal.aborted) {
              setUsuario(usuario)
              updateLastAccess()
            }
          } catch (userError) {
            console.warn('⚠️ Failed to load user profile:', userError)
            if (isMounted) {
              setUsuario(null)
            }
          }
        } else {
          setUsuario(null)
        }
        
        if (isMounted) {
          setLoading(false)
        }
        console.log('🎉 Auth initialization complete')
        
        // O Supabase já cuida do refresh automático de tokens
        // Não precisamos de monitoramento adicional
        console.log('🔄 Supabase auto-refresh enabled, no additional monitoring needed')
        
      } catch (error) {
        console.error('💥 Auth initialization error:', error)
        if (isMounted && !controller.signal.aborted) {
          if (retryCount < maxRetries) {
            retryCount++
            setRetryAttempts(retryCount)
            console.log(`🔄 Retrying auth (${retryCount}/${maxRetries})...`)
            setTimeout(initializeAuth, 2000 * retryCount)
          } else {
            console.log('🛑 Auth initialization failed, proceeding without session...')
            setSession(null)
            setUser(null)
            setUsuario(null)
            setLoading(false)
            setConnectionError(true)
            setRetryAttempts(0)
          }
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      console.log('🔄 Auth state changed:', event, session ? '✅ Session' : '❌ No session')
      
      try {
        setSession(session)
        setUser(session?.user ?? null)
        setConnectionError(false)
        setRetryAttempts(0)
        
        if (session?.user) {
          const usuario = await loadUsuarioFromDatabase(session.user)
          setUsuario(usuario)
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            updateLastAccess()
            console.log('🔑 Session refreshed or signed in, updating last access')
          }
        } else {
          setUsuario(null)
          
          // Se perdeu a sessão, tentar restaurar
          if (event === 'SIGNED_OUT' && user) {
            console.log('🔄 Session lost, attempting restore...')
            setTimeout(async () => {
              if (isMounted) {
                await restoreSession()
              }
            }, 1000)
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error('❌ Auth state change error:', error)
        setLoading(false)
      }
    })

    // Monitor simplificado apenas para visibilidade da página
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        console.log('👁️ Page visible again, refreshing user data...')
        refreshUsuario()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Monitor básico de conectividade
    const handleOnline = () => {
      console.log('🌐 Back online')
      setConnectionError(false)
    }

    const handleOffline = () => {
      console.log('📴 Offline detected') 
      setConnectionError(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      isMounted = false
      controller.abort()
      subscription.unsubscribe()
      if (connectionMonitor) clearInterval(connectionMonitor)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    console.log('🔐 Signing in...')
    
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign in timeout')), 20000)
        )
      ]) as any

      const { error } = result
      
      if (error) {
        console.error('❌ Sign in failed:', error)
        setLoading(false)
      } else {
        console.log('✅ Sign in successful')
      }
      return { error }
    } catch (error: any) {
      console.error('💥 Sign in error:', error)
      setLoading(false)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, nome: string, perfil: UserProfile = 'solicitante') => {
    setLoading(true)
    console.log('📝 Signing up...')
    
    try {
      const result = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: { data: { nome, perfil } },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign up timeout')), 20000)
        )
      ]) as any

      const { error } = result
      
      if (error) {
        console.error('❌ Sign up failed:', error)
        setLoading(false)
      } else {
        console.log('✅ Sign up successful')
      }
      return { error }
    } catch (error: any) {
      console.error('💥 Sign up error:', error)
      setLoading(false)
      return { error }
    }
  }

  const signOut = async () => {
    setLoading(true)
    console.log('🚪 Signing out...')
    
    try {
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 10000)
        )
      ]) as any
      
      if (error) {
        console.error('❌ Sign out error:', error)
      } else {
        console.log('✅ Sign out successful')
      }
      
      // Clear state regardless of error
      setUser(null)
      setUsuario(null)
      setSession(null)
      setLoading(false)
      
      return { error }
    } catch (error: any) {
      console.error('💥 Sign out error:', error)
      // Force clear state
      setUser(null)
      setUsuario(null)
      setSession(null)
      setLoading(false)
      return { error }
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  // Calcular permissões baseadas no perfil (personalizado ou padrão)
  const permissions: UserPermissions = (() => {
    if (!usuario) return PROFILE_PERMISSIONS.visualizador
    
    // Se o usuário tem um perfil personalizado, usar suas permissões
    if ((usuario as any).perfil_personalizado && (usuario as any).perfil_acesso_id) {
      // Buscar o perfil personalizado completo
      const perfilPersonalizado = (usuario as any).perfil_personalizado
      if (perfilPersonalizado && perfilPersonalizado.permissoes) {
        return convertCustomPermissions(perfilPersonalizado.permissoes)
      }
    }
    
    // Caso contrário, usar o perfil padrão
    return PROFILE_PERMISSIONS[usuario.perfil] || PROFILE_PERMISSIONS.visualizador
  })()

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions[permission] || false
  }

  const isAdmin = usuario?.perfil === 'administrador'
  const isAlmoxarife = usuario?.perfil === 'almoxarife'
  const isSupervisor = usuario?.perfil === 'supervisor'

  const value = {
    user,
    usuario,
    session,
    loading,
    connectionError,
    retryAttempts,
    permissions,
    hasPermission,
    isAdmin,
    isAlmoxarife,
    isSupervisor,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshUsuario,
    updateLastAccess,
    testConnection,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}