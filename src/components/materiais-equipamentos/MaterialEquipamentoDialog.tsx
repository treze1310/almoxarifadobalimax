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
import { HistoricoFornecedoresPrecos } from './HistoricoFornecedoresPrecos'
import { UnidadesDoMaterial } from './UnidadesDoMaterial'
import { Separator } from '@/components/ui/separator'
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

  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `xl` para editar e criar terem a mesma largura: o mesmo formulário
          aparecia em 672px ao editar e 800px ao criar. */}
      <DialogContent
        tamanho="xl"
        className="flex max-h-[calc(100dvh-2rem)] flex-col z-[9999]"
        style={{
          position: 'absolute',
          top: dialogPosition.top,
          left: dialogPosition.left,
          transform: 'translate(-50%, -50%)',
          margin: 0,
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {material ? 'Editar Item' : 'Novo Material ou Equipamento'}
          </DialogTitle>
          <DialogDescription>
            {material
              ? 'Edite as informações do item.'
              : 'Preencha os dados para cadastrar um novo item.'}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pt-2">
          <MaterialEquipamentoForm
            footerContainer={footerContainer}
            initialData={material as any}
            onSubmit={onSubmit || (async () => {})}
            onCancel={() => onOpenChange(false)}
          />
          {(material as any)?.id && (
            <>
              {/* Equipamento e ferramenta são acompanhados peça a peça: as
                  unidades ficam dentro do item PAI, não soltas na listagem */}
              {(material as any).exige_identificacao_individual && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-ds-section font-semibold">Unidades deste item</h3>
                      <p className="text-ds-caption text-muted-foreground">
                        Cada peça tem o seu próprio número ({(material as any).codigo}-1,{' '}
                        {(material as any).codigo}-2, …) e o seu próprio status.
                      </p>
                    </div>
                    <UnidadesDoMaterial
                      materialId={(material as any).id}
                      codigoMaterial={(material as any).codigo}
                      estoqueAtual={(material as any).estoque_atual}
                      nomeMaterial={(material as any).nome}
                    />
                  </div>
                </>
              )}
              <Separator className="my-6" />
              <HistoricoFornecedoresPrecos materialId={(material as any).id} />
            </>
          )}
        </div>
        <div ref={setFooterContainer} className="shrink-0 border-t pt-3" />
        {/* O "Excluir" ficava no cabeçalho, por cima do X de fechar, e era o
            primeiro elemento focável: ao abrir, o foco caía nele e um Enter
            distraído excluía o item. Aqui ele é o último, na ordem visual e na
            de tabulação. */}
        {material && onDelete && (
          <div className="shrink-0 border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir este item
            </Button>
          </div>
        )}
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
              Tem certeza que deseja excluir o item "{(material as any)?.nome}"?
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
