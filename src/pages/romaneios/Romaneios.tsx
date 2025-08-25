import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  PlusSquare, 
  ArrowLeftRight, 
  FileText, 
  Calendar,
  User,
  MapPin,
  Package,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Check,
  X,
  Ban,
  Download,
  Copy
} from 'lucide-react'
import { useRomaneios } from '@/hooks/useRomaneios'

import { formatDate } from '@/lib/utils'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'


import RomaneioDialog from '@/components/romaneios/RomaneioDialog'
import DevolucaoDialog from '@/components/romaneios/DevolucaoDialog'
import { generateRomaneoPDFContent } from '@/components/romaneios/RomaneioPDF'
import { companyService } from '@/services/companyService'
import { devolucaoService } from '@/services/devolucaoService'
import StatusDevolucaoLabel from '@/components/romaneios/StatusDevolucaoLabel'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

const RomaneiosPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('retiradas')
  const [selectedRomaneio, setSelectedRomaneio] = useState<Romaneio | null>(null)
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


  const retiradas = romaneios.filter(r => r.tipo === 'retirada')
  const devolucoes = romaneios.filter(r => r.tipo === 'devolucao')
  const transferencias = romaneios.filter(r => r.tipo === 'transferencia')

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
      
      // Create a temporary element with the new PDF content
      const printElement = document.createElement('div')
      printElement.innerHTML = generateRomaneoPDFContent(selectedRomaneio, company)
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
            height: printElement.scrollHeight,
            timeout: 10000
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

  const RomaneioCard = ({ romaneio }: { romaneio: Romaneio }) => (
    <Card 
      key={romaneio.id} 
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedRomaneio(romaneio)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{romaneio.numero}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(romaneio.data_romaneio || romaneio.created_at)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(romaneio.status || 'pendente')}>
              {romaneio.status || 'pendente'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/novo-romaneio?tipo=${romaneio.tipo}&edit=${romaneio.id}`)
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {romaneio.colaboradores && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{romaneio.colaboradores.nome}</span>
            </div>
          )}
          
          
          {romaneio.centro_custo_origem && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span>CC Origem: {romaneio.centro_custo_origem.codigo}</span>
            </div>
          )}
          
          {romaneio.centro_custo_destino && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span>CC Destino: {romaneio.centro_custo_destino.codigo}</span>
            </div>
          )}
          
          {romaneio.romaneios_itens && romaneio.romaneios_itens.length > 0 && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{romaneio.romaneios_itens.length} item(s)</span>
            </div>
          )}
        </div>
        
        {romaneio.responsavel_retirada && (
          <div className="mt-3 text-sm text-muted-foreground">
            Responsável: {romaneio.responsavel_retirada}
          </div>
        )}

        {/* Status de devolução para romaneios de retirada aprovados */}
        {romaneio.tipo === 'retirada' && ['aprovado', 'retirado'].includes(romaneio.status || '') && (
          <div className="mt-3">
            {loadingStatus ? (
              <div className="text-xs text-muted-foreground">Carregando status...</div>
            ) : (
              (() => {
                const status = statusDevolucoes.get(romaneio.id)
                return status ? (
                  <StatusDevolucaoLabel statusDevolucao={status} size="sm" />
                ) : null
              })()
            )}
          </div>
        )}
        
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Clique para ver detalhes
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Romaneios</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie retiradas, devoluções e transferências de materiais
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/romaneios/novo?tipo=retirada">
            <Button>
              <PlusSquare className="mr-2 h-4 w-4" />
              Nova Retirada
            </Button>
          </Link>
          <Link to="/romaneios/novo?tipo=devolucao">
            <Button variant="outline">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Nova Devolução
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="retiradas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Retiradas ({retiradas.length})
          </TabsTrigger>
          <TabsTrigger value="devolucoes" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Devoluções ({devolucoes.length})
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Transferências ({transferencias.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="retiradas" className="mt-6">
          {retiradas.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma retirada encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira retirada de materiais
              </p>
              <Link to="/romaneios/novo?tipo=retirada">
                <Button>
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Nova Retirada
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {retiradas.map(romaneio => (
                <RomaneioCard key={romaneio.id} romaneio={romaneio} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="devolucoes" className="mt-6">
          {devolucoes.length === 0 ? (
            <div className="text-center py-12">
              <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma devolução encontrada</h3>
              <p className="text-muted-foreground mb-4">
                As devoluções aparecerão aqui
              </p>
              <Link to="/romaneios/novo?tipo=devolucao">
                <Button>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Nova Devolução
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {devolucoes.map(romaneio => (
                <RomaneioCard key={romaneio.id} romaneio={romaneio} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transferencias" className="mt-6">
          {transferencias.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma transferência encontrada</h3>
              <p className="text-muted-foreground mb-4">
                As transferências aparecerão aqui
              </p>
              <Link to="/romaneios/novo?tipo=transferencia">
                <Button>
                  <Package className="mr-2 h-4 w-4" />
                  Nova Transferência
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {transferencias.map(romaneio => (
                <RomaneioCard key={romaneio.id} romaneio={romaneio} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
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
                    {selectedRomaneio.localizacao_origem && (
                      <p><strong>Origem:</strong> {selectedRomaneio.localizacao_origem.nome}</p>
                    )}
                    {selectedRomaneio.localizacao_destino && (
                      <p><strong>Destino:</strong> {selectedRomaneio.localizacao_destino.nome}</p>
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
                                Centro de Custo: {item.materiais_equipamentos.centros_custo.codigo} - {item.materiais_equipamentos.centros_custo.empresas?.nome || item.materiais_equipamentos.centros_custo.descricao}
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
                  
                  {/* Editar */}
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
                  
                  {/* Aprovar */}
                  {selectedRomaneio.status === 'pendente' && (
                    <Button
                      onClick={async () => {
                        await approveRomaneio(selectedRomaneio.id)
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
                            Tem certeza que deseja cancelar o romaneio {selectedRomaneio.numero}? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await cancelRomaneio(selectedRomaneio.id)
                              handleRomaneioUpdated()
                            }}
                          >
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {/* Excluir */}
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
