import { useCallback, useEffect, useState } from 'react'
import { contar } from '@/lib/plural'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

/**
 * Resumo do registro, em vez do JSON cru.
 *
 * A coluna mostrava `{"numero":"ROM-AL-…","itens":1,...}` e estourava a
 * largura da tabela. Aqui saem os campos que identificam a operação, na ordem
 * em que fazem sentido para quem lê; o JSON inteiro continua disponível no
 * clique.
 */
const resumoLegivel = (dados: unknown): string => {
  if (!dados || typeof dados !== 'object') return String(dados ?? '—')

  const registro = dados as Record<string, unknown>
  const dinheiro = (v: unknown) =>
    typeof v === 'number'
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : String(v)

  const partes: string[] = []
  for (const chave of ['numero', 'codigo', 'nome', 'email', 'material', 'perfil', 'motivo']) {
    const valor = registro[chave]
    if (valor != null && valor !== '') partes.push(String(valor))
  }
  for (const [chave, rotulo] of [
    ['itens', 'item'],
    ['itens_lancados', 'item lançado'],
    ['unidades_criadas', 'unidade'],
    ['quantidade', 'un.'],
  ] as const) {
    const valor = registro[chave]
    if (typeof valor === 'number' && valor > 0) partes.push(`${valor} ${rotulo}${valor > 1 ? 's' : ''}`)
  }
  for (const chave of ['valor_total', 'valor']) {
    const valor = registro[chave]
    if (valor != null) partes.push(dinheiro(valor))
  }

  // Nada reconhecido: melhor um JSON curto que uma célula vazia
  return partes.length > 0 ? partes.join(' · ') : JSON.stringify(dados).slice(0, 80)
}

/** 22/10/26 13:05 — cabe em uma linha */
const dataHoraCurta = (iso: string) => {
  const data = new Date(iso)
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
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
                  <TableHead className="w-[130px] whitespace-nowrap">Quando</TableHead>
                  <TableHead className="w-[200px]">Quem</TableHead>
                  <TableHead className="w-[180px] whitespace-nowrap">Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell
                      className="whitespace-nowrap py-2 text-xs"
                      title={new Date(e.timestamp).toLocaleString('pt-BR')}
                    >
                      {/* Data e hora quebravam em duas linhas; aqui vão em uma
                          só, no formato curto, com o completo no title */}
                      {dataHoraCurta(e.timestamp)}
                    </TableCell>
                    <TableCell className="max-w-[200px] py-2">
                      <div className="truncate text-sm" title={e.usuarios?.nome || 'Desconhecido'}>
                        {e.usuarios?.nome || 'Desconhecido'}
                      </div>
                      <div className="truncate text-xs text-muted-foreground" title={e.usuarios?.email}>
                        {e.usuarios?.email}
                      </div>
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
                      {/* O JSON cru estourava a tabela e ninguém lia. Agora o
                          resumo cabe na linha e o conteúdo inteiro fica a um
                          clique, para quem precisa auditar de verdade. */}
                      {e.dados_novos || e.dados_anteriores ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="max-w-full truncate text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                              title="Ver o registro completo"
                            >
                              {resumoLegivel(e.dados_novos ?? e.dados_anteriores)}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-[420px]">
                            <p className="mb-2 text-xs font-medium">Registro completo</p>
                            <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-[11px] leading-snug">
                              {JSON.stringify(e.dados_novos ?? e.dados_anteriores, null, 2)}
                            </pre>
                          </PopoverContent>
                        </Popover>
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
