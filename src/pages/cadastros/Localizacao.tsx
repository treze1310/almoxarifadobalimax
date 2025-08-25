import { useState } from 'react'
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, MapPin, Building, Navigation } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { LocalizacaoForm } from '@/components/localizacao/LocalizacaoForm'
import type { Tables } from '@/types/database'
import { PermissionGuard } from '@/components/PermissionGuard'

type Localizacao = Tables<'localizacao'>

const LocalizacaoPage = () => {
  const { data: localizacoes, loading, create, update, remove } = useSupabaseTable('localizacao')
  
  const [search, setSearch] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingLocalizacao, setEditingLocalizacao] = useState<Localizacao | null>(null)
  const [deletingLocalizacao, setDeletingLocalizacao] = useState<Localizacao | null>(null)

  const filteredLocalizacoes = localizacoes.filter(localizacao =>
    localizacao.codigo.toLowerCase().includes(search.toLowerCase()) ||
    localizacao.nome.toLowerCase().includes(search.toLowerCase()) ||
    (localizacao.descricao && localizacao.descricao.toLowerCase().includes(search.toLowerCase())) ||
    (localizacao.predio && localizacao.predio.toLowerCase().includes(search.toLowerCase())) ||
    (localizacao.andar && localizacao.andar.toLowerCase().includes(search.toLowerCase())) ||
    (localizacao.sala && localizacao.sala.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = async (data: any) => {
    const result = await create(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingLocalizacao) return
    const result = await update(editingLocalizacao.id, data)
    if (result.error === null) {
      setEditingLocalizacao(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingLocalizacao) return
    const result = await remove(deletingLocalizacao.id)
    if (result.error === null) {
      setDeletingLocalizacao(null)
    }
  }

  const formatLocation = (localizacao: Localizacao) => {
    const parts = []
    if (localizacao.predio) parts.push(`Prédio ${localizacao.predio}`)
    if (localizacao.andar) parts.push(`Andar ${localizacao.andar}`)
    if (localizacao.sala) parts.push(`Sala ${localizacao.sala}`)
    return parts.length > 0 ? parts.join(' - ') : null
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cadastro de Localização</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastro de Localização</h1>
        
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Localização
          </Button>
        
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou localização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">
          {filteredLocalizacoes.length} localização{filteredLocalizacoes.length !== 1 ? 'ões' : ''}
        </Badge>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLocalizacoes.length > 0 ? (
              filteredLocalizacoes.map((localizacao) => (
                <TableRow key={localizacao.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="font-medium">{localizacao.codigo}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{localizacao.nome}</div>
                      {localizacao.descricao && (
                        <div className="text-sm text-muted-foreground">
                          {localizacao.descricao.length > 50 
                            ? `${localizacao.descricao.substring(0, 50)}...`
                            : localizacao.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Building className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {formatLocation(localizacao) || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {localizacao.posicao_x !== null && localizacao.posicao_y !== null ? (
                      <div className="flex items-center space-x-1">
                        <Navigation className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          X: {localizacao.posicao_x}, Y: {localizacao.posicao_y}
                        </span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={localizacao.ativo ? 'default' : 'secondary'}>
                      {localizacao.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        
                          <DropdownMenuItem onClick={() => setEditingLocalizacao(localizacao)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        
                        
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingLocalizacao(localizacao)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {search ? 'Nenhuma localização encontrada com os critérios de busca.' : 'Nenhuma localização cadastrada.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Localização</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova localização.
            </DialogDescription>
          </DialogHeader>
          <LocalizacaoForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingLocalizacao} onOpenChange={() => setEditingLocalizacao(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Localização</DialogTitle>
            <DialogDescription>
              Altere os dados da localização conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingLocalizacao && (
            <LocalizacaoForm 
              initialData={editingLocalizacao}
              onSubmit={handleUpdate} 
              onCancel={() => setEditingLocalizacao(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingLocalizacao} onOpenChange={() => setDeletingLocalizacao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a localização "{deletingLocalizacao?.codigo} - {deletingLocalizacao?.nome}"? 
              Esta ação não pode ser desfeita e pode afetar outros registros relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default LocalizacaoPage
