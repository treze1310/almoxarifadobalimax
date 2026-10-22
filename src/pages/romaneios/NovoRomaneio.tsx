import { useEffect, useMemo, useRef, useState } from 'react'
import { contar } from '@/lib/plural'
import { useForm, useFieldArray } from 'react-hook-form'
import { SelecaoUnidades } from '@/components/romaneios/SelecaoUnidades'
import { expandirItensPorPeca } from '@/lib/romaneioPecas'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useAuth } from '@/contexts/AuthContext'
import { ToastAction } from '@/components/ui/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, PlusCircle, Trash2, ArrowLeft, Search, Package, Eye } from 'lucide-react'
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
  } from '@/components/ui/card'
import { PageHeader } from '@/components/ds/PageHeader'
import { FormSection, FormActions } from '@/components/ds/FormLayout'
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
import { devolucaoService } from '@/services/devolucaoService'
import { gerarRomaneioPDF } from '@/utils/romaneioPdf'
import { isResponsavelTextForColaborador } from '@/services/colaboradorEpiRomaneiosService'

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
    material_unidade_id?: string | null
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
    /**
     * Peças escolhidas quando o item é acompanhado peça a peça. No envio,
     * cada peça vira uma linha de quantidade 1.
     */
    unidades?: string[]
  }>
}

