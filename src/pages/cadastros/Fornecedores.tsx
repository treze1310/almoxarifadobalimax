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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, Building2, User } from 'lucide-react'
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
import { FornecedorForm } from '@/components/fornecedores/FornecedorForm'
import type { Tables } from '@/types/database'
import { PermissionGuard } from '@/components/PermissionGuard'

type Fornecedor = Tables<'fornecedores'>

const FornecedoresPage = () => {
  const { data: fornecedores, loading, create, update, remove } = useSupabaseTable('fornecedores')
  
  const [search, setSearch] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [deletingFornecedor, setDeletingFornecedor] = useState<Fornecedor | null>(null)

  const filteredFornecedores = fornecedores.filter(fornecedor =>
    fornecedor.nome.toLowerCase().includes(search.toLowerCase()) ||
    (fornecedor.cnpj && fornecedor.cnpj.includes(search.replace(/\D/g, ''))) ||
    (fornecedor.cpf && fornecedor.cpf.includes(search.replace(/\D/g, ''))) ||
    (fornecedor.email && fornecedor.email.toLowerCase().includes(search.toLowerCase())) ||
    (fornecedor.contato && fornecedor.contato.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = async (data: any) => {
    const result = await create(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingFornecedor) return
    const result = await update(editingFornecedor.id, data)
    if (result.error === null) {
      setEditingFornecedor(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingFornecedor) return
    const result = await remove(deletingFornecedor.id)
    if (result.error === null) {
      setDeletingFornecedor(null)
    }
  }

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return null
    const numbers = cnpj.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return null
    const numbers = cpf.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return null
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cadastro de Fornecedores</h1>
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
        <h1 className="text-2xl font-bold">Cadastro de Fornecedores</h1>
        <PermissionGuard permission="fornecedores_create">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ/CPF ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">
          {filteredFornecedores.length} fornecedor{filteredFornecedores.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFornecedores.length > 0 ? (
              filteredFornecedores.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {fornecedor.cnpj ? (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{fornecedor.nome}</div>
                        {fornecedor.contato && (
                          <div className="text-sm text-muted-foreground">{fornecedor.contato}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {fornecedor.cnpj ? (
                      <div>
                        <div className="font-medium">CNPJ</div>
                        <div className="text-sm">{formatCNPJ(fornecedor.cnpj)}</div>
                      </div>
                    ) : fornecedor.cpf ? (
                      <div>
                        <div className="font-medium">CPF</div>
                        <div className="text-sm">{formatCPF(fornecedor.cpf)}</div>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {fornecedor.telefone ? formatPhone(fornecedor.telefone) : '-'}
                  </TableCell>
                  <TableCell>{fornecedor.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={fornecedor.ativo ? 'default' : 'secondary'}>
                      {fornecedor.ativo ? 'Ativo' : 'Inativo'}
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
                        <PermissionGuard permission="fornecedores_edit">
                          <DropdownMenuItem onClick={() => setEditingFornecedor(fornecedor)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <PermissionGuard permission="fornecedores_delete">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingFornecedor(fornecedor)}
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
                <TableCell colSpan={6} className="text-center">
                  {search ? 'Nenhum fornecedor encontrado com os critérios de busca.' : 'Nenhum fornecedor cadastrado.'}
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
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo fornecedor.
            </DialogDescription>
          </DialogHeader>
          <FornecedorForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingFornecedor} onOpenChange={() => setEditingFornecedor(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Altere os dados do fornecedor conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingFornecedor && (
            <FornecedorForm 
              initialData={editingFornecedor}
              onSubmit={handleUpdate} 
              onCancel={() => setEditingFornecedor(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingFornecedor} onOpenChange={() => setDeletingFornecedor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor "{deletingFornecedor?.nome}"? 
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

export default FornecedoresPage
