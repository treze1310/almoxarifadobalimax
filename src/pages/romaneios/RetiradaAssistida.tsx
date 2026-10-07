import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PageHeader } from '@/components/ds/PageHeader'
import { EmptyState } from '@/components/ds/EstadosPagina'
import { LeitorCodigo } from '@/components/romaneios/LeitorCodigo'
import { AssinaturaCanvas } from '@/components/romaneios/AssinaturaCanvas'
import ResponsavelAutocomplete from '@/components/forms/ResponsavelAutocomplete'
import { CentroCustoSelector } from '@/components/romaneios/CentroCustoSelector'
import { useRomaneios } from '@/hooks/useRomaneios'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { registrarAuditoria } from '@/services/auditoriaService'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

/**
 * Retirada assistida em 3 passos (RF-09).
 *
 * O formulário completo de romaneio continua existindo para devolução,
 * transferência e ajustes; este assistente cobre o caminho do dia a dia —
 * bipar, conferir e assinar — e é o único lugar onde o saldo é mostrado item a
 * item em tempo real, antes de o estoque sair.
 */

interface ResponsavelData {
  type: 'colaborador' | 'nome'
  colaborador_id?: string
  nome?: string
  displayName?: string
}

/** Campos que a busca de material precisa trazer, num lugar só */
const CAMPOS_MATERIAL =
  'id, codigo, nome, unidade_medida, valor_unitario, estoque_atual, ponto_pedido, estoque_minimo'

interface MaterialBusca {
  id: string
  codigo: string
  nome: string
  unidade_medida: string | null
  valor_unitario: number | null
  estoque_atual: number | null
  ponto_pedido: number | null
  estoque_minimo: number | null
}

interface ItemRetirada {
  id: string
  codigo: string
  nome: string
  unidade: string | null
  valorUnitario: number
  /** Saldo do banco no momento da leitura */
  estoqueAtual: number
  pontoPedido: number | null
  quantidade: number
}

const PASSOS = [
  { numero: 1, titulo: 'Quem retira', descricao: 'Responsável e destino' },
  { numero: 2, titulo: 'Itens', descricao: 'Bipe ou busque os materiais' },
  { numero: 3, titulo: 'Conferência', descricao: 'Revise e colha a assinatura' },
] as const

export const RetiradaAssistida = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { usuario } = usePermissoes()
  const { createRomaneio } = useRomaneios()

  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [salvando, setSalvando] = useState(false)

  // Passo 1
  const [responsavel, setResponsavel] = useState<ResponsavelData | undefined>()
  const [centroCustoOrigemId, setCentroCustoOrigemId] = useState('')
  const [centroCustoId, setCentroCustoId] = useState('')
  // Data e hora, como no formulário completo: a hora da retirada importa.
  // `toISOString` devolve UTC e empurraria o horário; aqui o valor é local.
  const [data, setData] = useState(() => {
    const agora = new Date()
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
    return agora.toISOString().slice(0, 16)
  })

  // Passo 2
  const [itens, setItens] = useState<ItemRetirada[]>([])
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [termo, setTermo] = useState('')
  const [sugestoes, setSugestoes] = useState<MaterialBusca[]>([])

  // Passo 3
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')

  // A origem de uma retirada é sempre o almoxarifado; vem preenchida e pode ser
  // trocada. Sem isso o romaneio sai sem origem e destoa dos antigos nos
  // relatórios por centro de custo.
  useEffect(() => {
    let cancelado = false
    supabase
      .from('centros_custo')
      .select('id')
      .or('descricao.ilike.%almoxarifado%,codigo.ilike.%almox%')
      .eq('ativo', true)
      .limit(1)
      .maybeSingle()
      .then(({ data: almoxarifado }) => {
        if (!cancelado && almoxarifado?.id) setCentroCustoOrigemId((atual) => atual || almoxarifado.id)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const valorTotal = useMemo(
    () => itens.reduce((soma, item) => soma + item.valorUnitario * item.quantidade, 0),
    [itens],
  )

  const itensSemSaldo = useMemo(
    () => itens.filter((item) => item.quantidade > item.estoqueAtual),
    [itens],
  )

  /**
   * Põe o material na retirada. Bipar (ou clicar) de novo soma uma unidade: é
   * como o conferente conta quando passa várias peças iguais.
   */
  const adicionarMaterial = useCallback(
    (material: MaterialBusca) => {
      const saldo = material.estoque_atual ?? 0
      const existente = itens.find((item) => item.id === material.id)

      if (existente && existente.quantidade >= saldo) {
        setAviso(
          `${material.nome} tem apenas ${saldo} em estoque; a quantidade não foi aumentada.`,
        )
        return
      }
      if (!existente && saldo <= 0) {
        setAviso(`${material.nome} está com estoque zerado.`)
        return
      }

      setAviso(null)
      setItens((atuais) =>
        atuais.some((item) => item.id === material.id)
          ? atuais.map((item) =>
              item.id === material.id ? { ...item, quantidade: item.quantidade + 1 } : item,
            )
          : [
              ...atuais,
              {
                id: material.id,
                codigo: material.codigo,
                nome: material.nome,
                unidade: material.unidade_medida,
                valorUnitario: material.valor_unitario ?? 0,
                estoqueAtual: saldo,
                pontoPedido: material.ponto_pedido ?? material.estoque_minimo ?? null,
                quantidade: 1,
              },
            ],
      )
    },
    [itens],
  )

  /**
   * Caminho do leitor e do Enter: aqui o código precisa casar com um material
   * só. O código de barras é o que o leitor manda, e é o único realmente único.
   */
  const adicionarPorCodigo = useCallback(
    async (codigo: string) => {
      setAviso(null)
      setBuscando(true)
      try {
        const { data: achados, error } = await supabase
          .from('materiais_equipamentos')
          .select(CAMPOS_MATERIAL)
          .or(`codigo_barras.eq.${codigo},codigo.eq.${codigo},nome.ilike.%${codigo}%`)
          .eq('ativo', true)
          .limit(2)

        if (error) throw error

        if (!achados || achados.length === 0) {
          setAviso(`Nenhum material ativo encontrado para "${codigo}".`)
          return
        }
        if (achados.length > 1) {
          setAviso(`"${codigo}" casou com mais de um material. Escolha na lista abaixo.`)
          return
        }

        adicionarMaterial(achados[0] as MaterialBusca)
        setSugestoes([])
        setTermo('')
      } catch (erro) {
        setAviso(erro instanceof Error ? erro.message : 'Erro ao buscar o material.')
      } finally {
        setBuscando(false)
      }
    },
    [adicionarMaterial],
  )

  /**
   * Busca ao vivo: a lista aparece conforme se digita, sem precisar de Enter.
   * O Enter e o leitor continuam valendo para o código exato.
   */
  useEffect(() => {
    const procurado = termo.trim()
    if (procurado.length < 2) {
      setSugestoes([])
      return
    }

    let cancelado = false
    const id = setTimeout(async () => {
      const { data: achados } = await supabase
        .from('materiais_equipamentos')
        .select(CAMPOS_MATERIAL)
        .or(
          `nome.ilike.%${procurado}%,codigo.ilike.%${procurado}%,codigo_barras.ilike.%${procurado}%`,
        )
        .eq('ativo', true)
        .order('nome')
        .limit(8)

      if (!cancelado) setSugestoes((achados as MaterialBusca[]) ?? [])
    }, 250)

    return () => {
      cancelado = true
      clearTimeout(id)
    }
  }, [termo])

  const mudarQuantidade = (id: string, quantidade: number) => {
    setItens((atuais) =>
      atuais.map((item) =>
        item.id === id
          ? { ...item, quantidade: Math.max(1, Math.min(quantidade, item.estoqueAtual)) }
          : item,
      ),
    )
  }

  const podeAvancar =
    passo === 1
      ? !!responsavel && !!centroCustoId && !!data
      : passo === 2
        ? itens.length > 0 && itensSemSaldo.length === 0
        : !!assinatura

  const confirmar = async () => {
    if (!assinatura) return
    setSalvando(true)
    try {
      const { data: romaneio, error } = await createRomaneio({
        tipo: 'retirada',
        data_romaneio: new Date(data).toISOString(),
        colaborador_id: responsavel?.colaborador_id,
        responsavel_nome: responsavel?.type === 'nome' ? responsavel.nome : undefined,
        responsavel_retirada: responsavel?.displayName || responsavel?.nome || '',
        centro_custo_origem_id: centroCustoOrigemId || undefined,
        centro_custo_destino_id: centroCustoId,
        observacoes: observacoes || undefined,
        // 'aprovado' faz o estoqueService dar a baixa no estoque
        status: 'aprovado',
        valor_total: valorTotal,
        itens: itens.map((item) => ({
          material_equipamento_id: item.id,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
          valor_total: item.valorUnitario * item.quantidade,
        })),
      })

      if (error || !romaneio) throw error ?? new Error('Romaneio não foi criado')

      // A assinatura é gravada depois da criação: o romaneio só existe aqui.
      const { error: erroAssinatura } = await supabase
        .from('romaneios')
        .update({
          assinatura_retirada: assinatura,
          assinatura_em: new Date().toISOString(),
          conferido_por: usuario?.id ?? null,
        })
        .eq('id', romaneio.id)

      if (erroAssinatura) {
        toast({
          title: 'Romaneio criado, assinatura não gravada',
          description: erroAssinatura.message,
          variant: 'destructive',
        })
      }

      await registrarAuditoria({
        acao: 'romaneio.retirada_assistida',
        tabela: 'romaneios',
        registroId: romaneio.id,
        dadosNovos: {
          numero: romaneio.numero,
          itens: itens.length,
          valor_total: valorTotal,
          assinado: !erroAssinatura,
        },
      })

      navigate(`/romaneios?item=${romaneio.id}`)
    } catch (erro) {
      toast({
        title: 'Erro ao concluir a retirada',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Retirada assistida"
        descricao="Bipe os itens, confira o saldo e colha a assinatura de quem recebe."
        acoes={
          <Button variant="outline" onClick={() => navigate('/romaneios')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />

      {/* Trilha dos 3 passos */}
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        {PASSOS.map((item, indice) => {
          const atual = item.numero === passo
          const concluido = item.numero < passo
          return (
            <li key={item.numero} className="flex flex-1 items-center gap-3">
              <span
                className={
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ds-body font-semibold ' +
                  (concluido
                    ? 'bg-status-concluido text-white'
                    : atual
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground')
                }
              >
                {concluido ? <Check className="h-4 w-4" /> : item.numero}
              </span>
              <div className="min-w-0">
                <div className={atual ? 'text-ds-body font-medium' : 'text-ds-body'}>
                  {item.titulo}
                </div>
                <div className="truncate text-xs text-muted-foreground">{item.descricao}</div>
              </div>
              {indice < PASSOS.length - 1 && (
                <div className="hidden h-px flex-1 bg-border sm:block" />
              )}
            </li>
          )
        })}
      </ol>

      {passo === 1 && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <Label>Responsável pela retirada</Label>
              <ResponsavelAutocomplete value={responsavel} onChange={setResponsavel} />
              <p className="text-xs text-muted-foreground">
                Pode ser um colaborador cadastrado ou um nome avulso.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Centro de custo de origem</Label>
              <CentroCustoSelector
                label="Centro de custo de origem"
                placeholder="De onde sai"
                value={centroCustoOrigemId}
                onChange={setCentroCustoOrigemId}
              />
            </div>

            <div className="space-y-2">
              <Label>Centro de custo de destino</Label>
              <CentroCustoSelector
                label="Centro de custo de destino"
                placeholder="Para onde vai"
                value={centroCustoId}
                onChange={setCentroCustoId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-retirada">Data e hora</Label>
              <Input
                id="data-retirada"
                type="datetime-local"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {passo === 2 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              <LeitorCodigo
                onLer={adicionarPorCodigo}
                onDigitar={setTermo}
                valor={termo}
              />
              <p className="text-xs text-muted-foreground">
                Bipar o mesmo item de novo soma uma unidade. Sem leitor, digite o nome ou o código:
                a lista aparece conforme você escreve.
              </p>

              {/* Busca ao vivo: clicar já põe o item na retirada */}
              {sugestoes.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {sugestoes.map((material) => {
                    const saldo = material.estoque_atual ?? 0
                    const jaNaLista = itens.some((item) => item.id === material.id)
                    return (
                      <li key={material.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 disabled:opacity-50"
                          disabled={saldo <= 0}
                          onClick={() => {
                            adicionarMaterial(material)
                            setTermo('')
                            setSugestoes([])
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-ds-table font-medium">
                              {material.nome}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {material.codigo}
                              {jaNaLista && ' · já está na retirada'}
                            </span>
                          </span>
                          <span
                            className={
                              'shrink-0 text-xs tabular-nums ' +
                              (saldo <= 0 ? 'text-destructive' : 'text-muted-foreground')
                            }
                          >
                            {saldo <= 0 ? 'sem estoque' : `${saldo} ${material.unidade_medida ?? ''}`}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {buscando && (
                <div className="flex items-center gap-2 text-ds-body text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procurando...
                </div>
              )}
              {aviso && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{aviso}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {itens.length === 0 ? (
            <EmptyState
              icone={PackageCheck}
              titulo="Nenhum item na retirada"
              descricao="Bipe o primeiro material para começar."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Material</TableHead>
                    <TableHead className="text-right">Saldo atual</TableHead>
                    <TableHead className="text-center">Retirar</TableHead>
                    <TableHead className="text-right">Saldo depois</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const depois = item.estoqueAtual - item.quantidade
                    const vaiAoPonto = item.pontoPedido != null && depois <= item.pontoPedido
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="py-2">
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.codigo}
                            {item.valorUnitario > 0 &&
                              ` · ${formatCurrency(item.valorUnitario)} / ${item.unidade ?? 'un'}`}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          {item.estoqueAtual} {item.unidade}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => mudarQuantidade(item.id, item.quantidade - 1)}
                              disabled={item.quantidade <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) =>
                                mudarQuantidade(item.id, parseInt(e.target.value) || 1)
                              }
                              className="h-8 w-16 text-center tabular-nums"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => mudarQuantidade(item.id, item.quantidade + 1)}
                              disabled={item.quantidade >= item.estoqueAtual}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          <span
                            className={
                              depois === 0
                                ? 'font-medium text-destructive'
                                : vaiAoPonto
                                  ? 'font-medium text-status-pendente'
                                  : 'font-medium'
                            }
                          >
                            {depois}
                          </span>
                          {vaiAoPonto && (
                            <div className="text-xs text-muted-foreground">
                              {depois === 0 ? 'zera o estoque' : 'entra no ponto de pedido'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setItens((atuais) => atuais.filter((i) => i.id !== item.id))
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {itens.some((i) => i.pontoPedido != null && i.estoqueAtual - i.quantidade <= i.pontoPedido) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Esta retirada leva itens ao ponto de pedido</AlertTitle>
              <AlertDescription>
                A solicitação de compra de reposição é aberta automaticamente ao confirmar, para os
                itens com reposição automática ligada.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3 text-ds-body sm:grid-cols-3">
                <div>
                  <div className="text-xs text-muted-foreground">Responsável</div>
                  <div className="font-medium">
                    {responsavel?.displayName || responsavel?.nome || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Itens</div>
                  <div className="font-medium">
                    {itens.length} ({itens.reduce((s, i) => s + i.quantidade, 0)} un.)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Valor total</div>
                  <div className="font-medium">{formatCurrency(valorTotal)}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Saldo depois</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2">
                          {item.codigo} - {item.nome}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          {item.quantidade} {item.unidade}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          {item.estoqueAtual - item.quantidade}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs-retirada">Observações (opcional)</Label>
                <Textarea
                  id="obs-retirada"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Alguma condição do material, prazo de devolução, etc."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assinatura de quem recebe</Label>
                  {assinatura ? (
                    <Badge variant="outline" className="text-status-concluido">
                      Assinado
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Obrigatória</span>
                  )}
                </div>
                <AssinaturaCanvas onMudar={setAssinatura} />
                <p className="text-xs text-muted-foreground">
                  Ao confirmar, o estoque é baixado e a assinatura fica anexada ao romaneio.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 py-4 backdrop-blur">
        <Button
          variant="outline"
          onClick={() => (passo === 1 ? navigate('/romaneios') : setPasso((p) => (p - 1) as 1 | 2))}
          disabled={salvando}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {passo === 1 ? 'Cancelar' : 'Voltar'}
        </Button>

        {passo < 3 ? (
          <Button
            onClick={() => setPasso((p) => (p + 1) as 2 | 3)}
            disabled={!podeAvancar || buscando}
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={confirmar} disabled={!podeAvancar || salvando}>
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-4 w-4" />
            )}
            Confirmar retirada
          </Button>
        )}
      </div>
    </div>
  )
}

export default RetiradaAssistida
