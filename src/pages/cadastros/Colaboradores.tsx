import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, User, Mail, Phone, IdCard, Search, Briefcase, Building, Edit, FileText, Calendar, MapPin, CreditCard, Shield, Package, AlertTriangle, Users, Trash2, UserCheck, UserX } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { ColaboradorForm } from '@/components/colaboradores/ColaboradorForm'
import { type ColaboradorFormData } from '@/lib/validations'
import { generateFichaEPIPDF } from '@/components/colaboradores/FichaEPIPDF'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import { supabase } from '@/lib/supabase'
import { formatDate, formatDateTime } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Tables } from '@/types/database'


type Colaborador = Tables<'colaboradores'>

interface ColaboradorDetalhado extends Tables<'colaboradores'> {
  empresas?: { nome: string } | null
  centros_custo?: { codigo: string; descricao: string | null } | null
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

const ColaboradoresPage = () => {
  const { toast } = useToast()
  const { 
    data: colaboradores, 
    loading, 
    create, 
    update, 
    remove,
    fetchData 
  } = useSupabaseTable('colaboradores')
  
  const [search, setSearch] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorDetalhado | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingEpis, setLoadingEpis] = useState(false)
  const [episRomaneio, setEpisRomaneio] = useState<EPIVinculadoRomaneio[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingColaborador, setDeletingColaborador] = useState<ColaboradorDetalhado | null>(null)
  const [deleteDialogPosition, setDeleteDialogPosition] = useState({ top: '50vh', left: '50vw' })
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusDialogPosition, setStatusDialogPosition] = useState({ top: '50vh', left: '50vw' })

  // Hooks para centralização inteligente dos dialogs
  const createDialogPosition = useCenteredDialog(isCreateDialogOpen)
  const detailsDialogPosition = useCenteredDialog(showDetailsDialog)

  // Recalcular posição do diálogo de detalhes após mudanças de status
  useEffect(() => {
    if (showDetailsDialog && selectedColaborador) {
      // Pequeno delay para permitir que o DOM se atualize
      setTimeout(() => {
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
        
        const centerY = scrollTop + (viewportHeight / 2)
        const centerX = scrollLeft + (viewportWidth / 2)
        
        // Forçar atualização da posição via evento customizado
        const detailsDialog = document.querySelector('[aria-describedby="colaborador-details-description"]')
        if (detailsDialog && detailsDialog instanceof HTMLElement) {
          detailsDialog.style.top = `${centerY}px`
          detailsDialog.style.left = `${centerX}px`
          detailsDialog.style.transform = 'translate(-50%, -50%)'
        }
      }, 200)
    }
  }, [selectedColaborador?.ativo])

  // Calcular posição central da viewport atual quando abre dialog de exclusão
  useEffect(() => {
    if (showDeleteDialog) {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      const centerY = scrollTop + (viewportHeight / 2)
      const centerX = scrollLeft + (viewportWidth / 2)
      
      setDeleteDialogPosition({
        top: `${centerY}px`,
        left: `${centerX}px`
      })
    }
  }, [showDeleteDialog])

  // Calcular posição central da viewport atual quando abre dialog de status
  useEffect(() => {
    if (showStatusDialog) {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      const centerY = scrollTop + (viewportHeight / 2)
      const centerX = scrollLeft + (viewportWidth / 2)
      
      setStatusDialogPosition({
        top: `${centerY}px`,
        left: `${centerX}px`
      })
    }
  }, [showStatusDialog])

  // Fetch colaboradores data
  React.useEffect(() => {
    fetchData({
      order: { column: 'nome', ascending: true }
    })
  }, [])

  const filteredColaboradores = (colaboradores as Colaborador[]).filter(colaborador =>
    colaborador.nome.toLowerCase().includes(search.toLowerCase()) ||
    (colaborador.cpf && colaborador.cpf.includes(search.replace(/\D/g, ''))) ||
    (colaborador.matricula && colaborador.matricula.toLowerCase().includes(search.toLowerCase())) ||
    (colaborador.cargo && colaborador.cargo.toLowerCase().includes(search.toLowerCase())) ||
    (colaborador.setor && colaborador.setor.toLowerCase().includes(search.toLowerCase())) ||
    (colaborador.email && colaborador.email.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = async (data: any) => {
    const result = await create(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
      fetchData({ order: { column: 'nome', ascending: true } })
    }
  }

  const handleColaboradorClick = async (colaborador: Colaborador) => {
    console.log('🖱️ Card clicked:', colaborador.nome, 'ID:', colaborador.id)
    setShowDetailsDialog(true)
    await loadColaboradorDetails(colaborador.id)
    await loadEPIsRomaneio(colaborador.id)
    console.log('📱 Dialog state set to:', true)
  }

  const handleColaboradorUpdated = () => {
    fetchData({ order: { column: 'nome', ascending: true } })
  }

  const loadColaboradorDetails = async (colaboradorId: string) => {
    setLoadingDetails(true)
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          empresas:empresa_id (nome),
          centros_custo:centro_custo_id (codigo, descricao)
        `)
        .eq('id', colaboradorId)
        .single()

      if (error) throw error
      setSelectedColaborador(data as ColaboradorDetalhado)
    } catch (error) {
      console.error('Erro ao carregar detalhes do colaborador:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do colaborador",
        variant: "destructive",
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const loadEPIsRomaneio = async (colaboradorId: string) => {
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
        romaneio.romaneios_itens?.forEach((item: any) => {
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
              status: 'retirado'
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

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async (data: ColaboradorFormData) => {
    try {
      setLoadingDetails(true)
      const { data: updated, error } = await supabase
        .from('colaboradores')
        .update(data)
        .eq('id', selectedColaborador?.id as string)
        .select(`
          *,
          empresas:empresa_id(nome),
          centros_custo:centro_custo_id(codigo, descricao)
        `)
        .single()

      if (error) throw error
      
      setSelectedColaborador(updated as ColaboradorDetalhado)
      setIsEditing(false)
      handleColaboradorUpdated()
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
      setLoadingDetails(false)
    }
  }

  const handleDownloadFichaEPI = async () => {
    if (!selectedColaborador?.id) return

    setIsGeneratingPDF(true)
    try {
      console.log('📋 Iniciando geração de ficha EPI para:', selectedColaborador.nome)
      await generateFichaEPIPDF(selectedColaborador.id)
      
      toast({
        title: "Sucesso",
        description: "Ficha de EPI baixada com sucesso!",
      })
      console.log('✅ Ficha EPI gerada com sucesso')
    } catch (error) {
      console.error('❌ Erro ao gerar PDF da ficha de EPI:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar PDF da ficha de EPI",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
      console.log('🏁 Processo de geração de PDF finalizado')
    }
  }

  const handleDelete = () => {
    if (selectedColaborador) {
      setDeletingColaborador(selectedColaborador)
      setShowDeleteDialog(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingColaborador) return

    try {
      const result = await remove(deletingColaborador.id)
      if (result.error === null) {
        toast({
          title: "Sucesso",
          description: "Colaborador excluído com sucesso!",
        })
        setShowDeleteDialog(false)
        setShowDetailsDialog(false)
        setSelectedColaborador(null)
        setDeletingColaborador(null)
        fetchData({ order: { column: 'nome', ascending: true } })
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir colaborador",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao excluir colaborador:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir colaborador",
        variant: "destructive",
      })
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteDialog(false)
    setDeletingColaborador(null)
  }

  const handleToggleStatus = () => {
    if (selectedColaborador) {
      setShowStatusDialog(true)
    }
  }

  const handleConfirmToggleStatus = async () => {
    if (!selectedColaborador) return

    try {
      const newStatus = !selectedColaborador.ativo
      const { data, error } = await supabase
        .from('colaboradores')
        .update({ ativo: newStatus })
        .eq('id', selectedColaborador.id)
        .select(`
          *,
          empresas:empresa_id(nome),
          centros_custo:centro_custo_id(codigo, descricao)
        `)
        .single()

      if (error) throw error

      setSelectedColaborador(data as ColaboradorDetalhado)
      fetchData({ order: { column: 'nome', ascending: true } })
      toast({
        title: "Sucesso",
        description: `Colaborador ${newStatus ? 'ativado' : 'desativado'} com sucesso!`,
      })
      setShowStatusDialog(false)
    } catch (error) {
      console.error('Erro ao alterar status do colaborador:', error)
      toast({
        title: "Erro",
        description: "Erro ao alterar status do colaborador",
        variant: "destructive",
      })
    }
  }

  const handleCancelToggleStatus = () => {
    setShowStatusDialog(false)
  }

  const getStatusBadgeVariant = (ativo: boolean) => {
    return ativo ? 'default' : 'destructive'
  }

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-'
    const numbers = cpf.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const getInitials = (nome: string) => {
    const names = nome.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return nome.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cadastro de Colaboradores</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastro de Colaboradores</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">
          {filteredColaboradores.length} colaborador{filteredColaboradores.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredColaboradores.length > 0 ? (
              filteredColaboradores.map((colaborador) => (
            <Card 
              key={colaborador.id} 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => handleColaboradorClick(colaborador)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={colaborador.foto_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                          {getInitials(colaborador.nome)}
                        </AvatarFallback>
                      </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight">
                        {colaborador.nome}
                      </CardTitle>
                      {colaborador.matricula && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Matrícula: {colaborador.matricula}
                        </p>
                        )}
                      </div>
                    </div>
                  <Badge variant={colaborador.ativo ? 'default' : 'secondary'} className="text-xs">
                    {colaborador.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                      {colaborador.cargo && (
                  <div className="flex items-center text-sm">
                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{colaborador.cargo}</span>
                  </div>
                      )}
                      {colaborador.setor && (
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{colaborador.setor}</span>
                  </div>
                      )}
                {colaborador.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{colaborador.email}</span>
                    </div>
                )}
                {colaborador.cpf && (
                  <div className="flex items-center text-sm">
                    <IdCard className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatCPF(colaborador.cpf)}</span>
                        </div>
                )}
                {colaborador.telefone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{colaborador.telefone}</span>
                      </div>
                )}
              </CardContent>
            </Card>
              ))
            ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum colaborador encontrado</h3>
                <p className="text-muted-foreground text-center">
                  {search ? 'Nenhum colaborador encontrado com os critérios de busca.' : 'Nenhum colaborador cadastrado.'}
                </p>
                {!search && (
                  
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Cadastrar Primeiro Colaborador
                    </Button>
                  
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent 
          className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto fixed"
          style={{
            top: createDialogPosition.top,
            left: createDialogPosition.left,
            transform: createDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo colaborador.
            </DialogDescription>
          </DialogHeader>
          <ColaboradorForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Colaborador */}
      <Dialog open={showDetailsDialog} onOpenChange={() => {
        setShowDetailsDialog(false)
        setSelectedColaborador(null)
        setIsEditing(false)
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto fixed" 
          aria-describedby="colaborador-details-description"
          style={{
            top: detailsDialogPosition.top,
            left: detailsDialogPosition.left,
            transform: detailsDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span>{loadingDetails ? 'Carregando...' : selectedColaborador?.nome || 'Colaborador'}</span>
                {selectedColaborador && (
                  <Badge variant={getStatusBadgeVariant(selectedColaborador.ativo)}>
                    {selectedColaborador.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Ações rápidas */}
                
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleEdit} 
                    disabled={isEditing}
                    title="Editar colaborador"
                  >
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
                

                {/* Ações de status e exclusão - movidas dos três pontos */}
                
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleToggleStatus}
                    title={selectedColaborador?.ativo ? "Desativar colaborador" : "Ativar colaborador"}
                  >
                    {selectedColaborador?.ativo ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                

                
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    title="Excluir colaborador"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                
              </div>
            </DialogTitle>
            <DialogDescription id="colaborador-details-description">
              Detalhes completos do colaborador e ações disponíveis. 
              {selectedColaborador && (
                <span>
                  {' '}Colaborador {selectedColaborador.ativo ? 'ativo' : 'inativo'} 
                  {selectedColaborador.cargo && ` trabalhando como ${selectedColaborador.cargo}`}
                  {selectedColaborador.setor && ` no setor ${selectedColaborador.setor}`}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedColaborador && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Editando Colaborador</h3>
                    <p className="text-sm text-blue-600">Faça as alterações necessárias nos dados do colaborador.</p>
                  </div>
            <ColaboradorForm 
                    initialData={selectedColaborador}
                    onSubmit={handleSaveEdit}
                    onCancel={handleCancelEdit}
                  />
                </div>
              ) : (
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="epis">EPIs Vinculados ({episRomaneio.length})</TabsTrigger>
                    <TabsTrigger value="audit">Auditoria</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-6">
                    {/* Estatísticas Rápidas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium">EPIs Ativos</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {episRomaneio.filter(epi => epi.status === 'retirado').length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">Total EPIs</p>
                              <p className="text-2xl font-bold text-green-600">
                                {episRomaneio.length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="text-sm font-medium">Cadastrado há</p>
                              <p className="text-2xl font-bold text-purple-600">
                                {selectedColaborador.created_at ? 
                                  Math.floor((new Date().getTime() - new Date(selectedColaborador.created_at).getTime()) / (1000 * 60 * 60 * 24)) + 'd' 
                                  : '0d'
                                }
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={selectedColaborador.ativo ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {selectedColaborador.ativo ? 'ATIVO' : 'INATIVO'}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-medium">Status</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedColaborador.ativo ? 'Colaborador ativo no sistema' : 'Colaborador inativo'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Informações Pessoais */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Informações Pessoais
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <IdCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">CPF</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCPF(selectedColaborador.cpf)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Matrícula</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.matricula || 'Não informada'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.email || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Telefone</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.telefone || 'Não informado'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Informações Organizacionais */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Informações Organizacionais
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Cargo</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.cargo || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Setor</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.setor || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Empresa</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.empresas?.nome || 'Não informada'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Centro de Custo</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedColaborador.centros_custo ? 
                                `${selectedColaborador.centros_custo.codigo} - ${selectedColaborador.centros_custo.descricao}` : 
                                'Não informado'
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="epis" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          EPIs Vinculados
                          <Badge variant="secondary">{episRomaneio.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingEpis ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                            <span className="ml-2">Carregando EPIs...</span>
                          </div>
                        ) : episRomaneio.length > 0 ? (
                          <div className="space-y-3">
                            {episRomaneio.map((epi, index) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{epi.material_nome}</h4>
                                    <p className="text-sm text-muted-foreground">Código: {epi.material_codigo}</p>
                                    {epi.numero_ca && (
                                      <p className="text-sm text-muted-foreground">CA: {epi.numero_ca}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={epi.status === 'retirado' ? 'default' : 'secondary'}>
                                      {epi.status === 'retirado' ? 'Em uso' : 'Devolvido'}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Qtd: {epi.quantidade}
                                    </p>
                                  </div>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Romaneio: {epi.romaneio_numero}</span>
                                  <span>Data: {formatDate(epi.romaneio_data)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-8 text-muted-foreground">
                            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum EPI vinculado a este colaborador.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="audit" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Informações de Auditoria
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Data de Criação</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedColaborador.created_at 
                                  ? formatDateTime(selectedColaborador.created_at) 
                                  : 'Não disponível'
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Última Atualização</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedColaborador.updated_at 
                                  ? formatDateTime(selectedColaborador.updated_at) 
                                  : 'Não disponível'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Status */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent 
          className="sm:max-w-[425px]"
          style={{
            position: 'absolute',
            top: statusDialogPosition.top,
            left: statusDialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 9999,
            width: 'min(95vw, 425px)'
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedColaborador?.ativo ? (
                <>
                  <UserX className="h-5 w-5 text-orange-600" />
                  Desativar Colaborador
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Ativar Colaborador
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedColaborador?.ativo ? (
                <>
                  Tem certeza que deseja desativar o colaborador <strong>{selectedColaborador?.nome}</strong>?
                  <br /><br />
                  O colaborador será marcado como inativo no sistema, mas seus dados e histórico serão preservados.
                </>
              ) : (
                <>
                  Tem certeza que deseja ativar o colaborador <strong>{selectedColaborador?.nome}</strong>?
                  <br /><br />
                  O colaborador voltará a ter acesso ativo ao sistema.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelToggleStatus}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmToggleStatus}
              className={selectedColaborador?.ativo 
                ? "bg-orange-600 text-white hover:bg-orange-700" 
                : "bg-green-600 text-white hover:bg-green-700"
              }
            >
              {selectedColaborador?.ativo ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Desativar
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Ativar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent 
          className="sm:max-w-[425px]"
          style={{
            position: 'absolute',
            top: deleteDialogPosition.top,
            left: deleteDialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 9999,
            width: 'min(95vw, 425px)'
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o colaborador <strong>{deletingColaborador?.nome}</strong>?
              <br />
              <br />
              <strong>Esta ação não pode ser desfeita</strong> e todos os dados do colaborador serão permanentemente removidos, incluindo:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Informações pessoais e organizacionais</li>
                <li>Histórico de EPIs vinculados</li>
                <li>Registros de romaneios</li>
                <li>Dados de auditoria</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ColaboradoresPage





