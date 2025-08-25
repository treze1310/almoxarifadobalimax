// Utilitário para debug de autenticação
export const debugAuth = () => {
  console.log('🔍 Auth Debug Info:')
  
  // Verificar todas as chaves no localStorage
  const keys = Object.keys(localStorage)
  const authKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'))
  
  console.log('📦 Auth keys in localStorage:', authKeys)
  
  authKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      if (value) {
        const parsed = JSON.parse(value)
        console.log(`🔑 ${key}:`, {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          expiresAt: parsed.expires_at,
          expiresIn: parsed.expires_in,
          user: parsed.user?.email
        })
      }
    } catch (e) {
      console.log(`❌ Could not parse ${key}:`, localStorage.getItem(key))
    }
  })
  
  // Verificar URL do Supabase
  console.log('🌐 Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
  console.log('🔑 Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
}

// Função para limpar localStorage de auth
export const clearAuthStorage = () => {
  const keys = Object.keys(localStorage)
  const authKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'))
  
  authKeys.forEach(key => {
    localStorage.removeItem(key)
    console.log(`🧹 Removed ${key}`)
  })
  
  console.log('✅ Auth storage cleared')
}