import { useMemo } from 'react'
import { format } from 'date-fns'
import {
  Colaborador,
  RetiradaHistorico,
  ResourceTypeAssociation,
} from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface FichaImpressaoProps {
  colaborador: Colaborador
  historico: RetiradaHistorico[]
  tipoFicha: 'EPI' | 'Materiais' | 'Completa'
}

const getFichaTitle = (tipo: FichaImpressaoProps['tipoFicha']) => {
  switch (tipo) {
    case 'EPI':
      return 'Ficha de Controle de EPI'
    case 'Materiais':
      return 'Ficha de Controle de Materiais'
    case 'Completa':
      return 'Ficha Completa de Histórico e Débitos'
  }
}

export const FichaImpressao = ({
  colaborador,
  historico,
  tipoFicha,
}: FichaImpressaoProps) => {
  const filteredHistorico = useMemo(() => {
    if (tipoFicha === 'Completa') {
      return historico
    }
    if (tipoFicha === 'EPI') {
      return historico.filter(
        (item) =>
          item.resourceType === 'Only EPI' ||
          item.resourceType === 'Both EPI and Materials',
      )
    }
    if (tipoFicha === 'Materiais') {
      return historico.filter(
        (item) =>
          item.resourceType === 'Only Materials' ||
          item.resourceType === 'Both EPI and Materials',
      )
    }
    return []
  }, [historico, tipoFicha])

  const totalDebit = useMemo(() => {
    return filteredHistorico.reduce(
      (sum, item) => sum + item.valor * item.quantidade,
      0,
    )
  }, [filteredHistorico])

  return (
    <div className="bg-white text-black p-4 sm:p-8 print:p-0">
      <div className="max-w-4xl mx-auto print:max-w-full print:mx-0">
        <header className="flex justify-between items-start mb-6 print:mb-8">
          <div>
            <h1 className="text-2xl font-bold">{getFichaTitle(tipoFicha)}</h1>
            <p className="text-sm">
              Documento de controle de itens retirados pelo colaborador.
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">
              Data de Emissão: {format(new Date(), 'dd/MM/yyyy')}
            </p>
          </div>
        </header>

        <section className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Dados do Colaborador</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold">Nome:</p>
              <p>{colaborador.nomeCompleto}</p>
            </div>
            <div>
              <p className="font-semibold">Matrícula:</p>
              <p>{colaborador.matricula}</p>
            </div>
            <div>
              <p className="font-semibold">CPF:</p>
              <p>{colaborador.cpf}</p>
            </div>
            <div>
              <p className="font-semibold">Cargo:</p>
              <p>{colaborador.cargo}</p>
            </div>
            <div>
              <p className="font-semibold">Centro de Custo:</p>
              <p>{colaborador.centroCusto}</p>
            </div>
            <div>
              <p className="font-semibold">Status:</p>
              <p>{colaborador.status}</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Histórico de Itens Retirados
          </h2>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Data Retirada</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorico.length > 0 ? (
                  filteredHistorico.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item}</TableCell>
                      <TableCell>{format(item.data, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.resourceType}</Badge>
                      </TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell className="text-right">
                        {(item.valor * item.quantidade).toLocaleString(
                          'pt-BR',
                          {
                            style: 'currency',
                            currency: 'BRL',
                          },
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhum item encontrado para este tipo de ficha.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <h2 className="text-lg font-semibold">Resumo de Débitos</h2>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold">Valor Total em Aberto</span>
                <span className="text-lg font-bold text-red-600">
                  {totalDebit.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-16">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <Separator className="bg-black" />
              <p className="mt-2 text-sm font-semibold">
                {colaborador.nomeCompleto}
              </p>
              <p className="text-xs">(Assinatura do Colaborador)</p>
            </div>
            <div className="text-center">
              <Separator className="bg-black" />
              <p className="mt-2 text-sm font-semibold">
                Responsável Almoxarifado
              </p>
              <p className="text-xs">(Assinatura e Carimbo)</p>
            </div>
          </div>
          <div className="text-center mt-8 text-xs">
            <p>
              Declaro que recebi os itens listados acima e estou ciente da minha
              responsabilidade sobre os mesmos, incluindo a devolução quando
              aplicável.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
