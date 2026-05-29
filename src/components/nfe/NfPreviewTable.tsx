import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Search,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  MaterialSearchDialog,
  MatchedMaterial,
} from '@/components/nfe/MaterialSearchDialog'

// fileId -> itemCode -> material vinculado
export type ItemMatches = Record<string, Record<string, MatchedMaterial>>

// Classificação informada para itens NOVOS (que serão criados)
export interface ItemMetaValue {
  tipo: 'material' | 'equipamento'
  categoria: string
}
// fileId -> itemCode -> classificação
export type ItemMeta = Record<string, Record<string, ItemMetaValue>>

interface NfPreviewTableProps {
  files: UploadedNFeFile[]
  onRemoveFile: (id: string) => void
  selectedItems?: Record<string, string[]> // fileId -> itemCodes[]
  onItemSelectionChange?: (fileId: string, itemCode: string, selected: boolean) => void
  matches?: ItemMatches
  onMatchChange?: (fileId: string, itemCode: string, material: MatchedMaterial | null) => void
  itemMeta?: ItemMeta
  onItemMetaChange?: (fileId: string, itemCode: string, meta: ItemMetaValue) => void
  categorias?: string[]
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
  matches = {},
  onMatchChange,
  itemMeta = {},
  onItemMetaChange,
  categorias = [],
}: NfPreviewTableProps) => {
  // Item cuja lupa de busca está aberta
  const [searchTarget, setSearchTarget] = useState<{
    fileId: string
    item: NFeItem
  } | null>(null)

  const getMatch = (fileId: string, itemCode: string): MatchedMaterial | undefined =>
    matches[fileId]?.[itemCode]

  const getMeta = (fileId: string, itemCode: string): ItemMetaValue =>
    itemMeta[fileId]?.[itemCode] || { tipo: 'material', categoria: 'MATERIAL DE CONSUMO' }

  const isItemSelected = (fileId: string, itemCode: string) => {
    return selectedItems[fileId]?.includes(itemCode) || false
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
                        {onItemMetaChange && <TableHead className="w-56">Tipo / Categoria</TableHead>}
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Vlr. Unit.</TableHead>
                        <TableHead className="text-right">Vlr. Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedFile.data.items.map((item, index) => {
                        const isSelected = isItemSelected(uploadedFile.id, item.code)
                        const match = getMatch(uploadedFile.id, item.code)
                        return (
                          <TableRow
                            key={`${uploadedFile.id}-${item.code}`}
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
                              <Badge variant={match ? 'success' as any : 'outline'} className="text-xs">
                                {match ? match.codigo : isSelected ? 'Auto' : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="flex-1">{item.description}</span>
                                {onMatchChange && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    title="Vincular a material existente"
                                    onClick={() =>
                                      setSearchTarget({ fileId: uploadedFile.id, item })
                                    }
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {match && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-success">
                                  <span>
                                    → {match.nome} (estoque atual: {match.estoque_atual} →{' '}
                                    {match.estoque_atual + item.quantity})
                                  </span>
                                  {onMatchChange && (
                                    <button
                                      type="button"
                                      className="ml-1 inline-flex items-center text-muted-foreground hover:text-destructive"
                                      title="Remover vínculo"
                                      onClick={() =>
                                        onMatchChange(uploadedFile.id, item.code, null)
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            {onItemMetaChange && (
                              <TableCell>
                                {match ? (
                                  // Já cadastrado: classificação preenchida automaticamente
                                  <div className="text-xs text-muted-foreground">
                                    <div className="capitalize">{match.tipo || 'material'}</div>
                                    <div>{match.categoria || '—'}</div>
                                    <span className="text-[10px] italic">(do cadastro)</span>
                                  </div>
                                ) : (
                                  // Item novo: perguntar tipo e categoria
                                  <div className="space-y-1">
                                    <Select
                                      value={getMeta(uploadedFile.id, item.code).tipo}
                                      onValueChange={(value) =>
                                        onItemMetaChange(uploadedFile.id, item.code, {
                                          ...getMeta(uploadedFile.id, item.code),
                                          tipo: value as 'material' | 'equipamento',
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="material">Material</SelectItem>
                                        <SelectItem value="equipamento">Equipamento</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      list="nfe-categorias-sugestoes"
                                      className="h-7 text-xs"
                                      placeholder="Categoria"
                                      value={getMeta(uploadedFile.id, item.code).categoria}
                                      onChange={(e) =>
                                        onItemMetaChange(uploadedFile.id, item.code, {
                                          ...getMeta(uploadedFile.id, item.code),
                                          categoria: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                )}
                              </TableCell>
                            )}
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
      {onItemMetaChange && (
        <datalist id="nfe-categorias-sugestoes">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      )}
      {onMatchChange && (
        <MaterialSearchDialog
          open={!!searchTarget}
          onOpenChange={(open) => {
            if (!open) setSearchTarget(null)
          }}
          initialSearch={searchTarget?.item.description ?? ''}
          onSelect={(material) => {
            if (searchTarget) {
              onMatchChange(searchTarget.fileId, searchTarget.item.code, material)
            }
          }}
        />
      )}
    </Accordion>
  )
}
