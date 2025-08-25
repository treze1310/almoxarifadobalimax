import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Eye, 
  Edit, 
  Trash2, 
  Printer, 
  Download,
  Calendar,
  User,
  MapPin,
  Package,
  Building,
  AlertTriangle
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { generateRomaneoPDFContent } from './RomaneioPDF'
import { companyService } from '@/services/companyService'
import pdfService from '@/services/pdfService'
import { useRomaneios } from '@/hooks/useRomaneios'
import { useToast } from '@/components/ui/use-toast'
import ItensStatusTable from './ItensStatusTable'
import DevolucaoSeletivaDialog from './DevolucaoSeletivaDialog'
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
import type { Tables } from '@/types/database'

type Romaneio = Tables<'romaneios'> & {
  colaboradores?: { nome: string; matricula: string } | null
  centro_custo_origem?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
  centro_custo_destino?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
  localizacao_origem?: { codigo: string; nome: string } | null
  localizacao_destino?: { codigo: string; nome: string } | null
  fornecedores?: { nome: string } | null
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
      unidade_medida: string
    } | null
  }>
}

interface RomaneioDialogProps {
  romaneio: Romaneio
  trigger?: React.ReactNode
  onRomaneioUpdated?: () => void
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

const RomaneioDialog = ({ romaneio, trigger, onRomaneioUpdated }: RomaneioDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteRomaneio } = useRomaneios()
  const { toast } = useToast()

  // 🧹 Cleanup quando componente é desmontado
  useEffect(() => {
    return () => {
      // Abortar geração de PDF em andamento se componente for desmontado
      if (isGeneratingPDF) {
        console.log('🧹 Component unmounting, aborting PDF generation...')
        pdfService.abort()
        setIsGeneratingPDF(false)
      }
    }
  }, [isGeneratingPDF])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteRomaneio(romaneio.id)
      if (result.error === null) {
        toast({
          title: 'Sucesso',
          description: 'Romaneio excluído com sucesso!',
        })
        setIsOpen(false)
        onRomaneioUpdated?.()
      }
    } catch (error) {
      console.error('Erro ao excluir romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir romaneio',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrint = async () => {
    try {
      const company = await companyService.getActiveCompany()
      const printContent = generateRomaneoPDFContent(romaneio, company)
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.print()
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error)
    }
  }

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleDownloadPDF = async (event?: React.MouseEvent) => {
    // Prevenir propagação de eventos
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    // 🚫 Evitar múltiplas gerações simultâneas
    if (isGeneratingPDF || pdfService.isGenerating) {
      toast({
        title: 'Aguarde',
        description: 'Uma geração de PDF já está em andamento.',
        variant: 'default',
      })
      return
    }

    try {
      // 🏢 Buscar dados da empresa com cache
      const company = await companyService.getActiveCompany()
      if (!company) {
        throw new Error('Dados da empresa não encontrados')
      }

      // 🚀 Gerar PDF usando o serviço otimizado
      const success = await pdfService.generatePDF({
        filename: `romaneio-${romaneio.numero}.pdf`,
        htmlContent: generateRomaneoPDFContent(romaneio, company),
        onStart: () => {
          setIsGeneratingPDF(true)
          console.log('🚀 Starting PDF generation for romaneio:', romaneio.numero)
        },
        onFinish: () => {
          setIsGeneratingPDF(false)
          console.log('✅ PDF generation finished for romaneio:', romaneio.numero)
        },
        onError: (error) => {
          console.error('❌ PDF generation failed:', error)
          toast({
            title: 'Erro',
            description: error.message || 'Erro ao gerar PDF',
            variant: 'destructive',
          })
        }
      })

      if (success) {
        toast({
          title: 'Sucesso',
          description: 'PDF gerado com sucesso!',
        })
      }
    } catch (error: any) {
      console.error('❌ Unexpected error in PDF generation:', error)
      setIsGeneratingPDF(false)
      toast({
        title: 'Erro',
        description: error.message || 'Erro inesperado ao gerar PDF',
        variant: 'destructive',
      })
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="romaneio-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Romaneio {romaneio.numero}</span>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(romaneio.status || 'pendente')}>
                {romaneio.status || 'pendente'}
              </Badge>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || pdfService.isGenerating}
                >
                  {(isGeneratingPDF || pdfService.isGenerating) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Confirmar Exclusão
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o romaneio {romaneio.numero}? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div id="romaneio-description" className="sr-only">
          Detalhes do romaneio {romaneio.numero} com informações completas, itens e opções de ação.
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data do Romaneio</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(romaneio.data_romaneio)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Tipo</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {romaneio.tipo}
                    </p>
                  </div>
                </div>

                {romaneio.colaboradores && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Colaborador</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneio.colaboradores.nome}
                      </p>
                    </div>
                  </div>
                )}

                {romaneio.localizacao_origem && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Local de Origem</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneio.localizacao_origem.nome}
                      </p>
                    </div>
                  </div>
                )}

                {romaneio.localizacao_destino && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Local de Destino</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneio.localizacao_destino.nome}
                      </p>
                    </div>
                  </div>
                )}

                {romaneio.centro_custo_origem && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Centro de Custo Origem</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneio.centro_custo_origem.codigo} - {romaneio.centro_custo_origem.empresas?.nome || romaneio.centro_custo_origem.descricao}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {romaneio.responsavel_retirada && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium">Responsável pela Retirada</p>
                    <p className="text-sm text-muted-foreground">
                      {romaneio.responsavel_retirada}
                    </p>
                  </div>
                </>
              )}

              {romaneio.observacoes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium">Observações</p>
                    <p className="text-sm text-muted-foreground">
                      {romaneio.observacoes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Itens do Romaneio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Itens do Romaneio ({romaneio.romaneios_itens?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {romaneio.romaneios_itens && romaneio.romaneios_itens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Código</th>
                        <th className="text-left py-2 px-4">Descrição</th>
                        <th className="text-center py-2 px-4">Qtd</th>
                        <th className="text-left py-2 px-4">Unidade</th>
                        <th className="text-right py-2 px-4">Valor Unit.</th>
                        <th className="text-right py-2 px-4">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {romaneio.romaneios_itens.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 px-4 font-mono text-sm">
                            {item.materiais_equipamentos?.codigo || '-'}
                          </td>
                          <td className="py-2 px-4">
                            {item.materiais_equipamentos?.nome || '-'}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {item.quantidade}
                          </td>
                          <td className="py-2 px-4">
                            {item.materiais_equipamentos?.unidade_medida || '-'}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {item.valor_unitario ? `R$ ${item.valor_unitario.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2 px-4 text-right font-medium">
                            {item.valor_total ? `R$ ${item.valor_total.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {romaneio.valor_total && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Geral</p>
                          <p className="text-lg font-bold">
                            R$ {romaneio.valor_total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>Nenhum item encontrado neste romaneio</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status dos Itens (apenas para retiradas aprovadas) */}
          {romaneio.tipo === 'retirada' && ['aprovado', 'retirado'].includes(romaneio.status || '') && (
            <ItensStatusTable romaneioId={romaneio.id} onItemUpdated={onRomaneioUpdated} />
          )}

          {/* Ações de Devolução */}
          {romaneio.tipo === 'retirada' && ['aprovado', 'retirado'].includes(romaneio.status || '') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações de Devolução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <DevolucaoSeletivaDialog 
                    romaneio={romaneio}
                    onDevolucaoRealizada={onRomaneioUpdated}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações de Auditoria */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Criado em</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(romaneio.created_at)}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Última atualização</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(romaneio.updated_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RomaneioDialog