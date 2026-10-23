import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

interface RomaneioConsulta {
  numero: string
  data_romaneio: string | null
  responsavel_retirada: string | null
  observacoes: string | null
  colaboradores?: { nome: string } | null
  centro_custo_origem?: { codigo: string; descricao: string } | null
  centro_custo_destino?: { codigo: string; descricao: string } | null
  romaneios_itens?: Array<{
    id: string
    quantidade: number
    materiais_equipamentos?: { codigo: string; nome: string; unidade_medida: string } | null
  }>
}

/** Consulta da retirada original, sem alterar a seleção nem movimentar estoque. */
export function RomaneioDevolucaoDetalhes({ romaneio }: { romaneio: RomaneioConsulta }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />Ver Detalhes</Button>
      </DialogTrigger>
      <DialogContent tamanho="lg" className="flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Romaneio {romaneio.numero}</DialogTitle>
          <DialogDescription>Consulte os dados e itens da retirada original antes de selecionar a devolução.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-medium">Data</dt><dd>{romaneio.data_romaneio ? formatDate(romaneio.data_romaneio) : '—'}</dd></div>
            <div><dt className="font-medium">Responsável</dt><dd>{romaneio.responsavel_retirada || romaneio.colaboradores?.nome || '—'}</dd></div>
            <div><dt className="font-medium">Centro de Custo Origem</dt><dd>{romaneio.centro_custo_origem ? `${romaneio.centro_custo_origem.codigo} · ${romaneio.centro_custo_origem.descricao}` : '—'}</dd></div>
            <div><dt className="font-medium">Centro de Custo Destino</dt><dd>{romaneio.centro_custo_destino ? `${romaneio.centro_custo_destino.codigo} · ${romaneio.centro_custo_destino.descricao}` : '—'}</dd></div>
          </dl>
          <div>
            <h3 className="mb-2 font-semibold">Itens da retirada</h3>
            <Table className="table-fixed">
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-20">Unidade</TableHead><TableHead className="w-24 text-right">Quantidade</TableHead></TableRow></TableHeader>
              <TableBody>
                {(romaneio.romaneios_itens ?? []).map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="break-words"><span className="font-mono text-xs">{item.materiais_equipamentos?.codigo}</span><p>{item.materiais_equipamentos?.nome || 'Material indisponível'}</p></TableCell>
                    <TableCell>{item.materiais_equipamentos?.unidade_medida || '—'}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                  </TableRow>
                ))}
                {!romaneio.romaneios_itens?.length && <TableRow><TableCell colSpan={3}>Nenhum item encontrado neste romaneio.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {romaneio.observacoes && <div><h3 className="font-medium">Observações</h3><p className="whitespace-pre-wrap break-words text-sm">{romaneio.observacoes}</p></div>}
        </DialogBody>
        <DialogFooter className="border-t pt-3"><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
