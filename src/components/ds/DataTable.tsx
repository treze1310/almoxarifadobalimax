import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Rows3,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ColumnFilter, type SortDirection } from '@/components/ui/column-filter'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { cn } from '@/lib/utils'

export interface ColunaDataTable<T> {
  /** Chave única da coluna; usada na URL e na exportação */
  id: string
  cabecalho: string
  /** Conteúdo renderizado na célula */
  celula?: (linha: T) => React.ReactNode
  /** Valor textual usado em busca, filtro, ordenação e CSV */
  valor: (linha: T) => string
  /** Valor usado só na ordenação, quando difere do texto (ex.: número, data) */
  valorOrdenacao?: (linha: T) => string | number
  /** Fixa a coluna: não pode ser escondida */
  fixa?: boolean
  /** Desliga o filtro de valores distintos nesta coluna */
  semFiltro?: boolean
  className?: string
  alinhamento?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  dados: T[]
  colunas: ColunaDataTable<T>[]
  idLinha: (linha: T) => string
  carregando?: boolean
  /** Prefixo do estado salvo na URL, para duas tabelas conviverem numa tela */
  chaveUrl?: string
  placeholderBusca?: string
  /** Ações em lote; recebe os ids selecionados */
  acoesEmLote?: (idsSelecionados: string[], limparSelecao: () => void) => React.ReactNode
  /** Ações por linha, renderizadas na última coluna */
  acoesLinha?: (linha: T) => React.ReactNode
  onLinhaClick?: (linha: T) => void
  nomeArquivoCsv?: string
  vazio?: React.ReactNode
  tamanhoPaginaInicial?: number
}

const TAMANHOS_PAGINA = [25, 50, 100]

/**
 * Tabela de dados do design system: busca, filtro por coluna, ordenação,
 * seleção em lote, densidade, colunas configuráveis, exportação CSV e estado
 * na URL.
 *
 * Nota de implementação: o PRD sugere TanStack Table. A biblioteca não pôde ser
 * instalada neste ambiente (o node_modules do projeto está com symlinks
 * apontando para outra pasta, e o pnpm exige reinstalar tudo). A API deste
 * componente é independente da implementação, então trocar o motor por TanStack
 * depois não exige mudar as telas que o consomem.
 */
export function DataTable<T>({
  dados,
  colunas,
  idLinha,
  carregando = false,
  chaveUrl = 'tbl',
  placeholderBusca = 'Buscar...',
  acoesEmLote,
  acoesLinha,
  onLinhaClick,
  nomeArquivoCsv = 'dados',
  vazio,
  tamanhoPaginaInicial = 25,
}: DataTableProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const p = (sufixo: string) => `${chaveUrl}_${sufixo}`

  const [busca, setBusca] = useState(searchParams.get(p('q')) ?? '')
  // Filtrar a cada tecla custa caro em tabela grande (percorre todas as linhas
  // em todas as colunas), então o campo responde na hora e o filtro espera a
  // digitação parar.
  const [buscaAplicada, setBuscaAplicada] = useState(busca)
  const [filtros, setFiltros] = useState<Record<string, string[]>>({})
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: SortDirection }>({
    coluna: searchParams.get(p('sort')) ?? '',
    direcao: (searchParams.get(p('dir')) as SortDirection) ?? null,
  })
  const [pagina, setPagina] = useState(Number(searchParams.get(p('pg')) ?? 1))
  const [tamanhoPagina, setTamanhoPagina] = useState(tamanhoPaginaInicial)
  const [compacta, setCompacta] = useState(false)
  const [ocultas, setOcultas] = useState<string[]>([])
  const [selecionadas, setSelecionadas] = useState<string[]>([])

  // Estado relevante espelhado na URL (RF-08), para a tela ser compartilhável
  useEffect(() => {
    const novos = new URLSearchParams(searchParams)
    const aplicar = (chave: string, valor: string | null) => {
      if (valor) novos.set(chave, valor)
      else novos.delete(chave)
    }
    aplicar(p('q'), busca || null)
    aplicar(p('sort'), ordenacao.direcao ? ordenacao.coluna : null)
    aplicar(p('dir'), ordenacao.direcao)
    aplicar(p('pg'), pagina > 1 ? String(pagina) : null)

    if (novos.toString() !== searchParams.toString()) {
      setSearchParams(novos, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, ordenacao, pagina])

  const colunasVisiveis = colunas.filter((c) => c.fixa || !ocultas.includes(c.id))

  // As páginas montam `colunas` como literal, então o array muda de identidade
  // a cada render e invalidaria todos os memos abaixo — com 2.209 itens isso
  // significa refazer tudo a cada tecla. A assinatura por id mantém o cache.
  const assinaturaColunas = colunas.map((c) => c.id).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colunasEstaveis = useMemo(() => colunas, [assinaturaColunas])

  const opcoesPorColuna = useMemo(() => {
    const mapa: Record<string, string[]> = {}
    for (const coluna of colunasEstaveis) {
      if (coluna.semFiltro) continue
      const valores = new Set<string>()
      for (const linha of dados) valores.add(coluna.valor(linha) || '—')
      mapa[coluna.id] = Array.from(valores).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    }
    return mapa
  }, [dados, colunasEstaveis])

  useEffect(() => {
    const id = setTimeout(() => setBuscaAplicada(busca), 180)
    return () => clearTimeout(id)
  }, [busca])

  const filtradas = useMemo(() => {
    const termo = buscaAplicada.trim().toLowerCase()
    return dados.filter((linha) => {
      if (termo) {
        const casa = colunasEstaveis.some((c) => c.valor(linha).toLowerCase().includes(termo))
        if (!casa) return false
      }
      return Object.entries(filtros).every(([colunaId, valores]) => {
        if (valores.length === 0) return true
        const coluna = colunasEstaveis.find((c) => c.id === colunaId)
        if (!coluna) return true
        return valores.includes(coluna.valor(linha) || '—')
      })
    })
  }, [dados, colunasEstaveis, buscaAplicada, filtros])

  const ordenadas = useMemo(() => {
    if (!ordenacao.direcao) return filtradas
    const coluna = colunasEstaveis.find((c) => c.id === ordenacao.coluna)
    if (!coluna) return filtradas
    const fator = ordenacao.direcao === 'asc' ? 1 : -1
    const chave = coluna.valorOrdenacao ?? coluna.valor
    return [...filtradas].sort((a, b) => {
      const va = chave(a)
      const vb = chave(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * fator
      return String(va).localeCompare(String(vb), 'pt-BR') * fator
    })
  }, [filtradas, colunasEstaveis, ordenacao])

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / tamanhoPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = ordenadas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina)

  const idsVisiveis = visiveis.map(idLinha)
  const todasSelecionadas = idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionadas.includes(id))

  const limparSelecao = () => setSelecionadas([])
  const temFiltro = busca !== '' || Object.values(filtros).some((v) => v.length > 0)

  const limparTudo = () => {
    setBusca('')
    setFiltros({})
    setPagina(1)
  }

  const exportarCsv = () => {
    const cabecalho = colunasVisiveis.map((c) => c.cabecalho)
    const linhas = ordenadas.map((linha) =>
      colunasVisiveis.map((c) => `"${c.valor(linha).replace(/"/g, '""')}"`).join(';'),
    )
    const csv = ['﻿' + cabecalho.join(';'), ...linhas].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${nomeArquivoCsv}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (carregando) return <TableSkeleton colunas={colunasVisiveis.length} />

  return (
    <div className="space-y-3">
      {/* FilterBar: busca + ações da tabela */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            placeholder={placeholderBusca}
            className="pl-10"
            aria-label={placeholderBusca}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparTudo}>
              <X className="mr-1 h-4 w-4" />
              Limpar filtros
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title={compacta ? 'Densidade normal' : 'Densidade compacta'}
            onClick={() => setCompacta((v) => !v)}
          >
            <Rows3 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" title="Colunas">
                <Columns3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Colunas exibidas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {colunas.map((coluna) => (
                <DropdownMenuCheckboxItem
                  key={coluna.id}
                  checked={coluna.fixa || !ocultas.includes(coluna.id)}
                  disabled={coluna.fixa}
                  onCheckedChange={(marcada) =>
                    setOcultas((prev) =>
                      marcada ? prev.filter((id) => id !== coluna.id) : [...prev, coluna.id],
                    )
                  }
                >
                  {coluna.cabecalho}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Barra de seleção em lote */}
      {acoesEmLote && selecionadas.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border bg-muted/50 px-3 py-2">
          <span className="text-ds-body">
            {selecionadas.length} selecionado{selecionadas.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            {acoesEmLote(selecionadas, limparSelecao)}
            <Button variant="ghost" size="sm" onClick={limparSelecao}>
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {acoesEmLote && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={todasSelecionadas}
                    aria-label="Selecionar todas as linhas da página"
                    onCheckedChange={(marcada) =>
                      setSelecionadas((prev) =>
                        marcada
                          ? Array.from(new Set([...prev, ...idsVisiveis]))
                          : prev.filter((id) => !idsVisiveis.includes(id)),
                      )
                    }
                  />
                </TableHead>
              )}
              {colunasVisiveis.map((coluna) => (
                <TableHead
                  key={coluna.id}
                  className={cn(
                    'text-ds-table',
                    coluna.alinhamento === 'right' && 'text-right',
                    coluna.alinhamento === 'center' && 'text-center',
                    coluna.className,
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span>{coluna.cabecalho}</span>
                    {!coluna.semFiltro && (
                      <ColumnFilter
                        title={coluna.cabecalho}
                        options={opcoesPorColuna[coluna.id] ?? []}
                        selected={filtros[coluna.id] ?? []}
                        onSelectedChange={(valores) => {
                          setFiltros((prev) => ({ ...prev, [coluna.id]: valores }))
                          setPagina(1)
                        }}
                        sortDirection={ordenacao.coluna === coluna.id ? ordenacao.direcao : null}
                        onSortChange={(direcao) => setOrdenacao({ coluna: coluna.id, direcao })}
                      />
                    )}
                    {coluna.semFiltro && ordenacao.coluna === coluna.id && ordenacao.direcao && (
                      <span aria-hidden>
                        {ordenacao.direcao === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {acoesLinha && <TableHead className="w-[120px] text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colunasVisiveis.length + (acoesEmLote ? 1 : 0) + (acoesLinha ? 1 : 0)}
                >
                  {vazio ?? (
                    <EmptyState
                      titulo={temFiltro ? 'Nenhum resultado' : 'Nada cadastrado ainda'}
                      descricao={
                        temFiltro
                          ? 'Ajuste a busca ou limpe os filtros para ver mais registros.'
                          : undefined
                      }
                      className="py-10"
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((linha) => {
                const id = idLinha(linha)
                return (
                  <TableRow
                    key={id}
                    className={cn(
                      compacta ? 'h-9' : 'h-12',
                      onLinhaClick && 'cursor-pointer hover:bg-muted/50',
                    )}
                    onClick={onLinhaClick ? () => onLinhaClick(linha) : undefined}
                  >
                    {acoesEmLote && (
                      <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionadas.includes(id)}
                          aria-label="Selecionar linha"
                          onCheckedChange={(marcada) =>
                            setSelecionadas((prev) =>
                              marcada ? [...prev, id] : prev.filter((i) => i !== id),
                            )
                          }
                        />
                      </TableCell>
                    )}
                    {colunasVisiveis.map((coluna) => (
                      <TableCell
                        key={coluna.id}
                        className={cn(
                          'text-ds-table',
                          compacta ? 'py-1' : 'py-2',
                          coluna.alinhamento === 'right' && 'text-right',
                          coluna.alinhamento === 'center' && 'text-center',
                          coluna.className,
                        )}
                      >
                        {coluna.celula ? coluna.celula(linha) : coluna.valor(linha)}
                      </TableCell>
                    ))}
                    {acoesLinha && (
                      <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">{acoesLinha(linha)}</div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rodapé de paginação */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {ordenadas.length === 0
            ? 'Nenhum registro'
            : `${(paginaAtual - 1) * tamanhoPagina + 1}–${Math.min(
                paginaAtual * tamanhoPagina,
                ordenadas.length,
              )} de ${ordenadas.length}`}
          {ordenadas.length !== dados.length && ` (${dados.length} no total)`}
        </p>

        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-[var(--radius-control)] border bg-background px-2 text-xs"
            value={tamanhoPagina}
            onChange={(e) => {
              setTamanhoPagina(Number(e.target.value))
              setPagina(1)
            }}
            aria-label="Registros por página"
          >
            {TAMANHOS_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((v) => Math.max(1, v - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums">
            {paginaAtual} / {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((v) => Math.min(totalPaginas, v + 1))}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DataTable
