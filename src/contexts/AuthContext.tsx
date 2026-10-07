import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

/**
 * Encerra a sessao apos este tempo sem interacao do usuario. Protege o caso de
 * computador compartilhado no almoxarifado, onde a sessao ficava aberta
 * indefinidamente (persistSession + autoRefreshToken).
 */
const INATIVIDADE_MAXIMA_MS = 30 * 60 * 1000
const EVENTOS_DE_ATIVIDADE = ['mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange']

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  /**
   * RF-07: o toast de boas-vindas só deve aparecer quando o usuário realmente
   * faz login. O evento SIGNED_IN também dispara ao restaurar a sessão a cada
   * recarga de página, e era por isso que o aviso reaparecia sozinho.
   */
  const loginExplicito = useRef(false)

  useEffect(() => {
    // Limpar qualquer sessão local antiga
    localStorage.removeItem('local_user_session')

    // Buscar sessão Supabase atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && loginExplicito.current) {
          loginExplicito.current = false
          toast({
            title: 'Login realizado com sucesso!',
            description: 'Bem-vindo ao sistema.',
          })
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: 'Logout realizado',
            description: 'Você foi desconectado do sistema.',
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [toast])

  // Logout automatico por inatividade
  useEffect(() => {
    if (!user) return

    let timer: number

    const encerrarPorInatividade = async () => {
      await supabase.auth.signOut()
      toast({
        title: 'Sessão encerrada',
        description: 'Você ficou 30 minutos sem atividade. Entre novamente para continuar.',
      })
    }

    const reagendar = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(encerrarPorInatividade, INATIVIDADE_MAXIMA_MS)
    }

    reagendar()
    EVENTOS_DE_ATIVIDADE.forEach((evento) =>
      window.addEventListener(evento, reagendar, { passive: true }),
    )

    return () => {
      window.clearTimeout(timer)
      EVENTOS_DE_ATIVIDADE.forEach((evento) => window.removeEventListener(evento, reagendar))
    }
  }, [user, toast])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      loginExplicito.current = true

      // Login via Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        let errorMessage = 'Erro ao fazer login'

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos.'
        }

        loginExplicito.current = false
        return { error: errorMessage }
      }

      if (!data.user) {
        loginExplicito.current = false
        return { error: 'Usuário não encontrado' }
      }

      return { error: null }
    } catch (error) {
      console.error('Erro durante o login:', error)
      return { error: 'Erro interno do servidor' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * "Auth session missing" quer dizer que já não havia sessão para encerrar —
   * a sessão expirou, o token foi renovado em outra aba ou a inatividade já
   * tinha deslogado. O resultado que a pessoa queria (sair) já é verdade, e
   * mostrar erro vermelho nesse caso só assusta.
   */
  const sessaoJaEncerrada = (mensagem?: string) =>
    /session (missing|not found)|sessão não encontrada/i.test(mensagem ?? '')

  const signOut = async () => {
    try {
      setLoading(true)

      const { error } = await supabase.auth.signOut()

      if (error && !sessaoJaEncerrada(error.message)) {
        toast({
          title: 'Erro ao fazer logout',
          description: error.message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : ''
      if (!sessaoJaEncerrada(mensagem)) {
        console.error('Erro durante o logout:', error)
        toast({
          title: 'Erro ao fazer logout',
          description: 'Ocorreu um erro inesperado',
          variant: 'destructive',
        })
      }
    } finally {
      // Sem sessão no servidor não chega evento de mudança de autenticação,
      // então a tela ficaria presa como se ainda estivesse logada.
      setUser(null)
      setSession(null)
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
