import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMateriaisEquipamentos } from '@/hooks/useMateriaisEquipamentos'

const ajusteEstoqueSchema = z.object({
  nova_quantidade: z.number().min(0, 'Quantidade deve ser positiva'),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
  tipo_movimentacao: z.enum(['entrada', 'saida', 'ajuste'], {
    required_error: 'Tipo é obrigatório',
  }),
})

type AjusteEstoqueFormData = z.infer<typeof ajusteEstoqueSchema>

interface MovimentacaoEstoqueProps {
  materialId: string
  materialNome: string
  estoqueAtual: number
  unidadeMedida: string
}

export function MovimentacaoEstoque({
  materialId,
  materialNome,
  estoqueAtual,
  unidadeMedida,
}: MovimentacaoEstoqueProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  
  const { 
    movimentacoes, 
    fetchMovimentacoes, 
    adjustStock,
    loading 
  } = useMateriaisEquipamentos()

  const form = useForm<AjusteEstoqueFormData>({
    resolver: zodResolver(ajusteEstoqueSchema),
    defaultValues: {
      nova_quantidade: estoqueAtual,
      motivo: '',
      tipo_movimentacao: 'ajuste',
    },
  })

  useEffect(() => {
    if (showHistory) {
      fetchMovimentacoes(materialId)
    }
  }, [showHistory, materialId, fetchMovimentacoes])

  const onSubmit = async (data: AjusteEstoqueFormData) => {
    const result = await adjustStock(materialId, data.nova_quantidade, data.motivo)
    if (result.error === null) {
      setIsOpen(false)
      form.reset()
    }
  }

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

  return (
    <div className="space-y-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Ajustar Estoque
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription>
              Ajuste o estoque de "{materialNome}". 
              Estoque atual: {estoqueAtual} {unidadeMedida}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tipo_movimentacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimentação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                        <SelectItem value="ajuste">Ajuste</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nova_quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Quantidade ({unidadeMedida})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo do ajuste..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Ajustando...' : 'Confirmar Ajuste'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHistory(!showHistory)}
      >
        {showHistory ? 'Ocultar' : 'Ver'} Histórico
      </Button>

      {showHistory && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {movimentacoes.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((movimentacao) => (
                      <TableRow key={movimentacao.id}>
                        <TableCell>
                          {movimentacao.data_movimentacao
                            ? format(new Date(movimentacao.data_movimentacao), 'dd/MM/yyyy HH:mm')
                            : '-'}
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
                            {movimentacao.quantidade} {unidadeMedida}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{movimentacao.quantidade_anterior} → {movimentacao.quantidade_atual}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {movimentacao.motivo || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação encontrada
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}