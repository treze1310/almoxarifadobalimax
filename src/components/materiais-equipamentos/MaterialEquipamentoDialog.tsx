import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { MaterialEquipamentoForm } from './MaterialEquipamentoForm'
import { MaterialEquipamento } from '@/types'
import { Trash2 } from 'lucide-react'

interface MaterialEquipamentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: MaterialEquipamento | null
  onDelete?: (material: MaterialEquipamento) => void
  onSubmit?: (data: any) => Promise<void>
}

export const MaterialEquipamentoDialog = ({
  open,
  onOpenChange,
  material,
  onDelete,
  onSubmit,
}: MaterialEquipamentoDialogProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dialogPosition, setDialogPosition] = useState({ top: '50vh', left: '50vw' })
  
  useEffect(() => {
    if (open) {
      // Calcular posição central da viewport atual
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      // Centro absoluto da tela visível atual
      const centerY = scrollTop + (viewportHeight / 2)
      const centerX = scrollLeft + (viewportWidth / 2)
      
      setDialogPosition({
        top: `${centerY}px`,
        left: `${centerX}px`
      })
    }
  }, [open])
  
  const handleSuccess = () => {
    onOpenChange(false)
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (material && onDelete) {
      onDelete(material)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          position: 'absolute',
          top: dialogPosition.top,
          left: dialogPosition.left,
          transform: 'translate(-50%, -50%)',
          margin: 0,
          zIndex: 9999,
          maxHeight: '90vh',
          width: 'min(95vw, 672px)',
          overflowY: 'auto'
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {material ? 'Editar Item' : 'Novo Material ou Equipamento'}
              </DialogTitle>
              <DialogDescription>
                {material
                  ? 'Edite as informações do item.'
                  : 'Preencha os dados para cadastrar um novo item.'}
              </DialogDescription>
            </div>
            {material && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="p-1 pt-4">
          <MaterialEquipamentoForm
            initialData={material}
            onSubmit={onSubmit || (async () => {})}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent 
          className="sm:max-w-[425px]"
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 10000,
            width: 'min(95vw, 425px)'
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item "{material?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
