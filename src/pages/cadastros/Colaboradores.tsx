import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, User, Mail, Phone, IdCard, Briefcase, Building, Edit, FileText, Calendar, CreditCard, Shield, Package, AlertTriangle, Users, Trash2, UserCheck, UserX } from 'lucide-react'
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
import {
  capitalizarTexto,
  formatarCPF,
  mascararCPF,
  mascararEmail,
  mascararTelefone,
} from '@/lib/dadosPessoais'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { registrarAuditoria } from '@/services/auditoriaService'
import { useAbrirItemDaUrl } from '@/hooks/useAbrirItemDaUrl'
import { generateFichaEPIPDF } from '@/components/colaboradores/FichaEPIPDF'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { fetchRomaneiosRetiradaDoColaborador } from '@/services/colaboradorEpiRomaneiosService'
import { formatDate, formatDateTime } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Tables } from '@/types/database'


// A consulta traz o centro de custo por join; o tipo gerado da tabela não inclui
type Colaborador = Tables<'colaboradores'> & {
  centros_custo?: { codigo: string; descricao: string | null } | null
}

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

const onlyDigits = (value?: string | null) => (value || '').replace(/\D/g, '')

const ColaboradoresPage = () => {
  const { toast } = useToast()
  const { 
    data: colaboradores, 
    loading, 
    create, 
    update, 
    remove,
    fetchData 
  } = useSupabaseTable('colaboradores', { order: { column: 'nome' } })
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorDetalhado | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingEpis, setLoadingEpis] = useState(false)
  const [episRomaneio, setEpisRomaneio] = useState<EPIVinculadoRomaneio[]>([])
  const [isEditing, setIsEditing] = useState(false)
  // RF-06 / RNF-06: CPF completo exige permissão e o acesso é auditado
  const [cpfRevelado, setCpfRevelado] = useState(false)
  const { can } = usePermissoes()
  const podeVerCpf = can('colaboradores', 'update')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingColaborador, setDeletingColaborador] = useState<ColaboradorDetalhado | null>(null)
  const [deleteDialogPosition, setDeleteDialogPosition] = useState({ top: '50vh', left: '50vw' })
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusDialogPosition, setStatusDialogPosition] = useState({ top: '50vh', left: '50vw' })

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

  /**
   * Colunas da listagem. A busca, os filtros por coluna, a ordenação, a
   * paginação e a exportação ficam a cargo do DataTable do design system.
   *
   * Dado pessoal aparece mascarado aqui (RF-06); o valor completo só no
   * detalhe, para quem tem permissão.
   */
  const colunas: ColunaDataTable<Colaborador>[] = [
    {
      id: 'nome',
      cabecalho: 'Colaborador',
      fixa: true,
      semFiltro: true,
      valor: (c) => `${c.nome} ${c.matricula ?? ''} ${onlyDigits(c.cpf)}`.trim(),
      valorOrdenacao: (c) => c.nome,
      celula: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={c.foto_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-xs">{getInitials(c.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{c.nome}</div>
            {c.matricula && (
              <div className="text-xs text-muted-foreground">Matrícula {c.matricula}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'cargo',
      cabecalho: 'Cargo',
      valor: (c) => capitalizarTexto(c.cargo),
    },
    {
      id: 'setor',
      cabecalho: 'Setor',
      valor: (c) => capitalizarTexto(c.setor),
    },
    {
      id: 'centro_custo',
      cabecalho: 'Centro de custo',
      valor: (c) =>
        c.centros_custo ? `${c.centros_custo.codigo} - ${c.centros_custo.descricao ?? ''}`.trim() : '—',
    },
    {
      id: 'cpf',
      cabecalho: 'CPF',
      semFiltro: true,
      valor: (c) => mascararCPF(c.cpf),
      celula: (c) => (
        <span title="CPF mascarado — o completo fica no detalhe">{mascararCPF(c.cpf)}</span>
      ),
    },
    {
      id: 'contato',
      cabecalho: 'Contato',
      semFiltro: true,
      valor: (c) => mascararEmail(c.email),
      celula: (c) => (
        <div className="space-y-0.5">
          {c.email && <div className="truncate">{mascararEmail(c.email)}</div>}
          {c.telefone && (
            <div className="text-xs text-muted-foreground">{mascararTelefone(c.telefone)}</div>
          )}
          {!c.email && !c.telefone && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (c) => (c.ativo ? 'Ativo' : 'Inativo'),
      celula: (c) => <StatusBadge status={c.ativo ? 'ativo' : 'inativo'} />,
    },
  ]

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

  // Abre o colaborador vindo da paleta de comandos (?item=<id>)
  useAbrirItemDaUrl(
    colaboradores as Colaborador[],
    (c) => c.id,
    (c) => handleColaboradorClick(c),
  )


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
      const { data, error } = await fetchRomaneiosRetiradaDoColaborador<any>(colaboradorId, `
          id,
          numero,
          data_romaneio,
          colaborador_id,
          responsavel_nome,
          responsavel_retirada,
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

  useEffect(() => {
    setCpfRevelado(false)
  }, [selectedColaborador?.id])

  const revelarCpf = async (colaborador: { id: string; nome: string }) => {
    setCpfRevelado(true)
    await registrarAuditoria({
      acao: 'colaborador.cpf_consultado',
      tabela: 'colaboradores',
      registroId: colaborador.id,
      dadosNovos: { nome: colaborador.nome },
    })
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

  // RF-06: a formatação e o mascaramento vivem em src/lib/dadosPessoais.ts

  const getInitials = (nome: string) => {
    const names = nome.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return nome.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Colaboradores"
          descricao="Cadastro de colaboradores, cargos e vínculo com centro de custo."
          migalhas={[{ label: 'Cadastros' }, { label: 'Colaboradores' }]}
        />
        <TableSkeleton colunas={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Colaboradores"
        descricao="Cadastro de colaboradores, cargos e vínculo com centro de custo."
        migalhas={[{ label: 'Cadastros' }, { label: 'Colaboradores' }]}
        acoes={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo colaborador
          </Button>
        }
      />

      <DataTable
        dados={colaboradores as Colaborador[]}
        colunas={colunas}
        idLinha={(c) => c.id}
        chaveUrl="colab"
        placeholderBusca="Buscar por nome, matrícula, cargo ou CPF..."
        nomeArquivoCsv="colaboradores"
        onLinhaClick={(c) => handleColaboradorClick(c)}
        vazio={
          <EmptyState
            titulo="Nenhum colaborador cadastrado"
            descricao="Cadastre o primeiro colaborador para começar a emitir romaneios e fichas de EPI."
            icone={User}
            acao={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Cadastrar primeiro colaborador
              </Button>
            }
          />
        }
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent 
          className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto"
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
          className="max-w-4xl max-h-[90vh] overflow-y-auto" 
          aria-describedby="colaborador-details-description"
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
                              {cpfRevelado
                                ? formatarCPF(selectedColaborador.cpf)
                                : mascararCPF(selectedColaborador.cpf)}
                            </p>
                            {!cpfRevelado && selectedColaborador.cpf && podeVerCpf && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => revelarCpf(selectedColaborador)}
                              >
                                Ver CPF completo
                              </Button>
                            )}
                            {!podeVerCpf && (
                              <p className="text-xs text-muted-foreground">
                                Seu perfil não permite ver o CPF completo
                              </p>
                            )}
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
                              {capitalizarTexto(selectedColaborador.cargo)}
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





