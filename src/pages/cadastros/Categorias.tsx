import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { PlusCircle, Edit, Trash2, Layers } from 'lucide-react'
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
import { useSupabaseTable } from '@/hooks/useSupabase'
import { CategoriaForm } from '@/components/categorias/CategoriaForm'
import type { Tables } from '@/types/database'

type Categoria = Tables<'categorias'>

const CategoriasPage = () => {
  const { data: categorias, loading, create, update, remove } = useSupabaseTable('categorias', { order: { column: 'nome' } })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [deletingCategoria, setDeletingCategoria] = useState<Categoria | null>(null)


  const handleCreate = async (data: any) => {
    const result = await create(data)
    if (result.error === null) setIsCreateDialogOpen(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editingCategoria) return
    const result = await update(editingCategoria.id, data)
    if (result.error === null) setEditingCategoria(null)
  }

  const handleDelete = async () => {
    if (!deletingCategoria) return
    const result = await remove(deletingCategoria.id)
    if (result.error === null) setDeletingCategoria(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Categorias"
          descricao="Categorias de materiais e equipamentos."
          migalhas={[{ label: 'Cadastros' }, { label: 'Categorias' }]}
        />
        <TableSkeleton colunas={4} />
      </div>
    )
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'nome',
      cabecalho: 'Categoria',
      fixa: true,
      semFiltro: true,
      valor: (c) => c.nome ?? '',
      celula: (c) => <span className="font-medium">{c.nome}</span>,
    },
    {
      id: 'descricao',
      cabecalho: 'Descrição',
      semFiltro: true,
      valor: (c) => c.descricao || '—',
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
        titulo="Categorias"
        descricao="Categorias de materiais e equipamentos."
        migalhas={[{ label: 'Cadastros' }, { label: 'Categorias' }]}
        acoes={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova categoria
          </Button>
        }
      />

      <DataTable
        dados={categorias}
        colunas={colunas}
        idLinha={(r) => r.id}
        chaveUrl="categorias"
        placeholderBusca="Buscar por nome ou descrição..."
        nomeArquivoCsv="categorias"
        acoesLinha={(registro) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => setEditingCategoria(registro)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => setDeletingCategoria(registro)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nada cadastrado ainda"
            icone={Layers}
            acao={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova categoria
              </Button>
            }
          />
        }
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova categoria.
            </DialogDescription>
          </DialogHeader>
          <CategoriaForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategoria} onOpenChange={() => setEditingCategoria(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>Altere os dados da categoria conforme necessário.</DialogDescription>
          </DialogHeader>
          {editingCategoria && (
            <CategoriaForm
              initialData={editingCategoria}
              onSubmit={handleUpdate}
              onCancel={() => setEditingCategoria(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingCategoria} onOpenChange={() => setDeletingCategoria(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deletingCategoria?.nome}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default CategoriasPage
