import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface TestDialogProps {
  isOpen: boolean
  onClose: () => void
  colaboradorNome?: string
}

export function TestDialog({ isOpen, onClose, colaboradorNome }: TestDialogProps) {
  console.log('🧪 TestDialog render - isOpen:', isOpen)
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md" 
        style={{ 
          zIndex: 9999,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <DialogHeader>
          <DialogTitle>Teste - {colaboradorNome}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>Este é um diálogo de teste!</p>
          <p>Status: {isOpen ? 'Aberto' : 'Fechado'}</p>
          <Button onClick={onClose} className="mt-4">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
