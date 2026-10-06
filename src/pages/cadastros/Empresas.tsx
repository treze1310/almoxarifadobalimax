import { useState, useMemo, useEffect } from 'react'
import { Building2, Edit, PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatarCNPJ, formatarTelefone } from '@/lib/dadosPessoais'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  // A busca por texto é do DataTable; aqui fica só o recorte de ativos/inativos
  const filteredEmpresas = useMemo(
    () => (empresas ?? []).filter((empresa) => showInactive || empresa.ativo),
    [empresas, showInactive],
  )

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
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Empresas"
          descricao="Empresas do grupo e seus dados fiscais."
          migalhas={[{ label: 'Cadastros' }, { label: 'Empresas' }]}
        />
        <TableSkeleton colunas={4} />
      </div>
    )
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'nome',
      cabecalho: 'Empresa',
      fixa: true,
      semFiltro: true,
      valor: (e) => `${e.nome ?? ''} ${e.cnpj ?? ''}`.trim(),
      valorOrdenacao: (e) => e.nome ?? '',
      celula: (e) => <span className="font-medium">{e.nome}</span>,
    },
    {
      id: 'cnpj',
      cabecalho: 'CNPJ',
      semFiltro: true,
      valor: (e) => formatarCNPJ(e.cnpj),
    },
    {
      id: 'contato',
      cabecalho: 'Contato',
      semFiltro: true,
      valor: (e) => e.email || '—',
      celula: (e) => (
        <div className="space-y-0.5">
          {e.email && <div className="truncate">{e.email}</div>}
          {e.telefone && (
            <div className="text-xs text-muted-foreground">{formatarTelefone(e.telefone)}</div>
          )}
          {!e.email && !e.telefone && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (e) => (e.ativo ? 'Ativo' : 'Inativo'),
      celula: (e) => <StatusBadge status={e.ativo ? 'ativo' : 'inativo'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Empresas"
        descricao="Empresas do grupo e seus dados fiscais."
        migalhas={[{ label: 'Cadastros' }, { label: 'Empresas' }]}
        acoes={
          <>
            <Button
              variant={showInactive ? 'default' : 'outline'}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Mostrar apenas ativas' : 'Mostrar inativas'}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova empresa
            </Button>
          </>
        }
      />

      <DataTable
        dados={filteredEmpresas}
        colunas={colunas}
        idLinha={(e) => e.id}
        chaveUrl="emp"
        placeholderBusca="Buscar por nome ou CNPJ..."
        nomeArquivoCsv="empresas"
        acoesLinha={(empresa) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => setEditingEmpresa(empresa)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => setDeletingEmpresa(empresa)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhuma empresa cadastrada"
            icone={Building2}
            acao={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova empresa
              </Button>
            }
          />
        }
      />

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
