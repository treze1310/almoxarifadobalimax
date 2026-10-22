import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Package, Plus, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { contar } from '@/lib/plural'
import { formatCurrency } from '@/lib/utils'
import { TableSkeleton } from '@/components/ds/EstadosPagina'

/**
 * As unidades individuais (FILHOS) de um material ou equipamento.
 *
 * Elas vivem dentro do item PAI: equipamento e ferramenta são acompanhados peça
 * a peça (onde está, com quem, em manutenção, de qual nota veio), mas não
 * poluem a listagem geral do almoxarifado como se fossem itens separados.
 */

interface Unidade {
  id: string
  codigo: string
  sequencia: number
  numero_serie: string | null
  patrimonio_anterior: string | null
  status: string
  data_aquisicao: string | null
  valor_aquisicao: number | null
  observacoes: string | null
  localizacao: { codigo: string; nome: string } | null
  colaboradores: { nome: string } | null
  nfe_importacao: { id: string; numero_nfe: string | null } | null
}

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  disponivel: { rotulo: 'Disponível', classe: 'bg-status-concluido/12 text-status-concluido border-status-concluido/25' },
  em_uso: { rotulo: 'Em uso', classe: 'bg-status-aprovado/12 text-status-aprovado border-status-aprovado/25' },
  manutencao: { rotulo: 'Em manutenção', classe: 'bg-status-pendente/15 text-status-pendente border-status-pendente/30' },
  baixado: { rotulo: 'Baixado', classe: 'bg-status-cancelado/10 text-status-cancelado border-status-cancelado/25 line-through decoration-1' },
  extraviado: { rotulo: 'Extraviado', classe: 'bg-status-rejeitado/12 text-status-rejeitado border-status-rejeitado/25' },
}

interface UnidadesDoMaterialProps {
  materialId: string
  codigoMaterial: string
  /** Saldo do PAI, para avisar quando as unidades não batem com ele */
  estoqueAtual?: number | null
}

