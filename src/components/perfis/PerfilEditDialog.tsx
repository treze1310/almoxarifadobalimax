import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PerfilForm } from './PerfilForm'
import { PerfilAcesso, PerfilFormData } from '@/types/perfil'

interface PerfilEditDialogProps {
  perfil: PerfilAcesso | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PerfilFormData) => Promise<void>
}

export function PerfilEditDialog({ 
  perfil, 
  open, 
  onOpenChange, 
  onSubmit 
}: PerfilEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil de Acesso</DialogTitle>
          <DialogDescription>
            Edite as permissões e configurações do perfil <strong>{perfil?.nome}</strong>.
          </DialogDescription>
        </DialogHeader>
        {perfil && (
          <PerfilForm 
            initialData={perfil}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}