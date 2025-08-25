import { useState } from 'react'
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
import { ImageUpload } from '@/components/ui/image-upload'
import { empresaSchema, formatCNPJ, formatPhone, type EmpresaFormData } from '@/lib/validations'
import type { Tables } from '@/types/database'

interface EmpresaFormProps {
  initialData?: Tables<'empresas'>
  onSubmit: (data: EmpresaFormData) => Promise<void>
  onCancel: () => void
}

export function EmpresaForm({ initialData, onSubmit, onCancel }: EmpresaFormProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData?.logo_url || null)

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      cnpj: initialData?.cnpj || '',
      endereco: initialData?.endereco || '',
      telefone: initialData?.telefone || '',
      email: initialData?.email || '',
      ativo: initialData?.ativo ?? true,
    },
  })

  const handleSubmit = async (data: EmpresaFormData) => {
    // Remove formatting from CNPJ and phone before saving
    const cleanData = {
      ...data,
      cnpj: data.cnpj ? data.cnpj.replace(/\D/g, '') : null,
      telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null,
    }
    await onSubmit(cleanData)
  }

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value)
    form.setValue('cnpj', formatted)
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    form.setValue('telefone', formatted)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {initialData?.id && (
          <div className="flex justify-center">
            <ImageUpload
              currentImageUrl={logoUrl}
              onImageChange={setLogoUrl}
              uploadType="company"
              entityId={initialData.id}
              size="md"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome da Empresa *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Empresa LTDA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="contato@empresa.com"
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
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Endereço completo da empresa"
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
                  {field.value ? 'Empresa ativa no sistema' : 'Empresa inativa no sistema'}
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