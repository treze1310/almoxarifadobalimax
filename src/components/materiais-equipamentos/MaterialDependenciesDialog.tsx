import React, { useState, useEffect, useCallback } from 'react'
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
  AlertTriangle,
  FileText,
  Package,
  TrendingUp,
  Unlink,
  Trash2,
  Info
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { materialDependencyService, type MaterialDependencies } from '@/services/materialDependencyService'

interface MaterialDependenciesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string | null
  materialName?: string
  onDeleted?: () => void
}

export function MaterialDependenciesDialog({
  open,
  onOpenChange,
  materialId,
  materialName,
  onDeleted
}: MaterialDependenciesDialogProps) {
  const [loading, setLoading] = useState(false)
  const [dependencies, setDependencies] = useState<MaterialDependencies | null>(null)
  const [unlinkingNFe, setUnlinkingNFe] = useState(false)
  const [forceDeleting, setForceDeleting] = useState(false)
  const { toast } = useToast()

  const loadDependencies = useCallback(async () => {
    if (!materialId) return

    setLoading(true)
    try {
      const { data, error } = await materialDependencyService.checkDependencies(materialId)
      
      if (error) {
        console.error('Erro ao carregar dependências:', error)
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dependências do material',
          variant: 'destructive'
        })
        return
      }

      setDependencies(data)

    } catch (error: any) {
      console.error('Erro ao carregar dependências:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar dependências',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [materialId, toast])

  useEffect(() => {
    if (open && materialId) {
      loadDependencies()
    }
  }, [open, materialId, loadDependencies])

  const handleUnlinkFromNFe = async () => {
    if (!materialId) return

    setUnlinkingNFe(true)
    try {
      const { success, error } = await materialDependencyService.unlinkAllFromNFe(materialId)
      
      if (!success) {
        toast({
          title: 'Erro',
          description: 'Erro ao desvincular material da NFe',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Sucesso',
        description: 'Material desvinculado das NFes com sucesso'
      })

      // Recarregar dependências
      await loadDependencies()

    } catch (error: any) {
      console.error('Erro ao desvincular:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao desvincular material',
        variant: 'destructive'
      })
    } finally {
      setUnlinkingNFe(false)
    }
  }

  const handleForceDelete = async () => {
    if (!materialId) return

    setForceDeleting(true)
    try {
      const { success, error, warnings } = await materialDependencyService.forceDelete(materialId)
      
      if (!success) {
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao excluir material',
          variant: 'destructive'
        })
        return
      }

      // Mostrar avisos se houver
      if (warnings.length > 0) {
        toast({
          title: 'Material Excluído',
          description: `Material excluído com avisos: ${warnings.join(', ')}`,
        })
      } else {
        toast({
          title: 'Sucesso',
          description: 'Material excluído com sucesso'
        })
      }

      onDeleted?.()
      onOpenChange(false)

    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao excluir material',
        variant: 'destructive'
      })
    } finally {
      setForceDeleting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  }

  if (!dependencies && !loading) return null

  const nfeDep = dependencies?.dependencies.find(d => d.type === 'nfe_itens')
  const romaneiosDep = dependencies?.dependencies.find(d => d.type === 'romaneios_itens')
  const movimentacoesDep = dependencies?.dependencies.find(d => d.type === 'movimentacao_estoque')

  const hasCriticalDeps = (romaneiosDep?.count || 0) + (movimentacoesDep?.count || 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Dependências do Material</span>
          </DialogTitle>
          <DialogDescription>
            {materialName && `Material: ${materialName}`}
            <br />
            Este material possui vínculos que impedem a exclusão direta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : dependencies ? (
            <>
              {/* Resumo das Dependências */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Itens NFe</p>
                        <p className="text-xl font-bold">{nfeDep?.count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Romaneios</p>
                        <p className="text-xl font-bold">{romaneiosDep?.count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Movimentações</p>
                        <p className="text-xl font-bold">{movimentacoesDep?.count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status de Exclusão */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <div>
                      <p className="font-medium">
                        {dependencies.canDelete ? 'Pode ser excluído' : 'Não pode ser excluído diretamente'}
                      </p>
                      {!dependencies.canDelete && (
                        <p className="text-sm text-muted-foreground">
                          {hasCriticalDeps 
                            ? 'Possui dependências críticas que impedem a exclusão'
                            : 'Possui vínculos com NFe que podem ser removidos'
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes das Dependências */}
              {dependencies.dependencies.length > 0 && (
                <Tabs defaultValue={dependencies.dependencies[0].type} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    {nfeDep && (
                      <TabsTrigger value="nfe_itens">
                        NFe ({nfeDep.count})
                      </TabsTrigger>
                    )}
                    {romaneiosDep && (
                      <TabsTrigger value="romaneios_itens">
                        Romaneios ({romaneiosDep.count})
                      </TabsTrigger>
                    )}
                    {movimentacoesDep && (
                      <TabsTrigger value="movimentacao_estoque">
                        Movimentações ({movimentacoesDep.count})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* NFe Itens */}
                  {nfeDep && (
                    <TabsContent value="nfe_itens">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Itens de NFe Vinculados</span>
                            <Badge variant="outline">{nfeDep.count} item(s)</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>NFe</TableHead>
                                  <TableHead>Produto</TableHead>
                                  <TableHead>Fornecedor</TableHead>
                                  <TableHead>Quantidade</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Data</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {nfeDep.details.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div className="text-xs">
                                        <div className="font-medium">
                                          {item.nfe_importacao?.numero_nfe}-{item.nfe_importacao?.serie_nfe}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="max-w-xs">
                                        <p className="text-sm font-medium truncate">
                                          {item.descricao_produto}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {item.codigo_produto}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {item.nfe_importacao?.fornecedores?.nome || '-'}
                                    </TableCell>
                                    <TableCell>{item.quantidade}</TableCell>
                                    <TableCell>{formatCurrency(item.valor_total)}</TableCell>
                                    <TableCell>
                                      {item.nfe_importacao?.data_emissao && formatDate(item.nfe_importacao.data_emissao)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Romaneios */}
                  {romaneiosDep && (
                    <TabsContent value="romaneios_itens">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Romaneios que Utilizam Este Material</span>
                            <Badge variant="destructive">{romaneiosDep.count} item(s)</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Romaneio</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Responsável</TableHead>
                                  <TableHead>Quantidade</TableHead>
                                  <TableHead>Data</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {romaneiosDep.details.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono">
                                      {item.romaneios?.numero}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={item.romaneios?.tipo === 'retirada' ? 'default' : 'secondary'}>
                                        {item.romaneios?.tipo}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {item.romaneios?.colaboradores?.nome || '-'}
                                    </TableCell>
                                    <TableCell>{item.quantidade}</TableCell>
                                    <TableCell>
                                      {item.romaneios?.data_romaneio && formatDate(item.romaneios.data_romaneio)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Movimentações */}
                  {movimentacoesDep && (
                    <TabsContent value="movimentacao_estoque">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Histórico de Movimentações</span>
                            <Badge variant="destructive">{movimentacoesDep.count} item(s)</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Quantidade Anterior</TableHead>
                                  <TableHead>Quantidade Atual</TableHead>
                                  <TableHead>Motivo</TableHead>
                                  <TableHead>Data</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {movimentacoesDep.details.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Badge variant={item.tipo_movimentacao === 'entrada' ? 'default' : 'secondary'}>
                                        {item.tipo_movimentacao}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{item.quantidade_anterior}</TableCell>
                                    <TableCell>{item.quantidade_atual}</TableCell>
                                    <TableCell>{item.motivo}</TableCell>
                                    <TableCell>{formatDate(item.created_at)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            {nfeDep && nfeDep.count > 0 && (
              <Button 
                variant="outline" 
                onClick={handleUnlinkFromNFe}
                disabled={unlinkingNFe || forceDeleting}
              >
                <Unlink className="mr-2 h-4 w-4" />
                {unlinkingNFe ? 'Desvinculando...' : 'Desvincular NFe'}
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {!hasCriticalDeps && (
              <Button 
                variant="destructive" 
                onClick={handleForceDelete}
                disabled={unlinkingNFe || forceDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {forceDeleting ? 'Excluindo...' : 'Excluir Material'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}