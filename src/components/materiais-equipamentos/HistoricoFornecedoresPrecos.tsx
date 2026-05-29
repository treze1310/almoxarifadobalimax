import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Loader2, History, TrendingDown, TrendingUp, Clock } from 'lucide-react'

interface HistoricoItem {
  id: string
  valorUnitario: number
  quantidade: number
  numeroNfe: string | null
  dataEmissao: string | null
  fornecedorNome: string
  fornecedorCnpj: string | null
}

interface HistoricoFornecedoresPrecosProps {
  materialId: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const HistoricoFornecedoresPrecos = ({
  materialId,
}: HistoricoFornecedoresPrecosProps) => {
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistorico = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('nfe_itens')
        .select(`
          id,
          valor_unitario,
          quantidade,
          nfe_importacao:nfe_id (
            numero_nfe,
            data_emissao,
            fornecedores:fornecedor_id ( nome, cnpj )
          )
        `)
        .eq('material_equipamento_id', materialId)

      if (error) throw error

      const items: HistoricoItem[] = (data || []).map((row: any) => ({
        id: row.id,
        valorUnitario: row.valor_unitario ?? 0,
        quantidade: row.quantidade ?? 0,
        numeroNfe: row.nfe_importacao?.numero_nfe ?? null,
        dataEmissao: row.nfe_importacao?.data_emissao ?? null,
        fornecedorNome: row.nfe_importacao?.fornecedores?.nome ?? 'Não informado',
        fornecedorCnpj: row.nfe_importacao?.fornecedores?.cnpj ?? null,
      }))

      // Ordenar por data de emissão (mais recente primeiro)
      items.sort((a, b) => {
        const da = a.dataEmissao ? new Date(a.dataEmissao).getTime() : 0
        const db = b.dataEmissao ? new Date(b.dataEmissao).getTime() : 0
        return db - da
      })

      setHistorico(items)
    } catch (error) {
      console.error('Erro ao buscar histórico de fornecedores/preços:', error)
      setHistorico([])
    } finally {
      setLoading(false)
    }
  }, [materialId])

  useEffect(() => {
    if (materialId) fetchHistorico()
  }, [materialId, fetchHistorico])

  // Estatísticas de preço
  const precos = historico.map((h) => h.valorUnitario).filter((v) => v > 0)
  const menorPreco = precos.length ? Math.min(...precos) : null
  const maiorPreco = precos.length ? Math.max(...precos) : null
  const ultimoPreco = historico.length ? historico[0].valorUnitario : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Histórico de Fornecedores e Preços</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando histórico...
        </div>
      ) : historico.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
          Nenhuma compra registrada para este item (via importação de NF-e).
        </div>
      ) : (
        <>
          {/* Resumo de preços */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="border rounded-md p-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-muted-foreground">Último preço</div>
                <div className="font-semibold">
                  {ultimoPreco != null ? formatCurrency(ultimoPreco) : '-'}
                </div>
              </div>
            </div>
            <div className="border rounded-md p-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-success" />
              <div>
                <div className="text-muted-foreground">Menor preço</div>
                <div className="font-semibold">
                  {menorPreco != null ? formatCurrency(menorPreco) : '-'}
                </div>
              </div>
            </div>
            <div className="border rounded-md p-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <div>
                <div className="text-muted-foreground">Maior preço</div>
                <div className="font-semibold">
                  {maiorPreco != null ? formatCurrency(maiorPreco) : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Nº NF-e</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Vlr. Unit.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {item.dataEmissao
                        ? format(new Date(item.dataEmissao), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{item.fornecedorNome}</div>
                      {item.fornecedorCnpj && (
                        <div className="text-xs text-muted-foreground">
                          {item.fornecedorCnpj}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{item.numeroNfe || '-'}</TableCell>
                    <TableCell className="text-right text-sm">{item.quantidade}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrency(item.valorUnitario)}
                        {menorPreco != null &&
                          item.valorUnitario === menorPreco &&
                          precos.length > 1 && (
                            <Badge
                              variant="success"
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              menor
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
