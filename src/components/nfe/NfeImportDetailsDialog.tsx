import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  Package, 
  Building2, 
  Calendar,
  DollarSign,
  Save,
  X,
  ExternalLink
} from 'lucide-react'
import { useNFeImportCrud } from '@/hooks/useNFeImportCrud'
import type { NFEImportacao } from '@/services/nfeImportService'

interface NfeImportDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  importacao: NFEImportacao | null
  onSave?: () => void
}

export function NfeImportDetailsDialog({
  open,
  onOpenChange,
  importacao,
  onSave
}: NfeImportDetailsDialogProps) {
  const { updateImportacao, loading } = useNFeImportCrud()
  const [editedData, setEditedData] = useState<Partial<NFEImportacao>>({})
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (importacao) {
      setEditedData({
        observacoes: importacao.observacoes,
        status: importacao.status,
        valor_total: importacao.valor_total
      })
    }
  }, [importacao])

  if (!importacao) return null

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'importado': return 'default'
      case 'processado': return 'secondary'
      case 'reprocessando': return 'outline'
      case 'erro': return 'destructive'
      default: return 'outline'
    }
  }

  const handleSave = async () => {
    if (!importacao.id) return

    const updates = {
      observacoes: editedData.observacoes,
      status: editedData.status,
      valor_total: editedData.valor_total
    }

    const result = await updateImportacao(importacao.id, updates)
    
    if (result.success) {
      setIsEditing(false)
      onSave?.()
    }
  }

  const handleCancel = () => {
    setEditedData({
      observacoes: importacao.observacoes,
      status: importacao.status,
      valor_total: importacao.valor_total
    })
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>NFe {importacao.numero_nfe} - Série {importacao.serie_nfe}</span>
          </DialogTitle>
          <DialogDescription>
            Chave de acesso: {importacao.chave_nfe}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
              <TabsTrigger value="itens">Itens ({importacao.nfe_itens?.length || 0})</TabsTrigger>
              <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Dados da NFe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Número:</span>
                      <span className="text-sm font-medium">{importacao.numero_nfe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Série:</span>
                      <span className="text-sm font-medium">{importacao.serie_nfe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Data de Emissão:</span>
                      <span className="text-sm font-medium">{formatDate(importacao.data_emissao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Data de Importação:</span>
                      <span className="text-sm font-medium">{formatDate(importacao.data_importacao)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Valores Fiscais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valor Total:</span>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editedData.valor_total || ''}
                          onChange={(e) => setEditedData(prev => ({
                            ...prev,
                            valor_total: parseFloat(e.target.value) || 0
                          }))}
                          className="w-32 h-8 text-right"
                        />
                      ) : (
                        <span className="text-sm font-medium">{formatCurrency(importacao.valor_total)}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valor Produtos:</span>
                      <span className="text-sm font-medium">{formatCurrency(importacao.valor_produtos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ICMS:</span>
                      <span className="text-sm font-medium">{formatCurrency(importacao.valor_icms)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">IPI:</span>
                      <span className="text-sm font-medium">{formatCurrency(importacao.valor_ipi)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Status e Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedData.status || 'importado'}
                          onValueChange={(value) => setEditedData(prev => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="importado">Importado</SelectItem>
                            <SelectItem value="processado">Processado</SelectItem>
                            <SelectItem value="reprocessando">Reprocessando</SelectItem>
                            <SelectItem value="erro">Erro</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getStatusColor(importacao.status)}>
                          {importacao.status === 'importado' && 'Importado'}
                          {importacao.status === 'processado' && 'Processado'}
                          {importacao.status === 'reprocessando' && 'Reprocessando'}
                          {importacao.status === 'erro' && 'Erro'}
                          {!importacao.status && 'Não definido'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    {isEditing ? (
                      <Textarea
                        value={editedData.observacoes || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, observacoes: e.target.value }))}
                        placeholder="Adicione observações sobre esta importação..."
                        rows={3}
                      />
                    ) : (
                      <div className="min-h-[60px] p-3 border rounded-md bg-muted/50">
                        {importacao.observacoes || 'Nenhuma observação'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="itens">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Itens da NFe</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>NCM</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Valor Unit.</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Material</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importacao.nfe_itens?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">
                              {item.codigo_produto}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm font-medium truncate">
                                  {item.descricao_produto}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {item.ncm}
                            </TableCell>
                            <TableCell>{item.unidade}</TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.valor_total)}</TableCell>
                            <TableCell>
                              {item.materiais_equipamentos ? (
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">
                                    {item.materiais_equipamentos.codigo}
                                  </Badge>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </div>
                              ) : (
                                <Badge variant="secondary">Não vinculado</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fornecedor">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span>Dados do Fornecedor</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {importacao.fornecedores ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Nome</Label>
                          <p className="text-sm font-medium">{importacao.fornecedores.nome}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">CNPJ</Label>
                          <p className="text-sm font-mono">{importacao.fornecedores.cnpj}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <p className="text-sm">{importacao.fornecedores.email || 'Não informado'}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Telefone</Label>
                          <p className="text-sm">{importacao.fornecedores.telefone || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Endereço</Label>
                          <p className="text-sm">{importacao.fornecedores.endereco || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Status</Label>
                          <Badge variant={importacao.fornecedores.ativo ? 'default' : 'secondary'}>
                            {importacao.fornecedores.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum fornecedor vinculado a esta importação</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={loading}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}