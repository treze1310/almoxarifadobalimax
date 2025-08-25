import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertTriangle, Loader2, Settings } from 'lucide-react'
import { CodeGenerationService } from '@/services/codeGenerationService'
import { useToast } from '@/components/ui/use-toast'

interface CodesFixDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FixStatus = 'idle' | 'analyzing' | 'fixing' | 'completed' | 'error'

interface FixResult {
  success: boolean
  updated: number
  errors: string[]
}

export const CodesFixDialog = ({ open, onOpenChange }: CodesFixDialogProps) => {
  const [status, setStatus] = useState<FixStatus>('idle')
  const [result, setResult] = useState<FixResult | null>(null)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const handleFixCodes = async () => {
    try {
      setStatus('analyzing')
      setProgress(10)
      
      toast({
        title: 'Iniciando correção de códigos',
        description: 'Analisando materiais existentes...',
      })

      setProgress(30)
      setStatus('fixing')
      
      const fixResult = await CodeGenerationService.fixExistingCodes()
      
      setProgress(100)
      setResult(fixResult)
      setStatus(fixResult.success ? 'completed' : 'error')
      
      if (fixResult.success) {
        toast({
          title: 'Códigos atualizados com sucesso!',
          description: `${fixResult.updated} materiais atualizados`,
        })
      } else {
        toast({
          title: 'Erro na atualização',
          description: `${fixResult.errors.length} erros encontrados`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      setStatus('error')
      setResult({
        success: false,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      })
      
      toast({
        title: 'Erro na correção',
        description: 'Erro inesperado durante a correção',
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    setStatus('idle')
    setResult(null)
    setProgress(0)
    onOpenChange(false)
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'idle':
        return {
          title: 'Corrigir Códigos Sequenciais',
          description: 'Esta operação irá analisar todos os materiais e atualizar códigos não-sequenciais para seguir o padrão de 5 dígitos.',
          color: 'text-blue-600',
          icon: Settings
        }
      case 'analyzing':
        return {
          title: 'Analisando materiais...',
          description: 'Identificando materiais que precisam de novos códigos',
          color: 'text-yellow-600',
          icon: Loader2
        }
      case 'fixing':
        return {
          title: 'Corrigindo códigos...',
          description: 'Atualizando códigos para sequência numérica',
          color: 'text-blue-600',
          icon: Loader2
        }
      case 'completed':
        return {
          title: 'Correção concluída!',
          description: 'Todos os códigos foram atualizados com sucesso',
          color: 'text-green-600',
          icon: CheckCircle
        }
      case 'error':
        return {
          title: 'Erro na correção',
          description: 'Ocorreram erros durante a atualização',
          color: 'text-red-600',
          icon: AlertTriangle
        }
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Icon 
              className={`h-5 w-5 ${statusInfo.color} ${
                (status === 'analyzing' || status === 'fixing') ? 'animate-spin' : ''
              }`} 
            />
            <span>{statusInfo.title}</span>
          </DialogTitle>
          <DialogDescription>
            {statusInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === 'idle' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Esta operação irá alterar códigos de materiais 
                que não seguem o padrão sequencial de 5 dígitos. Recomenda-se fazer backup antes.
              </AlertDescription>
            </Alert>
          )}

          {(status === 'analyzing' || status === 'fixing') && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% concluído
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Materiais atualizados:</span>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.updated}
                </Badge>
              </div>
              
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-destructive">Erros:</span>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-xs bg-destructive/10 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'idle' && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleFixCodes}>
                Iniciar Correção
              </Button>
            </div>
          )}
          
          {(status === 'analyzing' || status === 'fixing') && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </Button>
          )}
          
          {(status === 'completed' || status === 'error') && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
