import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissoes } from '@/contexts/PermissionsContext'
import type { ModuloSistema, TipoPermissao } from '@/types/perfil'

interface RequirePermissionProps {
  modulo: ModuloSistema | string
  acao?: TipoPermissao
  children: React.ReactNode
}

/**
 * Bloqueia o conteúdo de uma rota quando o perfil de acesso do usuário não
 * possui a permissão exigida.
 */
const RequirePermission: React.FC<RequirePermissionProps> = ({
  modulo,
  acao = 'read',
  children,
}) => {
  const { can, loading, perfilNome } = usePermissoes()

  /**
   * Tela que já apareceu não volta para o spinner.
   *
   * Era daqui que vinha o "refresh" ao alternar de aba: um evento de auth
   * fazia as permissões recarregarem, `loading` voltava a `true` e este guard
   * desmontava a tela — levando com ela o formulário preenchido, a etapa do
   * wizard e os itens bipados. Hoje `loading` é só a primeira carga, e esta
   * trava garante que uma recarga nunca derrube o que está na tela.
   */
  const jaLiberado = useRef(false)

  if (loading && !jaLiberado.current) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!can(modulo, acao)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Acesso não autorizado</h2>
          <p className="text-sm text-muted-foreground">
            Seu perfil ({perfilNome}) não tem permissão para acessar esta tela.
            <br />
            Fale com um administrador se precisar deste acesso.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Voltar ao início</Link>
        </Button>
      </div>
    )
  }

  jaLiberado.current = true

  return <>{children}</>
}

export default RequirePermission
