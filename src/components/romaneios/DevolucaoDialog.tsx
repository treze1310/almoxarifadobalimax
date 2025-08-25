import { useState } from 'react'
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
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { generateRomaneoPDFContent } from './RomaneioPDF'
import { companyService } from '@/services/companyService'
import { useRomaneios } from '@/hooks/useRomaneios'
import { useToast } from '@/components/ui/use-toast'
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
  centro_custo_origem?: { codigo: string; nome: string } | null
  centro_custo_destino?: { codigo: string; nome: string } | null
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

interface DevolucaoDialogProps {
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

const DevolucaoDialog = ({ romaneio, trigger, onRomaneioUpdated }: DevolucaoDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteRomaneio } = useRomaneios()
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteRomaneio(romaneio.id)
      if (result.error === null) {
        toast({
          title: 'Sucesso',
          description: 'Devolução excluída com sucesso!',
        })
        setIsOpen(false)
        onRomaneioUpdated?.()
      }
    } catch (error) {
      console.error('Erro ao excluir devolução:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir devolução',
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

  const handleDownloadPDF = async (event?: React.MouseEvent) => {
    // Prevenir propagação de eventos
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    let printElement: HTMLElement | null = null

    try {
      // Importação dinâmica com fallback para commonjs
      const jsPDFModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      
      const jsPDF = jsPDFModule.default || jsPDFModule
      const html2canvas = html2canvasModule.default || html2canvasModule
      
      const company = await companyService.getActiveCompany()
      printElement = document.createElement('div')
      printElement.id = `pdf-temp-${Date.now()}` // ID único
      printElement.innerHTML = generateRomaneoPDFContent(romaneio, company)
      printElement.style.position = 'absolute'
      printElement.style.left = '-9999px'
      printElement.style.top = '0'
      printElement.style.width = '210mm'
      printElement.style.backgroundColor = 'white'
      printElement.style.zIndex = '-1000'
      document.body.appendChild(printElement)

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false,
        removeContainer: false
      })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF()
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`devolucao-${romaneio.numero}.pdf`)
      
      toast({
        title: 'Sucesso',
        description: 'PDF de devolução gerado com sucesso!',
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF',
        variant: 'destructive',
      })
    } finally {
      // Garantir limpeza do elemento temporário com delay
      if (printElement) {
        setTimeout(() => {
          if (printElement && printElement.parentNode) {
            try {
              document.body.removeChild(printElement)
            } catch (cleanupError) {
              console.warn('Erro na limpeza do elemento temporário:', cleanupError)
            }
          }
        }, 100)
      }
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Ver Devolução
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="devolucao-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <span>Devolução {romaneio.numero}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(romaneio.status || 'pendente')}>
                {romaneio.status || 'pendente'}
              </Badge>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4" />
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
                        Tem certeza que deseja excluir a devolução {romaneio.numero}? 
                        Esta ação não pode ser desfeita e o estoque será ajustado automaticamente.
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

        <div id="devolucao-description" className="sr-only">
          Detalhes da devolução {romaneio.numero} com informações completas, itens devolvidos e opções de ação.
        </div>

        <div className="space-y-6">
          {/* Referência ao Romaneio Original */}
          {romaneio.observacoes && romaneio.observacoes.includes('referente ao romaneio') && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5 text-blue-600" />
                  Referência ao Romaneio Original
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {romaneio.observacoes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Informações da Devolução */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Devolução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data da Devolução</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(romaneio.data_romaneio)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
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
                      <p className="text-sm font-medium">Devolvido de</p>
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
                      <p className="text-sm font-medium">Devolvido para</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneio.localizacao_destino.nome}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {romaneio.responsavel_retirada && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium">Responsável pela Devolução</p>
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

          {/* Itens Devolvidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Itens Devolvidos ({romaneio.romaneios_itens?.length || 0})
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
                        <th className="text-center py-2 px-4">Qtd Devolvida</th>
                        <th className="text-left py-2 px-4">Unidade</th>
                        <th className="text-left py-2 px-4">Observações</th>
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
                          <td className="py-2 px-4 text-center font-medium">
                            {item.quantidade}
                          </td>
                          <td className="py-2 px-4">
                            {item.materiais_equipamentos?.unidade_medida || '-'}
                          </td>
                          <td className="py-2 px-4 text-sm">
                            {item.observacoes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>Nenhum item encontrado nesta devolução</p>
                </div>
              )}
            </CardContent>
          </Card>

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

export default DevolucaoDialog