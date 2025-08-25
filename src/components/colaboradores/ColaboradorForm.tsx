import { useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { colaboradorSchema, formatCPF, formatPhone, type ColaboradorFormData } from '@/lib/validations'
import { useSupabaseTable } from '@/hooks/useSupabase'
import type { Tables } from '@/types/database'

interface ColaboradorFormProps {
  initialData?: Tables<'colaboradores'>
  onSubmit: (data: ColaboradorFormData) => Promise<void>
  onCancel: () => void
}

export function ColaboradorForm({ initialData, onSubmit, onCancel }: ColaboradorFormProps) {
  const { data: empresas } = useSupabaseTable('empresas')
  const { data: centrosCusto } = useSupabaseTable('centros_custo')
  
  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      cpf: initialData?.cpf || '',
      rg: initialData?.rg || '',
      matricula: initialData?.matricula || '',
      cargo: initialData?.cargo || '',
      setor: initialData?.setor || '',
      email: initialData?.email || '',
      telefone: initialData?.telefone || '',
      centro_custo_id: initialData?.centro_custo_id || undefined,
      empresa_id: initialData?.empresa_id || undefined,
      foto_url: initialData?.foto_url || '',
      data_admissao: initialData?.data_admissao || undefined,
      data_demissao: initialData?.data_demissao || undefined,
      ativo: initialData?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        cpf: initialData.cpf || '',
        rg: initialData.rg || '',
        matricula: initialData.matricula || '',
        cargo: initialData.cargo || '',
        setor: initialData.setor || '',
        email: initialData.email || '',
        telefone: initialData.telefone || '',
        centro_custo_id: initialData.centro_custo_id || undefined,
        empresa_id: initialData.empresa_id || undefined,
        foto_url: initialData.foto_url || '',
        data_admissao: initialData.data_admissao || undefined,
        data_demissao: initialData.data_demissao || undefined,
        ativo: initialData.ativo,
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: ColaboradorFormData) => {
    // Remove formatting from CPF and phone before saving
    const cleanData = {
      ...data,
      cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
      telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null,
      foto_url: data.foto_url || null,
    }
    await onSubmit(cleanData)
  }

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value)
    form.setValue('cpf', formatted)
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    form.setValue('telefone', formatted)
  }

  // Filter only active empresas and centros de custo
  const activeEmpresas = empresas.filter(empresa => empresa.ativo)
  const activeCentrosCusto = centrosCusto.filter(centro => centro.ativo)

  // Filter centros de custo by selected empresa
  const selectedEmpresaId = form.watch('empresa_id')
  const filteredCentrosCusto = selectedEmpresaId 
    ? activeCentrosCusto.filter(centro => centro.empresa_id === selectedEmpresaId)
    : activeCentrosCusto

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João da Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="000.000.000-00"
                    {...field}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    maxLength={14}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RG</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 12.345.678-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="matricula"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matrícula</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: EMP001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="usuario@empresa.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(00) 00000-0000"
                    {...field}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    maxLength={15}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_admissao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Admissão</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_demissao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Demissão</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cargo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Analista de Sistemas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="setor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Tecnologia da Informação" {...field} />
                </FormControl>
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
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value)
                    // Reset centro de custo when empresa changes
                    form.setValue('centro_custo_id', undefined)
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeEmpresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
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
            name="centro_custo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Custo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um centro de custo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCentrosCusto.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.codigo} - {centro.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="foto_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Foto</FormLabel>
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

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  {field.value ? 'Colaborador ativo no sistema' : 'Colaborador inativo no sistema'}
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
