import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UploadedNFeFile, NFeItem } from '@/types'
import { format } from 'date-fns'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
  Package,
} from 'lucide-react'

interface NfPreviewTableProps {
  files: UploadedNFeFile[]
  onRemoveFile: (id: string) => void
  selectedItems?: Record<string, string[]> // fileId -> itemCodes[]
  onItemSelectionChange?: (fileId: string, itemCode: string, selected: boolean) => void
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
  selectedItems = {},
  onItemSelectionChange,
}: NfPreviewTableProps) => {
  
  const isItemSelected = (fileId: string, itemCode: string) => {
    const selected = selectedItems[fileId]?.includes(itemCode) || false
    // Debug apenas no primeiro item para não poluir o console
    if (itemCode === selectedItems[fileId]?.[0]) {
      console.log(`🔍 Verificando seleção: Arquivo ${fileId}, Item ${itemCode}, Selecionado: ${selected}`)
      console.log(`📊 Itens selecionados para arquivo:`, selectedItems[fileId])
    }
    return selected
  }
  
  const getSelectedItemsCount = (fileId: string) => {
    const count = selectedItems[fileId]?.length || 0
    // console.log(`📊 Contando itens selecionados para arquivo ${fileId}: ${count}`)
    return count
  }
  
  const getTotalItemsCount = (file: UploadedNFeFile) => {
    const total = file.data?.items.length || 0
    // console.log(`📦 Total de itens no arquivo ${file.id}: ${total}`)
    return total
  }
  
  const toggleAllItems = (fileId: string, items: NFeItem[], selectAll: boolean) => {
    if (!onItemSelectionChange) return
    
    console.log(`🔄 ${selectAll ? 'Selecionando' : 'Desselecionando'} todos os ${items.length} itens do arquivo ${fileId}`)
    
    items.forEach(item => {
      onItemSelectionChange(fileId, item.code, selectAll)
    })
  }
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
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Itens da Nota:
                    </h4>
                    {onItemSelectionChange && (
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-muted-foreground">
                          {getSelectedItemsCount(uploadedFile.id)} de {getTotalItemsCount(uploadedFile)} selecionados
                        </span>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAllItems(uploadedFile.id, uploadedFile.data!.items, true)}
                          >
                            Todos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAllItems(uploadedFile.id, uploadedFile.data!.items, false)}
                          >
                            Nenhum
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {onItemSelectionChange && <TableHead className="w-12">Sel.</TableHead>}
                        <TableHead>Cód. Original</TableHead>
                        <TableHead>Novo Cód.</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Vlr. Unit.</TableHead>
                        <TableHead className="text-right">Vlr. Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedFile.data.items.map((item, index) => {
                        const isSelected = isItemSelected(uploadedFile.id, item.code)
                        return (
                          <TableRow 
                            key={index}
                            className={isSelected ? 'bg-muted/50' : ''}
                          >
                            {onItemSelectionChange && (
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    onItemSelectionChange(uploadedFile.id, item.code, !!checked)
                                  }
                                />
                              </TableCell>
                            )}
                            <TableCell className="text-xs text-muted-foreground">
                              {item.code}
                            </TableCell>
                            <TableCell className="font-mono">
                              <Badge variant="outline" className="text-xs">
                                {isSelected ? 'Auto' : 'N/A'}
                              </Badge>
                            </TableCell>
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
                        )
                      })}
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
