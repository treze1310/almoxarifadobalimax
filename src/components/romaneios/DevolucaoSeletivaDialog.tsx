import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { RefreshCw, Package, Calendar, User, MapPin, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRomaneios } from '@/hooks/useRomaneios'
import { devolucaoService } from '@/services/devolucaoService'
import { devolucaoItensService } from '@/services/devolucaoItensService'
import type { Tables } from '@/types/database'

type RomaneioItem = {
  id: string
  quantidade: number
  valor_unitario: number | null
  valor_total: number | null
  numero_serie: string | null
  codigo_patrimonial: string | null
  observacoes: string | null
  data_devolucao: string | null
  materiais_equipamentos?: {
    id: string
    codigo: string
    nome: string
    unidade_medida: string
    codigo_ncm: string | null
  } | null
}

type Romaneio = Tables<'romaneios'> & {
  colaboradores?: { nome: string; matricula: string } | null
  centro_custo_origem?: { codigo: string; nome: string } | null
  centro_custo_destino?: { codigo: string; nome: string } | null
  fornecedores?: { nome: string } | null
  romaneios_itens?: RomaneioItem[]
}

interface ItemDevolucao {
  itemId: string
  quantidadeDevolver: number
  selecionado: boolean
}

interface DevolucaoSeletivaDialogProps {
  romaneio: Romaneio
  trigger?: React.ReactNode
  onDevolucaoRealizada?: () => void
}

