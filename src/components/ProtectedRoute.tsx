import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserPermissions } from '@/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: keyof UserPermissions
  requiredPermissions?: (keyof UserPermissions)[]
  requireAll?: boolean
  allowedProfiles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  allowedProfiles
}) => {
  const { user, usuario, loading, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Verificar se o usuário está ativo
  if (usuario && !usuario.ativo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Conta Desativada</h2>
          <p className="text-muted-foreground">Sua conta foi desativada. Entre em contato com o administrador.</p>
        </div>
      </div>
    )
  }

  // Verificar perfis permitidos
  if (allowedProfiles && usuario && !allowedProfiles.includes(usuario.perfil)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  // Verificar permissão única
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  // Verificar múltiplas permissões
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission))

    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Acesso Negado</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}