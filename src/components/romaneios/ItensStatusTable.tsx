import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatDateTime } from '@/lib/utils'
import { Package, Calendar, RotateCcw, RefreshCw } from 'lucide-react'
import { devolucaoItensService } from '@/services/devolucaoItensService'
import type { Tables } from '@/types/database'

type RomaneioItem = Tables<'romaneios_itens'> & {
  materiais_equipamentos?: {
    id: string
    codigo: string
    nome: string
    unidade_medida: string
    codigo_ncm: string | null
  } | null
}

interface ItensStatusTableProps {
  romaneioId: string
  onItemUpdated?: () => void
}

interface EstatisticasDevolucao {
  totalItens: number
  itensDevolvidos: number
  itensPendentes: number
  percentualDevolvido: number
  quantidadeTotal: number
  quantidadeDevolvida: number
}

const ItensStatusTable = ({ romaneioId, onItemUpdated }: ItensStatusTableProps) => {
  const [itens, setItens] = useState<RomaneioItem[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasDevolucao>({
    totalItens: 0,
    itensDevolvidos: 0,
    itensPendentes: 0,
    percentualDevolvido: 0,
    quantidadeTotal: 0,
    quantidadeDevolvida: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  const carregarItens = async () => {
    setIsLoading(true)
    try {
      // Buscar todos os itens (pendentes e devolvidos)
      const [pendenteResult, devolvidoResult, estatisticasResult] = await Promise.all([
        devolucaoItensService.buscarItensPendentes(romaneioId),
        devolucaoItensService.buscarItensDevolvidos(romaneioId),
        devolucaoItensService.calcularEstatisticasDevolucao(romaneioId)
      ])

      if (pendenteResult.error || devolvidoResult.error) {
        console.error('Erro ao carregar itens:', pendenteResult.error || devolvidoResult.error)
        return
      }

      // Combinar itens pendentes e devolvidos
      const todosItens = [
        ...pendenteResult.data,
        ...devolvidoResult.data
      ]

      setItens(todosItens)
      setEstatisticas(estatisticasResult)
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar status dos itens',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarItens()
  }, [romaneioId])

  const handleDesfazerDevolucao = async (itemId: string) => {
    setIsUpdating(itemId)
    try {
      const result = await devolucaoItensService.desfazerDevolucaoItem(itemId)
      
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: result.message
        })
        
        await carregarItens()
        onItemUpdated?.()
      } else {
        toast({
          title: 'Erro',
          description: result.message,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao desfazer devolução:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao desfazer devolução do item',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const getStatusBadge = (item: RomaneioItem) => {
    if (item.data_devolucao) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Devolvido
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        Pendente
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Status dos Itens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resumo de Devoluções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{estatisticas.totalItens}</p>
              <p className="text-sm text-muted-foreground">Total de Itens</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{estatisticas.itensDevolvidos}</p>
              <p className="text-sm text-muted-foreground">Devolvidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{estatisticas.itensPendentes}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{estatisticas.percentualDevolvido}%</p>
              <p className="text-sm text-muted-foreground">% Devolvido</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {estatisticas.quantidadeDevolvida}/{estatisticas.quantidadeTotal}
              </p>
              <p className="text-sm text-muted-foreground">Quantidade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Itens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detalhes dos Itens</span>
            <Button variant="outline" size="sm" onClick={carregarItens}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Material/Equipamento</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Data Devolução</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {getStatusBadge(item)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {item.materiais_equipamentos?.codigo}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.materiais_equipamentos?.nome}
                  </TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>
                    {item.materiais_equipamentos?.unidade_medida}
                  </TableCell>
                  <TableCell>
                    {item.data_devolucao ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDateTime(item.data_devolucao)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.data_devolucao && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDesfazerDevolucao(item.id)}
                        disabled={isUpdating === item.id}
                      >
                        {isUpdating === item.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Desfazer
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {itens.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item encontrado neste romaneio.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ItensStatusTable