import { useCallback, useEffect, useMemo, useState } from 'react'
import { contar } from '@/lib/plural'
import { AlertTriangle, Check, Loader2, PackageCheck, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { registrarAuditoria } from '@/services/auditoriaService'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { TableSkeleton } from '@/components/ds/EstadosPagina'
import { formatCurrency } from '@/lib/utils'

interface ItemNFe {
  id: string
  codigo_produto: string | null
  descricao_produto: string
  unidade: string | null
  quantidade: number
  valor_unitario: number | null
  material_equipamento_id: string | null
}

interface ConciliacaoNFeDialogProps {
  nfeId: string | null
  numeroNfe?: string | null
  status?: string | null
  onFechar: () => void
  onAtualizado?: () => void
}

/**
 * Conciliação item a item da NF-e (RF-13).
 *
 * Cada item da nota precisa apontar para um material do cadastro. Só depois de
 * todos conciliados a nota pode ser conferida e, então, lançada no estoque —
 * é o lançamento que gera a movimentação de entrada.
 */
export const ConciliacaoNFeDialog = ({
  nfeId,
  numeroNfe,
  status,
  onFechar,
  onAtualizado,
}: ConciliacaoNFeDialogProps) => {
  const { toast } = useToast()
  const { can } = usePermissoes()
  const podeEditar = can('nfe', 'update')

  const [itens, setItens] = useState<ItemNFe[]>([])
  const [materiais, setMateriais] = useState<ComboboxOption[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    if (!nfeId) return
    setCarregando(true)
    try {
      const [itensResp, materiaisResp] = await Promise.all([
        supabase
          .from('nfe_itens')
          .select(
            'id, codigo_produto, descricao_produto, unidade, quantidade, valor_unitario, material_equipamento_id',
          )
          .eq('nfe_id', nfeId)
          .order('descricao_produto'),
        supabase
          .from('materiais_equipamentos')
          .select('id, codigo, nome')
          .eq('ativo', true)
          .order('codigo'),
      ])

      setItens((itensResp.data as ItemNFe[]) ?? [])
      setMateriais(
        (materiaisResp.data ?? []).map((m: any) => ({
          value: m.id,
          label: `${m.codigo} - ${m.nome}`,
        })),
      )
    } finally {
      setCarregando(false)
    }
  }, [nfeId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const pendentes = useMemo(
    () => itens.filter((i) => !i.material_equipamento_id).length,
    [itens],
  )
  const jaLancada = status === 'lancada'
  const conferida = status === 'conferida'

  const vincular = async (itemId: string, materialId: string) => {
    setSalvando(itemId)
    try {
      const { error } = await supabase
        .from('nfe_itens')
        .update({ material_equipamento_id: materialId || null })
        .eq('id', itemId)

      if (error) throw error
      setItens((atuais) =>
        atuais.map((i) => (i.id === itemId ? { ...i, material_equipamento_id: materialId } : i)),
      )
    } catch (erro) {
      toast({
        title: 'Erro ao vincular item',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setSalvando(null)
    }
  }

  const conferir = async () => {
    if (!nfeId) return
    setProcessando(true)
    try {
      const { error } = await supabase
        .from('nfe_importacao')
        .update({ status: 'conferida', data_conferencia: new Date().toISOString() })
        .eq('id', nfeId)

      if (error) throw error

      await registrarAuditoria({
        acao: 'nfe.conferir',
        tabela: 'nfe_importacao',
        registroId: nfeId,
        dadosNovos: { numero: numeroNfe, itens: itens.length },
      })

      toast({
        title: 'NF-e conferida',
        description: 'Agora ela pode ser lançada no estoque.',
      })
      onAtualizado?.()
    } catch (erro) {
      toast({
        title: 'Erro ao conferir',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  const lancar = async () => {
    if (!nfeId) return
    setProcessando(true)
    try {
      // O lançamento roda inteiro no banco: movimenta estoque, grava a
      // movimentação de cada item e muda o status, tudo numa transação.
      const { data, error } = await supabase.rpc('nfe_lancar_estoque', { p_nfe_id: nfeId })
      if (error) throw error

      const resultado = data as {
        ja_lancada: boolean
        itens_lancados: number
        /** Peças criadas para os itens que exigem identificação individual */
        unidades_criadas?: number
      }

      await registrarAuditoria({
        acao: 'nfe.lancar_estoque',
        tabela: 'nfe_importacao',
        registroId: nfeId,
        dadosNovos: {
          numero: numeroNfe,
          itens_lancados: resultado?.itens_lancados ?? 0,
          unidades_criadas: resultado?.unidades_criadas ?? 0,
        },
      })

      toast({
        title: resultado?.ja_lancada ? 'NF-e já estava lançada' : 'Estoque lançado',
        description: resultado?.ja_lancada
          ? 'Nenhuma movimentação foi duplicada.'
          : `${contar(resultado?.itens_lancados ?? 0, 'item deu', 'itens deram')} entrada no estoque.` +
            // Equipamento e ferramenta entram peça a peça, cada uma com o seu número
            (resultado?.unidades_criadas
              ? ` ${contar(resultado.unidades_criadas, 'unidade individual foi criada', 'unidades individuais foram criadas')} e já pode ser etiquetada.`
              : ''),
      })
      onAtualizado?.()
      onFechar()
    } catch (erro) {
      toast({
        title: 'Erro ao lançar no estoque',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Dialog open={!!nfeId} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Conciliação da NF-e {numeroNfe}
            {status && <StatusBadge status={status} genero="feminino" />}
          </DialogTitle>
          <DialogDescription>
            Vincule cada item da nota a um material do cadastro. O estoque só é movimentado no
            lançamento, depois da conferência.
          </DialogDescription>
        </DialogHeader>

        {jaLancada && (
          <Alert>
            <PackageCheck className="h-4 w-4" />
            <AlertTitle>Nota já lançada</AlertTitle>
            <AlertDescription>
              O estoque desta nota já foi movimentado. A conciliação fica apenas para consulta.
            </AlertDescription>
          </Alert>
        )}

        {!jaLancada && pendentes > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {contar(pendentes, 'item', 'itens')} sem material vinculado
            </AlertTitle>
            <AlertDescription>
              Vincule todos os itens para poder conferir e lançar a nota.
            </AlertDescription>
          </Alert>
        )}

        {carregando ? (
          <TableSkeleton colunas={4} linhas={4} />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Item da nota</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Valor unit.</TableHead>
                  <TableHead className="min-w-[280px]">Material do cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-2">
                      <div className="min-w-0">
                        <div className="truncate text-ds-table font-medium">
                          {item.descricao_produto}
                        </div>
                        {item.codigo_produto && (
                          <div className="text-xs text-muted-foreground">
                            Código na nota: {item.codigo_produto}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right text-ds-table tabular-nums">
                      {item.quantidade} {item.unidade}
                    </TableCell>
                    <TableCell className="py-2 text-right text-ds-table tabular-nums">
                      {formatCurrency(item.valor_unitario ?? 0)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        {salvando === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : item.material_equipamento_id ? (
                          <Link2 className="h-4 w-4 shrink-0 text-status-concluido" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <Combobox
                          options={materiais}
                          value={item.material_equipamento_id ?? ''}
                          onChange={(valor) => vincular(item.id, valor)}
                          placeholder="Selecione o material..."
                          disabled={!podeEditar || jaLancada}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>

          {podeEditar && !jaLancada && !conferida && (
            <Button onClick={conferir} disabled={pendentes > 0 || processando || carregando}>
              {processando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Marcar como conferida
            </Button>
          )}

          {podeEditar && conferida && (
            <Button onClick={lancar} disabled={pendentes > 0 || processando}>
              {processando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="mr-2 h-4 w-4" />
              )}
              Lançar no estoque
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConciliacaoNFeDialog
