import { useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { usePerfisAcesso } from '@/hooks/usePerfisAcesso'
import {
  MODULOS_SISTEMA,
  PERMISSION_LABELS,
  PERFIS_PADRAO,
  type ModuloSistema,
  type PermissoesPerfil,
  type TipoPermissao,
  type PerfilAcesso,
} from '@/types/perfil'

const MODULOS = Object.entries(MODULOS_SISTEMA) as [
  ModuloSistema,
  { label: string; description: string; permissions: readonly string[] }
][]

const TODAS_PERMISSOES = Object.keys(PERMISSION_LABELS) as TipoPermissao[]

/** Resumo curto das permissões concedidas, usado no cabeçalho de cada perfil */
const resumirPermissoes = (permissoes: PermissoesPerfil) => {
  const modulos = MODULOS.filter(([key]) => permissoes[key]?.read)
  return `${modulos.length} de ${MODULOS.length} módulos liberados`
}

export const PerfisAcesso = () => {
  const { perfis, loading, error, updatePerfil, togglePerfilStatus } = usePerfisAcesso()
  const { toast } = useToast()

  const [rascunhos, setRascunhos] = useState<Record<string, PermissoesPerfil>>({})
  const [salvando, setSalvando] = useState<string | null>(null)

  // Sincroniza os rascunhos locais sempre que os perfis são recarregados
  useEffect(() => {
    setRascunhos(
      perfis.reduce((acc, perfil) => {
        acc[perfil.id] = perfil.permissoes || {}
        return acc
      }, {} as Record<string, PermissoesPerfil>)
    )
  }, [perfis])

  const perfisAtivos = useMemo(() => perfis.filter((p) => p.ativo), [perfis])
  const perfisInativos = useMemo(() => perfis.filter((p) => !p.ativo), [perfis])

  const temAlteracoes = (perfil: PerfilAcesso) =>
    JSON.stringify(rascunhos[perfil.id] || {}) !== JSON.stringify(perfil.permissoes || {})

  const alternarPermissao = (
    perfilId: string,
    modulo: ModuloSistema,
    permissao: TipoPermissao
  ) => {
    setRascunhos((prev) => {
      const atual = prev[perfilId] || {}
      const moduloAtual = atual[modulo] || {}
      const concedida = !moduloAtual[permissao]

      // Remover a visualização remove todas as demais permissões do módulo
      if (permissao === 'read' && !concedida) {
        return {
          ...prev,
          [perfilId]: {
            ...atual,
            [modulo]: TODAS_PERMISSOES.reduce((acc, key) => {
              acc[key] = false
              return acc
            }, {} as Record<string, boolean>),
          },
        }
      }

      return {
        ...prev,
        [perfilId]: {
          ...atual,
          [modulo]: {
            ...moduloAtual,
            [permissao]: concedida,
            // Conceder qualquer permissão implica poder visualizar o módulo
            ...(concedida ? { read: true } : {}),
          },
        },
      }
    })
  }

  const liberarModuloCompleto = (perfilId: string, modulo: ModuloSistema, liberar: boolean) => {
    const permissoesDoModulo = MODULOS_SISTEMA[modulo].permissions as readonly TipoPermissao[]
    setRascunhos((prev) => ({
      ...prev,
      [perfilId]: {
        ...(prev[perfilId] || {}),
        [modulo]: permissoesDoModulo.reduce((acc, key) => {
          acc[key] = liberar
          return acc
        }, {} as Record<string, boolean>),
      },
    }))
  }

  const restaurarPadrao = (perfil: PerfilAcesso) => {
    const padrao = PERFIS_PADRAO.find((p) => p.nome === perfil.nome)
    if (!padrao) {
      toast({
        title: 'Sem padrão definido',
        description: `O perfil "${perfil.nome}" não possui configuração padrão de fábrica.`,
        variant: 'destructive',
      })
      return
    }
    setRascunhos((prev) => ({ ...prev, [perfil.id]: padrao.permissoes }))
  }

  const salvar = async (perfil: PerfilAcesso) => {
    setSalvando(perfil.id)
    const { error: saveError } = await updatePerfil(perfil.id, {
      nome: perfil.nome,
      descricao: perfil.descricao,
      permissoes: rascunhos[perfil.id] || {},
      ativo: perfil.ativo,
    })
    setSalvando(null)

    toast({
      title: saveError ? 'Erro ao salvar' : 'Perfil atualizado',
      description: saveError || `As permissões do perfil "${perfil.nome}" foram salvas.`,
      variant: saveError ? 'destructive' : 'default',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const renderPerfil = (perfil: PerfilAcesso) => {
    const permissoes = rascunhos[perfil.id] || {}
    const alterado = temAlteracoes(perfil)

    return (
      <AccordionItem key={perfil.id} value={perfil.id}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex flex-1 flex-col items-start gap-1 pr-4 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{perfil.nome}</span>
              {perfil.sistema && (
                <Badge variant="outline" className="text-xs">
                  Sistema
                </Badge>
              )}
              {!perfil.ativo && (
                <Badge variant="secondary" className="text-xs">
                  Inativo
                </Badge>
              )}
              {alterado && (
                <Badge variant="destructive" className="text-xs">
                  Alterações não salvas
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {perfil.descricao} &middot; {resumirPermissoes(permissoes)}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id={`ativo-${perfil.id}`}
                  checked={perfil.ativo}
                  onCheckedChange={(checked) => togglePerfilStatus(perfil.id, checked)}
                />
                <label htmlFor={`ativo-${perfil.id}`} className="text-sm">
                  Perfil ativo
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => restaurarPadrao(perfil)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurar padrão
                </Button>
                <Button
                  size="sm"
                  disabled={!alterado || salvando === perfil.id}
                  onClick={() => salvar(perfil)}
                >
                  {salvando === perfil.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar permissões
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Módulo</TableHead>
                    {TODAS_PERMISSOES.map((permissao) => (
                      <TableHead key={permissao} className="text-center">
                        {PERMISSION_LABELS[permissao]}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Tudo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULOS.map(([key, modulo]) => {
                    const disponiveis = modulo.permissions as readonly TipoPermissao[]
                    const moduloPerm = permissoes[key] || {}
                    const todasMarcadas = disponiveis.every((p) => moduloPerm[p])

                    return (
                      <TableRow key={key}>
                        <TableCell className="py-2">
                          <div className="text-sm font-medium">{modulo.label}</div>
                          <div className="text-xs text-muted-foreground">{modulo.description}</div>
                        </TableCell>
                        {TODAS_PERMISSOES.map((permissao) => (
                          <TableCell key={permissao} className="py-2 text-center">
                            {disponiveis.includes(permissao) ? (
                              <Checkbox
                                checked={!!moduloPerm[permissao]}
                                onCheckedChange={() =>
                                  alternarPermissao(perfil.id, key, permissao)
                                }
                                aria-label={`${modulo.label} - ${PERMISSION_LABELS[permissao]}`}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="py-2 text-center">
                          <Checkbox
                            checked={todasMarcadas}
                            onCheckedChange={(checked) =>
                              liberarModuloCompleto(perfil.id, key, !!checked)
                            }
                            aria-label={`Liberar tudo em ${modulo.label}`}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfis de Acesso</CardTitle>
        <CardDescription>
          Defina o que cada perfil pode fazer em cada módulo do sistema. Os perfis são atribuídos
          aos usuários no cadastro de usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Accordion type="multiple" className="w-full">
          {perfisAtivos.map(renderPerfil)}
        </Accordion>

        {perfisInativos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Perfis inativos</h3>
            <Accordion type="multiple" className="w-full">
              {perfisInativos.map(renderPerfil)}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PerfisAcesso
