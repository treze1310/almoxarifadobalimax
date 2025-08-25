import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { User } from '@/types/auth'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

const authSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type AuthFormData = z.infer<typeof authSchema>

interface CreateAuthDialogProps {
  usuario: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (userId: string, password: string) => Promise<{ error: string | null }>
}

export function CreateAuthDialog({ usuario, open, onOpenChange, onSubmit }: CreateAuthDialogProps) {
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const handleSubmit = async (data: AuthFormData) => {
    if (!usuario) return

    try {
      const result = await onSubmit(usuario.id, data.password)
      
      if (result.error) {
        toast({
          title: 'Erro ao criar credenciais',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Credenciais criadas com sucesso!',
          description: `${usuario.nome} agora pode fazer login no sistema.`,
        })
        form.reset()
        onOpenChange(false)
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    }
  }

  if (!usuario) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Criar Credenciais de Acesso
          </DialogTitle>
          <DialogDescription>
            Criar credenciais de autenticação para permitir que <strong>{usuario.nome}</strong> faça login no sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Email:</strong> {usuario.email}
              </div>
              <div className="text-sm text-muted-foreground">
                Este usuário não possui credenciais de login. Defina uma senha para permitir o acesso.
              </div>
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    A senha será usada para login no sistema
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repita a senha"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Criando...' : 'Criar Credenciais'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}