const NovoRomaneioPage = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  // TODO: Implementar sistema de usuário simplificado
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
      responsavel_retirada: '',
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
            // A peça desta linha volta marcada, para a edição não perdê-la
            unidades: (item as any).material_unidade_id
              ? [(item as any).material_unidade_id as string]
              : [],
          })) || []
          
          // Reset form with all data
          form.reset({
            tipo: romaneio.tipo as 'retirada' | 'devolucao' | 'transferencia',
            data_romaneio: romaneio.data_romaneio ? new Date(romaneio.data_romaneio).toISOString() : new Date().toISOString(),
            colaborador_id: (romaneio as any).colaborador_id || undefined,
            responsavel_nome: (romaneio as any).responsavel_nome || undefined,
            responsavel_retirada: romaneio.responsavel_retirada || '',
            centro_custo_origem_id: romaneio.centro_custo_origem_id || '',
            centro_custo_destino_id: romaneio.centro_custo_destino_id || '',
            observacoes: romaneio.observacoes || '',
            itens: itensForForm
          })

          // Hidratar o autocomplete de responsável
          const colabId = (romaneio as any).colaborador_id
          if (colabId) {
            const colab = colaboradores.find(c => c.id === colabId)
            setResponsavelData({
              type: 'colaborador',
              colaborador_id: colabId,
              displayName: colab ? `${colab.nome} (${colab.matricula})` : (romaneio.responsavel_retirada || ''),
            })
          } else if ((romaneio as any).responsavel_nome || romaneio.responsavel_retirada) {
            const nome = (romaneio as any).responsavel_nome || romaneio.responsavel_retirada
            setResponsavelData({ type: 'nome', nome, displayName: nome })
          }

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

  /**
   * Rascunho do romaneio em digitação.
   *
   * O documento é preenchido com o colaborador na frente e interrompido o
   * tempo todo — conferir um item, olhar o saldo em outra tela. Cada
   * interrupção dessas apagava tudo. Vale só para romaneio novo: na edição,
   * quem manda é o documento que está no banco.
   */
  const { userId } = useAuth()
  const [rascunho, setRascunho, { apagar: apagarRascunho }] = usePersistentState<
    ComponentFormValues | null
  >('romaneio-novo', null, { userId })

  const rascunhoRestaurado = useRef(false)
  useEffect(() => {
    if (isEditing || rascunhoRestaurado.current) return
    rascunhoRestaurado.current = true

    const guardado = rascunho
    const temConteudo =
      !!guardado && ((guardado.itens?.length ?? 0) > 0 || !!guardado.colaborador_id)
    if (!temConteudo) return

    form.reset(guardado)
    replace(guardado.itens ?? [])
    toast({
      title: 'Rascunho restaurado',
      description: 'Este romaneio estava sendo preenchido.',
      action: (
        <ToastAction
          altText="Descartar o rascunho"
          onClick={() => {
            apagarRascunho()
            window.location.reload()
          }}
        >
          Descartar
        </ToastAction>
      ),
    })
    // Só na montagem: depois quem manda é o formulário
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guardar o que vai sendo digitado (o hook já espera a digitação parar)
  useEffect(() => {
    if (isEditing) return
    const inscricao = form.watch((valores) => setRascunho(valores as ComponentFormValues))
    return () => inscricao.unsubscribe()
  }, [form, isEditing, setRascunho])

  const handleSelectRomaneio = async (romaneio: RomaneioRetirada) => {
    setSelectedRomaneio(romaneio)

    // Saldo a devolver por material = qtd original - já devolvido (devoluções anteriores)
    const statusDev = await devolucaoService.calcularStatusDevolucao(romaneio.id)
    const devolvidoPorMaterial = new Map<string, number>()
    statusDev.itensDevolvidos.forEach((it) => {
      devolvidoPorMaterial.set(it.material_id, it.quantidade_devolvida)
    })
    
    // Set reference to original romaneio in observations
    form.setValue('observacoes', `Devolução referente ao romaneio: ${romaneio.numero}`)
    
    // Set cost center data (invert origin and destination for return)
    if (romaneio.centro_custo_destino_id) {
      form.setValue('centro_custo_origem_id', romaneio.centro_custo_destino_id)
    }
    if (romaneio.centro_custo_origem_id) {
      form.setValue('centro_custo_destino_id', romaneio.centro_custo_origem_id)
    }
    
    // Set responsible person (carregar do romaneio original)
    const colabId = (romaneio as any).colaborador_id
    if (colabId) {
      const colab = colaboradores.find(c => c.id === colabId)
      const display = colab ? `${colab.nome} (${colab.matricula})` : (romaneio.responsavel_retirada || '')
      form.setValue('colaborador_id', colabId)
      form.setValue('responsavel_nome', undefined)
      form.setValue('responsavel_retirada', display)
      setResponsavelData({ type: 'colaborador', colaborador_id: colabId, displayName: display })
    } else if ((romaneio as any).responsavel_nome || romaneio.responsavel_retirada) {
      const nome = (romaneio as any).responsavel_nome || romaneio.responsavel_retirada || ''
      form.setValue('responsavel_nome', nome)
      form.setValue('responsavel_retirada', nome)
      setResponsavelData({ type: 'nome', nome, displayName: nome })
    }
    
    // Load items from original romaneio - Use setTimeout to ensure form is ready
    if (romaneio.romaneios_itens) {
      const itemsWithOriginalQty = romaneio.romaneios_itens
        .map((item) => {
          const materialId = item.materiais_equipamentos?.id || ''
          const jaDevolvido = devolvidoPorMaterial.get(materialId) || 0
          // Saldo restante a devolver (qtd original - devoluções anteriores)
          const saldo = Math.max(item.quantidade - jaDevolvido, 0)
          return {
            material_equipamento_id: materialId,
            quantidade: saldo, // default = saldo restante
            quantidadeOriginal: saldo, // mostrar o saldo como base na devolução
            valor_unitario: item.valor_unitario || 0,
            valor_total: (item.valor_unitario || 0) * saldo,
            observacoes: item.observacoes || '',
            numero_serie: item.numero_serie || '',
            codigo_patrimonial: item.codigo_patrimonial || '',
          }
        })
        // Itens já totalmente devolvidos não aparecem
        .filter((it) => it.quantidadeOriginal > 0)

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
      const responsavelText = data.responsavel_retirada || data.responsavel_nome
      const colaboradorSelecionado =
        data.colaborador_id
          ? colaboradores.find((colaborador) => colaborador.id === data.colaborador_id)
          : colaboradores.find((colaborador) =>
              isResponsavelTextForColaborador(responsavelText, colaborador),
            )
      const colaboradorId = colaboradorSelecionado?.id || data.colaborador_id
      const responsavelRetirada =
        colaboradorSelecionado
          ? colaboradorSelecionado.matricula
            ? `${colaboradorSelecionado.nome} (${colaboradorSelecionado.matricula})`
            : colaboradorSelecionado.nome
          : data.responsavel_retirada
      const responsavelNome = colaboradorSelecionado ? undefined : data.responsavel_nome

      // Para retiradas, validar estoque apenas ao aprovar uma NOVA retirada.
      // Na edição o estoque já foi baixado na aprovação original — não revalidar (bloquearia o salvamento).
      if (data.tipo === 'retirada' && data.itens.length > 0 && saveAndApprove && !isEditing) {
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
          colaborador_id: colaboradorId && colaboradorId !== '' ? colaboradorId : undefined,
          responsavel_nome: responsavelNome,
          responsavel_retirada: responsavelRetirada,
          centro_custo_origem_id: data.centro_custo_origem_id && data.centro_custo_origem_id !== '' ? data.centro_custo_origem_id : undefined,
          centro_custo_destino_id: data.centro_custo_destino_id && data.centro_custo_destino_id !== '' ? data.centro_custo_destino_id : undefined,
          observacoes: data.observacoes,
          itens: expandirItensPorPeca(data.itens),
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
          colaborador_id: colaboradorId && colaboradorId !== '' ? colaboradorId : undefined,
          responsavel_nome: responsavelNome,
          centro_custo_origem_id: data.centro_custo_origem_id && data.centro_custo_origem_id !== '' ? data.centro_custo_origem_id : undefined,
          centro_custo_destino_id: data.centro_custo_destino_id && data.centro_custo_destino_id !== '' ? data.centro_custo_destino_id : undefined,
          responsavel_retirada: responsavelRetirada,
          observacoes: data.observacoes,
          status: saveAndApprove ? 'aprovado' : 'pendente',
          romaneio_origem_id: selectedRomaneio?.id, // Para devoluções, salvar o romaneio original
          itens: expandirItensPorPeca(data.itens),
        }

        const result = await createRomaneio(romaneioData)
        if (result.error === null) {
          // Documento criado: o rascunho cumpriu o papel
          apagarRascunho()
          const message = saveAndApprove
            ? `Romaneio de ${data.tipo} criado e aprovado com sucesso! O estoque foi atualizado.`
            : `Romaneio de ${data.tipo} salvo como rascunho. Aguardando aprovação para movimentação do estoque.`

          toast({
            title: 'Sucesso',
            description: message,
          })

          // Após aprovação, oferecer impressão do comprovante em PDF
          if (saveAndApprove && result.data?.id) {
            if (window.confirm('Romaneio aprovado! Deseja imprimir o comprovante em PDF?')) {
              try {
                const full = await getRomaneioById(result.data.id)
                if (full.data) await gerarRomaneioPDF(full.data)
              } catch (e) {
                console.error('Erro ao gerar PDF do romaneio:', e)
              }
            }
          }

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

  /** O item escolhido é acompanhado peça a peça? */
  const exigeUnidades = (materialId?: string) =>
    !!getSelectedItem(materialId)?.exige_identificacao_individual

  const handleUnidadesChange = (index: number, ids: string[]) => {
    form.setValue(`itens.${index}.unidades`, ids)
    // A quantidade deixa de ser digitada: é quantas peças foram escolhidas
    form.setValue(`itens.${index}.quantidade`, Math.max(ids.length, 1))
  }

  const handleItemChange = (value: string, index: number) => {
    form.setValue(`itens.${index}.material_equipamento_id`, value)
    // Trocar o item zera as peças: elas eram do item anterior
    form.setValue(`itens.${index}.unidades`, [])
  }

  /**
   * Peças que já saíram neste romaneio.
   *
   * Elas estão `em_uso`, então não apareceriam na lista de disponíveis — e a
   * edição apagaria a escolha original sem o almoxarife perceber.
   */
  const unidadesJaNoRomaneio = useMemo(
    () =>
      (form.watch('itens') ?? [])
        .flatMap((item) => item.unidades ?? [])
        .filter((id): id is string => !!id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditing],
  )

  const getSelectedItem = (materialId: string) => {
    return materiaisEquipamentos.find(item => item.id === materialId)
  }

  if (isDevolucao && step === 1) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Nova devolução"
          descricao="Passo 1 de 2: escolha o romaneio de retirada de origem."
          migalhas={[
            { label: 'Operação' },
            { label: 'Romaneios', href: '/romaneios' },
            { label: 'Nova devolução' },
          ]}
          acoes={
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          }
        />
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
                              <span>{contar(romaneio.romaneios_itens?.length || 0, 'item', 'itens')}</span>
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
        <PageHeader
          titulo={
            isEditing
              ? 'Editar romaneio'
              : isCloning
                ? 'Clonar romaneio'
                : isDevolucao
                  ? 'Nova devolução'
                  : 'Novo romaneio de retirada'
          }
          descricao={
            isDevolucao && selectedRomaneio
              ? `Devolução do romaneio ${selectedRomaneio.numero}.`
              : 'Preencha os dados e adicione os itens movimentados.'
          }
          migalhas={[
            { label: 'Operação' },
            { label: 'Romaneios', href: '/romaneios' },
            { label: isEditing ? 'Editar' : 'Novo' },
          ]}
          acoes={
            <Button
              type="button"
              variant="outline"
              onClick={() => (isDevolucao && !isEditing ? setStep(1) : navigate(-1))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          }
        />

        <FormSection
          numero={1}
          titulo="Informações gerais"
          descricao="Dados principais do romaneio."
        >
          <div className="col-span-1 grid grid-cols-1 items-end gap-4 md:col-span-12 md:grid-cols-2 lg:grid-cols-4">
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
                      placeholder="Origem…"
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
                      placeholder="Destino…"
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
                  // Atualizar os campos do form baseado no tipo.
                  // responsavel_retirada é a coluna exibida na listagem/detalhe — sempre preencher.
                  if (value?.type === 'colaborador') {
                    form.setValue('colaborador_id', value.colaborador_id)
                    form.setValue('responsavel_nome', undefined)
                    form.setValue('responsavel_retirada', value.displayName || '')
                  } else if (value?.type === 'nome') {
                    form.setValue('colaborador_id', undefined)
                    form.setValue('responsavel_nome', value.nome)
                    form.setValue('responsavel_retirada', value.nome || '')
                  } else {
                    form.setValue('colaborador_id', undefined)
                    form.setValue('responsavel_nome', undefined)
                    form.setValue('responsavel_retirada', '')
                  }
                }}
                disabled={isDevolucao}
              />
            </div>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                // Texto livre em 1/4 da largura não serve para nada
                <FormItem className="col-span-full flex flex-col pt-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Observações opcionais..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection
          numero={2}
          titulo="Itens do romaneio"
          descricao="Materiais ou equipamentos que serão movimentados."
        >
          <div className="md:col-span-12">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Item</TableHead>
                    <TableHead>Unidade</TableHead>
                    {isDevolucao && <TableHead>Saldo a Devolver</TableHead>}
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

                        {/* Equipamento acompanhado peça a peça: é preciso dizer
                            qual peça sai, não só quantas */}
                        {exigeUnidades(form.watch(`itens.${index}.material_equipamento_id`)) && (
                          <div className="mt-2">
                            <SelecaoUnidades
                              materialId={form.watch(`itens.${index}.material_equipamento_id`)}
                              valor={form.watch(`itens.${index}.unidades`) ?? []}
                              onChange={(ids) => handleUnidadesChange(index, ids)}
                              jaNoRomaneio={unidadesJaNoRomaneio}
                              ocupadas={(form.watch('itens') ?? [])
                                .filter((_, i) => i !== index)
                                .flatMap((outro) => outro.unidades ?? [])}
                              disabled={isDevolucao}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSelectedItem(form.watch(`itens.${index}.material_equipamento_id`))?.unidade_medida || '-'}
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
                          render={({ field: formField }) => {
                            const materialId = form.watch(`itens.${index}.material_equipamento_id`)
                            const selectedMat = getSelectedItem(materialId)
                            const estoqueDisponivel = selectedMat?.estoque_atual ?? 0
                            const porPeca = exigeUnidades(materialId)
                            const pecas = form.watch(`itens.${index}.unidades`)?.length ?? 0
                            const excede =
                              !isDevolucao &&
                              !porPeca &&
                              !!selectedMat &&
                              Number(formField.value) > estoqueDisponivel
                            return (
                              <FormItem>
                                {porPeca ? (
                                  // Quem manda é a lista de peças escolhidas
                                  <div className="text-sm">
                                    <span className="font-medium">{pecas}</span>{' '}
                                    <span className="text-muted-foreground">
                                      {pecas === 1 ? 'peça' : 'peças'}
                                    </span>
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    min={1}
                                    {...formField}
                                    onChange={(e) => formField.onChange(parseInt(e.target.value) || 1)}
                                    className={excede ? 'border-destructive focus-visible:ring-destructive' : ''}
                                  />
                                )}
                                {selectedMat && !porPeca && (
                                  <p className={`text-xs mt-1 ${excede ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                    {excede
                                      ? `⚠️ Excede estoque! Atual: ${estoqueDisponivel} ${selectedMat.unidade_medida || ''}`
                                      : `Estoque atual: ${estoqueDisponivel} ${selectedMat.unidade_medida || ''}`}
                                  </p>
                                )}
                                {selectedMat && porPeca && pecas === 0 && (
                                  <p className="mt-1 text-xs text-destructive font-medium">
                                    Escolha ao menos uma peça
                                  </p>
                                )}
                                <FormMessage />
                              </FormItem>
                            )
                          }}
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
          </div>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => (isDevolucao && !isEditing ? setStep(1) : navigate(-1))}
          >
            Cancelar
          </Button>
          {!isEditing && (
            <Button type="button" variant="secondary" onClick={handleSaveDraft}>
              Salvar rascunho
            </Button>
          )}
          <Button type="button" onClick={handleSaveAndApprove}>
            {isEditing ? 'Salvar alterações' : 'Salvar e aprovar'}
          </Button>
        </FormActions>
      </form>
    </Form>
  )
}

export default NovoRomaneioPage
