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
import { localizacaoSchema, type LocalizacaoFormData } from '@/lib/validations'
import type { Tables } from '@/types/database'

interface LocalizacaoFormProps {
  initialData?: Tables<'localizacao'>
  onSubmit: (data: LocalizacaoFormData) => Promise<void>
  onCancel: () => void
}

export function LocalizacaoForm({ initialData, onSubmit, onCancel }: LocalizacaoFormProps) {
  const form = useForm<LocalizacaoFormData>({
    resolver: zodResolver(localizacaoSchema),
    defaultValues: {
      codigo: initialData?.codigo || '',
      nome: initialData?.nome || '',
      descricao: initialData?.descricao || '',
      predio: initialData?.predio || '',
      andar: initialData?.andar || '',
      sala: initialData?.sala || '',
      posicao_x: initialData?.posicao_x ?? undefined,
      posicao_y: initialData?.posicao_y ?? undefined,
      ativo: initialData?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        codigo: initialData.codigo,
        nome: initialData.nome,
        descricao: initialData.descricao || '',
        predio: initialData.predio || '',
        andar: initialData.andar || '',
        sala: initialData.sala || '',
        posicao_x: initialData.posicao_x ?? undefined,
        posicao_y: initialData.posicao_y ?? undefined,
        ativo: initialData.ativo,
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: LocalizacaoFormData) => {
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
                <FormControl>
                  <Input placeholder="Ex: LOC001, A1-P01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Prateleira A - Nível 1" {...field} />
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
                  placeholder="Descrição detalhada da localização"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="predio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prédio</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: A, Principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="andar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Andar</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 1º, Térreo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sala"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sala</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 101, Almoxarifado" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Posição no Mapa (opcional)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="posicao_x"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posição X</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Coordenada X"
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
              name="posicao_y"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posição Y</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Coordenada Y"
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

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  {field.value ? 'Localização ativa no sistema' : 'Localização inativa no sistema'}
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