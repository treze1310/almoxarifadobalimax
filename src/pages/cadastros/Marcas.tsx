import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { PlusCircle, Edit, Trash2, Tag } from 'lucide-react'
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
import { MarcaForm } from '@/components/marcas/MarcaForm'
import type { Tables } from '@/types/database'


type Marca = Tables<'marcas'>

const MarcasPage = () => {
  const { data: marcas, loading, create, update, remove } = useSupabaseTable('marcas', { order: { column: 'nome' } })
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null)
  const [deletingMarca, setDeletingMarca] = useState<Marca | null>(null)


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
      <div className="space-y-6">
        <PageHeader
          titulo="Marcas"
          descricao="Marcas de materiais e equipamentos."
          migalhas={[{ label: 'Cadastros' }, { label: 'Marcas' }]}
        />
        <TableSkeleton colunas={3} />
      </div>
    )
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'nome',
      cabecalho: 'Marca',
      fixa: true,
      semFiltro: true,
      valor: (m) => m.nome ?? '',
      celula: (m) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{m.nome}</span>
        </div>
      ),
    },
    {
      id: 'descricao',
      cabecalho: 'Descrição',
      semFiltro: true,
      valor: (m) => m.descricao || '—',
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (m) => (m.ativo ? 'Ativo' : 'Inativo'),
      celula: (m) => <StatusBadge status={m.ativo ? 'ativo' : 'inativo'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Marcas"
        descricao="Marcas de materiais e equipamentos."
        migalhas={[{ label: 'Cadastros' }, { label: 'Marcas' }]}
        acoes={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova marca
          </Button>
        }
      />

      <DataTable
        dados={marcas}
        colunas={colunas}
        idLinha={(m) => m.id}
        chaveUrl="marcas"
        placeholderBusca="Buscar por nome ou descrição..."
        nomeArquivoCsv="marcas"
        acoesLinha={(marca) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => setEditingMarca(marca)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => setDeletingMarca(marca)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhuma marca cadastrada"
            icone={Tag}
            acao={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova marca
              </Button>
            }
          />
        }
      />

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
