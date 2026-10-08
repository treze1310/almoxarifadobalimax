import { useEffect, useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert, Trash2, UserPlus } from 'lucide-react'

/** O mesmo mínimo exigido pela função de administração (Edge Function) */
const MINIMO_SENHA = 8
import { supabase } from '@/lib/supabase'
import { useAdminUsuarios, type UsuarioAdmin } from '@/hooks/useAdminUsuarios'
import { usePerfisAcesso } from '@/hooks/usePerfisAcesso'
import { usePermissoes } from '@/contexts/PermissionsContext'

const SEM_CENTRO = 'sem-centro'

interface CentroCusto {
  id: string
  codigo: string
  descricao: string
}

const formVazio = {
  nome: '',
  email: '',
  senha: '',
  perfil_acesso_id: '',
  centro_custo_id: SEM_CENTRO,
}

export const UsuariosAdmin = () => {
  const { isAdmin, usuario: usuarioLogado } = usePermissoes()
  const { usuarios, loading, criarUsuario, atualizarUsuario, redefinirSenha, excluirUsuario } =
    useAdminUsuarios()
  const { perfis } = usePerfisAcesso()
  const { toast } = useToast()

  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [senhaUsuario, setSenhaUsuario] = useState<UsuarioAdmin | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [excluindo, setExcluindo] = useState<UsuarioAdmin | null>(null)

  const perfisAtivos = useMemo(() => perfis.filter((p) => p.ativo), [perfis])

  useEffect(() => {
    supabase
      .from('centros_custo')
      .select('id, codigo, descricao')
      // Mais recente primeiro pela data da obra, como nas demais telas
      .order('data', { ascending: false, nullsFirst: false })
      .order('codigo', { ascending: false })
      .then(({ data }) => setCentrosCusto((data as CentroCusto[]) || []))
  }, [])

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem gerenciar usuários.
          </p>
        </CardContent>
      </Card>
    )
  }

  /** A coluna legada `perfil` é espelhada a partir do nome do perfil de acesso */
  const perfilLegado = (perfilAcessoId: string) =>
    (perfisAtivos.find((p) => p.id === perfilAcessoId)?.nome || 'visualizador').toLowerCase()

  const salvarNovoUsuario = async () => {
    if (!form.nome.trim() || !form.email.trim() || !form.senha || !form.perfil_acesso_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe nome, e-mail, senha e perfil de acesso.',
        variant: 'destructive',
      })
      return
    }
    // O mesmo mínimo que a função de administração exige. Estavam diferentes
    // (6 aqui, 8 lá): a tela deixava salvar, o servidor recusava e a senha não
    // mudava — fácil de passar despercebido e achar que trocou.
    if (form.senha.length < MINIMO_SENHA) {
      toast({
        title: 'Senha muito curta',
        description: `A senha deve ter ao menos ${MINIMO_SENHA} caracteres.`,
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    const { error } = await criarUsuario(
      {
        nome: form.nome.trim(),
        email: form.email,
        senha: form.senha,
        perfil_acesso_id: form.perfil_acesso_id,
        centro_custo_id: form.centro_custo_id === SEM_CENTRO ? null : form.centro_custo_id,
      },
      perfilLegado(form.perfil_acesso_id)
    )
    setSalvando(false)

    if (error) {
      toast({ title: 'Erro ao criar usuário', description: error, variant: 'destructive' })
      return
    }

    toast({
      title: 'Usuário criado',
      description: `${form.nome} já pode entrar no sistema com o e-mail informado.`,
    })
    setForm(formVazio)
    setDialogAberto(false)
  }

  const trocarPerfil = async (usuario: UsuarioAdmin, perfilAcessoId: string) => {
    const { error } = await atualizarUsuario(usuario.id, {
      perfil_acesso_id: perfilAcessoId,
      perfil: perfilLegado(perfilAcessoId),
    })
    toast({
      title: error ? 'Erro ao atribuir perfil' : 'Perfil atualizado',
      description:
        error ||
        `${usuario.nome} agora usa o perfil ${perfisAtivos.find((p) => p.id === perfilAcessoId)?.nome}.`,
      variant: error ? 'destructive' : 'default',
    })
  }

  const trocarCentroCusto = async (usuario: UsuarioAdmin, valor: string) => {
    const { error } = await atualizarUsuario(usuario.id, {
      centro_custo_id: valor === SEM_CENTRO ? null : valor,
    })
    if (error) {
      toast({ title: 'Erro ao alterar centro de custo', description: error, variant: 'destructive' })
    }
  }

  const alternarAtivo = async (usuario: UsuarioAdmin, ativo: boolean) => {
    const { error } = await atualizarUsuario(usuario.id, { ativo })
    if (error) {
      toast({ title: 'Erro ao alterar status', description: error, variant: 'destructive' })
    }
  }

  const confirmarSenha = async () => {
    if (!senhaUsuario) return
    if (novaSenha.length < MINIMO_SENHA) {
      toast({
        title: 'Senha muito curta',
        description: `A senha deve ter ao menos ${MINIMO_SENHA} caracteres.`,
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    const { error } = await redefinirSenha(senhaUsuario.id, novaSenha)
    setSalvando(false)

    toast({
      title: error ? 'Erro ao definir senha' : 'Senha definida',
      description: error || `Informe a nova senha a ${senhaUsuario.nome}.`,
      variant: error ? 'destructive' : 'default',
    })
    if (!error) {
      setSenhaUsuario(null)
      setNovaSenha('')
    }
  }

  const confirmarExclusao = async () => {
    if (!excluindo) return
    const { error } = await excluirUsuario(excluindo.id)
    toast({
      title: error ? 'Erro ao excluir' : 'Usuário excluído',
      description: error || `${excluindo.nome} foi removido do sistema.`,
      variant: error ? 'destructive' : 'default',
    })
    if (!error) setExcluindo(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Cadastre usuários, defina a senha inicial e atribua o perfil de acesso que controla o
            que cada um pode fazer.
          </CardDescription>
        </div>
        <Button onClick={() => setDialogAberto(true)} size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Usuário</TableHead>
                  <TableHead className="min-w-[180px]">Perfil de acesso</TableHead>
                  <TableHead className="min-w-[180px]">Centro de custo</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="py-2">
                      <div className="text-sm font-medium">{usuario.nome}</div>
                      <div className="text-xs text-muted-foreground">{usuario.email}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Select
                        value={usuario.perfil_acesso_id || ''}
                        onValueChange={(valor) => trocarPerfil(usuario, valor)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sem perfil (somente leitura)" />
                        </SelectTrigger>
                        <SelectContent>
                          {perfisAtivos.map((perfil) => (
                            <SelectItem key={perfil.id} value={perfil.id}>
                              {perfil.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2">
                      <Select
                        value={usuario.centro_custo_id || SEM_CENTRO}
                        onValueChange={(valor) => trocarCentroCusto(usuario, valor)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_CENTRO}>Não definido</SelectItem>
                          {centrosCusto.map((centro) => (
                            <SelectItem key={centro.id} value={centro.id}>
                              {centro.codigo} - {centro.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2">
                      {usuario.auth_user_id ? (
                        <Badge variant="outline" className="text-xs">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Sem acesso
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Switch
                        checked={usuario.ativo !== false}
                        onCheckedChange={(checked) => alternarAtivo(usuario, checked)}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={usuario.auth_user_id ? 'Redefinir senha' : 'Criar acesso e senha'}
                          onClick={() => {
                            setSenhaUsuario(usuario)
                            setNovaSenha('')
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Excluir usuário"
                          disabled={usuario.id === usuarioLogado?.id}
                          onClick={() => setExcluindo(usuario)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Novo usuário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O acesso é criado imediatamente: o usuário entra com o e-mail e a senha definidos
              aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="novo-nome">Nome</Label>
              <Input
                id="novo-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="novo-email">E-mail</Label>
              <Input
                id="novo-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@balimax.com.br"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nova-senha-usuario">Senha inicial</Label>
              <div className="relative">
                <Input
                  id="nova-senha-usuario"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value.trim() })}
                  placeholder={`Mínimo de ${MINIMO_SENHA} caracteres`}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Perfil de acesso</Label>
              <Select
                value={form.perfil_acesso_id}
                onValueChange={(valor) => setForm({ ...form, perfil_acesso_id: valor })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {perfisAtivos.map((perfil) => (
                    <SelectItem key={perfil.id} value={perfil.id}>
                      {perfil.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Centro de custo (opcional)</Label>
              <Select
                value={form.centro_custo_id}
                onValueChange={(valor) => setForm({ ...form, centro_custo_id: valor })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_CENTRO}>Não definido</SelectItem>
                  {centrosCusto.map((centro) => (
                    <SelectItem key={centro.id} value={centro.id}>
                      {centro.codigo} - {centro.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarNovoUsuario} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redefinir senha */}
      <Dialog
        open={!!senhaUsuario}
        onOpenChange={() => {
          setSenhaUsuario(null)
          setNovaSenha('')
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {senhaUsuario?.auth_user_id ? 'Redefinir senha' : 'Criar acesso'}
            </DialogTitle>
            <DialogDescription>
              {senhaUsuario?.nome} — {senhaUsuario?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="senha-reset">Nova senha</Label>
            <div className="relative">
              <Input
                id="senha-reset"
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                // Espaço no começo ou no fim é invisível aqui e some na hora de
                // digitar no login — a pessoa jura que a senha está certa.
                onChange={(e) => setNovaSenha(e.target.value.trim())}
                placeholder={`Mínimo de ${MINIMO_SENHA} caracteres`}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anote a senha antes de salvar: ela não é exibida depois.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSenhaUsuario(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarSenha} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir usuário */}
      <AlertDialog open={!!excluindo} onOpenChange={() => setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário "{excluindo?.nome}" e o respectivo acesso ao sistema serão removidos. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default UsuariosAdmin
