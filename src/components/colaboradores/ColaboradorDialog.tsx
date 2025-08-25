import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ColaboradorForm } from './ColaboradorForm'
import {
  Colaborador,
  RetiradaHistorico,
  ResourceTypeAssociation,
} from '@/types'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileText } from 'lucide-react'

interface ColaboradorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  colaborador?: Colaborador | null
}

const historicoMock: RetiradaHistorico[] = [
  {
    id: '1',
    item: 'Mouse sem Fio Logitech',
    data: new Date(2025, 6, 15),
    quantidade: 1,
    valor: 150.0,
    resourceType: 'Only Materials',
    associationDate: new Date(2025, 6, 15, 10, 30),
  },
  {
    id: '2',
    item: 'Teclado ABNT2',
    data: new Date(2025, 6, 15),
    quantidade: 1,
    valor: 180.0,
    resourceType: 'Only Materials',
    associationDate: new Date(2025, 6, 15, 10, 30),
  },
  {
    id: '3',
    item: 'Capacete de Segurança',
    data: new Date(2025, 5, 1),
    quantidade: 1,
    valor: 75.0,
    resourceType: 'Only EPI',
    associationDate: new Date(2025, 5, 1, 9, 0),
  },
  {
    id: '4',
    item: 'Luva de Proteção',
    data: new Date(2025, 5, 1),
    quantidade: 1,
    valor: 25.0,
    resourceType: 'Both EPI and Materials',
    associationDate: new Date(2025, 5, 1, 9, 0),
  },
]

export const ColaboradorDialog = ({
  open,
  onOpenChange,
  colaborador,
}: ColaboradorDialogProps) => {
  const handleSuccess = () => {
    onOpenChange(false)
  }

  const debitsByType = historicoMock.reduce(
    (acc, item) => {
      const type = item.resourceType
      if (!acc[type]) {
        acc[type] = 0
      }
      acc[type] += item.valor * item.quantidade
      return acc
    },
    {} as Record<ResourceTypeAssociation, number>,
  )

  const totalDebit = Object.values(debitsByType).reduce(
    (sum, val) => sum + val,
    0,
  )

  const handleGenerateFicha = (tipoFicha: 'EPI' | 'Materiais' | 'Completa') => {
    if (!colaborador) return

    const printData = {
      colaborador,
      historico: historicoMock,
      tipoFicha,
    }

    localStorage.setItem('fichaPrintData', JSON.stringify(printData))
    window.open(`/cadastros/colaboradores/${colaborador.id}/ficha`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {colaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
          <DialogDescription>
            {colaborador
              ? 'Edite as informações do colaborador.'
              : 'Preencha os dados para cadastrar um novo colaborador.'}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes do Colaborador</TabsTrigger>
            <TabsTrigger value="history" disabled={!colaborador}>
              Histórico e Débitos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="p-1 pt-4">
              <ColaboradorForm
                colaborador={colaborador}
                onSuccess={handleSuccess}
              />
            </div>
          </TabsContent>
          <TabsContent value="history">
            <div className="p-1 pt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Histórico de EPIs e materiais retirados</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Gerar Ficha
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => handleGenerateFicha('EPI')}
                      >
                        Ficha de EPI
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleGenerateFicha('Materiais')}
                      >
                        Ficha de Materiais
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleGenerateFicha('Completa')}
                      >
                        Ficha Completa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Data Retirada</TableHead>
                        <TableHead>Tipo Recurso</TableHead>
                        <TableHead>Data Associação</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicoMock.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item}</TableCell>
                          <TableCell>
                            {format(item.data, 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.resourceType}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(item.associationDate, 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{item.quantidade}</TableCell>
                          <TableCell className="text-right">
                            {item.valor.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Débitos Pendentes de Devolução</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(debitsByType).map(([type, value]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center"
                      >
                        <span className="text-muted-foreground">{type}</span>
                        <span className="font-semibold">
                          {value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold">Valor Total</span>
                      <span className="text-lg font-bold text-destructive">
                        {totalDebit.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
