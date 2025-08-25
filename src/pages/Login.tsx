import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PackageSearch, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
  rememberMe: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { signIn, user, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true)
    try {
      const { error } = await signIn(data.email, data.password)
      
      if (error) {
        toast({
          title: 'Erro no login',
          description: getErrorMessage(error.message),
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Login bem-sucedido!',
          description: 'Redirecionando para o dashboard...',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'Invalid login credentials':
        return 'E-mail ou senha incorretos.'
      case 'Email not confirmed':
        return 'Por favor, confirme seu e-mail antes de fazer login.'
      case 'Too many requests':
        return 'Muitas tentativas. Tente novamente em alguns minutos.'
      default:
        return 'Erro ao fazer login. Verifique suas credenciais.'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <PackageSearch className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema de almoxarifado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu.email@empresa.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Sua senha"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Lembrar-me</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <Button variant="link" type="button" className="p-0 h-auto">
                  Esqueceu sua senha?
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
