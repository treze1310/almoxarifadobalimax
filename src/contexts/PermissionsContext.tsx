import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  loading: boolean
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
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null)
  const [permissoes, setPermissoes] = useState<PermissoesPerfil>({})

  const carregar = useCallback(async () => {
    if (!user) {
      setUsuario(null)
      setPermissoes({})
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // O vínculo preferencial é por auth_user_id; o e-mail serve de fallback
      // para registros antigos que ainda não foram vinculados ao Auth.
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, email, perfil, ativo, perfil_acesso_id, perfis_acesso:perfil_acesso_id(nome, permissoes, ativo)')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .order('auth_user_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (!data) {
        setUsuario(null)
        setPermissoes({})
        return
      }

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
      setPermissoes(FALLBACK_SOMENTE_LEITURA)
    } finally {
      setLoading(false)
    }
  }, [user])

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

  const value: PermissionsContextType = {
    loading: loading || authLoading,
    usuario,
    permissoes,
    perfilNome: usuario?.perfilNome || (isAdmin ? 'Administrador' : 'Sem perfil (somente leitura)'),
    isAdmin,
    can,
    refresh: carregar,
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissoes() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissoes deve ser usado dentro de um PermissionsProvider')
  }
  return context
}
