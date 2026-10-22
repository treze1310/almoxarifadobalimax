import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ModuloSistema, PermissoesPerfil, TipoPermissao } from '@/types/perfil'

export interface UsuarioAtual {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
  perfil_acesso_id: string | null
  perfilNome: string | null
}

interface PermissionsContextType {
  /**
   * Primeira carga, quando ainda não há permissão nenhuma. É a única que pode
   * bloquear a tela: recarga em segundo plano mantém o que já está na mão.
   */
  loading: boolean
  /** Recarregando por trás, com as permissões atuais ainda valendo */
  refreshing: boolean
  usuario: UsuarioAtual | null
  permissoes: PermissoesPerfil
  /** Nome do perfil de acesso vinculado (ou rótulo do fallback) */
  perfilNome: string
  isAdmin: boolean
  can: (modulo: ModuloSistema | string, acao?: TipoPermissao) => boolean
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

/**
 * Permissões usadas quando o usuário não tem perfil de acesso vinculado:
 * somente leitura, sem acesso a usuários e configurações.
 */
const FALLBACK_SOMENTE_LEITURA: PermissoesPerfil = {
  dashboard: { read: true },
  materiais: { read: true },
  estoque: { read: true },
  epi: { read: true },
  romaneios: { read: true },
  solicitacoes: { read: true },
  relatorios: { read: true },
  empresas: { read: true },
  fornecedores: { read: true },
  colaboradores: { read: true },
  centros_custo: { read: true },
  marcas: { read: true },
  localizacao: { read: true },
  nfe: { read: true },
  usuarios: {},
  configuracoes: {},
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { userId, user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null)
  const [permissoes, setPermissoes] = useState<PermissoesPerfil>({})

  /**
   * De quem são as permissões que já estão carregadas.
   *
   * Recarregar para o mesmo usuário é recarga em segundo plano e não pode
   * piscar `loading`: era esse pisca, a cada evento de auth (aba voltando a
   * ficar visível, token renovado, outra aba renovando), que fazia o guard de
   * rota desmontar a tela e apagar o que estava preenchido.
   */
  const donoDasPermissoes = useRef<string | null>(null)
  const email = user?.email ?? null

  const carregar = useCallback(async () => {
    if (!userId) {
      donoDasPermissoes.current = null
      setUsuario(null)
      setPermissoes({})
      setLoading(false)
      setRefreshing(false)
      return
    }

    const jaTemDesteUsuario = donoDasPermissoes.current === userId
    if (jaTemDesteUsuario) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // O vínculo preferencial é por auth_user_id; o e-mail serve de fallback
      // para registros antigos que ainda não foram vinculados ao Auth.
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, email, perfil, ativo, perfil_acesso_id, perfis_acesso:perfil_acesso_id(nome, permissoes, ativo)')
        .or(`auth_user_id.eq.${userId},email.eq.${email}`)
        .order('auth_user_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (!data) {
        donoDasPermissoes.current = null
        setUsuario(null)
        setPermissoes({})
        return
      }

      donoDasPermissoes.current = userId

      const perfilVinculado = (data as any).perfis_acesso as
        | { nome: string; permissoes: PermissoesPerfil; ativo: boolean }
        | null

      setUsuario({
        id: data.id,
        nome: data.nome,
        email: data.email,
        perfil: data.perfil,
        ativo: data.ativo !== false,
        perfil_acesso_id: data.perfil_acesso_id,
        perfilNome: perfilVinculado?.nome ?? null,
      })

      if (perfilVinculado?.ativo && perfilVinculado.permissoes) {
        setPermissoes(perfilVinculado.permissoes)
      } else {
        setPermissoes(FALLBACK_SOMENTE_LEITURA)
      }
    } catch (error) {
      console.error('Erro ao carregar permissões do usuário:', error)
      // Numa recarga que falhou, o que já estava valendo continua valendo:
      // derrubar o usuário para somente leitura por causa de uma falha de rede
      // momentânea tiraria acesso no meio do trabalho.
      if (donoDasPermissoes.current !== userId) {
        setPermissoes(FALLBACK_SOMENTE_LEITURA)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId, email])

  useEffect(() => {
    if (!authLoading) carregar()
  }, [authLoading, carregar])

  // Administrador legado (coluna "perfil") continua com acesso total,
  // garantindo que nunca se perca o acesso à gestão de perfis e usuários.
  const isAdmin = useMemo(
    () => usuario?.perfilNome === 'Administrador' || usuario?.perfil === 'administrador',
    [usuario]
  )

  const can = useCallback(
    (modulo: ModuloSistema | string, acao: TipoPermissao = 'read') => {
      if (isAdmin) return true
      if (!usuario?.ativo) return false
      return !!permissoes[modulo]?.[acao]
    },
    [isAdmin, permissoes, usuario]
  )

  const value: PermissionsContextType = useMemo(() => ({
    // Só a primeira carga bloqueia; `refreshing` fica à disposição de quem
    // quiser mostrar um indicador discreto.
    loading: loading || authLoading,
    refreshing,
    usuario,
    permissoes,
    perfilNome: usuario?.perfilNome || (isAdmin ? 'Administrador' : 'Sem perfil (somente leitura)'),
    isAdmin,
    can,
    refresh: carregar,
  }), [loading, authLoading, refreshing, usuario, permissoes, isAdmin, can, carregar])

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissoes() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissoes deve ser usado dentro de um PermissionsProvider')
  }
  return context
}
