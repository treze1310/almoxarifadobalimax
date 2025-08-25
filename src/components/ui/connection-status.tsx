import { AlertCircle, Wifi, WifiOff, RotateCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function ConnectionStatus() {
  const { connectionError, retryAttempts, testConnection, user, session } = useAuth()

  if (!connectionError) return null

  const handleRetryConnection = async () => {
    console.log('🔄 Manual connection retry...')
    
    // Se há usuário mas não há sessão, tentar restaurar
    if (user && !session) {
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession()
        if (error) throw error
        console.log('✅ Session restored manually')
      } catch (error) {
        console.warn('⚠️ Manual session restore failed:', error)
      }
    }
    
    await testConnection()
  }

  const isSessionLost = user && !session

  return (
    <Alert variant="destructive" className="mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span>
            {isSessionLost ? 
              'Sessão expirada. Você precisa fazer login novamente.' : 
              'Problemas de conectividade detectados. Algumas funcionalidades podem estar indisponíveis.'
            }
          </span>
          {retryAttempts > 0 && (
            <div className="text-xs mt-1 opacity-75">
              Tentativa {retryAttempts}/3 de reconexão...
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetryConnection}
          className="ml-2"
        >
          <RotateCw className="h-3 w-3 mr-1" />
          {isSessionLost ? 'Restaurar Sessão' : 'Tentar Novamente'}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function ConnectionIndicator() {
  const { connectionError } = useAuth()

  return (
    <div className="flex items-center space-x-1 text-xs">
      {connectionError ? (
        <>
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-red-500">Desconectado</span>
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <span className="text-green-500">Conectado</span>
        </>
      )}
    </div>
  )
}