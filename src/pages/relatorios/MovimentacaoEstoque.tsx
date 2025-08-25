import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, RotateCcw, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMateriaisEquipamentos } from '@/hooks/useMateriaisEquipamentos'

const RelatorioMovimentacaoPage = () => {
  const { movimentacoes, fetchMovimentacoes, loading } = useMateriaisEquipamentos()
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchMovimentacoes()
  }, [fetchMovimentacoes])

  const filteredMovimentacoes = movimentacoes.filter(movimentacao => {
    const matchSearch = 
      movimentacao.materiais_equipamentos?.codigo.toLowerCase().includes(search.toLowerCase()) ||
      movimentacao.materiais_equipamentos?.nome.toLowerCase().includes(search.toLowerCase()) ||
      movimentacao.motivo?.toLowerCase().includes(search.toLowerCase())

    const matchTipo = !tipoFilter || movimentacao.tipo_movimentacao === tipoFilter

    const matchDate = (!dateFrom || !dateTo) || (
      movimentacao.data_movimentacao &&
      new Date(movimentacao.data_movimentacao) >= new Date(dateFrom) &&
      new Date(movimentacao.data_movimentacao) <= new Date(dateTo)
    )

    return matchSearch && matchTipo && matchDate
  })

  const getMovimentacaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'saida':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <RotateCcw className="h-4 w-4 text-blue-500" />
    }
  }

  const getMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'default'
      case 'saida':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const totalEntradas = filteredMovimentacoes
    .filter(m => m.tipo_movimentacao === 'entrada')
    .reduce((sum, m) => sum + m.quantidade, 0)

  const totalSaidas = filteredMovimentacoes
    .filter(m => m.tipo_movimentacao === 'saida')
    .reduce((sum, m) => sum + m.quantidade, 0)

  const valorTotalMovimentado = filteredMovimentacoes
    .reduce((sum, m) => sum + ((m.valor_unitario || 0) * m.quantidade), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Relatório de Movimentação de Estoque</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Relatório de Movimentação de Estoque</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMovimentacoes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalEntradas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalSaidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(valorTotalMovimentado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar por material ou motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lg:col-span-2"
            />
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Data início"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              placeholder="Data fim"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Material/Equipamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimentacoes.length > 0 ? (
                  filteredMovimentacoes.map((movimentacao) => (
                    <TableRow key={movimentacao.id}>
                      <TableCell>
                        {movimentacao.data_movimentacao
                          ? format(new Date(movimentacao.data_movimentacao), 'dd/MM/yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {movimentacao.materiais_equipamentos?.codigo || '-'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {movimentacao.materiais_equipamentos?.nome || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovimentacaoIcon(movimentacao.tipo_movimentacao)}
                          <Badge variant={getMovimentacaoColor(movimentacao.tipo_movimentacao)}>
                            {movimentacao.tipo_movimentacao}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={
                          movimentacao.tipo_movimentacao === 'entrada' 
                            ? 'text-green-600 font-medium' 
                            : movimentacao.tipo_movimentacao === 'saida'
                            ? 'text-red-600 font-medium'
                            : 'text-blue-600 font-medium'
                        }>
                          {movimentacao.tipo_movimentacao === 'entrada' ? '+' : 
                           movimentacao.tipo_movimentacao === 'saida' ? '-' : '±'}
                          {movimentacao.quantidade} {movimentacao.materiais_equipamentos?.unidade_medida || ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movimentacao.quantidade_anterior} → {movimentacao.quantidade_atual}
                        </div>
                      </TableCell>
                      <TableCell>
                        {movimentacao.valor_unitario 
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(movimentacao.valor_unitario)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {movimentacao.valor_unitario 
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(movimentacao.valor_unitario * movimentacao.quantidade)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">
                          {movimentacao.motivo || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhuma movimentação encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RelatorioMovimentacaoPage