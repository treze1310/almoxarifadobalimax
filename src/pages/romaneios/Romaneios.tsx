import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useScrollRestaurado } from '@/hooks/useScrollRestaurado'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  PlusSquare, 
  ArrowLeftRight, 
  FileText, 
  Calendar,
  User,
  Package,
  Edit,
  Trash2,
  Check,
  Ban,
  Download,
  Copy,
  PenLine,
} from 'lucide-react'
import { useRomaneios } from '@/hooks/useRomaneios'

import { formatDate } from '@/lib/utils'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'


import { generateRomaneoPDFContent } from '@/components/romaneios/RomaneioPDF'
import { enriquecerComMaiorPreco } from '@/utils/romaneioPdf'
import { companyService } from '@/services/companyService'
import { devolucaoService } from '@/services/devolucaoService'
import StatusDevolucaoLabel from '@/components/romaneios/StatusDevolucaoLabel'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import type { Tables } from '@/types/database'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { rotuloStatus } from '@/lib/status'
import { useAbrirItemDaUrl } from '@/hooks/useAbrirItemDaUrl'

type Romaneio = Tables<'romaneios'> & {
  colaboradores?: { nome: string; matricula: string } | null
  centro_custo_origem?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
  centro_custo_destino?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
  fornecedores?: { nome: string } | null
  statusDevolucao?: StatusDevolucao
  romaneios_itens?: Array<{
    id: string
    quantidade: number
    valor_unitario: number | null
    valor_total: number | null
    numero_serie: string | null
    codigo_patrimonial: string | null
    observacoes: string | null
    materiais_equipamentos?: {
      codigo: string
      nome: string
      codigo_ncm: string | null
      centros_custo?: {
        codigo: string
        nome: string
      } | null
    } | null
  }>
}

