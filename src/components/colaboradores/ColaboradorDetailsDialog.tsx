import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Edit, 
  Printer, 
  Download,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building,
  CreditCard,
  Shield,
  Package,
  AlertTriangle,
  Users,
  Wrench
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { generateFichaEPIPDF } from './FichaEPIPDF'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { ColaboradorForm, type ColaboradorFormData } from './ColaboradorForm'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import { colaboradorMateriaisService, type MaterialEquipamentoVinculado } from '@/services/colaboradorMateriaisService'

interface ColaboradorDetailsDialogProps {
  colaboradorId: string | null
  isOpen: boolean
  onClose: () => void
  onColaboradorUpdated?: () => void
}

interface ColaboradorDetalhado extends Tables<'colaboradores'> {
  empresa?: { nome: string; cnpj: string; logo_url: string | null } | null
  centro_custo?: { codigo: string; descricao: string | null } | null
}

interface EPIVinculadoRomaneio {
  romaneio_id: string
  romaneio_numero: string
  romaneio_data: string
  item_id: string
  quantidade: number
  material_nome: string
  material_codigo: string
  numero_ca?: string | null
  status: 'retirado' | 'devolvido' | 'parcialmente_devolvido'
}

const ColaboradorDetailsDialog = ({ colaboradorId, isOpen, onClose, onColaboradorUpdated }: ColaboradorDetailsDialogProps) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [colaborador, setColaborador] = useState<ColaboradorDetalhado | null>(null)
  const [episRomaneio, setEpisRomaneio] = useState<EPIVinculadoRomaneio[]>([])
  const [materiaisEquipamentos, setMateriaisEquipamentos] = useState<MaterialEquipamentoVinculado[]>([])
  const [loadingEpis, setLoadingEpis] = useState(false)
  const [loadingMateriais, setLoadingMateriais] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    if (isOpen && colaboradorId) {
      loadColaboradorDetails()
      loadEPIsRomaneio()
      loadMateriaisEquipamentos()
    }
  }, [isOpen, colaboradorId])

  const loadColaboradorDetails = async () => {
    if (!colaboradorId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          empresa:empresas(nome, cnpj, logo_url),
          centro_custo:centros_custo(codigo, descricao)
        `)
        .eq('id', colaboradorId)
        .single()

      if (error) throw error
      setColaborador(data)
    } catch (error) {
      console.error('Erro ao carregar dados do colaborador:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do colaborador",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadEPIsRomaneio = async () => {
    if (!colaboradorId) return

    setLoadingEpis(true)
    try {
      const { data, error } = await supabase
        .from('romaneios')
        .select(`
          id,
          numero,
          data_romaneio,
          romaneios_itens!inner(
            id,
            quantidade,
            materiais_equipamentos!inner(
              codigo,
              nome,
              numero_ca,
              is_epi
            )
          )
        `)
        .eq('colaborador_id', colaboradorId)
        .eq('tipo', 'retirada')
        .order('data_romaneio', { ascending: false })

      if (error) throw error

      const episFormatados: EPIVinculadoRomaneio[] = []
      
      data?.forEach(romaneio => {
        romaneio.romaneios_itens?.forEach(item => {
          if (item.materiais_equipamentos?.is_epi) {
            episFormatados.push({
              romaneio_id: romaneio.id,
              romaneio_numero: romaneio.numero,
              romaneio_data: romaneio.data_romaneio,
              item_id: item.id,
              quantidade: item.quantidade,
              material_nome: item.materiais_equipamentos.nome,
              material_codigo: item.materiais_equipamentos.codigo,
              numero_ca: item.materiais_equipamentos.numero_ca,
              status: 'retirado' // Placeholder - pode ser refinado com lógica de devolução
            })
          }
        })
      })

      setEpisRomaneio(episFormatados)
    } catch (error) {
      console.error('❌ Error loading EPIs from romaneios:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar EPIs vinculados",
        variant: "destructive",
      })
    } finally {
      setLoadingEpis(false)
    }
  }

  const loadMateriaisEquipamentos = async () => {
    if (!colaboradorId) return

    setLoadingMateriais(true)
    try {
      const { data, error } = await colaboradorMateriaisService.getMateriaisEquipamentosVinculados(colaboradorId)

      if (error) throw error

      setMateriaisEquipamentos(data || [])
    } catch (error) {
      console.error('❌ Error loading materiais/equipamentos from romaneios:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar materiais/equipamentos vinculados",
        variant: "destructive",
      })
    } finally {
      setLoadingMateriais(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async (data: ColaboradorFormData) => {
    try {
      setLoading(true)
      const { data: updated, error } = await supabase
        .from('colaboradores')
        .update(data)
        .eq('id', colaboradorId as string)
        .select(`
          *,
          empresa:empresas(nome, cnpj, logo_url),
          centro_custo:centros_custo(codigo, descricao)
        `)
        .single()

      if (error) throw error
      
      setColaborador(updated as any)
      setIsEditing(false)
      onColaboradorUpdated?.()
      toast({ 
        title: 'Sucesso', 
        description: 'Colaborador atualizado com sucesso.' 
      })
    } catch (error) {
      console.error('Erro ao atualizar colaborador:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar o colaborador.', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadFichaEPI = async () => {
    if (!colaboradorId) return

    setIsGeneratingPDF(true)
    try {
      await generateFichaEPIPDF(colaboradorId)
      toast({
        title: "Sucesso",
        description: "Ficha de EPI baixada com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao gerar PDF da ficha de EPI:', error)
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF da ficha de EPI",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const getStatusBadgeVariant = (ativo: boolean) => {
    return ativo ? 'default' : 'destructive'
  }

  if (!isOpen || !colaboradorId) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span>{loading ? 'Carregando...' : colaborador?.nome || `Colaborador ${colaboradorId}`}</span>
            </div>
            <div className="flex items-center gap-2">
              {colaborador && (
                <Badge variant={getStatusBadgeVariant(colaborador.ativo)}>
                  {colaborador.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              )}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={handleEdit} disabled={isEditing}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadFichaEPI}
                  disabled={isGeneratingPDF}
                  title="Baixar Ficha de EPI"
                >
                  {isGeneratingPDF ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie todas as informações do colaborador, incluindo dados pessoais, EPIs e materiais/equipamentos vinculados.
          </DialogDescription>
        </DialogHeader>



        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        ) : colaborador ? (
          <>
            {isEditing ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Editando Colaborador</h3>
                  <p className="text-sm text-blue-600">Faça as alterações necessárias nos dados do colaborador.</p>
                </div>
                <ColaboradorForm
                  initialData={colaborador}
                  onSubmit={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="epis" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    EPIs ({episRomaneio.length})
                  </TabsTrigger>
                  <TabsTrigger value="materiais" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Materiais ({materiaisEquipamentos.length})
                  </TabsTrigger>
                  <TabsTrigger value="auditoria" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Auditoria
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6 mt-6">
                  {/* Informações Pessoais */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Informações Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">CPF</p>
                            <p className="text-sm text-muted-foreground">
                              {colaborador.cpf || 'Não informado'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">RG</p>
                            <p className="text-sm text-muted-foreground">
                              {colaborador.rg || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Matrícula</p>
                            <p className="text-sm text-muted-foreground">
                              {colaborador.matricula || 'Não informada'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">
                              {colaborador.email || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Telefone</p>
                            <p className="text-sm text-muted-foreground">
                              {colaborador.telefone || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Cargo</p>
                            <p className="text-sm text-muted-foreground">
                              {colaborador.cargo || 'Não informado'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Informações Organizacionais */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Informações Organizacionais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {colaborador.empresa && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Empresa</p>
                              <p className="text-sm text-muted-foreground">
                                {colaborador.empresa.nome}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                CNPJ: {colaborador.empresa.cnpj}
                              </p>
                            </div>
                          </div>
                        )}

                        {colaborador.centro_custo && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Centro de Custo</p>
                              <p className="text-sm text-muted-foreground">
                                {colaborador.centro_custo.codigo} - {colaborador.centro_custo.descricao}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="epis" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        EPIs Vinculados ({episRomaneio.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingEpis ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Carregando EPIs...</p>
                        </div>
                      ) : episRomaneio.length > 0 ? (
                        <div className="space-y-4">
                          {episRomaneio.map((epi) => (
                            <div key={`${epi.romaneio_id}-${epi.item_id}`} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg text-gray-900">{epi.material_nome}</h4>
                                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                                    <div className="flex items-center gap-4">
                                      <span><Package className="w-4 h-4 inline mr-1" />Código: {epi.material_codigo}</span>
                                      {epi.numero_ca && <span><Shield className="w-4 h-4 inline mr-1" />CA: {epi.numero_ca}</span>}
                                    </div>
                                    <div><Calendar className="w-4 h-4 inline mr-1" />Quantidade: {epi.quantidade}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge 
                                    variant={epi.status === 'devolvido' ? 'destructive' : 'default'}
                                    className="mb-2"
                                  >
                                    {epi.status === 'devolvido' ? 'Devolvido' : 'Em Uso'}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="border-t pt-3 text-xs text-gray-500 bg-white rounded p-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="font-medium">Romaneio:</span> {epi.romaneio_numero}
                                  </div>
                                  <div>
                                    <span className="font-medium">Data Retirada:</span> {format(new Date(epi.romaneio_data), 'dd/MM/yyyy', { locale: ptBR })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Shield className="mx-auto h-12 w-12 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum EPI Encontrado</h3>
                          <p className="text-gray-600">Este colaborador não possui EPIs vinculados através de romaneios de retirada.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="materiais" className="space-y-6 mt-6">
                  {/* Resumo dos Materiais/Equipamentos */}
                  {materiaisEquipamentos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-800">Total de Itens</p>
                              <p className="text-2xl font-bold text-blue-900">{materiaisEquipamentos.length}</p>
                            </div>
                            <Package className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-800">Em Uso</p>
                              <p className="text-2xl font-bold text-green-900">
                                {materiaisEquipamentos.filter(m => m.status === 'retirado').length}
                              </p>
                            </div>
                            <Wrench className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-orange-800">Devolvidos</p>
                              <p className="text-2xl font-bold text-orange-900">
                                {materiaisEquipamentos.filter(m => m.status === 'devolvido').length}
                              </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-purple-800">Valor Total</p>
                              <p className="text-2xl font-bold text-purple-900">
                                R$ {materiaisEquipamentos
                                  .filter(m => m.valor_total)
                                  .reduce((acc, m) => acc + (m.valor_total || 0), 0)
                                  .toFixed(2)
                                }
                              </p>
                            </div>
                            <Building className="h-8 w-8 text-purple-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Materiais/Equipamentos Vinculados ({materiaisEquipamentos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingMateriais ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Carregando materiais/equipamentos...</p>
                        </div>
                      ) : materiaisEquipamentos.length > 0 ? (
                        <div className="space-y-4">
                          {materiaisEquipamentos.map((material) => (
                            <div 
                              key={`${material.romaneio_id}-${material.item_id}`} 
                              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                                material.status === 'devolvido' 
                                  ? 'bg-gray-50 border-gray-300' 
                                  : 'bg-green-50 border-green-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-lg text-gray-900">{material.material_nome}</h4>
                                    {material.material_categoria && (
                                      <Badge variant="outline" className="text-xs">
                                        {material.material_categoria}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-500" />
                                        <span><strong>Código:</strong> {material.material_codigo}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span><strong>Quantidade:</strong> {material.quantidade}</span>
                                      </div>
                                      {material.numero_serie && (
                                        <div className="flex items-center gap-2">
                                          <CreditCard className="w-4 h-4 text-gray-500" />
                                          <span><strong>Nº Série:</strong> {material.numero_serie}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-1">
                                      {material.valor_unitario && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-green-600">💰</span>
                                          <span><strong>Valor Unit.:</strong> R$ {material.valor_unitario.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {material.codigo_patrimonial && (
                                        <div className="flex items-center gap-2">
                                          <Building className="w-4 h-4 text-gray-500" />
                                          <span><strong>Patrimônio:</strong> {material.codigo_patrimonial}</span>
                                        </div>
                                      )}
                                      {material.valor_total && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-blue-600">🏷️</span>
                                          <span><strong>Total:</strong> R$ {material.valor_total.toFixed(2)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {material.observacoes && (
                                    <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                                      <strong>Observações:</strong> {material.observacoes}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-right ml-4">
                                  <Badge 
                                    variant={material.status === 'devolvido' ? 'destructive' : 'default'}
                                    className="mb-2"
                                  >
                                    {material.status === 'devolvido' ? '↩️ Devolvido' : '🔧 Em Uso'}
                                  </Badge>
                                </div>
                              </div>
                              
                              <Separator className="my-3" />
                              
                              <div className="text-xs text-gray-500 bg-white rounded p-3 border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span><strong>Romaneio:</strong> {material.romaneio_numero}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span><strong>Data Retirada:</strong> {format(new Date(material.romaneio_data), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                  </div>
                                  {material.data_devolucao && (
                                    <div className="md:col-span-2 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4" />
                                      <span><strong>Data Devolução:</strong> {format(new Date(material.data_devolucao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Wrench className="h-12 w-12 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum Material/Equipamento Encontrado</h3>
                          <p className="text-gray-600 max-w-sm mx-auto">
                            Este colaborador não possui materiais ou equipamentos vinculados através de romaneios de retirada.
                          </p>
                          <div className="mt-4 text-sm text-gray-500">
                            <p>💡 Dica: Materiais são vinculados através de romaneios de retirada</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="auditoria" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Informações de Auditoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Criado em</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(colaborador.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Última atualização</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(colaborador.updated_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        ) : (
          <div className="p-4 text-center">
            <div className="text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-4" />
              <p>Colaborador não encontrado</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ColaboradorDetailsDialog