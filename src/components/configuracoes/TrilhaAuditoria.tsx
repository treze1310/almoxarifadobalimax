import { useCallback, useEffect, useState } from 'react'
import { contar } from '@/lib/plural'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { consultarAuditoria, type EntradaAuditoria } from '@/services/auditoriaService'

const ROTULOS: Record<string, string> = {
  'solicitacao.aprovar': 'Solicitação aprovada',
  'solicitacao.rejeitar': 'Solicitação rejeitada',
  'solicitacao.concluir': 'Solicitação concluída',
  'solicitacao.cancelar': 'Solicitação cancelada',
  'solicitacao.excluir': 'Solicitação excluída',
  'material.criar': 'Material criado',
  'material.editar': 'Material editado',
  'material.excluir': 'Material excluído',
  'estoque.movimentar': 'Estoque movimentado',
  'usuario.criar': 'Usuário criado',
  'usuario.excluir': 'Usuário excluído',
  'usuario.perfil_alterado': 'Perfil do usuário alterado',
  'usuario.senha_redefinida': 'Senha redefinida',
  'usuario.status_alterado': 'Status do usuário alterado',
  'perfil.permissoes_alteradas': 'Permissões do perfil alteradas',
  'seguranca.acesso_negado': 'Acesso negado',
  'colaborador.cpf_consultado': 'CPF completo consultado',
  'romaneio.cancelar': 'Romaneio cancelado',
  'nfe.conferir': 'NF-e conferida',
  'nfe.lancar_estoque': 'NF-e lançada no estoque',
  'romaneio.retirada_assistida': 'Retirada assistida concluída',
  'material.importar_csv': 'Edição em lote por planilha',
  'solicitacoes.reposicao_automatica': 'Solicitação de reposição automática',
}

const destrutiva = (acao: string) =>
  acao.endsWith('.excluir') ||
  acao.endsWith('.rejeitar') ||
  acao.endsWith('.cancelar') ||
  acao === 'seguranca.acesso_negado'

const POR_PAGINA = 50

/** Os prefixos de ação, para filtrar por área sem precisar listar tudo */
const MODULOS = [
  { valor: 'todos', rotulo: 'Todas as ações' },
  { valor: 'romaneio', rotulo: 'Romaneios' },
  { valor: 'material', rotulo: 'Materiais' },
  { valor: 'estoque', rotulo: 'Estoque' },
  { valor: 'solicitacoes', rotulo: 'Solicitações' },
  { valor: 'nfe', rotulo: 'NF-e' },
  { valor: 'usuario', rotulo: 'Usuários' },
  { valor: 'perfil', rotulo: 'Perfis' },
  { valor: 'seguranca', rotulo: 'Segurança' },
  { valor: 'colaborador', rotulo: 'Colaboradores' },
]

export const TrilhaAuditoria = () => {
  const [entradas, setEntradas] = useState<EntradaAuditoria[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [modulo, setModulo] = useState('todos')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, total: quantos, error } = await consultarAuditoria({
      pagina,
      porPagina: POR_PAGINA,
      modulo: modulo === 'todos' ? undefined : modulo,
      de: de || undefined,
      ate: ate || undefined,
    })
    setEntradas(data)
    setTotal(quantos)
    setErro(error)
    setLoading(false)
  }, [pagina, modulo, de, ate])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Trocar de filtro com a página 3 aberta mostraria "nenhum registro"
  useEffect(() => {
    setPagina(1)
  }, [modulo, de, ate])

  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Trilha de Auditoria</CardTitle>
          <CardDescription>
            Registro de quem executou as ações sensíveis do sistema. Os registros não podem ser
            alterados nem apagados.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="pb-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="auditoria-modulo" className="text-xs">
              Área
            </Label>
            <Select value={modulo} onValueChange={setModulo}>
              <SelectTrigger id="auditoria-modulo" className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULOS.map((m) => (
                  <SelectItem key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="auditoria-de" className="text-xs">
              De
            </Label>
            <Input
              id="auditoria-de"
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="h-9 w-[160px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="auditoria-ate" className="text-xs">
              Até
            </Label>
            <Input
              id="auditoria-ate"
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="h-9 w-[160px]"
            />
          </div>

          {(modulo !== 'todos' || de || ate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setModulo('todos')
                setDe('')
                setAte('')
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </CardContent>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : erro ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Não foi possível carregar a trilha: {erro}
          </p>
        ) : entradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {modulo !== 'todos' || de || ate
              ? 'Nenhum registro no filtro escolhido.'
              : `Nenhuma ação registrada ainda. A partir de agora, aprovações, exclusões,
                 movimentações de estoque e alterações de usuários e perfis aparecem aqui.`}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Quando</TableHead>
                  <TableHead className="min-w-[180px]">Quem</TableHead>
                  <TableHead className="min-w-[200px]">Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="py-2 text-xs">
                      {new Date(e.timestamp).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-sm">{e.usuarios?.nome || 'Desconhecido'}</div>
                      <div className="text-xs text-muted-foreground">{e.usuarios?.email}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={destrutiva(e.acao) ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {ROTULOS[e.acao] || e.acao}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {e.dados_novos || e.dados_anteriores ? (
                        <code className="text-xs text-muted-foreground">
                          {JSON.stringify(e.dados_novos ?? e.dados_anteriores).slice(0, 120)}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginação: as páginas vêm do banco, uma de cada vez */}
        {!loading && !erro && total > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de{' '}
              {contar(total, 'registro', 'registros')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {pagina} de {ultimaPagina}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
                disabled={pagina >= ultimaPagina}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TrilhaAuditoria
