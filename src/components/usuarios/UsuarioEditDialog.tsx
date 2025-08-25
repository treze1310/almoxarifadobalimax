import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UsuarioForm } from './UsuarioForm'
import { User } from '@/types/auth'

interface UsuarioEditDialogProps {
  usuario: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
}

export function UsuarioEditDialog({ 
  usuario, 
  open, 
  onOpenChange, 
  onSubmit 
}: UsuarioEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere os dados do usuário <strong>{usuario?.nome}</strong>.
            Deixe o campo de senha em branco para manter a senha atual.
          </DialogDescription>
        </DialogHeader>
        {usuario && (
          <UsuarioForm 
            initialData={usuario}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}