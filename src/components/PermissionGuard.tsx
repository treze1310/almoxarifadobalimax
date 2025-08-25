import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserPermissions } from '@/types/auth'

interface PermissionGuardProps {
  permission: keyof UserPermissions
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean // Se true, requer todas as permissões; se false, requer pelo menos uma
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission } = useAuth()

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface MultiPermissionGuardProps {
  permissions: (keyof UserPermissions)[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean // Se true, requer todas as permissões; se false, requer pelo menos uma
}

export function MultiPermissionGuard({ 
  permissions, 
  children, 
  fallback = null,
  requireAll = false 
}: MultiPermissionGuardProps) {
  const { hasPermission } = useAuth()

  const hasRequiredPermissions = requireAll
    ? permissions.every(permission => hasPermission(permission))
    : permissions.some(permission => hasPermission(permission))

  if (!hasRequiredPermissions) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Componente para mostrar conteúdo baseado no perfil do usuário
interface ProfileGuardProps {
  profiles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function ProfileGuard({ 
  profiles, 
  children, 
  fallback = null 
}: ProfileGuardProps) {
  const { usuario } = useAuth()

  if (!usuario || !profiles.includes(usuario.perfil)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Componente para exibir conteúdo apenas para administradores
interface AdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminGuard({ children, fallback = null }: AdminGuardProps) {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Componente para mostrar diferentes conteúdos baseados no nível de acesso
interface AccessLevelProps {
  admin?: ReactNode
  almoxarife?: ReactNode
  supervisor?: ReactNode
  solicitante?: ReactNode
  visualizador?: ReactNode
  fallback?: ReactNode
}

export function AccessLevel({ 
  admin, 
  almoxarife, 
  supervisor, 
  solicitante, 
  visualizador, 
  fallback = null 
}: AccessLevelProps) {
  const { usuario } = useAuth()

  if (!usuario) return <>{fallback}</>

  switch (usuario.perfil) {
    case 'administrador':
      return <>{admin || fallback}</>
    case 'almoxarife':
      return <>{almoxarife || fallback}</>
    case 'supervisor':
      return <>{supervisor || fallback}</>
    case 'solicitante':
      return <>{solicitante || fallback}</>
    case 'visualizador':
      return <>{visualizador || fallback}</>
    default:
      return <>{fallback}</>
  }
}