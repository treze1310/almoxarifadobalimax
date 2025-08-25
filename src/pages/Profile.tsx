import { useState, useEffect } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Moon, Sun, User } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const profileSchema = z.object({
  name: z.string().min(1, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
})

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: 'Senha atual é obrigatória' }),
    newPassword: z
      .string()
      .min(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

const ProfilePage = () => {
  const { user, usuario, refreshUsuario } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark'),
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  useEffect(() => {
    if (usuario) {
      setPhotoUrl(usuario.foto_url)
      profileForm.reset({
        name: usuario.nome,
        email: usuario.email,
      })
    }
  }, [usuario, profileForm])

  useEffect(() => {
    loadEmpresaAtiva()
  }, [])

  const loadEmpresaAtiva = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('ativo', true)
      .limit(1)
      .single()

    if (data && !error) {
      setEmpresa(data)
      setLogoUrl(data.logo_url)
    }
  }

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return

    const { error } = await supabase
      .from('usuarios')
      .update({
        nome: data.name,
        email: data.email,
      })
      .eq('id', user.id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil.',
        variant: 'destructive'
      })
    } else {
      await refreshUsuario()
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      })
    }
  }

  const handlePhotoChange = async (newPhotoUrl: string | null) => {
    setPhotoUrl(newPhotoUrl)
    await refreshUsuario()
  }

  const handleLogoChange = async (newLogoUrl: string | null) => {
    setLogoUrl(newLogoUrl)
    await loadEmpresaAtiva()
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user) return

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao alterar senha.',
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Senha alterada!',
          description: 'Sua senha foi alterada com sucesso.',
        })
        passwordForm.reset()
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar senha.',
        variant: 'destructive'
      })
    }
  }

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode
    setIsDarkMode(newIsDarkMode)
    document.documentElement.classList.toggle('dark', newIsDarkMode)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Perfil e Configurações</h1>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="password">Senha</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="theme">Aparência</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e foto de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                {user && (
                  <ImageUpload
                    currentImageUrl={photoUrl}
                    onImageChange={handlePhotoChange}
                    uploadType="user"
                    entityId={user.id}
                    size="lg"
                  />
                )}
              </div>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Seu e-mail"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Salvar Alterações</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Para sua segurança, escolha uma senha forte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Alterar Senha</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Empresa</CardTitle>
              <CardDescription>
                Gerencie o logo e informações da empresa que aparecerão nos romaneios e solicitações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Logo da Empresa</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Este logo aparecerá nos romaneios e solicitações de compra
                  </p>
                </div>
                {empresa && (
                  <ImageUpload
                    currentImageUrl={logoUrl}
                    onImageChange={handleLogoChange}
                    uploadType="company"
                    entityId={empresa.id}
                    size="lg"
                  />
                )}
              </div>
              
              {empresa && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome da Empresa</label>
                    <p className="text-base font-medium">{empresa.nome}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                    <p className="text-base">{empresa.cnpj || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{empresa.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                    <p className="text-base">{empresa.telefone || 'Não informado'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                    <p className="text-base">{empresa.endereco || 'Não informado'}</p>
                  </div>
                </div>
              )}
              
              {!empresa && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma empresa ativa encontrada.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Configure uma empresa no menu de cadastros para poder adicionar o logo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize a aparência do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Tema</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant={!isDarkMode ? 'secondary' : 'outline'}
                  onClick={toggleTheme}
                  disabled={!isDarkMode}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Claro
                </Button>
                <Button
                  variant={isDarkMode ? 'secondary' : 'outline'}
                  onClick={toggleTheme}
                  disabled={isDarkMode}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Escuro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfilePage
