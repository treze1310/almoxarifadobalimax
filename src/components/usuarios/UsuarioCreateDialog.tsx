import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UsuarioForm } from './UsuarioForm'

interface UsuarioCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
}

export function UsuarioCreateDialog({ 
  open, 
  onOpenChange, 
  onSubmit 
}: UsuarioCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo usuário no sistema.
            O usuário receberá as credenciais de acesso por email.
          </DialogDescription>
        </DialogHeader>
        <UsuarioForm 
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}