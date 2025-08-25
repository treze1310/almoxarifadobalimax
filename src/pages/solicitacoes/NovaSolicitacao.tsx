import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import {
  SolicitacaoCompra,
  PrazoEntregaOptions,
} from '@/types'
import { useEffect, useState } from 'react'
import { generatePurchaseRequisitionCode } from '@/lib/codeGenerator'
import { CentroCustoSelector } from '@/components/romaneios/CentroCustoSelector'
import ResponsavelAutocomplete from '@/components/forms/ResponsavelAutocomplete'
import { ComboboxWithCustom, type ComboboxOption, type CustomItem } from '@/components/ui/combobox-with-custom'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useSolicitacoes } from '@/hooks/useSolicitacoes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const requestSchema = z
  .object({
    data: z.date({ required_error: 'A data é obrigatória.' }),
    centroCustoOrigemId: z.string().min(1, 'Centro de Custo de Origem é obrigatório.'),
    centroCustoDestinoId: z.string().min(1, 'Centro de Custo de Destino é obrigatório.'),
    prazoEntrega: z.enum(PrazoEntregaOptions, {
      required_error: 'Prazo de entrega é obrigatório.',
    }),
    dataCustomizada: z.date().optional(),
    // Campos para solicitante (mesmo sistema dos romaneios)
    colaborador_id: z.string().optional(),
    solicitante_nome: z.string().optional(),
    itens: z
      .array(
        z.object({
          material_equipamento_id: z.string().optional(),
          item_avulso: z.object({
            descricao: z.string(),
            unidade_medida: z.string().optional(),
            codigo: z.string().optional(),
          }).optional(),
          quantidade: z.coerce
            .number()
            .min(1, 'Quantidade deve ser maior que 0.'),
          observacoes: z.string().optional(),
        }).refine(
          (data) => !!data.material_equipamento_id || !!data.item_avulso?.descricao,
          {
            message: 'Material/Equipamento ou item avulso é obrigatório.',
            path: ['material_equipamento_id'],
          }
        ),
      )
      .min(1, 'Adicione pelo menos um item.'),
  })
  .refine(
    (data) => {
      // Pelo menos um dos campos de solicitante deve estar preenchido
      return !!data.colaborador_id || !!data.solicitante_nome
    },
    {
      message: 'Solicitante é obrigatório.',
      path: ['solicitante_nome'],
    },
  )
  .refine(
    (data) => {
      if (data.prazoEntrega === 'Customizada (especificar data)') {
        return !!data.dataCustomizada
      }
      return true
    },
    {
      message: 'Data customizada é obrigatória quando o prazo for "Customizada".',
      path: ['dataCustomizada'],
    },
  )

type RequestFormValues = z.infer<typeof requestSchema>