export const UnidadesDoMaterial = ({
  materialId,
  codigoMaterial,
  estoqueAtual,
}: UnidadesDoMaterialProps) => {
  const { toast } = useToast()
  const { can } = usePermissoes()
  const podeEditar = can('materiais', 'update')
  const podeCriar = can('materiais', 'create')

  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [quantidadeNova, setQuantidadeNova] = useState('1')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('material_unidades')
        .select(
          `id, codigo, sequencia, numero_serie, patrimonio_anterior, status,
           data_aquisicao, valor_aquisicao, observacoes,
           localizacao:localizacao_id (codigo, nome),
           colaboradores:colaborador_id (nome),
           nfe_importacao:nfe_id (id, numero_nfe)`,
        )
        .eq('material_equipamento_id', materialId)
        .order('sequencia')

      if (error) throw error
      setUnidades((data as unknown as Unidade[]) ?? [])
    } catch (erro) {
      toast({
        title: 'Erro ao carregar as unidades',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [materialId, toast])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const resumo = useMemo(() => {
    const porStatus = (s: string) => unidades.filter((u) => u.status === s).length
    return {
      total: unidades.length,
      disponiveis: porStatus('disponivel'),
      emUso: porStatus('em_uso'),
      manutencao: porStatus('manutencao'),
      baixadas: porStatus('baixado') + porStatus('extraviado'),
    }
  }, [unidades])

  // O saldo conta o que está disponível; unidade em uso ou baixada não entra
  const saldoDivergente =
    typeof estoqueAtual === 'number' && estoqueAtual !== resumo.disponiveis

  const gerarUnidades = async () => {
    const quantidade = Number(quantidadeNova)
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      toast({ title: 'Informe quantas unidades gerar', variant: 'destructive' })
      return
    }

    setGerando(true)
    try {
      const { data, error } = await supabase.rpc('gerar_unidades_material', {
        p_material_id: materialId,
        p_quantidade: quantidade,
      })
      if (error) throw error

      const criadas = (data as Array<{ codigo: string }>) ?? []
      toast({
        title: contar(criadas.length, 'unidade gerada', 'unidades geradas'),
        description: criadas.map((u) => u.codigo).join(', '),
      })
      setQuantidadeNova('1')
      await carregar()
    } catch (erro) {
      toast({
        title: 'Erro ao gerar unidades',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setGerando(false)
    }
  }

  const mudarStatus = async (unidade: Unidade, status: string) => {
    const anterior = unidade.status
    // Otimista: a tabela responde na hora e o banco confirma depois
    setUnidades((atuais) =>
      atuais.map((u) => (u.id === unidade.id ? { ...u, status } : u)),
    )

    const { error } = await supabase
      .from('material_unidades')
      .update({ status })
      .eq('id', unidade.id)

    if (error) {
      setUnidades((atuais) =>
        atuais.map((u) => (u.id === unidade.id ? { ...u, status: anterior } : u)),
      )
      toast({
        title: 'Erro ao mudar o status',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (carregando) return <TableSkeleton colunas={5} linhas={3} />

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{contar(resumo.total, 'unidade', 'unidades')}</Badge>
        <Badge variant="outline" className="text-status-concluido">
          {resumo.disponiveis} disponível(is)
        </Badge>
        {resumo.emUso > 0 && (
          <Badge variant="outline" className="text-status-aprovado">
            {resumo.emUso} em uso
          </Badge>
        )}
        {resumo.manutencao > 0 && (
          <Badge variant="outline" className="text-status-pendente">
            {resumo.manutencao} em manutenção
          </Badge>
        )}
        {resumo.baixadas > 0 && (
          <Badge variant="outline" className="text-muted-foreground">
            {resumo.baixadas} baixada(s)
          </Badge>
        )}
      </div>

      {saldoDivergente && (
        <p className="rounded-md border border-status-pendente/30 bg-status-pendente/10 px-3 py-2 text-xs">
          O saldo do item é <strong>{estoqueAtual}</strong> e há{' '}
          <strong>{resumo.disponiveis}</strong> unidade(s) disponível(is). Ajuste as unidades ou o
          saldo para os dois contarem a mesma coisa.
        </p>
      )}

      {podeCriar && (
        <div className="flex items-end gap-2">
          <div className="w-28">
            <label className="text-xs text-muted-foreground" htmlFor="qtd-unidades">
              Gerar unidades
            </label>
            <Input
              id="qtd-unidades"
              type="number"
              min={1}
              value={quantidadeNova}
              onChange={(e) => setQuantidadeNova(e.target.value)}
              className="h-9"
            />
          </div>
          <Button variant="outline" onClick={gerarUnidades} disabled={gerando}>
            {gerando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Gerar
          </Button>
          <p className="pb-2 text-xs text-muted-foreground">
            Continua de {codigoMaterial}-{resumo.total + 1} em diante; número usado não se repete.
          </p>
        </div>
      )}

      {unidades.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center">
          <Package className="h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="text-ds-body text-muted-foreground">
            Nenhuma unidade cadastrada para este item.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[130px]">Unidade</TableHead>
                <TableHead>Série / Patrimônio</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="min-w-[150px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((unidade) => (
                <TableRow key={unidade.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2 font-mono text-ds-table font-medium">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <Link className="text-primary underline" to={`/unidades/${encodeURIComponent(unidade.codigo)}`}>{unidade.codigo}</Link>
                    </div>
                    {unidade.valor_aquisicao ? (
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(unidade.valor_aquisicao)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 text-ds-table">
                    {unidade.numero_serie && <div>Série {unidade.numero_serie}</div>}
                    {unidade.patrimonio_anterior && (
                      <div className="text-xs text-muted-foreground">
                        Patrimônio {unidade.patrimonio_anterior}
                      </div>
                    )}
                    {!unidade.numero_serie && !unidade.patrimonio_anterior && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-ds-table">
                    {unidade.localizacao
                      ? `${unidade.localizacao.codigo} - ${unidade.localizacao.nome}`
                      : '—'}
                    {unidade.colaboradores && (
                      <div className="text-xs text-muted-foreground">
                        com {unidade.colaboradores.nome}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-ds-table">
                    {unidade.nfe_importacao?.numero_nfe
                      ? `NF-e ${unidade.nfe_importacao.numero_nfe}`
                      : 'Saldo anterior'}
                    {unidade.data_aquisicao && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(unidade.data_aquisicao).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {podeEditar ? (
                      <Select
                        value={unidade.status}
                        onValueChange={(valor) => mudarStatus(unidade, valor)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10002]">
                          {Object.entries(STATUS).map(([valor, { rotulo }]) => (
                            <SelectItem key={valor} value={valor}>
                              {rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={STATUS[unidade.status]?.classe}>
                        {STATUS[unidade.status]?.rotulo ?? unidade.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default UnidadesDoMaterial
