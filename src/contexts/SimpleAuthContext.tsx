// 🧹 Simplified Auth Context - NO AUTHENTICATION
import React, { createContext, useContext } from 'react'

// 📝 Minimal context for compatibility - no real auth
interface SimpleAuthContextType {
  // Fake auth state for compatibility
  isAuthenticated: boolean
  user: null
  loading: boolean
  
  // Dummy functions to prevent errors
  hasPermission: () => boolean
  signOut: () => void
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  isAuthenticated: true, // Always authenticated
  user: null,
  loading: false,
  hasPermission: () => true, // Allow everything
  signOut: () => {}, // Do nothing
})

export const useAuth = () => {
  const context = useContext(SimpleAuthContext)
  if (!context) {
    throw new Error('useAuth must be used within SimpleAuthProvider')
  }
  return context
}

interface SimpleAuthProviderProps {
  children: React.ReactNode
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  // 🎯 Always authenticated, no permissions check
  const value: SimpleAuthContextType = {
    isAuthenticated: true,
    user: null,
    loading: false,
    hasPermission: () => true, // Allow all actions
    signOut: () => console.log('📝 Logout (no-op)'),
  }

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  )
}

export default SimpleAuthProvider
