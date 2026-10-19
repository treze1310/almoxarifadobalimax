import { useState, useMemo, useEffect, useCallback } from 'react'
import { PlusCircle, Pencil, Trash2, Landmark } from 'lucide-react'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { Button } from '@/components/ui/button'
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
import { CentroCustoForm } from '@/components/centros-custo/CentroCustoForm'
import type { CentroCustoFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'


export default function CentrosCusto() {
  const { data: centrosCusto, loading, fetchData: buscarCentrosCusto } = useSupabaseTable('centros_custo')

  /**
   * Mais recente primeiro pela **data da obra**, não pela data de cadastro:
   * uma carga em lote joga tudo para o topo de uma vez e embaralha a ordem.
   * Sem data vai para o fim, e o código desempata — ele carrega a data no
   * padrão do sistema anterior (2601131544 = 13/01/26).
   */
  const refetchCentrosCusto = useCallback(
    () =>
      buscarCentrosCusto({
        order: [
          { column: 'data', ascending: false, nullsFirst: false },
          { column: 'codigo', ascending: false },
        ],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    refetchCentrosCusto()
  }, [refetchCentrosCusto])
  const { data: empresas } = useSupabaseTable('empresas', { order: { column: 'nome' } })
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
  // A busca por texto é do DataTable; aqui fica só o recorte de ativos/inativos
  const filteredCentrosCusto = useMemo(
    () => (centrosCusto ?? []).filter((centro) => showInactive || centro.ativo),
    [centrosCusto, showInactive],
  )

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
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Centros de Custo"
          descricao="Centros de custo vinculados às empresas."
          migalhas={[{ label: 'Cadastros' }, { label: 'Centros de Custo' }]}
        />
        <TableSkeleton colunas={4} />
      </div>
    )
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'codigo',
      cabecalho: 'Código',
      fixa: true,
      semFiltro: true,
      valor: (c) => `${c.codigo ?? ''} ${c.descricao ?? ''}`.trim(),
      valorOrdenacao: (c) => c.codigo ?? '',
      celula: (c) => <span className="font-medium">{c.codigo}</span>,
    },
    {
      id: 'descricao',
      cabecalho: 'Descrição',
      semFiltro: true,
      valor: (c) => c.descricao || '—',
    },
    {
      id: 'empresa',
      cabecalho: 'Empresa',
      valor: (c) => empresas?.find((e) => e.id === c.empresa_id)?.nome || '—',
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (c) => (c.ativo ? 'Ativo' : 'Inativo'),
      celula: (c) => <StatusBadge status={c.ativo ? 'ativo' : 'inativo'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Centros de Custo"
        descricao="Centros de custo vinculados às empresas."
        migalhas={[{ label: 'Cadastros' }, { label: 'Centros de Custo' }]}
        acoes={
          <>
            <Button
              variant={showInactive ? 'default' : 'outline'}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Mostrar apenas ativos' : 'Mostrar inativos'}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo centro de custo
            </Button>
          </>
        }
      />

      <DataTable
        dados={filteredCentrosCusto}
        colunas={colunas}
        idLinha={(c) => c.id}
        chaveUrl="cc"
        placeholderBusca="Buscar por código ou descrição..."
        nomeArquivoCsv="centros-de-custo"
        acoesLinha={(centro) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => setEditingCentroCusto(centro)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => setDeletingCentroCusto(centro)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhum centro de custo cadastrado"
            icone={Landmark}
            acao={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo centro de custo
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