const DevolucaoSeletivaDialog = ({ romaneio, trigger, onDevolucaoRealizada }: DevolucaoSeletivaDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [itensParaDevolucao, setItensParaDevolucao] = useState<ItemDevolucao[]>([])
  const { toast } = useToast()
  const { createRomaneio } = useRomaneios()

  // Inicializar itens para devolução
  useEffect(() => {
    if (romaneio.romaneios_itens) {
      const itens = romaneio.romaneios_itens
        .filter(item => !item.data_devolucao) // Apenas itens não devolvidos
        .map(item => ({
          itemId: item.id,
          quantidadeDevolver: 0,
          selecionado: false
        }))
      setItensParaDevolucao(itens)
    }
  }, [romaneio])

  const handleItemSelectionChange = (itemId: string, selecionado: boolean) => {
    setItensParaDevolucao(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return {
          ...item,
          selecionado,
          quantidadeDevolver: selecionado ? getQuantidadeDisponivel(itemId) : 0
        }
      }
      return item
    }))
  }

  const handleQuantidadeChange = (itemId: string, quantidade: number) => {
    setItensParaDevolucao(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const maxQuantidade = getQuantidadeDisponivel(itemId)
        return {
          ...item,
          quantidadeDevolver: Math.min(Math.max(0, quantidade), maxQuantidade)
        }
      }
      return item
    }))
  }

  const getQuantidadeDisponivel = (itemId: string): number => {
    const item = romaneio.romaneios_itens?.find(i => i.id === itemId)
    return item?.quantidade || 0
  }

  const getItemById = (itemId: string): RomaneioItem | undefined => {
    return romaneio.romaneios_itens?.find(i => i.id === itemId)
  }

  const getTotalItensSelecionados = (): number => {
    return itensParaDevolucao.filter(item => item.selecionado).length
  }

  const getTotalQuantidadeDevolver = (): number => {
    return itensParaDevolucao.reduce((total, item) => {
      return total + (item.selecionado ? item.quantidadeDevolver : 0)
    }, 0)
  }

  const handleSelecionarTodos = () => {
    const todosSelecionados = itensParaDevolucao.every(item => item.selecionado)
    setItensParaDevolucao(prev => prev.map(item => ({
      ...item,
      selecionado: !todosSelecionados,
      quantidadeDevolver: !todosSelecionados ? getQuantidadeDisponivel(item.itemId) : 0
    })))
  }

  const handleSalvarDevolucao = async () => {
    const itensSelecionados = itensParaDevolucao.filter(item => item.selecionado && item.quantidadeDevolver > 0)
    
    if (itensSelecionados.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um item para devolução',
        variant: 'destructive'
      })
      return
    }

    // Validar se pode finalizar devolução
    const validacao = await devolucaoService.validarFinalizacaoDevolucao(romaneio.id)
    if (!validacao.valido) {
      toast({
        title: 'Erro',
        description: validacao.motivo || 'Não é possível criar devolução para este romaneio',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)
    try {
      // Criar romaneio de devolução
      const devolucaoData = {
        tipo: 'devolucao' as const,
        centro_custo_origem_id: romaneio.centro_custo_destino_id,
        centro_custo_destino_id: romaneio.centro_custo_origem_id,
        colaborador_id: romaneio.colaborador_id,
        data_romaneio: new Date().toISOString().split('T')[0],
        observacoes: `Devolução parcial do romaneio ${romaneio.numero}`,
        status: 'pendente',
        romaneio_origem_id: romaneio.id,
        itens: itensSelecionados.map(itemDev => {
          const itemOriginal = getItemById(itemDev.itemId)!
          return {
            material_equipamento_id: itemOriginal.materiais_equipamentos?.id || '',
            quantidade: itemDev.quantidadeDevolver,
            valor_unitario: itemOriginal.valor_unitario,
            valor_total: (itemOriginal.valor_unitario || 0) * itemDev.quantidadeDevolver,
            numero_serie: itemOriginal.numero_serie,
            codigo_patrimonial: itemOriginal.codigo_patrimonial,
            observacoes: itemOriginal.observacoes
          }
        })
      }

      const result = await createRomaneio(devolucaoData)
      
      if (result.error === null) {
        // Marcar itens como devolvidos com data de devolução
        const agora = new Date().toISOString()
        const itensDevolucao = itensSelecionados.map(item => ({
          itemId: item.itemId,
          quantidadeDevolvida: item.quantidadeDevolver,
          dataDevolucao: agora
        }))

        const resultMarcacao = await devolucaoItensService.marcarItensComoDevolvidos(itensDevolucao)
        
        if (resultMarcacao.success) {
          toast({
            title: 'Sucesso',
            description: `Devolução criada com sucesso! ${itensSelecionados.length} item(ns) devolvido(s).`,
          })
        } else {
          toast({
            title: 'Aviso',
            description: `Devolução criada, mas houve erro ao marcar itens: ${resultMarcacao.message}`,
            variant: 'destructive'
          })
        }
        
        setIsOpen(false)
        onDevolucaoRealizada?.()
      }
    } catch (error) {
      console.error('Erro ao criar devolução:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar devolução seletiva',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const itensDisponiveis = romaneio.romaneios_itens?.filter(item => !item.data_devolucao) || []

  if (itensDisponiveis.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline" size="sm">Devolução Seletiva</Button>}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Nenhum Item Disponível
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Todos os itens deste romaneio já foram devolvidos.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Devolução Seletiva
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <span>Devolução Seletiva - {romaneio.numero}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Romaneio Original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Romaneio Original
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Data</p>
                    <p className="text-muted-foreground">{formatDate(romaneio.data_romaneio)}</p>
                  </div>
                </div>
                {romaneio.colaboradores && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Colaborador</p>
                      <p className="text-muted-foreground">{romaneio.colaboradores.nome}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Destino</p>
                    <p className="text-muted-foreground">
                      {romaneio.centro_custo_destino?.nome || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Selecionar Itens para Devolução</span>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">
                    {getTotalItensSelecionados()} de {itensDisponiveis.length} selecionados
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelecionarTodos}
                  >
                    {itensParaDevolucao.every(item => item.selecionado) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sel.</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Material/Equipamento</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Qtd. Disponível</TableHead>
                    <TableHead>Qtd. Devolver</TableHead>
                    <TableHead>Valor Unit.</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensDisponiveis.map((item) => {
                    const itemDevolucao = itensParaDevolucao.find(i => i.itemId === item.id)
                    if (!itemDevolucao) return null

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={itemDevolucao.selecionado}
                            onCheckedChange={(checked) => 
                              handleItemSelectionChange(item.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono">
                          {item.materiais_equipamentos?.codigo}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.materiais_equipamentos?.nome}
                        </TableCell>
                        <TableCell>
                          {item.materiais_equipamentos?.unidade_medida}
                        </TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.quantidade}
                            value={itemDevolucao.quantidadeDevolver}
                            onChange={(e) => 
                              handleQuantidadeChange(item.id, parseInt(e.target.value) || 0)
                            }
                            disabled={!itemDevolucao.selecionado}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          {item.valor_unitario ? 
                            `R$ ${item.valor_unitario.toFixed(2)}` : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.observacoes || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumo */}
          {getTotalItensSelecionados() > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Devolução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Itens Selecionados</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getTotalItensSelecionados()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Quantidade Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getTotalQuantidadeDevolver()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Valor Total</p>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {itensParaDevolucao
                        .filter(item => item.selecionado)
                        .reduce((total, item) => {
                          const itemOriginal = getItemById(item.itemId)
                          const valor = (itemOriginal?.valor_unitario || 0) * item.quantidadeDevolver
                          return total + valor
                        }, 0)
                        .toFixed(2)
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarDevolucao}
              disabled={isSaving || getTotalItensSelecionados() === 0}
            >
              {isSaving ? 'Salvando...' : `Criar Devolução (${getTotalItensSelecionados()} itens)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DevolucaoSeletivaDialog