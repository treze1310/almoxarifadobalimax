import { useState, useEffect, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, PlusCircle, Trash2, ArrowLeft, Search, User, MapPin, Package, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import ResponsavelAutocomplete from '@/components/forms/ResponsavelAutocomplete'
import { CentroCustoSelector } from '@/components/romaneios/CentroCustoSelector'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useRomaneios } from '@/hooks/useRomaneios'
import { romaneioSchema, type RomaneioFormData } from '@/lib/validations'
import { estoqueService } from '@/services/estoqueService'
import { useAuth } from '@/contexts/AuthContext'
import type { Tables } from '@/types/database'

type MaterialEquipamento = Tables<'materiais_equipamentos'>
type Colaborador = Tables<'colaboradores'>
type RomaneioRetirada = Tables<'romaneios'> & {
  colaboradores?: { nome: string; matricula: string } | null
  centro_custo_origem?: { codigo: string; nome: string } | null
  centro_custo_destino?: { codigo: string; nome: string } | null
  romaneios_itens?: Array<{
    id: string
    quantidade: number
    valor_unitario: number | null
    valor_total: number | null
    numero_serie: string | null
    codigo_patrimonial: string | null
    observacoes: string | null
    materiais_equipamentos?: {
      id: string
      codigo: string
      nome: string
      unidade_medida: string
      codigo_ncm: string | null
    } | null
  }>
}

// Simplified form schema for the component
const componentFormSchema = romaneioSchema.omit({ numero: true })

type ComponentFormValues = {
  tipo: 'retirada' | 'devolucao' | 'transferencia'
  data_romaneio: string
  colaborador_id?: string
  responsavel_nome?: string
  centro_custo_origem_id?: string
  centro_custo_destino_id?: string
  responsavel_retirada?: string
  observacoes?: string
  itens: Array<{
    material_equipamento_id: string
    quantidade: number
    valor_unitario?: number
    valor_total?: number
    observacoes?: string
    numero_serie?: string
    codigo_patrimonial?: string
    quantidadeOriginal?: number
  }>
}

