import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  PlusSquare, 
  FileText, 
  Calendar,
  User,
  MapPin,
  Package,
  Edit,
  Check,
  ShoppingCart,
  X,
  Ban,
  Download,
  Clock,
  Copy,
  Bot
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'

import { SolicitacaoCompra } from '@/types'
import { supabase } from '@/lib/supabase'
import { companyService, CompanyWithLogo } from '@/services/companyService'
import { useSolicitacoes } from '@/hooks/useSolicitacoes'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { useAbrirItemDaUrl } from '@/hooks/useAbrirItemDaUrl'
import SolicitacaoActionDialogs from '@/components/solicitacoes/SolicitacaoActionDialogs'
// Dynamic imports para jsPDF e html2canvas
import {
  } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

// Função para obter a variante do badge baseada no status

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'aprovada': return 'default'
    case 'pendente': return 'secondary'
    case 'rejeitada': return 'destructive'
    case 'cancelada': return 'outline'
    case 'concluída': return 'default'
    default: return 'secondary'
  }
}

const SolicitacoesPage = () => {
  const navigate = useNavigate()
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoCompra | null>(null)
  const [selectedSolicitacoes, setSelectedSolicitacoes] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  // Rejeição em lote exige motivo; guarda os ids enquanto o diálogo está aberto
  const [rejeicaoEmLote, setRejeicaoEmLote] = useState<{ ids: string[]; limpar: () => void } | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [centroCustoOrigem, setCentroCustoOrigem] = useState<string>('')
  const [centroCustoDestino, setCentroCustoDestino] = useState<string>('')
  const [materiaisInfo, setMateriaisInfo] = useState<{ [key: string]: { nome: string; unidade_medida: string } }>({})
  const [company, setCompany] = useState<CompanyWithLogo | null>(null)
  const [colaboradorInfo, setColaboradorInfo] = useState<string>('')
  
  // Hook para centralização inteligente do dialog
  const detailsDialogPosition = useCenteredDialog(!!selectedSolicitacao)
  
  // Hook para gerenciar solicitações
  const { 
    solicitacoes, 
    loading, 
    fetchSolicitacoes,
    approveSolicitacao,
    rejectSolicitacao,
    cancelSolicitacao,
    deleteSolicitacao,
    concludeSolicitacao
  } = useSolicitacoes()

  // Carregar dados iniciais
  useEffect(() => {
    fetchSolicitacoes()
  }, [fetchSolicitacoes])

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const companyData = await companyService.getActiveCompany()
        setCompany(companyData)
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error)
      }
    }
    fetchCompany()
  }, [])

  useEffect(() => {
    const fetchCentrosCusto = async () => {
      if (!selectedSolicitacao?.centroCustoOrigemId && !selectedSolicitacao?.centroCustoDestinoId) return

      try {
        const promises = []
        
        if (selectedSolicitacao.centroCustoOrigemId) {
          promises.push(
            supabase
              .from('centros_custo')
              .select('codigo, descricao')
              .eq('id', selectedSolicitacao.centroCustoOrigemId)
              .single()
          )
        }

        if (selectedSolicitacao.centroCustoDestinoId) {
          promises.push(
            supabase
              .from('centros_custo')
              .select('codigo, descricao')
              .eq('id', selectedSolicitacao.centroCustoDestinoId)
              .single()
          )
        }

        const results = await Promise.all(promises)

        if (selectedSolicitacao.centroCustoOrigemId && results[0]?.data) {
          setCentroCustoOrigem(`${results[0].data.codigo} - ${results[0].data.descricao}`)
        }

        const destinoIndex = selectedSolicitacao.centroCustoOrigemId ? 1 : 0
        if (selectedSolicitacao.centroCustoDestinoId && results[destinoIndex]?.data) {
          setCentroCustoDestino(`${results[destinoIndex].data.codigo} - ${results[destinoIndex].data.descricao}`)
        }

      } catch (error) {
        console.error('Erro ao buscar centros de custo:', error)
      }
    }

    fetchCentrosCusto()
  }, [selectedSolicitacao])

  useEffect(() => {
    const fetchMateriaisInfo = async () => {
      if (!selectedSolicitacao?.itens) return

      try {
        // Filtrar apenas IDs válidos (não null) para evitar erro de UUID
        const materialIds = selectedSolicitacao.itens
          .map(item => item.material_equipamento_id)
          .filter(id => id !== null && id !== undefined) as string[]
        
        let materiais: any[] = []
        
        // Só fazer a query se houver IDs válidos
        if (materialIds.length > 0) {
          const { data, error } = await supabase
            .from('materiais_equipamentos')
            .select('id, nome, unidade_medida')
            .in('id', materialIds)
          
          if (error) throw error
          materiais = data || []
        }

        const materiaisMap: { [key: string]: { nome: string; unidade_medida: string } } = {}
        materiais?.forEach(material => {
          materiaisMap[material.id] = {
            nome: material.nome,
            unidade_medida: material.unidade_medida
          }
        })

        setMateriaisInfo(materiaisMap)
      } catch (error) {
        console.error('Erro ao buscar informações dos materiais:', error)
      }
    }

    fetchMateriaisInfo()
  }, [selectedSolicitacao])

  // Buscar informações do colaborador
  useEffect(() => {
    const fetchColaboradorInfo = async () => {
      if (!selectedSolicitacao?.colaborador_id) {
        // Se não há colaborador_id, usar o solicitante_nome
        setColaboradorInfo(selectedSolicitacao?.solicitante_nome || 'N/A')
        return
      }

      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('nome')
          .eq('id', selectedSolicitacao.colaborador_id)
          .single()

        if (error) throw error

        setColaboradorInfo(data?.nome || 'Colaborador não encontrado')
      } catch (error) {
        console.error('Erro ao buscar informações do colaborador:', error)
        setColaboradorInfo('Erro ao carregar colaborador')
      }
    }

    fetchColaboradorInfo()
  }, [selectedSolicitacao])

  // Filtrar solicitações por status

  // Handlers para ações das solicitações
  const handleSolicitacaoUpdated = () => {
    fetchSolicitacoes()
    setSelectedSolicitacao(null)
  }

  const handleApprove = async (id: string) => {
    await approveSolicitacao(id)
    handleSolicitacaoUpdated()
  }

  const handleReject = async (id: string, reason: string) => {
    await rejectSolicitacao(id, reason)
    handleSolicitacaoUpdated()
  }

  const handleCancel = async (id: string) => {
    await cancelSolicitacao(id)
    handleSolicitacaoUpdated()
  }

  const handleDelete = async (id: string) => {
    await deleteSolicitacao(id)
    handleSolicitacaoUpdated()
  }

  const handleConclude = async (id: string) => {
    await concludeSolicitacao(id)
    handleSolicitacaoUpdated()
  }

  const handleCloneSolicitacao = () => {
    if (selectedSolicitacao) {
      setSelectedSolicitacao(null)
      navigate(`/solicitacoes/nova?clone=${selectedSolicitacao.id}`)
    }
  }

  // Funções de seleção múltipla
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedSolicitacoes)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSolicitacoes(newSelected)
  }

  const selectAll = (solicitacoes: SolicitacaoCompra[]) => {
    const allIds = new Set(solicitacoes.map(s => s.id))
    setSelectedSolicitacoes(allIds)
  }

  const clearSelection = () => {
    setSelectedSolicitacoes(new Set())
    setIsSelectionMode(false)
  }

  // Ações em lote
  const handleBulkApprove = async () => {
    const pendentes = Array.from(selectedSolicitacoes).filter(id => {
      const solicitacao = solicitacoes.find(s => s.id === id)
      return solicitacao?.status === 'Pendente'
    })

    for (const id of pendentes) {
      try {
        await approveSolicitacao(id)
      } catch (error) {
        console.error(`Erro ao aprovar solicitação ${id}:`, error)
      }
    }
    
    clearSelection()
    handleSolicitacaoUpdated()
  }

  const handleBulkReject = async (reason: string) => {
    const pendentes = Array.from(selectedSolicitacoes).filter(id => {
      const solicitacao = solicitacoes.find(s => s.id === id)
      return solicitacao?.status === 'Pendente'
    })

    for (const id of pendentes) {
      try {
        await rejectSolicitacao(id, reason)
      } catch (error) {
        console.error(`Erro ao rejeitar solicitação ${id}:`, error)
      }
    }
    
    clearSelection()
    handleSolicitacaoUpdated()
  }

  const handleBulkCancel = async () => {
    const cancelaveis = Array.from(selectedSolicitacoes).filter(id => {
      const solicitacao = solicitacoes.find(s => s.id === id)
      return solicitacao?.status === 'Pendente' || solicitacao?.status === 'Aprovada'
    })

    for (const id of cancelaveis) {
      try {
        await cancelSolicitacao(id)
      } catch (error) {
        console.error(`Erro ao cancelar solicitação ${id}:`, error)
      }
    }
    
    clearSelection()
    handleSolicitacaoUpdated()
  }

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedSolicitacoes)) {
      try {
        await deleteSolicitacao(id)
      } catch (error) {
        console.error(`Erro ao excluir solicitação ${id}:`, error)
      }
    }
    
    clearSelection()
    handleSolicitacaoUpdated()
  }

  const handleDownloadPDF = async () => {
    if (!selectedSolicitacao) return

    setIsGeneratingPDF(true)

    try {
      // Importação dinâmica com fallback para commonjs
      const jsPDFModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      
      const jsPDF = jsPDFModule.default
      const html2canvas = html2canvasModule.default
      const printElement = document.createElement('div')
      printElement.innerHTML = generateSolicitacaoPDFContent(selectedSolicitacao, company, centroCustoOrigem, centroCustoDestino, materiaisInfo, colaboradorInfo)
      printElement.style.position = 'absolute'
      printElement.style.left = '-9999px'
      printElement.style.top = '0'
      printElement.style.width = '210mm'
      printElement.style.minHeight = '297mm'
      printElement.style.backgroundColor = 'white'
      document.body.appendChild(printElement)

      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        width: printElement.scrollWidth,
        height: printElement.scrollHeight
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgWidth = 190
      const pageHeight = 280
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 10
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`solicitacao-compra-${selectedSolicitacao.id}.pdf`)
      
      document.body.removeChild(printElement)
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  /**
   * Colunas da listagem. As abas de status viraram filtro da coluna Status
   * (PRD), e a seleção em lote agora é do DataTable.
   */
  // Abre a solicitação vinda da paleta de comandos (?item=<numero>)
  useAbrirItemDaUrl(solicitacoes, (s) => s.id, (s) => setSelectedSolicitacao(s))

  const colunas: ColunaDataTable<SolicitacaoCompra>[] = [
    {
      id: 'numero',
      cabecalho: 'Solicitação',
      fixa: true,
      semFiltro: true,
      valor: (s) => `${s.id} ${s.solicitante_nome ?? ''}`.trim(),
      valorOrdenacao: (s) => s.id,
      celula: (s) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{s.id}</span>
            {s.origem === 'automatica' && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Bot className="h-3 w-3" />
                Automática
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{formatDate(s.data as any)}</div>
        </div>
      ),
    },
    {
      id: 'origem',
      cabecalho: 'Origem',
      valor: (s) => (s.origem === 'automatica' ? 'Ponto de pedido' : 'Manual'),
    },
    {
      id: 'solicitante',
      cabecalho: 'Solicitante',
      valor: (s) => s.solicitante_nome || 'Não informado',
    },
    {
      id: 'prazo',
      cabecalho: 'Prazo',
      valor: (s) => s.prazoEntrega ?? '—',
    },
    {
      id: 'itens',
      cabecalho: 'Itens',
      semFiltro: true,
      alinhamento: 'right',
      valor: (s) => String(s.itens?.length ?? 0),
      valorOrdenacao: (s) => s.itens?.length ?? 0,
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (s) => s.status,
      // Solicitação é feminina: "Aprovada", "Concluída"
      celula: (s) => <StatusBadge status={s.status} genero="feminino" />,
    },
  ]

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Solicitações de Compra"
          descricao="Pedidos de compra de materiais e equipamentos."
          migalhas={[{ label: 'Compras' }, { label: 'Solicitações' }]}
        />
        <TableSkeleton colunas={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Solicitações de Compra"
        descricao="Pedidos de compra de materiais e equipamentos."
        migalhas={[{ label: 'Compras' }, { label: 'Solicitações' }]}
        acoes={
          <Link to="/solicitacoes/nova">
            <Button>
              <PlusSquare className="mr-2 h-4 w-4" />
              Nova solicitação
            </Button>
          </Link>
        }
      />

      {/* As abas de status viraram filtro da coluna Status; aprovar e rejeitar
          em lote agora saem da seleção do DataTable. */}
      <DataTable
        dados={solicitacoes}
        colunas={colunas}
        idLinha={(s) => s.id}
        chaveUrl="sol"
        placeholderBusca="Buscar por número ou solicitante..."
        nomeArquivoCsv="solicitacoes"
        onLinhaClick={(s) => setSelectedSolicitacao(s)}
        acoesEmLote={(ids, limpar) => {
          const pendentesSelecionadas = ids.filter((id) =>
            solicitacoes.some((s) => s.id === id && s.status === 'Pendente'),
          )
          return (
            <>
              <Button
                size="sm"
                disabled={pendentesSelecionadas.length === 0}
                onClick={async () => {
                  setSelectedSolicitacoes(new Set(pendentesSelecionadas))
                  await handleBulkApprove()
                  limpar()
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Aprovar ({pendentesSelecionadas.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pendentesSelecionadas.length === 0}
                onClick={() => {
                  setMotivoRejeicao('')
                  setRejeicaoEmLote({ ids: pendentesSelecionadas, limpar })
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Rejeitar ({pendentesSelecionadas.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={ids.length === 0}
                onClick={async () => {
                  setSelectedSolicitacoes(new Set(ids))
                  await handleBulkCancel()
                  limpar()
                }}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          )
        }}
        vazio={
          <EmptyState
            titulo="Nenhuma solicitação encontrada"
            descricao="Crie a primeira solicitação de compra para registrar a necessidade de material."
            icone={ShoppingCart}
            acao={
              <Link to="/solicitacoes/nova">
                <Button>
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Nova solicitação
                </Button>
              </Link>
            }
          />
        }
      />

      {/* Rejeição em lote: motivo obrigatório, igual à rejeição individual */}
      <Dialog
        open={!!rejeicaoEmLote}
        onOpenChange={(aberto) => !aberto && setRejeicaoEmLote(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Rejeitar solicitações</DialogTitle>
            <DialogDescription>
              {rejeicaoEmLote?.ids.length} solicitação(ões) serão rejeitadas. O motivo fica
              registrado em cada uma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-rejeicao-lote">Motivo da rejeição</Label>
            <Textarea
              id="motivo-rejeicao-lote"
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Descreva o motivo da rejeição"
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeicaoEmLote(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={motivoRejeicao.trim().length < 10}
              onClick={async () => {
                if (!rejeicaoEmLote) return
                setSelectedSolicitacoes(new Set(rejeicaoEmLote.ids))
                await handleBulkReject(motivoRejeicao.trim())
                rejeicaoEmLote.limpar()
                setRejeicaoEmLote(null)
                setMotivoRejeicao('')
              }}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Detalhes da Solicitação */}
      <Dialog open={!!selectedSolicitacao} onOpenChange={() => setSelectedSolicitacao(null)}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto fixed" 
          aria-describedby="solicitacao-details-description"
          style={{
            top: detailsDialogPosition.top,
            left: detailsDialogPosition.left,
            transform: detailsDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedSolicitacao?.id} - Solicitação de Compra
            </DialogTitle>
            <DialogDescription id="solicitacao-details-description">
              Detalhes completos da solicitação e ações disponíveis
            </DialogDescription>
          </DialogHeader>
          
          {selectedSolicitacao && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações Gerais
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Data:</span>
                    <span>{formatDate(selectedSolicitacao.data as any)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(selectedSolicitacao.status)}>
                      {selectedSolicitacao.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Solicitante:</span>
                    <span>{colaboradorInfo || 'Carregando...'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Prazo:</span>
                    <span>{selectedSolicitacao.prazoEntrega}</span>
                  </div>
                  
                  {selectedSolicitacao.centroCustoOrigemId && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Centro de Custo Origem:</span>
                      <span>{centroCustoOrigem || 'Carregando...'}</span>
                    </div>
                  )}
                  
                  {selectedSolicitacao.centroCustoDestinoId && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Centro de Custo Destino:</span>
                      <span>{centroCustoDestino || 'Carregando...'}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedSolicitacao.justificativa && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                    {selectedSolicitacao.origem === 'automatica' && <Bot className="h-4 w-4" />}
                    Justificativa
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedSolicitacao.justificativa}
                  </p>
                </div>
              )}

              {selectedSolicitacao.rejectionReason && (
                <div>
                  <span className="font-medium">Motivo da Rejeição:</span>
                  <p className="mt-1 text-sm text-red-600">{selectedSolicitacao.rejectionReason}</p>
                </div>
              )}
              
              <Separator />
              
              {/* Itens da Solicitação */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens ({selectedSolicitacao.itens?.length || 0})
                </h3>
                
                {selectedSolicitacao.itens && selectedSolicitacao.itens.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSolicitacao.itens.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {/* Exibir item avulso ou material cadastrado */}
                            {item.item_avulso ? (
                              <>
                                <p className="font-medium">{item.item_avulso.descricao}</p>
                                <p className="text-sm text-muted-foreground">
                                  Item Avulso
                                </p>
                                {item.item_avulso.codigo && (
                                  <p className="text-sm text-muted-foreground">
                                    Código: {item.item_avulso.codigo}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  Unidade: {item.item_avulso.unidade_medida || 'N/A'}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">{materiaisInfo[item.material_equipamento_id]?.nome || 'Material não encontrado'}</p>
                                <p className="text-sm text-muted-foreground">
                                  ID: {item.material_equipamento_id}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Unidade: {materiaisInfo[item.material_equipamento_id]?.unidade_medida || 'N/A'}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">Qtd: {item.quantidade}</p>
                          </div>
                        </div>
                        
                        {item.observacoes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Obs: {item.observacoes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum item encontrado</p>
                )}
              </div>
              
              <Separator />
              
              {/* Ações */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Ações</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* PDF */}
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF
                      </>
                    )}
                  </Button>
                  
                  {/* Clonar */}
                  <Button
                    variant="outline"
                    onClick={handleCloneSolicitacao}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clonar
                  </Button>
                  
                  {/* Editar */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSolicitacao(null)
                      navigate(`/solicitacoes/nova?edit=${selectedSolicitacao.id}`)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
                
                {/* Ações específicas do status */}
                <SolicitacaoActionDialogs
                  solicitacaoId={selectedSolicitacao.id}
                  solicitacaoNumero={selectedSolicitacao.id}
                  status={selectedSolicitacao.status}
                  onApprove={() => handleApprove(selectedSolicitacao.id)}
                  onReject={(reason) => handleReject(selectedSolicitacao.id, reason)}
                  onCancel={() => handleCancel(selectedSolicitacao.id)}
                  onDelete={() => handleDelete(selectedSolicitacao.id)}
                  onConclude={() => handleConclude(selectedSolicitacao.id)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const formatDatePDF = (dateString: string | Date) => {
  if (!dateString) return 'Data não informada'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const generateSolicitacaoPDFContent = (
  solicitacao: SolicitacaoCompra,
  company: CompanyWithLogo | null,
  centroCustoOrigem: string,
  centroCustoDestino: string,
  materiaisInfo: { [key: string]: { nome: string; unidade_medida: string } },
  colaboradorInfo: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Requisição de Compra ${solicitacao.id}</title>
        <style>
          @page {
            margin: 10mm;
            size: A4;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.3;
          }
          
          .container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #4a90e2;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .logo {
            height: 35px;
            width: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: white;
            font-weight: bold;
            font-size: 16px;
            overflow: hidden;
          }

          .logo img {
            height: 35px;
            width: auto;
            object-fit: contain;
            background: transparent;
          }
          
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 0;
            line-height: 35px;
            display: flex;
            align-items: center;
          }
          
          .company-info {
            text-align: right;
            font-size: 9px;
            line-height: 1.2;
            color: #666;
            max-width: 200px;
          }
          
          .company-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
            font-size: 10px;
          }
          
          .info-section {
            border: 2px solid #333;
            margin-bottom: 15px;
          }
          
          .info-header {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #333;
          }
          
          .info-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #333;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .info-cell {
            padding: 8px 12px;
            border-right: 1px solid #333;
            display: flex;
            align-items: center;
          }
          
          .info-cell:last-child {
            border-right: none;
          }
          
          .info-label {
            font-weight: bold;
            margin-right: 8px;
            min-width: 80px;
          }
          
          .info-value {
            flex: 1;
          }
          
          .material-section {
            margin-bottom: 20px;
          }
          
          .section-title {
            background: #4a90e2;
            color: white;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            margin: 0 0 2px 0;
            text-align: center;
          }
          
          .material-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #333;
          }
          
          .material-table th {
            background: #4a90e2;
            color: white;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            border: 1px solid #333;
          }
          
          .material-table td {
            padding: 8px 6px;
            border: 1px solid #333;
            text-align: center;
            font-size: 10px;
            vertical-align: middle;
          }
          
          .material-table td:nth-child(2) {
            text-align: left;
            max-width: 200px;
            word-wrap: break-word;
          }
          
          .material-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .empty-row td {
            height: 25px;
            border: 1px solid #333;
          }
          
          .verification-section {
            margin-top: 30px;
            padding: 10px;
            border: 1px solid #333;
            text-align: center;
            font-weight: bold;
          }
          
          .signature-section {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
          }
          
          .signature-box {
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 130px;
          }
          
          .signature-line {
            width: 100%;
            height: 1px;
            background-color: #333;
            margin: 80px 0 8px 0;
          }
          
          .signature-title {
            font-size: 9px;
            color: #666;
            text-align: center;
            font-weight: normal;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                ${company?.logo_url 
                  ? `<img src="${company.logo_url}" alt="Logo da Empresa" />` 
                  : 'LOGO'
                }
              </div>
              <h1 class="title">REQUISIÇÃO DE COMPRA</h1>
            </div>
            <div class="company-info">
              <div class="company-name">${company?.nome || 'SISTEMA DE ALMOXARIFADO'}</div>
              ${company?.cnpj ? `<div>${company.cnpj}</div>` : '<div>08.296.443/0001-83</div>'}
              ${company?.endereco ? `<div>${company.endereco}</div>` : '<div>Sistema de Gestão de Materiais</div>'}
              ${company?.telefone ? `<div>${company.telefone}</div>` : '<div>Controle de Estoque e Movimentação</div>'}
              ${company?.email ? `<div>${company.email}</div>` : '<div>190</div>'}
            </div>
          </div>

          <!-- Info Section -->
          <div class="info-section">
            <div class="info-header">
              <div class="info-cell">
                <span class="info-label">No. da Solicitação:</span>
                <span class="info-value">${solicitacao.id}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Data da Solicitação:</span>
                <span class="info-value">${formatDatePDF(solicitacao.data)}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Solicitante:</span>
                <span class="info-value">${colaboradorInfo}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Prazo de Entrega:</span>
                <span class="info-value">${solicitacao.prazoEntrega}${solicitacao.prazoEntrega === 'Customizada (especificar data)' && solicitacao.dataCustomizada ? ` - ${formatDatePDF(solicitacao.dataCustomizada)}` : ''}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Centro de Custo Origem:</span>
                <span class="info-value">${centroCustoOrigem || 'N/A'}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Centro de Custo Destino:</span>
                <span class="info-value">${centroCustoDestino || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Material Section -->
          <div class="material-section">
            <h2 class="section-title">Lista de Materiais/Equipamentos Solicitados</h2>
            
            <table class="material-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Item</th>
                  <th style="width: 250px;">Descrição</th>
                  <th style="width: 80px;">Unidade</th>
                  <th style="width: 60px;">Quantidade</th>
                  <th style="width: 150px;">Observações</th>
                </tr>
              </thead>
              <tbody>
                ${solicitacao.itens?.map((item, index) => `
                  <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td style="text-align: left; padding-left: 8px;">
                      ${item.item_avulso ? 
                        `${item.item_avulso.descricao} <small>(Item Avulso)</small>` : 
                        (materiaisInfo[item.material_equipamento_id]?.nome || 'Material não encontrado')
                      }
                    </td>
                    <td>${item.item_avulso ? 
                        (item.item_avulso.unidade_medida || 'N/A') : 
                        (materiaisInfo[item.material_equipamento_id]?.unidade_medida || 'N/A')
                      }</td>
                    <td><strong>${item.quantidade}</strong></td>
                    <td style="text-align: left; padding-left: 8px;">${item.observacoes || '-'}</td>
                  </tr>
                `).join('') || ''}
                
                ${Array.from({ length: Math.max(0, 10 - (solicitacao.itens?.length || 0)) }, (_, i) => `
                  <tr class="empty-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Verification Section -->
          <div class="verification-section">
            SOLICITAÇÃO VERIFICADA E APROVADA POR:
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <div>SOLICITANTE</div>
              <div class="signature-line"></div>
              <div class="signature-title">Responsável pela Solicitação</div>
            </div>
            <div class="signature-box">
              <div>GESTOR</div>
              <div class="signature-line"></div>
              <div class="signature-title">Aprovação do Gestor</div>
            </div>
            <div class="signature-box">
              <div>COMPRAS</div>
              <div class="signature-line"></div>
              <div class="signature-title">Departamento de Compras</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export default SolicitacoesPage