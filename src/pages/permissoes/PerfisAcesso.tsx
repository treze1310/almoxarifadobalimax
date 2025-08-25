import React, { useState } from 'react'
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
import { 
  PlusCircle, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Search, 
  Eye, 
  Copy, 
  Shield,
  ShieldCheck,
  ShieldOff
} from 'lucide-react'
import { PerfilCreateDialog } from '@/components/perfis/PerfilCreateDialog'
import { PerfilEditDialog } from '@/components/perfis/PerfilEditDialog'
import { PerfilDetailsDialog } from '@/components/perfis/PerfilDetailsDialog'
import { usePerfisAcesso } from '@/hooks/usePerfisAcesso'
import { useAuth } from '@/contexts/AuthContext'
import { PerfilAcesso, PerfilFormData } from '@/types/perfil'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PerfisAcessoPage = () => {
  const { hasPermission } = useAuth()
  const { 
    perfis, 
    loading, 
    createPerfil, 
    updatePerfil, 
    deletePerfil,
    togglePerfilStatus,
    duplicatePerfil
  } = usePerfisAcesso()
  
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPerfil, setEditingPerfil] = useState<PerfilAcesso | null>(null)
  const [viewingPerfil, setViewingPerfil] = useState<PerfilAcesso | null>(null)
  const [deletingPerfil, setDeletingPerfil] = useState<PerfilAcesso | null>(null)

  // Verificar permissões
  if (!hasPermission('usuarios_view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar perfis de acesso.</p>
        </div>
      </div>
    )
  }

  const filteredPerfis = perfis.filter(perfil => {
    const matchesSearch = search === '' ||
      perfil.nome.toLowerCase().includes(search.toLowerCase()) ||
      (perfil.descricao && perfil.descricao.toLowerCase().includes(search.toLowerCase()))
    
    const matchesActive = showInactive || perfil.ativo
    
    return matchesSearch && matchesActive
  })

  const handleCreate = async (data: PerfilFormData) => {
    const result = await createPerfil(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdate = async (data: PerfilFormData) => {
    if (!editingPerfil) return
    const result = await updatePerfil(editingPerfil.id, data)
    if (result.error === null) {
      setEditingPerfil(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingPerfil) return
    const result = await deletePerfil(deletingPerfil.id)
    if (result.error === null) {
      setDeletingPerfil(null)
    }
  }

  const handleToggleStatus = async (perfil: PerfilAcesso) => {
    await togglePerfilStatus(perfil.id, !perfil.ativo)
  }

  const handleDuplicate = async (perfil: PerfilAcesso) => {
    const novoNome = `${perfil.nome} - Cópia`
    await duplicatePerfil(perfil.id, novoNome)
  }

  const formatLastUpdate = (updateDate: string) => {
    try {
      return formatDistanceToNow(new Date(updateDate), { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return 'Data inválida'
    }
  }

  const getPermissionCount = (perfil: PerfilAcesso) => {
    let count = 0
    Object.values(perfil.permissoes).forEach(modulePermissions => {
      if (typeof modulePermissions === 'object' && modulePermissions !== null) {
        Object.values(modulePermissions).forEach(permission => {
          if (permission === true) count++
        })
      }
    })
    return count
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Perfis de Acesso</h1>
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
        <h1 className="text-2xl font-bold">Perfis de Acesso</h1>
        {hasPermission('usuarios_create') && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Perfil
          </Button>
        )}
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
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showInactive" className="text-sm text-muted-foreground cursor-pointer">
            Mostrar inativos
          </label>
        </div>
        <Badge variant="secondary">
          {filteredPerfis.length} perfil{filteredPerfis.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Última Atualização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPerfis.length > 0 ? (
              filteredPerfis.map((perfil) => (
                <TableRow key={perfil.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{perfil.nome}</div>
                      {perfil.descricao && (
                        <div className="text-sm text-muted-foreground">{perfil.descricao}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={perfil.sistema ? 'destructive' : 'outline'}>
                      {perfil.sistema ? (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          Sistema
                        </>
                      ) : (
                        'Personalizado'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getPermissionCount(perfil)} permissões
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatLastUpdate(perfil.updated_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={perfil.ativo ? 'default' : 'secondary'}>
                      {perfil.ativo ? (
                        <>
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <ShieldOff className="mr-1 h-3 w-3" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingPerfil(perfil)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        {hasPermission('usuarios_edit') && (
                          <DropdownMenuItem onClick={() => setEditingPerfil(perfil)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {hasPermission('usuarios_create') && (
                          <DropdownMenuItem onClick={() => handleDuplicate(perfil)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                        )}
                        {hasPermission('usuarios_edit') && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(perfil)}>
                            {perfil.ativo ? (
                              <>
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {hasPermission('usuarios_delete') && !perfil.sistema && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingPerfil(perfil)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {search ? 'Nenhum perfil encontrado com os critérios de busca.' : 'Nenhum perfil cadastrado.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para criar perfil */}
      <PerfilCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
      />

      {/* Dialog para editar perfil */}
      <PerfilEditDialog
        perfil={editingPerfil}
        open={!!editingPerfil}
        onOpenChange={(open) => !open && setEditingPerfil(null)}
        onSubmit={handleUpdate}
      />

      {/* Dialog para visualizar detalhes do perfil */}
      <PerfilDetailsDialog
        perfil={viewingPerfil}
        open={!!viewingPerfil}
        onOpenChange={(open) => !open && setViewingPerfil(null)}
      />

      {/* Dialog de confirmação para exclusão */}
      <AlertDialog open={!!deletingPerfil} onOpenChange={(open) => !open && setDeletingPerfil(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil <strong>{deletingPerfil?.nome}</strong>?
              Esta ação não pode ser desfeita e removerá todas as permissões associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPerfil(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PerfisAcessoPage
