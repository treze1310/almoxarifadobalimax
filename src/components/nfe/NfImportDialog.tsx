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

interface NfImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  importCounts: {
    success: number
    warning: number
    error: number
  }
  loading?: boolean
}

export const NfImportDialog = ({
  open,
  onOpenChange,
  onConfirm,
  importCounts,
  loading = false,
}: NfImportDialogProps) => {
  const { success, warning } = importCounts
  const totalToImport = success + warning

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a importar{' '}
            <span className="font-bold">{totalToImport}</span> NF-e(s).
            {warning > 0 && (
              <>
                {' '}
                Dessas,{' '}
                <span className="font-bold text-warning">{warning}</span> contêm
                avisos.
              </>
            )}
            <br />
            As notas com erros não serão importadas. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Importando...
              </>
            ) : (
              'Sim, Importar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