type StatusDevolucao = {
  status: 'nao_devolvido' | 'parcialmente_devolvido' | 'totalmente_devolvido'
  percentualDevolvido: number
  quantidadeOriginal: number
  quantidadeDevolvida: number
  itensDevolvidos: Array<{
    material_id: string
    nome_material: string
    quantidade_original: number
    quantidade_devolvida: number
    percentual: number
  }>
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pendente':
      return 'secondary'
    case 'aprovado':
      return 'default'
    case 'retirado':
      return 'default'
    case 'devolvido':
      return 'default'
    case 'cancelado':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * RF-04: documento aprovado é imutável. Editar e excluir só valem enquanto o
 * romaneio está pendente ou cancelado; depois disso, a correção é por
 * cancelamento com motivo. A regra também é aplicada por trigger no banco.
 */
const documentoEditavel = (status?: string | null) =>
  status === 'pendente' || status === 'cancelado' || !status

const RomaneiosPage = () => {
  // Voltar para a listagem devolve a rolagem onde estava
  useScrollRestaurado()

  const navigate = useNavigate()
  const [selectedRomaneio, setSelectedRomaneio] = useState<Romaneio | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [statusDevolucoes, setStatusDevolucoes] = useState<Map<string, StatusDevolucao>>(new Map())
  const [loadingStatus, setLoadingStatus] = useState(false)
  const { romaneios, loading, fetchRomaneios, approveRomaneio, cancelRomaneio, deleteRomaneio } = useRomaneios()

  // Hook para centralização inteligente do dialog de detalhes
  const detailsDialogPosition = useCenteredDialog(!!selectedRomaneio)

  useEffect(() => {
    fetchRomaneios({ includeItens: true })
  }, [fetchRomaneios])

  // Carregar status de devolução para romaneios de retirada
  useEffect(() => {
    const carregarStatusDevolucoes = async () => {
      if (loading || romaneios.length === 0) return

      setLoadingStatus(true)
      const novosStatus = new Map<string, StatusDevolucao>()

      try {
        const retiradasAprovadas = romaneios.filter(r => 
          r.tipo === 'retirada' && ['aprovado', 'retirado'].includes(r.status || '')
        )

        for (const romaneio of retiradasAprovadas) {
          const status = await devolucaoService.calcularStatusDevolucao(romaneio.id)
          novosStatus.set(romaneio.id, status)
        }

        setStatusDevolucoes(novosStatus)
      } catch (error) {
        console.error('Erro ao carregar status de devoluções:', error)
      } finally {
        setLoadingStatus(false)
      }
    }

    carregarStatusDevolucoes()
  }, [romaneios, loading])



  const handleRomaneioUpdated = () => {
    fetchRomaneios({ includeItens: true })
    setSelectedRomaneio(null) // Fechar detalhes após atualização
  }


  const handleDownloadPDF = async () => {
    if (!selectedRomaneio) return

    setIsGeneratingPDF(true)

    try {
      console.log('🔄 Iniciando geração de PDF para romaneio:', selectedRomaneio.numero)
      
      // Buscar dados da empresa com retry robusto
      const company = await companyService.getActiveCompany()
      
      if (!company) {
        throw new Error('Não foi possível carregar os dados da empresa')
      }

      console.log('✅ Dados da empresa carregados')
      
      // Enriquecer com o maior valor do histórico de preços
      const romaneioParaPdf = await enriquecerComMaiorPreco(selectedRomaneio as any)

      // Create a temporary element with the new PDF content
      const printElement = document.createElement('div')
      printElement.innerHTML = generateRomaneoPDFContent(romaneioParaPdf, company)
      printElement.style.position = 'absolute'
      printElement.style.left = '-9999px'
      printElement.style.top = '0'
      printElement.style.width = '210mm'
      printElement.style.minHeight = '297mm'
      printElement.style.backgroundColor = 'white'
      document.body.appendChild(printElement)

      // Wait a bit for images to load
      console.log('⏳ Aguardando carregamento de imagens...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('🖨️ Convertendo para canvas...')
      // Convert to canvas and then to PDF with retry logic
      let canvas
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        try {
          canvas = await html2canvas(printElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: 'white',
            width: printElement.scrollWidth,
            height: printElement.scrollHeight
          })
          break
        } catch (canvasError) {
          retryCount++
          console.warn(`⚠️ Tentativa ${retryCount}/${maxRetries} de conversão falhou:`, canvasError)
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          } else {
            throw canvasError
          }
        }
      }

      if (!canvas) {
        throw new Error('Falha na conversão para canvas após todas as tentativas')
      }

      console.log('📄 Gerando PDF...')
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
      
      pdf.save(`romaneio-${selectedRomaneio.numero}.pdf`)
      console.log('✅ PDF gerado com sucesso!')
      
      // Clean up
      document.body.removeChild(printElement)
      
    } catch (error) {
      console.error('💥 Erro ao gerar PDF:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('JWT')) {
        alert('Sessão expirada. Faça login novamente.')
      } else if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
        alert('Problema de conexão. Verifique sua internet e tente novamente.')
      } else {
        alert(`Erro ao gerar PDF: ${errorMessage}. Tente novamente.`)
      }
    } finally {
      setIsGeneratingPDF(false)
    }
  }


  const handleCloneRomaneio = () => {
    if (selectedRomaneio) {
      setSelectedRomaneio(null)
      navigate(`/novo-romaneio?tipo=${selectedRomaneio.tipo}&clone=${selectedRomaneio.id}`)
    }
  }

  /**
   * Colunas da listagem de romaneios. As antigas abas (Retiradas, Devoluções,
   * Transferências) viraram filtro da coluna Tipo, como pede o PRD.
   */
  // Abre o romaneio vindo da paleta de comandos (?item=<id>)
  useAbrirItemDaUrl(romaneios as Romaneio[], (r) => r.id, (r) => setSelectedRomaneio(r))

  const colunas: ColunaDataTable<Romaneio>[] = [
    {
      id: 'numero',
      cabecalho: 'Romaneio',
      fixa: true,
      semFiltro: true,
      valor: (r) =>
        `${r.numero ?? ''} ${r.colaboradores?.nome ?? ''} ${r.centro_custo_origem?.codigo ?? ''}`.trim(),
      valorOrdenacao: (r) => r.numero ?? '',
      // "ROM-AL-2605151587-0001" quebrava em três linhas
      largura: 210,
      nowrap: true,
      celula: (r) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium">{r.numero}</span>
            {/* RF-09: romaneio com assinatura colhida na retirada assistida */}
            {(r as any).assinatura_retirada && (
              <span title="Assinado digitalmente" aria-label="Assinado digitalmente">
                <PenLine className="h-3.5 w-3.5 shrink-0 text-status-concluido" />
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(r.data_romaneio || r.created_at)}
          </div>
        </div>
      ),
    },
    {
      id: 'tipo',
      cabecalho: 'Tipo',
      largura: 110,
      nowrap: true,
      valor: (r) => (r.tipo ? r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1) : '—'),
    },
    {
      id: 'colaborador',
      cabecalho: 'Colaborador',
      // Estava largo demais e espremia Status, Valor e Devolução
      largura: 220,
      valor: (r) => r.colaboradores?.nome ?? r.responsavel_retirada ?? '—',
      celula: (r) => (
        <div className="min-w-0">
          <div className="truncate">{r.colaboradores?.nome ?? r.responsavel_retirada ?? '—'}</div>
          {r.colaboradores?.matricula && (
            <div className="text-xs text-muted-foreground">Matrícula {r.colaboradores.matricula}</div>
          )}
        </div>
      ),
    },
    {
      id: 'centro_custo',
      cabecalho: 'Centro de custo',
      cabecalhoCurto: 'C. Custo',
      larguraMax: 150,
      prioridade: 'baixa',
      valor: (r) =>
        r.centro_custo_origem
          ? `${r.centro_custo_origem.codigo} - ${r.centro_custo_origem.descricao ?? ''}`.trim()
          : '—',
    },
    {
      id: 'itens',
      cabecalho: 'Itens',
      semFiltro: true,
      alinhamento: 'right',
      largura: 70,
      nowrap: true,
      valor: (r) => String(r.romaneios_itens?.length ?? 0),
      valorOrdenacao: (r) => r.romaneios_itens?.length ?? 0,
    },
    {
      id: 'valor',
      cabecalho: 'Valor',
      semFiltro: true,
      alinhamento: 'right',
      largura: 110,
      nowrap: true,
      valor: (r) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          r.valor_total ?? 0,
        ),
      valorOrdenacao: (r) => r.valor_total ?? 0,
    },
    {
      id: 'status',
      cabecalho: 'Status',
      largura: 104,
      nowrap: true,
      valor: (r) => rotuloStatus(r.status),
      celula: (r) => <StatusBadge status={r.status} />,
    },
    {
      // Mantém a informação que antes aparecia no rodapé do card
      id: 'devolucao',
      cabecalho: 'Devolução',
      semFiltro: true,
      largura: 130,
      nowrap: true,
      valor: (r) => {
        const devolucao = statusDevolucoes.get(r.id)
        if (!devolucao) return '—'
        return (
          {
            nao_devolvido: 'Não devolvido',
            parcialmente_devolvido: 'Parcialmente devolvido',
            totalmente_devolvido: 'Totalmente devolvido',
          }[devolucao.status] ?? devolucao.status
        )
      },
      celula: (r) => {
        const aplicavel =
          r.tipo === 'retirada' && ['aprovado', 'retirado'].includes(r.status || '')
        if (!aplicavel) return <span className="text-muted-foreground">—</span>
        if (loadingStatus) return <span className="text-xs text-muted-foreground">…</span>
        const devolucao = statusDevolucoes.get(r.id)
        return devolucao ? (
          <StatusDevolucaoLabel statusDevolucao={devolucao} size="sm" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Romaneios"
          descricao="Retiradas, devoluções e transferências de materiais."
          migalhas={[{ label: 'Operação' }, { label: 'Romaneios' }]}
        />
        <TableSkeleton colunas={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Romaneios"
        descricao="Retiradas, devoluções e transferências de materiais."
        migalhas={[{ label: 'Operação' }, { label: 'Romaneios' }]}
        acoes={
          <>
            {/* A retirada do dia a dia passa pelo assistente; o formulário
                completo continua acessível como modo avançado. */}
            <Link to="/romaneios/retirada">
              <Button>
                <PlusSquare className="mr-2 h-4 w-4" />
                Nova retirada
              </Button>
            </Link>
            <Link to="/romaneios/novo?tipo=devolucao">
              <Button variant="outline">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Nova devolução
              </Button>
            </Link>
            <Link to="/romaneios/novo?tipo=retirada">
              {/* `ghost` fazia parecer texto solto no meio dos botões */}
              <Button variant="outline">Retirada avançada</Button>
            </Link>
          </>
        }
      />

      {/* As abas de tipo viraram coluna filtrável (PRD): uma lista só, com
          filtro por Tipo, Status, Centro de custo e Colaborador. */}
      <DataTable
        dados={romaneios as Romaneio[]}
        colunas={colunas}
        idLinha={(r) => r.id}
        chaveUrl="rom"
        placeholderBusca="Buscar por número, colaborador ou centro de custo…"
        nomeArquivoCsv="romaneios"
        onLinhaClick={(r) => setSelectedRomaneio(r)}
        vazio={
          <EmptyState
            titulo="Nenhum romaneio encontrado"
            descricao="Crie a primeira retirada para começar a movimentar materiais."
            icone={FileText}
            acao={
              <Link to="/romaneios/retirada">
                <Button>
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Nova retirada
                </Button>
              </Link>
            }
          />
        }
      />

      {/* Diálogo de Detalhes do Romaneio */}
      <Dialog open={!!selectedRomaneio} onOpenChange={() => setSelectedRomaneio(null)}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto fixed" 
          aria-describedby="romaneio-details-description"
          style={{
            top: detailsDialogPosition.top,
            left: detailsDialogPosition.left,
            transform: detailsDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedRomaneio?.numero} - {selectedRomaneio?.tipo === 'retirada' ? 'Retirada' : 
                                           selectedRomaneio?.tipo === 'devolucao' ? 'Devolução' : 'Transferência'}
            </DialogTitle>
            <DialogDescription id="romaneio-details-description">
              Detalhes completos do romaneio e ações disponíveis
            </DialogDescription>
          </DialogHeader>
          
          {selectedRomaneio && (
            <div className="space-y-6">
              {/* Conteúdo para impressão/PDF (oculto por padrão) */}
              <div id="romaneio-details-print" style={{ display: 'none' }}>
                <div className="header">
                  <h1>ROMANEIO {selectedRomaneio.numero}</h1>
                  <p>{selectedRomaneio.tipo === 'retirada' ? 'RETIRADA' : 
                      selectedRomaneio.tipo === 'devolucao' ? 'DEVOLUÇÃO' : 'TRANSFERÊNCIA'}</p>
                </div>
                
                <div className="info-grid">
                  <div className="section">
                    <h3>Informações Gerais</h3>
                    <p><strong>Data:</strong> {formatDate(selectedRomaneio.data_romaneio || selectedRomaneio.created_at)}</p>
                    <p><strong>Status:</strong> {selectedRomaneio.status || 'pendente'}</p>
                    {selectedRomaneio.colaboradores && (
                      <p><strong>Solicitante:</strong> {selectedRomaneio.colaboradores.nome}</p>
                    )}
                    {selectedRomaneio.responsavel_retirada && (
                      <p><strong>Responsável:</strong> {selectedRomaneio.responsavel_retirada}</p>
                    )}
                  </div>
                  
                  <div className="section">
                    <h3>Localização</h3>
                    {(selectedRomaneio as any).localizacao_origem && (
                      <p><strong>Origem:</strong> {(selectedRomaneio as any).localizacao_origem.nome}</p>
                    )}
                    {(selectedRomaneio as any).localizacao_destino && (
                      <p><strong>Destino:</strong> {(selectedRomaneio as any).localizacao_destino.nome}</p>
                    )}
                    {selectedRomaneio.centro_custo_origem && (
                      <p><strong>Centro de Custo Origem:</strong> {selectedRomaneio.centro_custo_origem.codigo} - {selectedRomaneio.centro_custo_origem.empresas?.nome || selectedRomaneio.centro_custo_origem.descricao}</p>
                    )}
                    {selectedRomaneio.centro_custo_destino && (
                      <p><strong>Centro de Custo Destino:</strong> {selectedRomaneio.centro_custo_destino.codigo} - {selectedRomaneio.centro_custo_destino.empresas?.nome || selectedRomaneio.centro_custo_destino.descricao}</p>
                    )}
                  </div>
                </div>
                
                {selectedRomaneio.observacoes && (
                  <div className="section">
                    <h3>Observações</h3>
                    <p>{selectedRomaneio.observacoes}</p>
                  </div>
                )}
                
                <div className="section">
                  <h3>Itens ({selectedRomaneio.romaneios_itens?.length || 0})</h3>
                  {selectedRomaneio.romaneios_itens && selectedRomaneio.romaneios_itens.length > 0 ? (
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Código</th>
                          <th>Quantidade</th>
                          <th>Número de Série</th>
                          <th>Patrimônio</th>
                          <th>Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRomaneio.romaneios_itens.map((item) => (
                          <tr key={item.id}>
                            <td>{item.materiais_equipamentos?.nome || 'Item não especificado'}</td>
                            <td>{item.materiais_equipamentos?.codigo || 'N/A'}</td>
                            <td>{item.quantidade}</td>
                            <td>{item.numero_serie || '-'}</td>
                            <td>{item.codigo_patrimonial || '-'}</td>
                            <td>{item.observacoes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>Nenhum item encontrado</p>
                  )}
                </div>
              </div>
              
              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Data:</span>
                    <span>{formatDate(selectedRomaneio.data_romaneio || selectedRomaneio.created_at)}</span>
                  </div>
                  
                  {selectedRomaneio.colaboradores && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Solicitante:</span>
                      <span>{selectedRomaneio.colaboradores.nome}</span>
                    </div>
                  )}
                  
                  {selectedRomaneio.responsavel_retirada && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Responsável:</span>
                      <span>{selectedRomaneio.responsavel_retirada}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant={getStatusBadgeVariant(selectedRomaneio.status || 'pendente')}>
                      {selectedRomaneio.status || 'pendente'}
                    </Badge>
                  </div>
                  
                  
                  {selectedRomaneio.centro_custo_origem && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Centro de Custo Origem:</span>
                      <span>{selectedRomaneio.centro_custo_origem.codigo} - {selectedRomaneio.centro_custo_origem.empresas?.nome || selectedRomaneio.centro_custo_origem.descricao}</span>
                    </div>
                  )}
                  
                  {selectedRomaneio.centro_custo_destino && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Centro de Custo Destino:</span>
                      <span>{selectedRomaneio.centro_custo_destino.codigo} - {selectedRomaneio.centro_custo_destino.empresas?.nome || selectedRomaneio.centro_custo_destino.descricao}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedRomaneio.observacoes && (
                <div>
                  <span className="font-medium">Observações:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedRomaneio.observacoes}</p>
                </div>
              )}
              
              <Separator />
              
              {/* Itens do Romaneio */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens ({selectedRomaneio.romaneios_itens?.length || 0})
                </h3>
                
                {selectedRomaneio.romaneios_itens && selectedRomaneio.romaneios_itens.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRomaneio.romaneios_itens.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.materiais_equipamentos?.nome || 'Item não especificado'}</p>
                            <p className="text-sm text-muted-foreground">
                              Código: {item.materiais_equipamentos?.codigo || 'N/A'}
                            </p>
                            {item.materiais_equipamentos?.codigo_ncm && (
                              <p className="text-sm text-muted-foreground">
                                NCM: {item.materiais_equipamentos.codigo_ncm}
                              </p>
                            )}
                            {item.materiais_equipamentos?.centros_custo && (
                              <p className="text-sm text-blue-600">
                                Centro de Custo: {item.materiais_equipamentos.centros_custo.codigo} - {(item.materiais_equipamentos.centros_custo as any).empresas?.nome || (item.materiais_equipamentos.centros_custo as any).descricao}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">Qtd: {item.quantidade}</p>
                            {item.numero_serie && (
                              <p className="text-sm text-muted-foreground">S/N: {item.numero_serie}</p>
                            )}
                            {item.codigo_patrimonial && (
                              <p className="text-sm text-muted-foreground">Patrimônio: {item.codigo_patrimonial}</p>
                            )}
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
                <div className="flex flex-wrap gap-2">
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
                    onClick={handleCloneRomaneio}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clonar
                  </Button>
                  
                  {/* Editar — bloqueado após aprovação (RF-04) */}
                  {documentoEditavel(selectedRomaneio.status) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRomaneio(null)
                        navigate(`/novo-romaneio?tipo=${selectedRomaneio.tipo}&edit=${selectedRomaneio.id}`)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  
                  {/* Aprovar */}
                  {selectedRomaneio.status === 'pendente' && (
                    <Button
                      onClick={async () => {
                        const res = await approveRomaneio(selectedRomaneio.id)
                        if (!res.error) {
                          // Após aprovar, oferecer impressão do comprovante
                          if (window.confirm('Romaneio aprovado! Deseja imprimir o comprovante em PDF?')) {
                            await handleDownloadPDF()
                          }
                        }
                        handleRomaneioUpdated()
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                  )}
                  
                  {/* Cancelar */}
                  {(selectedRomaneio.status === 'pendente' || selectedRomaneio.status === 'aprovado') && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          <Ban className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar Romaneio</AlertDialogTitle>
                          <AlertDialogDescription>
                            O romaneio {selectedRomaneio.numero} será cancelado. Como o documento
                            não pode ser editado nem excluído depois de aprovado, o motivo é
                            obrigatório e fica registrado na auditoria.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="motivo-cancelamento">Motivo do cancelamento</Label>
                          <Textarea
                            id="motivo-cancelamento"
                            value={motivoCancelamento}
                            onChange={(e) => setMotivoCancelamento(e.target.value)}
                            placeholder="Descreva o que motivou o cancelamento"
                            className="resize-none"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setMotivoCancelamento('')}>
                            Voltar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={motivoCancelamento.trim().length < 5}
                            onClick={async () => {
                              await cancelRomaneio(selectedRomaneio.id, motivoCancelamento)
                              setMotivoCancelamento('')
                              handleRomaneioUpdated()
                            }}
                          >
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {/* Excluir — indisponível após aprovação (RF-04) */}
                  {documentoEditavel(selectedRomaneio.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Romaneio</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir permanentemente o romaneio {selectedRomaneio.numero}? 
                          Esta ação não pode ser desfeita e todos os dados serão perdidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await deleteRomaneio(selectedRomaneio.id)
                            handleRomaneioUpdated()
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RomaneiosPage
