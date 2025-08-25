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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, Tag } from 'lucide-react'
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
import { MarcaForm } from '@/components/marcas/MarcaForm'
import type { Tables } from '@/types/database'
import { PermissionGuard } from '@/components/PermissionGuard'

type Marca = Tables<'marcas'>

const MarcasPage = () => {
  const { data: marcas, loading, create, update, remove } = useSupabaseTable('marcas')
  
  const [search, setSearch] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null)
  const [deletingMarca, setDeletingMarca] = useState<Marca | null>(null)

  const filteredMarcas = marcas.filter(marca =>
    marca.nome.toLowerCase().includes(search.toLowerCase()) ||
    (marca.descricao && marca.descricao.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = async (data: any) => {
    const result = await create(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingMarca) return
    const result = await update(editingMarca.id, data)
    if (result.error === null) {
      setEditingMarca(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingMarca) return
    const result = await remove(deletingMarca.id)
    if (result.error === null) {
      setDeletingMarca(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cadastro de Marcas</h1>
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
        <h1 className="text-2xl font-bold">Cadastro de Marcas</h1>
        <PermissionGuard permission="marcas_create">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Marca
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">
          {filteredMarcas.length} marca{filteredMarcas.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMarcas.length > 0 ? (
              filteredMarcas.map((marca) => (
                <TableRow key={marca.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div className="font-medium">{marca.nome}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {marca.descricao ? (
                      marca.descricao.length > 100 
                        ? `${marca.descricao.substring(0, 100)}...`
                        : marca.descricao
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={marca.ativo ? 'default' : 'secondary'}>
                      {marca.ativo ? 'Ativo' : 'Inativo'}
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
                        <PermissionGuard permission="marcas_edit">
                          <DropdownMenuItem onClick={() => setEditingMarca(marca)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <PermissionGuard permission="marcas_delete">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingMarca(marca)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  {search ? 'Nenhuma marca encontrada com os critérios de busca.' : 'Nenhuma marca cadastrada.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Marca</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova marca.
            </DialogDescription>
          </DialogHeader>
          <MarcaForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMarca} onOpenChange={() => setEditingMarca(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Marca</DialogTitle>
            <DialogDescription>
              Altere os dados da marca conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingMarca && (
            <MarcaForm 
              initialData={editingMarca}
              onSubmit={handleUpdate} 
              onCancel={() => setEditingMarca(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingMarca} onOpenChange={() => setDeletingMarca(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a marca "{deletingMarca?.nome}"? 
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

export default MarcasPage
