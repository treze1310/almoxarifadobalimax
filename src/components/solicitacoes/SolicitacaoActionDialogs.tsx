import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Check, X, Ban, Trash2 } from 'lucide-react'
import { usePermissoes } from '@/contexts/PermissionsContext'

const rejectSchema = z.object({
  reason: z.string().min(10, 'O motivo deve ter pelo menos 10 caracteres'),
})

type RejectFormValues = z.infer<typeof rejectSchema>

interface SolicitacaoActionDialogsProps {
  solicitacaoId: string
  solicitacaoNumero: string
  status: string
  onApprove: () => Promise<void>
  onReject: (reason: string) => Promise<void>
  onCancel: () => Promise<void>
  onDelete: () => Promise<void>
  onConclude: () => Promise<void>
}

export default function SolicitacaoActionDialogs({
  solicitacaoId,
  solicitacaoNumero,
  status,
  onApprove,
  onReject,
  onCancel,
  onDelete,
  onConclude
}: SolicitacaoActionDialogsProps) {
  const { can } = usePermissoes()
  // Aprovar/rejeitar exigem permissao de aprovacao; concluir e cancelar fazem
  // parte do atendimento da solicitacao; excluir e uma acao destrutiva.
  const podeAprovar = can('solicitacoes', 'approve')
  const podeAtender = can('solicitacoes', 'update')
  const podeExcluir = can('solicitacoes', 'delete')

  const [destructiveAction, setDestructiveAction] = useState<'cancel' | 'delete' | null>(null)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rejectForm = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: '',
    },
  })

  const handleReject = async (data: RejectFormValues) => {
    setIsSubmitting(true)
    try {
      await onReject(data.reason)
      setIsRejectDialogOpen(false)
      rejectForm.reset()
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      await onApprove()
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    setIsSubmitting(true)
    try {
      await onCancel()
    } catch (error) {
      console.error('Erro ao cancelar solicitação:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConclude = async () => {
    setIsSubmitting(true)
    try {
      await onConclude()
    } catch (error) {
      console.error('Erro ao concluir solicitação:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {(podeExcluir || ((status === 'Pendente' || status === 'Aprovada') && podeAtender)) && (
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Mais ações</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(status === 'Pendente' || status === 'Aprovada') && podeAtender && <DropdownMenuItem onSelect={() => setDestructiveAction('cancel')}><Ban className="mr-2 h-4 w-4" />Cancelar solicitação</DropdownMenuItem>}
            {podeExcluir && <DropdownMenuItem className="text-destructive" onSelect={() => setDestructiveAction('delete')}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Aprovar */}
      {status === 'Pendente' && podeAprovar && (
        <Button
          onClick={handleApprove}
          disabled={isSubmitting}
        >
          <Check className="h-4 w-4 mr-2" />
          Aprovar
        </Button>
      )}

      {/* Rejeitar */}
      {status === 'Pendente' && podeAprovar && (
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <X className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Rejeitar Solicitação</DialogTitle>
              <DialogDescription>
                Informe o motivo da rejeição da solicitação {solicitacaoNumero}.
              </DialogDescription>
            </DialogHeader>
            <Form {...rejectForm}>
              <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
                <FormField
                  control={rejectForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da Rejeição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o motivo da rejeição..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRejectDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="destructive" disabled={isSubmitting}>
                    {isSubmitting ? 'Rejeitando...' : 'Confirmar Rejeição'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Concluir */}
      {status === 'Aprovada' && podeAtender && (
        <Button
          onClick={handleConclude}
          disabled={isSubmitting}
        >
          <Check className="h-4 w-4 mr-2" />
          Concluir
        </Button>
      )}

      {/* Cancelar */}
      {(status === 'Pendente' || status === 'Aprovada') && podeAtender && (
        <AlertDialog open={destructiveAction === 'cancel'} onOpenChange={open => { if (!open) setDestructiveAction(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar a solicitação {solicitacaoNumero}? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Excluir */}
      {podeExcluir && (
      <AlertDialog open={destructiveAction === 'delete'} onOpenChange={open => { if (!open) setDestructiveAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente a solicitação {solicitacaoNumero}? 
              Esta ação não pode ser desfeita e todos os dados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  )
}