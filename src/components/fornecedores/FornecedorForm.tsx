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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DialogFooter } from '@/components/ui/dialog'
import { fornecedorSchema, formatCNPJ, formatCPF, formatPhone, type FornecedorFormData } from '@/lib/validations'
import type { Tables } from '@/types/database'

interface FornecedorFormProps {
  initialData?: Tables<'fornecedores'>
  onSubmit: (data: FornecedorFormData) => Promise<void>
  onCancel: () => void
}

export function FornecedorForm({ initialData, onSubmit, onCancel }: FornecedorFormProps) {
  const form = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      cnpj: initialData?.cnpj || '',
      cpf: initialData?.cpf || '',
      endereco: initialData?.endereco || '',
      telefone: initialData?.telefone || '',
      email: initialData?.email || '',
      contato: initialData?.contato || '',
      ativo: initialData?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        cnpj: initialData.cnpj || '',
        cpf: initialData.cpf || '',
        endereco: initialData.endereco || '',
        telefone: initialData.telefone || '',
        email: initialData.email || '',
        contato: initialData.contato || '',
        ativo: initialData.ativo,
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: FornecedorFormData) => {
    // Remove formatting from documents and phone before saving
    const cleanData = {
      ...data,
      cnpj: data.cnpj ? data.cnpj.replace(/\D/g, '') : null,
      cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
      telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null,
    }
    await onSubmit(cleanData)
  }

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value)
    form.setValue('cnpj', formatted)
    // Clear CPF when CNPJ is entered
    if (value && form.getValues('cpf')) {
      form.setValue('cpf', '')
    }
  }

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value)
    form.setValue('cpf', formatted)
    // Clear CNPJ when CPF is entered
    if (value && form.getValues('cnpj')) {
      form.setValue('cnpj', '')
    }
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    form.setValue('telefone', formatted)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome/Razão Social *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Empresa LTDA ou João da Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="00.000.000/0000-00"
                    {...field}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    maxLength={18}
                  />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="contato@fornecedor.com"
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
        </div>

        <FormField
          control={form.control}
          name="contato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pessoa de Contato</FormLabel>
              <FormControl>
                <Input placeholder="Ex: João Silva - Gerente de Vendas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Endereço completo do fornecedor"
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
                  {field.value ? 'Fornecedor ativo no sistema' : 'Fornecedor inativo no sistema'}
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