// 🧹 Temporary component to replace PermissionGuard during simplification
import { ReactNode } from 'react'

interface NoAuthGuardProps {
  permission?: string  // Ignored - just for compatibility
  children: ReactNode
}

// 📝 Always render children - no permission check
export const NoAuthGuard = ({ children }: NoAuthGuardProps) => {
  return <>{children}</>
}

// 📝 Alias for easier migration
export const PermissionGuard = NoAuthGuard

export default NoAuthGuard
