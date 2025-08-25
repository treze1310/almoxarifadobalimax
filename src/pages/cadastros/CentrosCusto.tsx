import { useState, useMemo, useEffect } from 'react'
import { Search, PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useToast } from '@/components/ui/use-toast'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import type { Tables } from '@/types/database'
import { CentroCustoForm } from '@/components/centros-custo/CentroCustoForm'
import type { CentroCustoFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { PermissionGuard } from '@/components/PermissionGuard'

export default function CentrosCusto() {
  const { data: centrosCusto, loading, fetchData: refetchCentrosCusto } = useSupabaseTable('centros_custo')
  const { data: empresas } = useSupabaseTable('empresas')
  const { toast } = useToast()
  
  // Estados para diálogos
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCentroCusto, setEditingCentroCusto] = useState<Tables<'centros_custo'> | null>(null)
  const [deletingCentroCusto, setDeletingCentroCusto] = useState<Tables<'centros_custo'> | null>(null)
  const [dialogPosition, setDialogPosition] = useState({ top: '50vh', left: '50vw' })
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Hooks para centralização inteligente dos diálogos
  const createDialogPosition = useCenteredDialog(isCreateDialogOpen)
  const editDialogPosition = useCenteredDialog(!!editingCentroCusto)

  // Calcular posição central da viewport atual quando abre dialog de exclusão
  useEffect(() => {
    if (deletingCentroCusto) {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      const centerY = scrollTop + (viewportHeight / 2)
      const centerX = scrollLeft + (viewportWidth / 2)
      
      setDialogPosition({
        top: `${centerY}px`,
        left: `${centerX}px`
      })
    }
  }, [deletingCentroCusto])

  // Filtrar centros de custo
  const filteredCentrosCusto = useMemo(() => {
    if (!centrosCusto) return []
    
    return centrosCusto.filter((centro) => {
      const matchesSearch = centro.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           centro.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = showInactive || centro.ativo
      return matchesSearch && matchesStatus
    })
  }, [centrosCusto, searchTerm, showInactive])

  // Handlers
  const handleCreate = async (data: CentroCustoFormData) => {
    try {
      const { error } = await supabase
        .from('centros_custo')
        .insert([data])

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Centro de Custo criado com sucesso!',
      })

      setIsCreateDialogOpen(false)
      refetchCentrosCusto()
    } catch (error) {
      console.error('Error creating centro custo:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar centro de custo',
        variant: 'destructive',
      })
    }
  }

  const handleUpdate = async (data: CentroCustoFormData) => {
    if (!editingCentroCusto) return

    try {
      const { error } = await supabase
        .from('centros_custo')
        .update(data)
        .eq('id', editingCentroCusto.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Centro de Custo atualizado com sucesso!',
      })

      setEditingCentroCusto(null)
      refetchCentrosCusto()
    } catch (error) {
      console.error('Error updating centro custo:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar centro de custo',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deletingCentroCusto) return

    try {
      const { error } = await supabase
        .from('centros_custo')
        .delete()
        .eq('id', deletingCentroCusto.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Centro de Custo excluído com sucesso!',
      })

      setDeletingCentroCusto(null)
      refetchCentrosCusto()
    } catch (error) {
      console.error('Error deleting centro custo:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir centro de custo',
        variant: 'destructive',
      })
    }
  }

  // Função para buscar nome da empresa
  const getEmpresaNome = (empresaId: string) => {
    const empresa = empresas?.find(e => e.id === empresaId)
    return empresa?.nome || 'N/A'
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastro de Centros de Custo</h1>
        <PermissionGuard permission="centros_custo_create">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Centro de Custo
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant={showInactive ? "default" : "outline"}
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Mostrar Apenas Ativos" : "Mostrar Inativos"}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCentrosCusto.map((centro) => (
              <TableRow key={centro.id}>
                <TableCell className="font-mono">{centro.codigo}</TableCell>
                <TableCell>{centro.descricao}</TableCell>
                <TableCell>{getEmpresaNome(centro.empresa_id)}</TableCell>
                <TableCell>
                  <Badge variant={centro.ativo ? "default" : "secondary"}>
                    {centro.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <PermissionGuard permission="centros_custo_edit">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCentroCusto(centro)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="centros_custo_delete">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingCentroCusto(centro)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de Criação */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto items-start fixed"
          style={{
            top: createDialogPosition.top,
            left: createDialogPosition.left,
            transform: createDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle>Novo Centro de Custo</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo centro de custo.
            </DialogDescription>
          </DialogHeader>
          <CentroCustoForm 
            onSubmit={handleCreate} 
            onCancel={() => setIsCreateDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edição */}
      <Dialog open={!!editingCentroCusto} onOpenChange={() => setEditingCentroCusto(null)}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto items-start fixed"
          style={{
            top: editDialogPosition.top,
            left: editDialogPosition.left,
            transform: editDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle>Editar Centro de Custo</DialogTitle>
            <DialogDescription>
              Altere os dados do centro de custo.
            </DialogDescription>
          </DialogHeader>
          {editingCentroCusto && (
            <CentroCustoForm
              initialData={editingCentroCusto}
              onSubmit={handleUpdate}
              onCancel={() => setEditingCentroCusto(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingCentroCusto} onOpenChange={() => setDeletingCentroCusto(null)}>
        <AlertDialogContent 
          className="sm:max-w-[425px]"
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 9999,
            width: 'min(95vw, 425px)'
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o centro de custo "{deletingCentroCusto?.codigo} - {deletingCentroCusto?.descricao}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}