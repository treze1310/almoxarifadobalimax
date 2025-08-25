import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { 
  ArrowLeft, 
  FileText, 
  Package, 
  Calendar, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { useNFeImportCrud } from '@/hooks/useNFeImportCrud'
import { NfeImportDetailsDialog } from '@/components/nfe/NfeImportDetailsDialog'
import type { NFEImportacao } from '@/services/nfeImportService'

const HistoricoNFePage = () => {
  const { 
    loading, 
    importacoes, 
    stats,
    fetchImportacoes, 
    deleteImportacao,
    reprocessImportacao,
    fetchStats
  } = useNFeImportCrud()
  
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedImportacao, setSelectedImportacao] = useState<NFEImportacao | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importacaoToDelete, setImportacaoToDelete] = useState<NFEImportacao | null>(null)

  useEffect(() => {
    fetchImportacoes()
    fetchStats()
  }, [fetchImportacoes, fetchStats])

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'importado': return 'default'
      case 'processado': return 'secondary'
      case 'erro': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'importado': return 'Importado'
      case 'processado': return 'Processado'
      case 'reprocessando': return 'Reprocessando'
      case 'erro': return 'Erro'
      default: return status
    }
  }

  const handleViewDetails = (importacao: NFEImportacao) => {
    setSelectedImportacao(importacao)
    setDetailsDialogOpen(true)
  }

  const handleDeleteClick = (importacao: NFEImportacao) => {
    setImportacaoToDelete(importacao)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!importacaoToDelete) return
    
    const result = await deleteImportacao(importacaoToDelete.id)
    if (result.success) {
      setDeleteDialogOpen(false)
      setImportacaoToDelete(null)
      await fetchStats() // Atualizar estatísticas
    }
  }

  const handleReprocess = async (importacao: NFEImportacao) => {
    const result = await reprocessImportacao(importacao.id)
    if (result.success) {
      await fetchStats() // Atualizar estatísticas
    }
  }

  const handleDetailsSaved = () => {
    fetchImportacoes()
    fetchStats()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/nfe/importacao">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Importações NFe</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/nfe/importacao">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Importações NFe</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            {importacoes.length} importação{importacoes.length !== 1 ? 'ões' : ''}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchImportacoes} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Painel de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total de NFes</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Materiais Criados</p>
                <p className="text-xl font-bold">{stats.materiaisCriados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">{formatCurrency(stats.valorTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Processadas</p>
                <p className="text-lg font-bold text-green-600">{stats.processadas}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Erros</p>
                <p className="text-lg font-bold text-red-600">{stats.erros}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {importacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma importação encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Você ainda não realizou nenhuma importação de NFe.
            </p>
            <Button asChild>
              <Link to="/nfe/importacao">
                <Package className="mr-2 h-4 w-4" />
                Importar NFe
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Importações Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NFe</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Data Importação</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importacoes.map((nfe) => (
                    <TableRow key={nfe.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{nfe.numero_nfe}</span>
                          <span className="text-xs text-muted-foreground">
                            Série: {nfe.serie_nfe}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {nfe.fornecedores?.nome || 'Não informado'}
                          </span>
                          {nfe.fornecedores?.cnpj && (
                            <span className="text-xs text-muted-foreground">
                              {nfe.fornecedores.cnpj}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(nfe.data_emissao)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {nfe.data_importacao && formatDate(nfe.data_importacao)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(nfe.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {nfe.nfe_itens?.length || 0} itens
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(nfe.status || 'importado')}>
                          {getStatusLabel(nfe.status || 'importado')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(nfe)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewDetails(nfe)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleReprocess(nfe)}
                              disabled={nfe.status === 'reprocessando'}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reprocessar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(nfe)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Detalhes/Edição */}
      <NfeImportDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        importacao={selectedImportacao}
        onSave={handleDetailsSaved}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a importação da NFe {importacaoToDelete?.numero_nfe}?
              <br />
              <br />
              <strong>Esta ação não pode ser desfeita.</strong> O registro da importação e seus itens serão permanentemente removidos.
              {importacaoToDelete?.nfe_itens?.some(item => item.material_equipamento_id) && (
                <>
                  <br />
                  <br />
                  <span className="text-blue-600">
                    ℹ️ Os materiais criados desta importação serão preservados, apenas os vínculos serão removidos.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default HistoricoNFePage