const NovoRomaneioPage = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const [searchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') as 'retirada' | 'devolucao' | 'transferencia'
  const editId = searchParams.get('edit')
  const cloneId = searchParams.get('clone')
  const isEditing = Boolean(editId)
  const isCloning = Boolean(cloneId)
  const isDevolucao = tipo === 'devolucao'

  // Hooks for data fetching
  const { data: materiaisEquipamentos } = useSupabaseTable('materiais_equipamentos')
  const { data: colaboradores } = useSupabaseTable('colaboradores')
  const { createRomaneio, updateRomaneio, getRomaneiosForReturn, getRomaneioById } = useRomaneios()

  const [step, setStep] = useState(isDevolucao && !isEditing ? 1 : 2)
  const [selectedRomaneio, setSelectedRomaneio] = useState<RomaneioRetirada | null>(null)
  const [availableRomaneios, setAvailableRomaneios] = useState<RomaneioRetirada[]>([])
  const [loadingRomaneios, setLoadingRomaneios] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [responsavelData, setResponsavelData] = useState<{
    type: 'colaborador' | 'nome'
    colaborador_id?: string
    nome?: string
    displayName?: string
  } | undefined>()

  const form = useForm<ComponentFormValues>({
    defaultValues: {
      tipo: tipo || 'retirada',
      data_romaneio: new Date().toISOString(),
      responsavel_retirada: 'Usuário Logado',
      itens: [],
    },
  })

  // Load available romaneios for return
  useEffect(() => {
    if (isDevolucao) {
      setLoadingRomaneios(true)
      getRomaneiosForReturn().then((result) => {
        if (result.data) {
          setAvailableRomaneios(result.data as RomaneioRetirada[])
        }
        setLoadingRomaneios(false)
      })
    }
  }, [isDevolucao, getRomaneiosForReturn])

  // Load romaneio data for editing
  useEffect(() => {
    if (isEditing && editId) {
      getRomaneioById(editId).then((result) => {
        if (result.data) {
          const romaneio = result.data
          
          const itensForForm = romaneio.romaneios_itens?.map(item => ({
            material_equipamento_id: item.materiais_equipamentos?.id || '',
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario || 0,
            valor_total: item.valor_total || 0,
            observacoes: item.observacoes || '',
            numero_serie: item.numero_serie || '',
            codigo_patrimonial: item.codigo_patrimonial || '',
          })) || []
          
          // Reset form with all data
          form.reset({
            tipo: romaneio.tipo as 'retirada' | 'devolucao' | 'transferencia',
            data_romaneio: romaneio.data_romaneio ? new Date(romaneio.data_romaneio).toISOString() : new Date().toISOString(),
            responsavel_retirada: romaneio.responsavel_retirada || '',
            centro_custo_origem_id: romaneio.centro_custo_origem_id || '',
            centro_custo_destino_id: romaneio.centro_custo_destino_id || '',
            observacoes: romaneio.observacoes || '',
            itens: itensForForm
          })
          
          // Ensure items are properly loaded with a slight delay
          setTimeout(() => {
            replace(itensForForm)
          }, 200)
        }
      })
    }
  }, [isEditing, editId, getRomaneioById, form])

  // Load romaneio data for cloning
  useEffect(() => {
    if (isCloning && cloneId) {
      getRomaneioById(cloneId).then((result) => {
        if (result.data) {
          const romaneio = result.data
          
          const itensForForm = romaneio.romaneios_itens?.map(item => ({
            material_equipamento_id: item.materiais_equipamentos?.id || '',
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario || 0,
            valor_total: item.valor_total || 0,
            observacoes: item.observacoes || '',
            numero_serie: '', // Clear serial numbers for cloning
            codigo_patrimonial: '', // Clear patrimony codes for cloning
          })) || []
          
          // Reset form with cloned data but clear identifying fields
          form.reset({
            tipo: romaneio.tipo as 'retirada' | 'devolucao' | 'transferencia',
            data_romaneio: new Date().toISOString(), // Use current date and time
            responsavel_retirada: romaneio.responsavel_retirada || '',
            centro_custo_origem_id: romaneio.centro_custo_origem_id || '',
            centro_custo_destino_id: romaneio.centro_custo_destino_id || '',
            observacoes: `Clonado do romaneio: ${romaneio.numero}`,
            itens: itensForForm
          })
          
          // Ensure items are properly loaded with a slight delay
          setTimeout(() => {
            replace(itensForForm)
          }, 200)
        }
      })
    }
  }, [isCloning, cloneId, getRomaneioById, form])

  // Filter romaneios based on search term
  const filteredRomaneios = useMemo(() => {
    if (!searchTerm) return availableRomaneios
    
    return availableRomaneios.filter(romaneio => 
      romaneio.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      romaneio.colaboradores?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      romaneio.colaboradores?.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableRomaneios, searchTerm])

  // Create options for comboboxes
  const itemOptions: ComboboxOption[] = materiaisEquipamentos.map((item) => ({
    value: item.id,
    label: `${item.codigo} - ${item.nome}`,
  }))


  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'itens',
  })

  const handleSelectRomaneio = (romaneio: RomaneioRetirada) => {
    setSelectedRomaneio(romaneio)
    
    // Set reference to original romaneio in observations
    form.setValue('observacoes', `Devolução referente ao romaneio: ${romaneio.numero}`)
    
    // Set cost center data (invert origin and destination for return)
    if (romaneio.centro_custo_destino_id) {
      form.setValue('centro_custo_origem_id', romaneio.centro_custo_destino_id)
    }
    if (romaneio.centro_custo_origem_id) {
      form.setValue('centro_custo_destino_id', romaneio.centro_custo_origem_id)
    }
    
    // Set responsible person
    if (romaneio.responsavel_retirada) {
      form.setValue('responsavel_retirada', romaneio.responsavel_retirada)
    }
    
    // Load items from original romaneio - Use setTimeout to ensure form is ready
    if (romaneio.romaneios_itens) {
      const itemsWithOriginalQty = romaneio.romaneios_itens.map((item) => ({
        material_equipamento_id: item.materiais_equipamentos?.id || '',
        quantidade: item.quantidade, // Use original quantity as default for return
        quantidadeOriginal: item.quantidade,
        valor_unitario: item.valor_unitario || 0,
        valor_total: (item.valor_unitario || 0) * item.quantidade,
        observacoes: item.observacoes || '',
        numero_serie: item.numero_serie || '',
        codigo_patrimonial: item.codigo_patrimonial || '',
      }))
      
      // Use setTimeout to ensure the form state is updated after the step change
      setTimeout(() => {
        replace(itemsWithOriginalQty)
        // Force form to recognize the new items
        form.setValue('itens', itemsWithOriginalQty)
      }, 100)
    }
    setStep(2)
  }

  const onSubmit = async (data: ComponentFormValues, saveAndApprove: boolean = false) => {
    try {
      // Para retiradas, validar estoque apenas se for aprovar
      if (data.tipo === 'retirada' && data.itens.length > 0 && saveAndApprove) {
        const itensParaValidacao = data.itens.map(item => {
          const material = materiaisEquipamentos.find(m => m.id === item.material_equipamento_id)
          return {
            material_equipamento_id: item.material_equipamento_id,
            quantidade: item.quantidade,
            nome: material?.nome || 'Material não encontrado'
          }
        })

        const validacao = await estoqueService.validarItensRomaneio(itensParaValidacao)
        
        if (!validacao.valid) {
          toast({
            title: 'Estoque Insuficiente',
            description: validacao.message,
            variant: 'destructive',
          })
          return
        }
      }

      if (isEditing && editId) {
        // Update existing romaneio
        const romaneioData: Partial<RomaneioFormData> = {
          tipo: data.tipo,
          data_romaneio: data.data_romaneio,
          colaborador_id: data.colaborador_id && data.colaborador_id !== '' ? data.colaborador_id : undefined,
          responsavel_nome: data.responsavel_nome,
          responsavel_retirada: data.responsavel_retirada,
          centro_custo_origem_id: data.centro_custo_origem_id && data.centro_custo_origem_id !== '' ? data.centro_custo_origem_id : undefined,
          centro_custo_destino_id: data.centro_custo_destino_id && data.centro_custo_destino_id !== '' ? data.centro_custo_destino_id : undefined,
          observacoes: data.observacoes,
          itens: data.itens.map(item => ({
            material_equipamento_id: item.material_equipamento_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            observacoes: item.observacoes,
            numero_serie: item.numero_serie,
            codigo_patrimonial: item.codigo_patrimonial,
          })),
        }

        const result = await updateRomaneio(editId, romaneioData)
        if (result.error === null) {
          toast({
            title: 'Sucesso',
            description: 'Romaneio atualizado com sucesso',
          })
          navigate('/romaneios')
        }
      } else {
        // Create new romaneio - sempre como pendente para aprovação manual
        const romaneioData: RomaneioFormData = {
          numero: '', // Will be generated by the hook
          tipo: data.tipo,
          data_romaneio: data.data_romaneio,
          colaborador_id: data.colaborador_id && data.colaborador_id !== '' ? data.colaborador_id : undefined,
          responsavel_nome: data.responsavel_nome,
          centro_custo_origem_id: data.centro_custo_origem_id && data.centro_custo_origem_id !== '' ? data.centro_custo_origem_id : undefined,
          centro_custo_destino_id: data.centro_custo_destino_id && data.centro_custo_destino_id !== '' ? data.centro_custo_destino_id : undefined,
          responsavel_retirada: data.responsavel_retirada,
          observacoes: data.observacoes,
          status: saveAndApprove ? 'aprovado' : 'pendente',
          romaneio_origem_id: selectedRomaneio?.id, // Para devoluções, salvar o romaneio original
          itens: data.itens.map(item => ({
            material_equipamento_id: item.material_equipamento_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            observacoes: item.observacoes,
            numero_serie: item.numero_serie,
            codigo_patrimonial: item.codigo_patrimonial,
          })),
        }

        const result = await createRomaneio(romaneioData)
        if (result.error === null) {
          const message = saveAndApprove 
            ? `Romaneio de ${data.tipo} criado e aprovado com sucesso! O estoque foi atualizado.`
            : `Romaneio de ${data.tipo} salvo como rascunho. Aguardando aprovação para movimentação do estoque.`
          
          toast({
            title: 'Sucesso',
            description: message,
          })
          navigate('/romaneios')
        }
      }
    } catch (error) {
      console.error('Erro ao processar romaneio:', error)
      toast({
        title: 'Erro',
        description: isEditing ? 'Erro ao atualizar romaneio' : 'Erro ao criar romaneio',
        variant: 'destructive',
      })
    }
  }

  const handleSaveDraft = async () => {
    const data = form.getValues()
    
    // Validação básica dos campos obrigatórios
    if (!data.tipo || !data.data_romaneio || data.itens.length === 0) {
      toast({
        title: 'Dados Incompletos',
        description: 'Preencha os campos obrigatórios: tipo, data e pelo menos um item.',
        variant: 'destructive',
      })
      return
    }

    await onSubmit(data, false) // false = salvar como rascunho
  }

  const handleSaveAndApprove = async () => {
    const data = form.getValues()
    await onSubmit(data, true) // true = salvar e aprovar
  }

  // Função para o submit padrão do form (sem parâmetros extras)
  const handleFormSubmit = async (data: ComponentFormValues) => {
    await onSubmit(data, false) // padrão é rascunho
  }

  const handleAddItem = () =>
    append({ material_equipamento_id: '', quantidade: 1 })

  const handleItemChange = (value: string, index: number) => {
    form.setValue(`itens.${index}.material_equipamento_id`, value)
  }

  const getSelectedItem = (materialId: string) => {
    return materiaisEquipamentos.find(item => item.id === materialId)
  }

  if (isDevolucao && step === 1) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            Nova Devolução - Passo 1: Selecionar Romaneio de Retirada
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Selecione o Romaneio Original</CardTitle>
            <CardDescription>
              Escolha o romaneio de retirada do qual os itens serão devolvidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por número, colaborador ou matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredRomaneios.length} de {availableRomaneios.length} romaneios
              </div>
            </div>

            {loadingRomaneios ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Carregando romaneios...</span>
              </div>
            ) : filteredRomaneios.length > 0 ? (
              <div className="grid gap-4">
                {filteredRomaneios.map((romaneio) => (
                  <Card key={romaneio.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div>
                              <h4 className="font-semibold text-lg">{romaneio.numero}</h4>
                              <p className="text-sm text-muted-foreground">
                                Solicitante: {romaneio.colaboradores?.nome || 'N/A'} 
                                {romaneio.colaboradores?.matricula && ` (${romaneio.colaboradores.matricula})`}
                              </p>
                              {romaneio.responsavel_retirada && (
                                <p className="text-sm text-muted-foreground">
                                  Responsável: {romaneio.responsavel_retirada}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {romaneio.status || 'retirado'}
                            </Badge>
                          </div>
                          
                                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {romaneio.data_romaneio ? formatDate(romaneio.data_romaneio) : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>{romaneio.romaneios_itens?.length || 0} item(s)</span>
                            </div>

                            {romaneio.centro_custo_origem && (
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">CC Origem:</span>
                                  <span>{romaneio.centro_custo_origem.codigo} - {romaneio.centro_custo_origem.nome}</span>
                                </div>
                              </div>
                            )}
                            {romaneio.centro_custo_destino && (
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-green-500" />
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">CC Destino:</span>
                                  <span>{romaneio.centro_custo_destino.codigo} - {romaneio.centro_custo_destino.nome}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {romaneio.romaneios_itens && romaneio.romaneios_itens.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Itens retirados:</p>
                              <div className="flex flex-wrap gap-1">
                                {romaneio.romaneios_itens.slice(0, 3).map((item, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {item.materiais_equipamentos?.codigo} (Qtd: {item.quantidade})
                                  </Badge>
                                ))}
                                {romaneio.romaneios_itens.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{romaneio.romaneios_itens.length - 3} mais
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            onClick={() => handleSelectRomaneio(romaneio)}
                            className="w-full"
                          >
                            Selecionar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* Implementar visualização */}}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum romaneio encontrado' : 'Nenhum romaneio disponível'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca'
                    : 'Não há romaneios de retirada disponíveis para devolução no momento.'
                  }
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    className="mt-4"
                  >
                    Limpar Busca
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => (isDevolucao && !isEditing ? setStep(1) : navigate(-1))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {isEditing 
                ? `Editar Romaneio`
                : isCloning
                ? `Clonar Romaneio`
                : isDevolucao
                ? `Nova Devolução (Origem: ${selectedRomaneio?.numero})`
                : 'Novo Romaneio de Retirada'}
            </h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>
              Preencha os dados principais do romaneio.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FormField
              control={form.control}
              name="data_romaneio"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Data e Hora</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="centro_custo_origem_id"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Centro de Custo Origem</FormLabel>
                  <FormControl>
                    <CentroCustoSelector
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Selecione o centro de custo origem"
                      label="Centro de Custo Origem"
                      disabled={isDevolucao}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="centro_custo_destino_id"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Centro de Custo Destino</FormLabel>
                  <FormControl>
                    <CentroCustoSelector
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Selecione o centro de custo destino"
                      label="Centro de Custo Destino"
                      disabled={isDevolucao}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col pt-2">
              <ResponsavelAutocomplete
                value={responsavelData}
                onChange={(value) => {
                  setResponsavelData(value)
                  // Atualizar os campos do form baseado no tipo
                  if (value?.type === 'colaborador') {
                    form.setValue('colaborador_id', value.colaborador_id)
                    form.setValue('responsavel_nome', undefined)
                  } else if (value?.type === 'nome') {
                    form.setValue('colaborador_id', undefined)
                    form.setValue('responsavel_nome', value.nome)
                  } else {
                    form.setValue('colaborador_id', undefined)
                    form.setValue('responsavel_nome', undefined)
                  }
                }}
                disabled={isDevolucao}
              />
            </div>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Observações opcionais..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Itens do Romaneio</CardTitle>
            <CardDescription>
              Adicione os materiais ou equipamentos que serão movimentados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Item</TableHead>
                    <TableHead>Unidade</TableHead>
                    {isDevolucao && <TableHead>Qtd. Original</TableHead>}
                    <TableHead>Quantidade</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`itens.${index}.material_equipamento_id`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <Combobox
                                options={itemOptions}
                                value={formField.value}
                                onChange={(value) =>
                                  handleItemChange(value, index)
                                }
                                placeholder="Selecione um item"
                                searchPlaceholder="Buscar item..."
                                emptyPlaceholder="Nenhum item encontrado."
                                disabled={isDevolucao}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {getSelectedItem(field.material_equipamento_id)?.unidade_medida || '-'}
                      </TableCell>
                      {isDevolucao && (
                        <TableCell>
                          {field.quantidadeOriginal || 0}
                        </TableCell>
                      )}
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`itens.${index}.quantidade`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <Input 
                                type="number" 
                                {...formField}
                                onChange={(e) => formField.onChange(parseInt(e.target.value) || 1)}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={isDevolucao}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!isDevolucao && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAddItem}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            )}
            <FormField
              control={form.control}
              name="itens"
              render={() => <FormMessage className="mt-2" />}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => (isDevolucao && !isEditing ? setStep(1) : navigate(-1))}
            >
              Cancelar
            </Button>
            {!isEditing && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
              >
                Salvar Rascunho
              </Button>
            )}
            <Button type="button" onClick={handleSaveAndApprove}>
              {isEditing ? 'Salvar Alterações' : 'Salvar e Aprovar'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}

export default NovoRomaneioPage
