import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UploadedNFeFile } from '@/types'
import { format } from 'date-fns'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
} from 'lucide-react'

interface NfPreviewTableProps {
  files: UploadedNFeFile[]
  onRemoveFile: (id: string) => void
}

const statusConfig = {
  pending: {
    icon: Loader2,
    color: 'text-muted-foreground',
    variant: 'secondary',
    label: 'Pendente',
    className: 'animate-spin',
  },
  parsing: {
    icon: Loader2,
    color: 'text-blue-500',
    variant: 'secondary',
    label: 'Processando...',
    className: 'animate-spin',
  },
  success: {
    icon: CheckCircle,
    color: 'text-success',
    variant: 'success',
    label: 'Pronto para Importar',
    className: '',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    variant: 'warning',
    label: 'Avisos Encontrados',
    className: '',
  },
  error: {
    icon: XCircle,
    color: 'text-destructive',
    variant: 'destructive',
    label: 'Erro na Validação',
    className: '',
  },
}

export const NfPreviewTable = ({
  files,
  onRemoveFile,
}: NfPreviewTableProps) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      {files.map((uploadedFile) => {
        const config = statusConfig[uploadedFile.status]
        const Icon = config.icon

        return (
          <AccordionItem
            key={uploadedFile.id}
            value={uploadedFile.id}
            className="border-b"
          >
            <AccordionTrigger className="hover:no-underline p-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 text-left font-medium">
                  {uploadedFile.file.name}
                </div>
                <div className="w-1/4 text-left">
                  <Badge variant={config.variant as any}>
                    <Icon
                      className={`mr-2 h-4 w-4 ${config.color} ${config.className}`}
                    />
                    {config.label}
                  </Badge>
                </div>
                <div className="w-1/4 text-left">
                  {uploadedFile.data?.number || 'N/A'}
                </div>
                <div className="w-1/4 text-right">
                  {uploadedFile.data?.totalValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }) || 'N/A'}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-muted/50">
              {uploadedFile.message && (
                <div
                  className={`mb-4 p-3 rounded-md text-sm ${
                    uploadedFile.status === 'error'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-warning/10 text-warning-foreground'
                  }`}
                >
                  <p className="font-semibold">Mensagem:</p>
                  <p>{uploadedFile.message}</p>
                </div>
              )}
              {uploadedFile.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-semibold">Emissor:</p>
                      <p>{uploadedFile.data.emitter.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Destinatário:</p>
                      <p>{uploadedFile.data.recipient.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Data de Emissão:</p>
                      <p>{format(uploadedFile.data.issueDate, 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <h4 className="font-semibold">Itens da Nota:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cód.</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Vlr. Unit.</TableHead>
                        <TableHead className="text-right">Vlr. Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedFile.data.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {item.unitValue.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.totalValue.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveFile(uploadedFile.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
