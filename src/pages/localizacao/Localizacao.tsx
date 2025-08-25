import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, PlusCircle, Map } from 'lucide-react'
import { Link } from 'react-router-dom'

const localizacoes = [
  {
    id: 'LOC-001',
    localizacao:
      'Almoxarifado Principal - Corredor A - Prateleira 01 - Nível A',
    itensCadastrados: 15,
  },
  {
    id: 'LOC-002',
    localizacao:
      'Almoxarifado Principal - Corredor A - Prateleira 01 - Nível B',
    itensCadastrados: 22,
  },
  {
    id: 'LOC-003',
    localizacao: 'Almoxarifado Principal - Corredor A - Prateleira 02',
    itensCadastrados: 8,
  },
  {
    id: 'LOC-004',
    localizacao: 'Almoxarifado Principal - Corredor B - Prateleira 01',
    itensCadastrados: 31,
  },
  {
    id: 'LOC-005',
    localizacao: 'Área de Recebimento',
    itensCadastrados: 0,
  },
  {
    id: 'LOC-006',
    localizacao: 'Área de Expedição',
    itensCadastrados: 0,
  },
  {
    id: 'LOC-007',
    localizacao: 'Sala 203 - Armário B',
    itensCadastrados: 5,
  },
]

const LocalizacaoPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Localização</h1>
        <div className="space-x-2">
          <Button asChild variant="outline">
            <Link to="/localizacao/mapa">
              <Map className="mr-2 h-4 w-4" />
              Ver Mapa Visual
            </Link>
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Localização
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Buscar por ID ou descrição da localização..."
          className="max-w-sm"
        />
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Itens Cadastrados</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localizacoes.map((local) => (
              <TableRow key={local.id}>
                <TableCell className="font-medium">{local.id}</TableCell>
                <TableCell>{local.localizacao}</TableCell>
                <TableCell>{local.itensCadastrados}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Gerar Etiqueta</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default LocalizacaoPage
