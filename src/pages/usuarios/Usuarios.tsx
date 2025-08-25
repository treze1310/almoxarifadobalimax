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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, UserCheck, UserX, Eye, KeyRound } from 'lucide-react'
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
import { UsuarioCreateDialog } from '@/components/usuarios/UsuarioCreateDialog'
import { UsuarioEditDialog } from '@/components/usuarios/UsuarioEditDialog'
import { UsuarioDetailsDialog } from '@/components/usuarios/UsuarioDetailsDialog'
import { CreateAuthDialog } from '@/components/usuarios/CreateAuthDialog'
import { useUsuarios } from '@/hooks/useUsuarios'
import { useAuth } from '@/contexts/AuthContext'
import { User, PROFILE_LABELS } from '@/types/auth'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const UsuariosPage = () => {
  const { hasPermission } = useAuth()
  const { 
    usuarios, 
    loading, 
    createUsuario, 
    updateUsuario, 
    deleteUsuario,
    toggleUsuarioStatus,
    createAuthForUser
  } = useUsuarios()
  
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<User | null>(null)
  const [deletingUsuario, setDeletingUsuario] = useState<User | null>(null)
  const [viewingUsuario, setViewingUsuario] = useState<User | null>(null)
  const [creatingAuthUsuario, setCreatingAuthUsuario] = useState<User | null>(null)

  // Verificar permissões
  if (!hasPermission('usuarios_view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar usuários.</p>
        </div>
      </div>
    )
  }

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = search === '' ||
      usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
      usuario.email.toLowerCase().includes(search.toLowerCase()) ||
      PROFILE_LABELS[usuario.perfil].toLowerCase().includes(search.toLowerCase())
    
    const matchesActive = showInactive || usuario.ativo
    
    return matchesSearch && matchesActive
  })

  const handleCreate = async (data: any) => {
    const result = await createUsuario(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingUsuario) return
    const result = await updateUsuario(editingUsuario.id, data)
    if (result.error === null) {
      setEditingUsuario(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingUsuario) return
    const result = await deleteUsuario(deletingUsuario.id)
    if (result.error === null) {
      setDeletingUsuario(null)
    }
  }

  const handleToggleStatus = async (usuario: User) => {
    await toggleUsuarioStatus(usuario.id, !usuario.ativo)
  }

  const handleCreateAuth = async (userId: string, password: string) => {
    const result = await createAuthForUser(userId, password)
    return result
  }

  const getProfileColor = (perfil: string) => {
    switch (perfil) {
      case 'administrador': return 'destructive'
      case 'almoxarife': return 'default'
      case 'supervisor': return 'secondary'
      case 'solicitante': return 'outline'
      case 'visualizador': return 'secondary'
      default: return 'secondary'
    }
  }

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return 'Nunca'
    try {
      return formatDistanceToNow(new Date(lastAccess), { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return 'Data inválida'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Usuários</h1>
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
        <h1 className="text-2xl font-bold">Usuários</h1>
        {hasPermission('usuarios_create') && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou perfil..."
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
          {filteredUsuarios.length} usuário{filteredUsuarios.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsuarios.length > 0 ? (
              filteredUsuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{usuario.nome}</div>
                      <div className="text-sm text-muted-foreground">{usuario.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {(usuario as any).perfil_personalizado ? (
                        <>
                          <Badge variant="default">
                            {(usuario as any).perfil_personalizado.nome}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            Perfil personalizado
                          </div>
                        </>
                      ) : (
                        <>
                          <Badge variant={getProfileColor(usuario.perfil)}>
                            {PROFILE_LABELS[usuario.perfil]}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            Perfil padrão
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(usuario as any).centros_custo ? (
                      <div className="text-sm">
                        <div>{(usuario as any).centros_custo.codigo}</div>
                        <div className="text-muted-foreground">
                          {(usuario as any).centros_custo.descricao}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Não definido</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatLastAccess(usuario.ultimo_acesso)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {usuario.auth_user_id ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Login habilitado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Sem login
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingUsuario(usuario)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        {hasPermission('usuarios_edit') && !usuario.auth_user_id && (
                          <DropdownMenuItem onClick={() => setCreatingAuthUsuario(usuario)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Criar Credenciais
                          </DropdownMenuItem>
                        )}
                        {hasPermission('usuarios_edit') && (
                          <DropdownMenuItem onClick={() => setEditingUsuario(usuario)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {hasPermission('usuarios_edit') && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(usuario)}>
                            {usuario.ativo ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {hasPermission('usuarios_delete') && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletingUsuario(usuario)}
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
                  {search ? 'Nenhum usuário encontrado com os critérios de busca.' : 'Nenhum usuário cadastrado.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para criar usuário */}
      <UsuarioCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
      />

      {/* Dialog para editar usuário */}
      <UsuarioEditDialog
        usuario={editingUsuario}
        open={!!editingUsuario}
        onOpenChange={(open) => !open && setEditingUsuario(null)}
        onSubmit={handleUpdate}
      />

      {/* Dialog para visualizar detalhes do usuário */}
      <UsuarioDetailsDialog
        usuario={viewingUsuario}
        open={!!viewingUsuario}
        onOpenChange={(open) => !open && setViewingUsuario(null)}
      />

      {/* Dialog de confirmação para exclusão */}
      <AlertDialog open={!!deletingUsuario} onOpenChange={(open) => !open && setDeletingUsuario(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deletingUsuario?.nome}</strong>?
              Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingUsuario(null)}>
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

      {/* Dialog para criar credenciais de autenticação */}
      <CreateAuthDialog
        usuario={creatingAuthUsuario}
        open={!!creatingAuthUsuario}
        onOpenChange={(open) => !open && setCreatingAuthUsuario(null)}
        onSubmit={handleCreateAuth}
      />
    </div>
  )
}

export default UsuariosPage