const NovaSolicitacaoPage = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [searchParams] = useSearchParams()
  
  // Estados para gerenciar dados
  const [fetchedSolicitacao, setFetchedSolicitacao] = useState<SolicitacaoCompra | null>(null)
  const [solicitacaoToClone, setSolicitacaoToClone] = useState<SolicitacaoCompra | null>(null)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [solicitanteData, setSolicitanteData] = useState<{
    type: 'colaborador' | 'nome'
    colaborador_id?: string
    nome?: string
    displayName?: string
  } | undefined>()

  // Detectar modos de operação
  const editId = searchParams.get('edit')
  const cloneId = searchParams.get('clone')
  const solicitacaoToEdit: SolicitacaoCompra | null = state?.solicitacao || fetchedSolicitacao
  const isEditMode = !!editId || !!solicitacaoToEdit
  const isCloneMode = !!cloneId

  const [generatedCode, setGeneratedCode] = useState<string | null>(
    isEditMode ? (solicitacaoToEdit?.id || editId) : null,
  )

  // Hooks para buscar dados
  const { data: materiaisEquipamentos } = useSupabaseTable('materiais_equipamentos')
  const { solicitacoes, fetchSolicitacoes, createSolicitacao } = useSolicitacoes()
  const { toast } = useToast()
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: isEditMode && solicitacaoToEdit
      ? {
          ...solicitacaoToEdit,
          data: new Date(solicitacaoToEdit.data),
          dataCustomizada: solicitacaoToEdit.dataCustomizada ? new Date(solicitacaoToEdit.dataCustomizada) : undefined,
        }
      : {
          data: new Date(),
          centroCustoOrigemId: '',
          centroCustoDestinoId: '',
          prazoEntrega: 'Normal (3-5 dias úteis)',
          colaborador_id: '',
          solicitante_nome: '',
          itens: [{ material_equipamento_id: '', quantidade: 1, observacoes: '', item_avulso: undefined }],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  })

  const { watch, getValues } = form
  const prazoEntrega = watch('prazoEntrega')
  const centroCustoDestinoId = watch('centroCustoDestinoId')

  // Criar opções para materiais e equipamentos
  const itemOptions: ComboboxOption[] = materiaisEquipamentos.map((item) => ({
    value: item.id,
    label: `${item.codigo} - ${item.nome}`,
  }))

  // Função para obter item selecionado
  const getSelectedItem = (materialId: string) => {
    return materiaisEquipamentos.find(item => item.id === materialId)
  }

  // useEffect para buscar solicitação para editar se há editId mas não há state.solicitacao
  useEffect(() => {
    const loadDataForEditing = async () => {
      if (editId && !state?.solicitacao) {
        // Buscar solicitações se ainda não foram carregadas
        if (solicitacoes.length === 0) {
          await fetchSolicitacoes()
        }
        
        // Encontrar a solicitação para editar
        const solicitacaoParaEditar = solicitacoes.find(s => s.id === editId)
        if (solicitacaoParaEditar) {
          setFetchedSolicitacao(solicitacaoParaEditar)
        }
      }
    }
    
    loadDataForEditing()
  }, [editId, state?.solicitacao, solicitacoes, fetchSolicitacoes])

  // useEffect para carregar dados de clonagem
  useEffect(() => {
    const loadDataForCloning = async () => {
      if (isCloneMode && cloneId) {
        // Buscar solicitações se ainda não foram carregadas
        if (solicitacoes.length === 0) {
          await fetchSolicitacoes()
        }
        
        // Encontrar a solicitação para clonar
        const solicitacaoParaClonar = solicitacoes.find(s => s.id === cloneId)
        if (solicitacaoParaClonar) {
          setSolicitacaoToClone(solicitacaoParaClonar)
          
          // Resetar form com dados da solicitação clonada (sem ID e data)
          const dadosClonados = {
            data: new Date(), // Nova data
            centroCustoOrigemId: solicitacaoParaClonar.centroCustoOrigemId,
            centroCustoDestinoId: solicitacaoParaClonar.centroCustoDestinoId,
            prazoEntrega: solicitacaoParaClonar.prazoEntrega,
            dataCustomizada: undefined, // Limpar data customizada
            colaborador_id: solicitacaoParaClonar.colaborador_id || '',
            solicitante_nome: solicitacaoParaClonar.solicitante_nome || '',
            itens: solicitacaoParaClonar.itens.map(item => ({
              material_equipamento_id: item.material_equipamento_id,
              quantidade: item.quantidade,
              observacoes: item.observacoes
            }))
          }
          
          // Resetar o form com os dados clonados
          form.reset(dadosClonados)
          
          // Atualizar dados do solicitante
          if (solicitacaoParaClonar.colaborador_id) {
            setSolicitanteData({
              type: 'colaborador',
              colaborador_id: solicitacaoParaClonar.colaborador_id
            })
          } else if (solicitacaoParaClonar.solicitante_nome) {
            setSolicitanteData({
              type: 'nome',
              nome: solicitacaoParaClonar.solicitante_nome,
              displayName: solicitacaoParaClonar.solicitante_nome
            })
          }
        }
      }
    }
    
    loadDataForCloning()
  }, [isCloneMode, cloneId, solicitacoes, fetchSolicitacoes, form])

  // useEffect para resetar formulário quando solicitação for carregada para edição
  useEffect(() => {
    if (fetchedSolicitacao && isEditMode) {
      form.reset({
        ...fetchedSolicitacao,
        data: new Date(fetchedSolicitacao.data),
        dataCustomizada: fetchedSolicitacao.dataCustomizada ? new Date(fetchedSolicitacao.dataCustomizada) : undefined,
      })
    }
  }, [fetchedSolicitacao, isEditMode, form])

  useEffect(() => {
    const generate = async () => {
      if (centroCustoDestinoId && !isEditMode) { // Só gerar novo código se não for edição e tiver centro de custo destino
        setIsGeneratingCode(true)
        setGeneratedCode(null)
        try {
          // Gerar código usando a nova função específica para requisições de compra
          const code = await generatePurchaseRequisitionCode(centroCustoDestinoId)
          setGeneratedCode(code)
        } catch (error) {
          console.error('Failed to generate code', error)
          setGeneratedCode('Falha ao gerar código')
        } finally {
          setIsGeneratingCode(false)
        }
      }
    }
    generate()
  }, [centroCustoDestinoId, isEditMode])

  const onSubmit = async (data: RequestFormValues) => {
    if (!generatedCode || generatedCode.includes('Falha')) {
      toast({
        title: 'Erro na Geração do Código',
        description:
          'Não foi possível gerar o código do documento. Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    try {
      const requestData = {
        ...data,
        id: generatedCode,
        status: 'Pendente' as const,
      }
      
      // Salvar a solicitação no banco de dados
      await createSolicitacao(requestData as SolicitacaoCompra)
      
      toast({
        title: `Requisição ${isEditMode ? 'Atualizada' : 'Criada'}!`,
        description: `A requisição ${generatedCode} foi salva para aprovação.`,
      })

      // Sempre redirecionar para a página de gestão de solicitações
      navigate('/solicitacoes')
    } catch (error) {
      console.error('Erro ao salvar requisição:', error)
      toast({
        title: 'Erro ao Salvar',
        description: 'Ocorreu um erro ao salvar a requisição. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="mx-auto max-w-6xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
          {isEditMode 
            ? 'Editar Requisição de Compra' 
            : isCloneMode 
            ? 'Clonar Requisição de Compra' 
            : 'Nova Requisição de Compra'
          }
        </CardTitle>
                <CardDescription>
                  Preencha as informações para criar uma nova requisição.
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="font-semibold">Nº do Documento</p>
                  {isGeneratingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="font-mono">{generatedCode || '...'}</span>
                  )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditMode && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-medium text-destructive mb-1">
                  Modo de Edição
                </h4>
                <p className="text-sm text-destructive/90">
                  Esta requisição será reenviada para aprovação após salvar.
                </p>
              </div>
            )}

            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-4">
                Configuração do Documento
              </h3>
              <div className="text-sm text-muted-foreground">
                Tipo de documento: <strong>SCO (Solicitação de Compra)</strong> - padrão fixo
              </div>
            </div>

            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-4">
                Informações da Requisição
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Data e Hora</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="centroCustoOrigemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Custo de Origem *</FormLabel>
                      <FormControl>
                        <CentroCustoSelector
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione o centro de custo de origem"
                          label="Centro de Custo de Origem"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="centroCustoDestinoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Custo de Destino *</FormLabel>
                      <FormControl>
                        <CentroCustoSelector
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione o centro de custo de destino"
                          label="Centro de Custo de Destino"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="prazoEntrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo de Entrega *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o prazo de entrega" />
                          </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          {PrazoEntregaOptions.map((prazo) => (
                            <SelectItem key={prazo} value={prazo}>
                              {prazo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {prazoEntrega === 'Customizada (especificar data)' && (
                <FormField
                  control={form.control}
                    name="dataCustomizada"
                  render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel>Data Customizada *</FormLabel>
                      <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                  />
                )}
              </div>

              <div className="mt-4">
                <ResponsavelAutocomplete
                  value={solicitanteData}
                  onChange={(value) => {
                    setSolicitanteData(value)
                    // Atualizar os campos do form baseado no tipo
                    if (value?.type === 'colaborador') {
                      form.setValue('colaborador_id', value.colaborador_id)
                      form.setValue('solicitante_nome', undefined)
                    } else if (value?.type === 'nome') {
                      form.setValue('colaborador_id', undefined)
                      form.setValue('solicitante_nome', value.nome)
                    } else {
                      form.setValue('colaborador_id', undefined)
                      form.setValue('solicitante_nome', undefined)
                    }
                  }}
                  placeholder="Digite o nome do solicitante..."
                />
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-4">Itens Solicitados</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Material/Equipamento</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
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
                                <ComboboxWithCustom
                                  options={itemOptions}
                                  value={formField.value || ''}
                                  onChange={(value) => {
                                    formField.onChange(value)
                                    // Limpar item avulso quando selecionar material do estoque
                                    if (value) {
                                      form.setValue(`itens.${index}.item_avulso`, undefined)
                                    }
                                  }}
                                  onCustomItemAdd={(customItem: CustomItem) => {
                                    // Limpar material do estoque quando adicionar item avulso
                                    form.setValue(`itens.${index}.material_equipamento_id`, '')
                                    form.setValue(`itens.${index}.item_avulso`, customItem)
                                  }}
                                  placeholder="Selecione um material/equipamento"
                                  searchPlaceholder="Buscar material..."
                                  emptyPlaceholder="Nenhum material encontrado."
                                  allowCustom={true}
                                />
                                <FormMessage />
                                {field.item_avulso && (
                                  <div className="mt-2 p-2 bg-muted rounded-md">
                                    <p className="text-sm font-medium">Item Avulso:</p>
                                    <p className="text-sm">{field.item_avulso.descricao}</p>
                                    {field.item_avulso.codigo && (
                                      <p className="text-xs text-muted-foreground">Código: {field.item_avulso.codigo}</p>
                                    )}
                                    {field.item_avulso.unidade_medida && (
                                      <p className="text-xs text-muted-foreground">Unidade: {field.item_avulso.unidade_medida}</p>
                                    )}
                                  </div>
                                )}
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {field.item_avulso?.unidade_medida || 
                           getSelectedItem(field.material_equipamento_id)?.unidade_medida || 
                           '-'}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`itens.${index}.quantidade`}
                            render={({ field: formField }) => (
                              <FormItem>
                                <Input 
                                  type="number" 
                                  min="1"
                                  {...formField}
                                  onChange={(e) => formField.onChange(parseInt(e.target.value) || 1)}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`itens.${index}.observacoes`}
                            render={({ field: formField }) => (
                              <FormItem>
                                  <Input
                                  placeholder="Observações"
                                  {...formField}
                                  />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                      append({ material_equipamento_id: '', quantidade: 1, observacoes: '', item_avulso: undefined })
                }
              >
                    <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isGeneratingCode || !generatedCode}>
              {isGeneratingCode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isEditMode ? 'Reenviar para Aprovação' : 'Salvar Requisição'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}

export default NovaSolicitacaoPage