import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PerfilForm } from './PerfilForm'
import { PerfilFormData } from '@/types/perfil'

interface PerfilCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PerfilFormData) => Promise<void>
}

export function PerfilCreateDialog({ 
  open, 
  onOpenChange, 
  onSubmit 
}: PerfilCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Perfil de Acesso</DialogTitle>
          <DialogDescription>
            Crie um novo perfil de acesso configurando as permissões específicas para este grupo de usuários.
          </DialogDescription>
        </DialogHeader>
        <PerfilForm 
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}