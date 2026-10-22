import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
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
import { LocalizacaoForm } from '@/components/localizacao/LocalizacaoForm'
import type { Tables } from '@/types/database'


type Localizacao = Tables<'localizacao'>

const LocalizacaoPage = () => {
  const { data: localizacoes, loading, create, update, remove } = useSupabaseTable('localizacao')
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingLocalizacao, setEditingLocalizacao] = useState<Localizacao | null>(null)
  const [deletingLocalizacao, setDeletingLocalizacao] = useState<Localizacao | null>(null)

  const handleCreate = async (data: any) => {
    try {
      const result = await create(data)
      if (result && result.error === null) {
        setIsCreateDialogOpen(false)
      }
    } catch (error) {
      console.error('❌ Erro ao criar localização:', error)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingLocalizacao) return
    try {
      const result = await update(editingLocalizacao.id, data)
      if (result && result.error === null) {
        setEditingLocalizacao(null)
      }
    } catch (error) {
      console.error('❌ Erro ao editar localização:', error)
    }
  }

  const handleDelete = async () => {
    if (!deletingLocalizacao) return
    try {
      const result = await remove(deletingLocalizacao.id)
      if (result && result.error === null) {
        setDeletingLocalizacao(null)
      }
    } catch (error) {
      console.error('❌ Erro ao excluir localização:', error)
    }
  }

  const formatLocation = (localizacao: Localizacao) => {
    const parts = []
    if (localizacao.predio) parts.push(`Prédio ${localizacao.predio}`)
    if (localizacao.andar) parts.push(`Andar ${localizacao.andar}`)
    if (localizacao.sala) parts.push(`Sala ${localizacao.sala}`)
    return parts.length > 0 ? parts.join(' - ') : null
  }

  const colunas: ColunaDataTable<Localizacao>[] = [
    { id: 'codigo', cabecalho: 'Código', valor: linha => linha.codigo || '', largura: 100, nowrap: true, fixa: true },
    { id: 'nome', cabecalho: 'Nome', valor: linha => linha.nome || '', larguraMax: 260, fixa: true },
    { id: 'localizacao', cabecalho: 'Localização', valor: linha => formatLocation(linha) || '-', larguraMax: 240 },
    { id: 'posicao', cabecalho: 'Posição', prioridade: 'baixa', valor: linha => linha.posicao_x !== null && linha.posicao_y !== null ? `X: ${linha.posicao_x}, Y: ${linha.posicao_y}` : '-', nowrap: true },
    { id: 'status', cabecalho: 'Status', valor: linha => linha.ativo ? 'Ativo' : 'Inativo', largura: 100, fixa: true,
      celula: linha => <Badge variant={linha.ativo ? 'default' : 'secondary'}>{linha.ativo ? 'Ativo' : 'Inativo'}</Badge> },
    { id: 'acoes', cabecalho: 'Ações', valor: () => '', largura: 88, fixa: true,
      celula: linha => <div className="flex gap-1"><Button variant="ghost" size="icon" title="Editar" onClick={() => setEditingLocalizacao(linha)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeletingLocalizacao(linha)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div> },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader titulo="Cadastro de Localização" descricao="Organize os locais de armazenamento." migalhas={[{ label: 'Início', href: '/dashboard' }, { label: 'Cadastro de Localização' }]} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader titulo="Cadastro de Localização" descricao="Organize os locais de armazenamento." migalhas={[{ label: 'Início', href: '/dashboard' }, { label: 'Cadastro de Localização' }]} acoes={
        <Button onClick={() => setIsCreateDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Nova Localização</Button>
      } />
      <DataTable dados={localizacoes || []} colunas={colunas} idLinha={linha => linha.id} chaveUrl="cadastro-localizacao" placeholderBusca="Buscar localização…" />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Localização</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova localização.
            </DialogDescription>
          </DialogHeader>
          <LocalizacaoForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingLocalizacao} onOpenChange={() => setEditingLocalizacao(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Localização</DialogTitle>
            <DialogDescription>
              Altere os dados da localização conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingLocalizacao && (
            <LocalizacaoForm 
              initialData={editingLocalizacao}
              onSubmit={handleUpdate} 
              onCancel={() => setEditingLocalizacao(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingLocalizacao} onOpenChange={() => setDeletingLocalizacao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a localização "{deletingLocalizacao?.codigo} - {deletingLocalizacao?.nome}"? 
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

export default LocalizacaoPage
