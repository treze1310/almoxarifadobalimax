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
import { EmpresaForm } from '@/components/empresas/EmpresaForm'
import type { EmpresaFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'


export default function Empresas() {
  const { data: empresas, loading, fetchData: refetchEmpresas } = useSupabaseTable('empresas')
  const { toast } = useToast()
  
  // Estados para diálogos
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Tables<'empresas'> | null>(null)
  const [deletingEmpresa, setDeletingEmpresa] = useState<Tables<'empresas'> | null>(null)
  const [dialogPosition, setDialogPosition] = useState({ top: '50vh', left: '50vw' })
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Hooks para centralização inteligente dos diálogos
  const createDialogPosition = useCenteredDialog(isCreateDialogOpen)
  const editDialogPosition = useCenteredDialog(!!editingEmpresa)

  // Calcular posição central da viewport atual quando abre dialog de exclusão
  useEffect(() => {
    if (deletingEmpresa) {
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
  }, [deletingEmpresa])

  // Filtrar empresas
  const filteredEmpresas = useMemo(() => {
    if (!empresas) return []
    
    return empresas.filter((empresa) => {
      const matchesSearch = empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           empresa.cnpj?.includes(searchTerm) ||
                           false
      const matchesStatus = showInactive || empresa.ativo
      return matchesSearch && matchesStatus
    })
  }, [empresas, searchTerm, showInactive])

  // Handlers
  const handleCreate = async (data: EmpresaFormData) => {
    try {
      const { error } = await supabase
        .from('empresas')
        .insert([data])

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Empresa criada com sucesso!',
      })

      setIsCreateDialogOpen(false)
      refetchEmpresas()
    } catch (error) {
      console.error('Error creating empresa:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar empresa',
        variant: 'destructive',
      })
    }
  }

  const handleUpdate = async (data: EmpresaFormData) => {
    if (!editingEmpresa) return

    try {
      const { error } = await supabase
        .from('empresas')
        .update(data)
        .eq('id', editingEmpresa.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Empresa atualizada com sucesso!',
      })

      setEditingEmpresa(null)
      refetchEmpresas()
    } catch (error) {
      console.error('Error updating empresa:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar empresa',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deletingEmpresa) return

    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', deletingEmpresa.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Empresa excluída com sucesso!',
      })

      setDeletingEmpresa(null)
      refetchEmpresas()
    } catch (error) {
      console.error('Error deleting empresa:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir empresa',
        variant: 'destructive',
      })
    }
  }

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return ''
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastro de Empresas</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
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
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmpresas.map((empresa) => (
              <TableRow key={empresa.id}>
                <TableCell className="font-medium">{empresa.nome}</TableCell>
                <TableCell>{formatCNPJ(empresa.cnpj)}</TableCell>
                <TableCell>{empresa.email || '-'}</TableCell>
                <TableCell>{empresa.telefone || '-'}</TableCell>
                <TableCell>
                  <Badge variant={empresa.ativo ? "default" : "secondary"}>
                    {empresa.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEmpresa(empresa)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    
                    
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingEmpresa(empresa)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    
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
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova empresa.
            </DialogDescription>
          </DialogHeader>
          <EmpresaForm 
            onSubmit={handleCreate} 
            onCancel={() => setIsCreateDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edição */}
      <Dialog open={!!editingEmpresa} onOpenChange={() => setEditingEmpresa(null)}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto items-start fixed"
          style={{
            top: editDialogPosition.top,
            left: editDialogPosition.left,
            transform: editDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Altere os dados da empresa.
            </DialogDescription>
          </DialogHeader>
          {editingEmpresa && (
            <EmpresaForm
              initialData={editingEmpresa}
              onSubmit={handleUpdate}
              onCancel={() => setEditingEmpresa(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingEmpresa} onOpenChange={() => setDeletingEmpresa(null)}>
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
              Tem certeza que deseja excluir a empresa "{deletingEmpresa?.nome}"?
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
