import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { verificarStatusCalibracao } from '@/utils/calibracao'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DialogFooter } from '@/components/ui/dialog'
import { materialEquipamentoSchema, type MaterialEquipamentoFormData } from '@/lib/validations'
import { useSupabaseTable } from '@/hooks/useSupabase'
import type { Tables } from '@/types/database'
import { buscarNCMPorDescricao } from '@/services/ncmService'
import { Search, AlertTriangle, Upload } from 'lucide-react'
import { MarcaComboboxWithAdd } from './MarcaComboboxWithAdd'

interface MaterialEquipamentoFormProps {
  initialData?: Tables<'materiais_equipamentos'>
  onSubmit: (data: MaterialEquipamentoFormData) => Promise<void>
  onCancel: () => void
}

export function MaterialEquipamentoForm({ initialData, onSubmit, onCancel }: MaterialEquipamentoFormProps) {
  const { data: fornecedores } = useSupabaseTable('fornecedores')
  const { data: localizacoes } = useSupabaseTable('localizacao')
  const [ncmSuggestions, setNcmSuggestions] = useState<Array<{ codigo: string; descricao: string; confianca: number }>>([])
  const [loadingNCM, setLoadingNCM] = useState(false)
  
  const form = useForm<MaterialEquipamentoFormData>({
    resolver: zodResolver(materialEquipamentoSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      marca_id: initialData?.marca_id || undefined,
      modelo: initialData?.modelo || '',
      numero_serie: initialData?.numero_serie || '',
      valor_unitario: initialData?.valor_unitario ?? undefined,
      estoque_atual: initialData?.estoque_atual ?? 0,
      localizacao_id: initialData?.localizacao_id || undefined,
      fornecedor_id: initialData?.fornecedor_id || undefined,
      foto_url: initialData?.foto_url || '',
      codigo_ncm: initialData?.codigo_ncm || '',
      codigo_barras: initialData?.codigo_barras || '',
      data_aquisicao: initialData?.data_aquisicao || '',
      status: (initialData?.status as any) || 'ativo',
      ativo: initialData?.ativo ?? true,
      alugado: (initialData as any)?.alugado ?? false,
      // EPI-specific fields
      is_epi: initialData?.is_epi ?? false,
      numero_ca: initialData?.numero_ca || '',
      validade_ca: initialData?.validade_ca || '',
      periodo_troca_meses: initialData?.periodo_troca_meses ?? undefined,
      
      // Calibration-specific fields
      requer_calibracao: (initialData as any)?.requer_calibracao ?? false,
      frequencia_calibracao_meses: (initialData as any)?.frequencia_calibracao_meses ?? undefined,
      ultima_calibracao: (initialData as any)?.ultima_calibracao || '',
      proxima_calibracao: (initialData as any)?.proxima_calibracao || '',
      observacoes_calibracao: (initialData as any)?.observacoes_calibracao || '',
      certificado_calibracao_url: (initialData as any)?.certificado_calibracao_url || '',
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        marca_id: initialData.marca_id || undefined,
        modelo: initialData.modelo || '',
        numero_serie: initialData.numero_serie || '',
        valor_unitario: initialData.valor_unitario ?? undefined,
        estoque_atual: initialData.estoque_atual,
        localizacao_id: initialData.localizacao_id || undefined,
        fornecedor_id: initialData.fornecedor_id || undefined,
        foto_url: initialData.foto_url || '',
        codigo_ncm: initialData.codigo_ncm || '',
        codigo_barras: initialData.codigo_barras || '',
        data_aquisicao: initialData.data_aquisicao || '',
        status: initialData.status as any,
        ativo: initialData.ativo,
        alugado: (initialData as any)?.alugado ?? false,
        // EPI-specific fields
        is_epi: initialData.is_epi ?? false,
        numero_ca: initialData.numero_ca || '',
        validade_ca: initialData.validade_ca || '',
        periodo_troca_meses: initialData.periodo_troca_meses ?? undefined,
        
        // Calibration-specific fields
        requer_calibracao: (initialData as any)?.requer_calibracao ?? false,
        frequencia_calibracao_meses: (initialData as any)?.frequencia_calibracao_meses ?? undefined,
        ultima_calibracao: (initialData as any)?.ultima_calibracao || '',
        proxima_calibracao: (initialData as any)?.proxima_calibracao || '',
        observacoes_calibracao: (initialData as any)?.observacoes_calibracao || '',
        certificado_calibracao_url: (initialData as any)?.certificado_calibracao_url || '',
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: MaterialEquipamentoFormData) => {
    // Auto-gerar código se não existir (5 dígitos)
    if (!data.codigo && !initialData) {
      const nextNumber = Math.floor(Math.random() * 90000) + 10000 // 5 dígitos entre 10000-99999
      data.codigo = nextNumber.toString()
    }
    
    await onSubmit(data)
  }

  const handleBuscarNCM = async (event?: React.MouseEvent) => {
    // Prevent form submission
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    const nome = form.getValues('nome')
    
    if (!nome || nome.trim().length < 3) {
      alert('Para buscar o NCM ideal, preencha o nome do item (mínimo 3 caracteres).')
      return
    }

    setLoadingNCM(true)
    try {
      console.log('Buscando NCM para:', nome)
      const resultados = await buscarNCMPorDescricao(nome.trim())
      console.log('Resultados NCM:', resultados)
      
      if (resultados.length === 0) {
        alert('Nenhum NCM encontrado para este item. Tente com um nome mais específico.')
      } else {
        setNcmSuggestions(resultados)
      }
    } catch (error) {
      console.error('Erro ao buscar NCM:', error)
      alert('Erro ao buscar NCM. Tente novamente.')
      setNcmSuggestions([])
    } finally {
      setLoadingNCM(false)
    }
  }

  const selecionarNCM = (codigo: string) => {
    form.setValue('codigo_ncm', codigo)
    setNcmSuggestions([])
  }

  // Filter only active records
  const activeFornecedores = fornecedores?.filter(fornecedor => fornecedor.ativo) || []
  const activeLocalizacoes = localizacoes?.filter(localizacao => localizacao.ativo) || []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Nome do Material/Equipamento - Campo Principal */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Nome do Material/Equipamento *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Parafuso Phillips, Furadeira Elétrica, Capacete de Segurança" 
                  className="text-lg p-4" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo Alugado - Destaque Especial */}
        <FormField
          control={form.control}
          name="alugado"
          render={({ field }) => (
            <FormItem className={`flex flex-row items-center justify-between rounded-lg border-2 p-6 ${
              field.value ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="space-y-0.5">
                <FormLabel className="text-lg font-semibold flex items-center gap-2">
                  {field.value && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                  Item Alugado
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  Marque se este item está em regime de aluguel/locação
                </div>
                {field.value && (
                  <Badge variant="outline" className="mt-2 bg-orange-100 text-orange-800 border-orange-300">
                    🏷️ ALUGADO
                  </Badge>
                )}
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-orange-600"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="marca_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <MarcaComboboxWithAdd
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Selecione ou crie uma nova marca..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="modelo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: DWD502, XYZ-100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numero_serie"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Série</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: ABC123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor_unitario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Unitário (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estoque_atual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade em Estoque</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Localização e Fornecedor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="localizacao_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localização</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma localização" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[10001]">
                    {activeLocalizacoes.map((localizacao) => (
                      <SelectItem key={localizacao.id} value={localizacao.id}>
                        {localizacao.codigo} - {localizacao.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fornecedor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[10001]">
                    {activeFornecedores.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Códigos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="codigo_ncm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código NCM</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input 
                      placeholder="Ex: 8205.40.00" 
                      {...field} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleBuscarNCM()
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBuscarNCM}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={loadingNCM}
                    title="Buscar NCM ideal baseado no nome"
                    className="min-w-[90px] shrink-0"
                  >
                    <Search className="h-4 w-4" />
                    {loadingNCM ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
                {ncmSuggestions.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg relative z-[10002]">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      Sugestões de NCM baseadas no nome:
                    </p>
                    <div className="space-y-2">
                      {ncmSuggestions.map((sugestao) => (
                        <div
                          key={sugestao.codigo}
                          className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50"
                          onClick={() => selecionarNCM(sugestao.codigo)}
                        >
                          <div className="flex-1">
                            <span className="font-medium text-blue-900">{sugestao.codigo}</span>
                            <p className="text-sm text-gray-600 mt-1">{sugestao.descricao}</p>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {sugestao.confianca}% compatível
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNcmSuggestions([])}
                      className="mt-2 text-blue-600"
                    >
                      Fechar sugestões
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codigo_barras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Barras</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 7891234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="data_aquisicao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Aquisição</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Foto do Item */}
        <FormField
          control={form.control}
          name="foto_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto do Item</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://exemplo.com/foto.jpg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggle EPI */}
        <FormField
          control={form.control}
          name="is_epi"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Item é EPI</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Marque se este item é um Equipamento de Proteção Individual
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    if (!checked && field.value) {
                      // Se está desabilitando o EPI, confirmar
                      const confirm = window.confirm(
                        'Ao desmarcar como EPI, os dados específicos (CA, Validade, Período de Troca) serão perdidos. Deseja continuar?'
                      )
                      if (confirm) {
                        field.onChange(false)
                        // Limpar campos específicos de EPI
                        form.setValue('numero_ca', undefined)
                        form.setValue('validade_ca', undefined)
                        form.setValue('periodo_troca_meses', undefined)
                      }
                    } else {
                      field.onChange(checked)
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Campos específicos de EPI */}
        {form.watch('is_epi') && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              🛡️ Informações do EPI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_ca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do CA (Certificado de Aprovação)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validade_ca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade do CA</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo_troca_meses"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Período de Troca (meses)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 6, 12, 24"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Toggle Calibração */}
        <FormField
          control={form.control}
          name="requer_calibracao"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Requer Calibração/Aferição</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Marque se este equipamento precisa de calibração ou aferição periódica
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    if (!checked && field.value) {
                      // Se está desabilitando a calibração, confirmar
                      const confirm = window.confirm(
                        'Ao desmarcar calibração, os dados específicos (Frequência, Datas, Observações, Certificado) serão perdidos. Deseja continuar?'
                      )
                      if (confirm) {
                        field.onChange(false)
                        // Limpar campos específicos de calibração
                        form.setValue('frequencia_calibracao_meses', undefined)
                        form.setValue('ultima_calibracao', undefined)
                        form.setValue('proxima_calibracao', undefined)
                        form.setValue('observacoes_calibracao', undefined)
                        form.setValue('certificado_calibracao_url', undefined)
                      }
                    } else {
                      field.onChange(checked)
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Campos específicos de Calibração */}
        {form.watch('requer_calibracao') && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                🔧 Informações de Calibração/Aferição
              </h3>
              {(() => {
                const proximaCalibracao = form.watch('proxima_calibracao')
                const frequenciaMeses = form.watch('frequencia_calibracao_meses')
                
                if (proximaCalibracao) {
                  const statusCalibracao = verificarStatusCalibracao(
                    true,
                    proximaCalibracao,
                    frequenciaMeses
                  )
                  
                  if (statusCalibracao.status === 'vencida' || statusCalibracao.status === 'proxima_vencimento') {
                    return (
                      <Badge 
                        variant={statusCalibracao.cor}
                        className="text-xs"
                      >
                        {statusCalibracao.icone} {statusCalibracao.mensagem}
                      </Badge>
                    )
                  }
                }
                return null
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequencia_calibracao_meses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência de Calibração (meses)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 6, 12, 24"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ultima_calibracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Última Calibração</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proxima_calibracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próxima Calibração</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes_calibracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações sobre Calibração</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Responsável: João Silva, etc."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campo de Certificado de Calibração/Aferição */}
            <FormField
              control={form.control}
              name="certificado_calibracao_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Certificado de Calibração/Aferição
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://exemplo.com/certificado.pdf"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    Insira a URL do certificado (PDF, JPG, PNG, DOC, DOCX)
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-[10001]">
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Sistema</FormLabel>
                <div className="text-sm text-muted-foreground">
                  {field.value ? 'Item ativo no sistema' : 'Item inativo no sistema'}
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : initialData ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}