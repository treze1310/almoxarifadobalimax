import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PermissionsForm } from './PermissionsForm'
import { PerfilAcesso, PerfilFormData } from '@/types/perfil'

const perfilSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  permissoes: z.object({}).passthrough(), // Aceita qualquer estrutura de permissões
  ativo: z.boolean(),
})

interface PerfilFormProps {
  initialData?: PerfilAcesso
  onSubmit: (data: PerfilFormData) => Promise<void>
  onCancel: () => void
}

export function PerfilForm({ initialData, onSubmit, onCancel }: PerfilFormProps) {
  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      descricao: initialData?.descricao || '',
      permissoes: initialData?.permissoes || {},
      ativo: initialData?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        descricao: initialData.descricao || '',
        permissoes: initialData.permissoes || {},
        ativo: initialData.ativo,
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: PerfilFormData) => {
    await onSubmit(data)
  }

  const isEditing = !!initialData
  const isSystemProfile = initialData?.sistema || false

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Perfil *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Operador de Almoxarifado" 
                        {...field}
                        disabled={isSystemProfile}
                      />
                    </FormControl>
                    {isSystemProfile && (
                      <FormDescription>
                        Perfis do sistema não podem ter o nome alterado
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva as responsabilidades e escopo deste perfil..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Descrição opcional para explicar o propósito do perfil
                    </FormDescription>
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
                      <FormLabel className="text-base">Perfil Ativo</FormLabel>
                      <FormDescription>
                        Perfis inativos não podem ser atribuídos a novos usuários
                      </FormDescription>
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

              {isSystemProfile && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Perfil do Sistema
                      </h3>
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        <p>
                          Este é um perfil padrão do sistema. Algumas configurações podem ter restrições de edição.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="permissions" className="mt-4">
            <PermissionsForm form={form} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Perfil'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}