import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatarCNPJ } from '@/lib/dadosPessoais'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { PageHeader } from '@/components/ds/PageHeader'
import { ConciliacaoNFeDialog } from '@/components/nfe/ConciliacaoNFeDialog'
import { useAbrirItemDaUrl } from '@/hooks/useAbrirItemDaUrl'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { ArrowLeft, FileText, Package, Eye, Trash2, RefreshCw, TrendingUp, Link2 } from 'lucide-react'
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

  // Ciclo do RF-13: Importada -> Conferida -> Lançada
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'importada': return 'Importada'
      case 'conferida': return 'Conferida'
      case 'lancada': return 'Lançada'
      case 'reprocessando': return 'Reprocessando'
      case 'erro': return 'Erro'
      // valores legados
      case 'importado': return 'Importada'
      case 'processado': return 'Lançada'
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
      <div className="space-y-6">
        <PageHeader
          titulo="Histórico de NF-e"
          descricao="Notas fiscais importadas e seus itens."
          migalhas={[{ label: 'Compras' }, { label: 'NF-e' }, { label: 'Histórico' }]}
        />
        <TableSkeleton colunas={6} />
      </div>
    )
  }

  // RF-13: conciliação item a item, conferência e lançamento no estoque
  const [conciliando, setConciliando] = useState<any | null>(null)

  // A central de notificações manda `?item=<id>` para abrir a conciliação da
  // nota direto, e não só a listagem.
  useAbrirItemDaUrl(importacoes as any[], (nfe) => nfe.id, (nfe) => setConciliando(nfe))

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'nfe',
      cabecalho: 'NF-e',
      fixa: true,
      semFiltro: true,
      valor: (n) => `${n.numero_nfe ?? ''} ${n.serie_nfe ?? ''} ${n.fornecedores?.nome ?? ''}`.trim(),
      valorOrdenacao: (n) => n.numero_nfe ?? '',
      celula: (n) => (
        <div className="min-w-0">
          <div className="font-medium">{n.numero_nfe}</div>
          <div className="text-xs text-muted-foreground">Série {n.serie_nfe}</div>
        </div>
      ),
    },
    {
      id: 'fornecedor',
      cabecalho: 'Fornecedor',
      valor: (n) => n.fornecedores?.nome || 'Não informado',
      celula: (n) => (
        <div className="min-w-0">
          <div className="truncate">{n.fornecedores?.nome || 'Não informado'}</div>
          {n.fornecedores?.cnpj && (
            <div className="text-xs text-muted-foreground">{formatarCNPJ(n.fornecedores.cnpj)}</div>
          )}
        </div>
      ),
    },
    {
      id: 'emissao',
      cabecalho: 'Emissão',
      semFiltro: true,
      valor: (n) => formatDate(n.data_emissao),
      valorOrdenacao: (n) => n.data_emissao ?? '',
    },
    {
      id: 'importacao',
      cabecalho: 'Importação',
      semFiltro: true,
      valor: (n) => (n.data_importacao ? formatDate(n.data_importacao) : '—'),
      valorOrdenacao: (n) => n.data_importacao ?? '',
    },
    {
      id: 'valor',
      cabecalho: 'Valor total',
      semFiltro: true,
      alinhamento: 'right',
      valor: (n) => formatCurrency(n.valor_total),
      valorOrdenacao: (n) => n.valor_total ?? 0,
    },
    {
      id: 'itens',
      cabecalho: 'Itens',
      semFiltro: true,
      alinhamento: 'right',
      valor: (n) => String(n.nfe_itens?.length ?? 0),
      valorOrdenacao: (n) => n.nfe_itens?.length ?? 0,
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (n) => getStatusLabel(n.status || 'importada'),
      celula: (n) => <StatusBadge status={n.status || 'importada'} genero="feminino" />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <PageHeader
        titulo="Histórico de NF-e"
        descricao="Notas fiscais importadas e seus itens."
        migalhas={[{ label: 'Compras' }, { label: 'NF-e' }, { label: 'Histórico' }]}
        acoes={
          <>
            <Button variant="outline" asChild>
              <Link to="/nfe/importacao">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Importar NF-e
              </Link>
            </Button>
            <Button variant="outline" onClick={fetchImportacoes} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </>
        }
      />
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

      <DataTable
        dados={importacoes}
        colunas={colunas}
        idLinha={(n) => n.id}
        chaveUrl="nfe"
        placeholderBusca="Buscar por número, série ou fornecedor..."
        nomeArquivoCsv="importacoes-nfe"
        acoesLinha={(nfe) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={nfe.status === 'lancada' ? 'Ver conciliação' : 'Conciliar itens'}
              onClick={() => setConciliando(nfe)}
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Ver detalhes"
              onClick={() => handleViewDetails(nfe)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Reprocessar"
              disabled={nfe.status === 'reprocessando'}
              onClick={() => handleReprocess(nfe)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => handleDeleteClick(nfe)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhuma importação encontrada"
            descricao="Você ainda não importou nenhuma NF-e."
            icone={FileText}
            acao={
              <Button asChild>
                <Link to="/nfe/importacao">
                  <Package className="mr-2 h-4 w-4" />
                  Importar NF-e
                </Link>
              </Button>
            }
          />
        }
      />

      <ConciliacaoNFeDialog
        nfeId={conciliando?.id ?? null}
        numeroNfe={conciliando?.numero_nfe}
        status={conciliando?.status}
        onFechar={() => setConciliando(null)}
        onAtualizado={() => {
          fetchImportacoes()
          fetchStats()
          setConciliando(null)
        }}
      />

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
