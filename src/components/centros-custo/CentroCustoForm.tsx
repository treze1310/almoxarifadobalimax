import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DialogFooter } from '@/components/ui/dialog'
import { centroCustoSchema, type CentroCustoFormData } from '@/lib/validations'
import { useSupabaseTable } from '@/hooks/useSupabase'
import type { Tables } from '@/types/database'
import { generateCentroCustoCode } from '@/services/centroCustoService'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { EmpresaCombobox } from './EmpresaCombobox'

interface CentroCustoFormProps {
  initialData?: Tables<'centros_custo'>
  onSubmit: (data: CentroCustoFormData) => Promise<void>
  onCancel: () => void
}

export function CentroCustoForm({ initialData, onSubmit, onCancel }: CentroCustoFormProps) {
  const { data: empresas } = useSupabaseTable('empresas')
  const { toast } = useToast()
  const [generatingCode, setGeneratingCode] = useState(false)
  
  // Estado local para empresas (incluindo as criadas dinamicamente)
  const [localEmpresas, setLocalEmpresas] = useState<Tables<'empresas'>[]>(empresas)
  
  // Sincronizar empresas locais com as do hook
  useEffect(() => {
    if (empresas && empresas.length > 0) {
      setLocalEmpresas(empresas)
    }
  }, [empresas])
  
  // Callback para quando uma nova empresa é criada
  const handleEmpresaCreated = (novaEmpresa: Tables<'empresas'>) => {
    setLocalEmpresas(prev => [...prev, novaEmpresa])
  }
  
  const form = useForm<CentroCustoFormData>({
    resolver: zodResolver(centroCustoSchema),
    defaultValues: {
      codigo: initialData?.codigo || '',
      descricao: initialData?.descricao || '',
      empresa_id: initialData?.empresa_id || undefined,
      ativo: initialData?.ativo ?? true,
    },
  })

  const handleGenerateCode = useCallback(async () => {
    setGeneratingCode(true)
    try {
      const codeInfo = await generateCentroCustoCode()
      form.setValue('codigo', codeInfo.codigo)
      toast({
        title: 'Código gerado',
        description: `Código automático: ${codeInfo.codigo}`,
      })
    } catch (error) {
      console.error('Error generating code:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao gerar código automático',
        variant: 'destructive',
      })
    } finally {
      setGeneratingCode(false)
    }
  }, [form, toast])

  useEffect(() => {
    if (initialData) {
      form.reset({
        codigo: initialData.codigo,
        descricao: initialData.descricao || '',
        empresa_id: initialData.empresa_id || undefined,
        ativo: initialData.ativo,
      })
    }
    // Removido auto-geração para evitar loops
  }, [initialData])

  const handleSubmit = async (data: CentroCustoFormData) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código *</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input 
                      placeholder={initialData ? "Ex: CC001" : "Gerando código automático..."} 
                      {...field}
                      readOnly={!initialData && generatingCode}
                    />
                  </FormControl>
                  {!initialData && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                      className="shrink-0"
                    >
                      {generatingCode ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {!initialData && (
                  <div className="text-xs text-muted-foreground">
                    Formato: AAMMDDXXXX (Ano/Mês/Dia/Sequência)
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <EmpresaCombobox
                    value={field.value}
                    onChange={field.onChange}
                    empresas={localEmpresas}
                    onEmpresaCreated={handleEmpresaCreated}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>



        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrição detalhada do centro de custo"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
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
                <FormLabel className="text-base">Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  {field.value ? 'Centro de custo ativo no sistema' : 'Centro de custo inativo no sistema'}
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