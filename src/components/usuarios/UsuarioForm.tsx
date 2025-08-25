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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { User, UserProfile, PROFILE_LABELS, PROFILE_DESCRIPTIONS } from '@/types/auth'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { usePerfisAcesso } from '@/hooks/usePerfisAcesso'

const usuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  perfil: z.enum(['administrador', 'almoxarife', 'supervisor', 'solicitante', 'visualizador']),
  perfil_acesso_id: z.string().optional(),
  centro_custo_id: z.string().optional(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
})

type UsuarioFormData = z.infer<typeof usuarioSchema>

interface UsuarioFormProps {
  initialData?: User
  onSubmit: (data: UsuarioFormData) => Promise<void>
  onCancel: () => void
}

export function UsuarioForm({ initialData, onSubmit, onCancel }: UsuarioFormProps) {
  const { data: centrosCusto } = useSupabaseTable('centros_custo')
  const { perfis: perfisPersonalizados } = usePerfisAcesso()
  
  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      email: initialData?.email || '',
      perfil: initialData?.perfil || 'solicitante',
      perfil_acesso_id: (initialData as any)?.perfil_acesso_id || 'none',
      centro_custo_id: initialData?.centro_custo_id || 'none',
      senha: '',
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        email: initialData.email,
        perfil: initialData.perfil,
        perfil_acesso_id: (initialData as any).perfil_acesso_id || 'none',
        centro_custo_id: initialData.centro_custo_id || 'none',
        senha: '', // Não preencher senha em edição
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: UsuarioFormData) => {
    // Converter "none" para undefined nos campos opcionais
    const processedData = {
      ...data,
      centro_custo_id: data.centro_custo_id === 'none' ? undefined : data.centro_custo_id,
      perfil_acesso_id: data.perfil_acesso_id === 'none' ? undefined : data.perfil_acesso_id
    }

    // Se é edição, remover senha se estiver vazia
    if (initialData && !processedData.senha) {
      const { senha, ...dataWithoutPassword } = processedData
      await onSubmit(dataWithoutPassword)
    } else {
      await onSubmit(processedData)
    }
  }

  // Filter only active records
  const activeCentrosCusto = centrosCusto.filter(centro => centro.ativo)

  const isEditing = !!initialData

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João Silva" {...field} />
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
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Ex: joao.silva@empresa.com" 
                    {...field}
                    disabled={isEditing} // Email não pode ser alterado em edição
                  />
                </FormControl>
                {isEditing && (
                  <FormDescription>
                    O email não pode ser alterado após a criação
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="perfil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Perfil de Acesso *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {PROFILE_DESCRIPTIONS[key as UserProfile]}
                          </div>
                        </div>
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
            name="perfil_acesso_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Perfil Personalizado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil personalizado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Usar perfil padrão</SelectItem>
                    {perfisPersonalizados
                      .filter(perfil => perfil.ativo)
                      .map((perfil) => (
                        <SelectItem key={perfil.id} value={perfil.id}>
                          <div>
                            <div className="font-medium">{perfil.nome}</div>
                            {perfil.descricao && (
                              <div className="text-xs text-muted-foreground">
                                {perfil.descricao}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Se selecionado, substituirá o perfil padrão com permissões customizadas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
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
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeCentrosCusto.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.codigo} - {centro.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Centro de custo associado ao usuário (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isEditing && (
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha *</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  A senha será enviada por email para o usuário
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isEditing && (
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova Senha (opcional)</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Deixe em branco para manter a senha atual" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Deixe em branco se não quiser alterar a senha
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}