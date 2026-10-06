import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { PlusCircle, Map, Edit, Trash2, Tag } from 'lucide-react'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import { supabase } from '@/lib/supabase'
import { LocalizacaoForm } from '@/components/localizacao/LocalizacaoForm'
import type { Tables } from '@/types/database'

type Localizacao = Tables<'localizacao'>

const LocalizacaoPage = () => {
  const { data: localizacoes, loading, update, remove } = useSupabaseTable('localizacao')
  const [search, setSearch] = useState('')
  const [editingLocalizacao, setEditingLocalizacao] = useState<Localizacao | null>(null)
  const [deletingLocalizacao, setDeletingLocalizacao] = useState<Localizacao | null>(null)
  const [itensCadastrados, setItensCadastrados] = useState<Record<string, number>>({})

  // Hook para centralização inteligente do dialog de edição (funciona com zoom)
  const editDialogPosition = useCenteredDialog(!!editingLocalizacao)

  // Forçar reposicionamento do diálogo para lidar com zoom e scroll
  useEffect(() => {
    if (editingLocalizacao) {
      // Pequeno delay para permitir que o DOM se atualize
      setTimeout(() => {
        const editDialog = document.querySelector('[aria-describedby]')
        if (editDialog && editDialog instanceof HTMLElement) {
          const viewportHeight = window.innerHeight
          const viewportWidth = window.innerWidth
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
          
          const centerY = scrollTop + (viewportHeight / 2)
          const centerX = scrollLeft + (viewportWidth / 2)
          
          editDialog.style.position = 'fixed'
          editDialog.style.top = `${centerY}px`
          editDialog.style.left = `${centerX}px`
          editDialog.style.transform = 'translate(-50%, -50%)'
          editDialog.style.zIndex = '9999'
        }
      }, 50)
    }
  }, [editingLocalizacao])

  // Buscar contagem real de materiais e equipamentos por localização
  useEffect(() => {
    const fetchItemCounts = async () => {
      if (localizacoes.length > 0) {
        try {
          // Buscar contagem usando função SQL otimizada
          const { data: contagens, error } = await supabase
            .rpc('get_materiais_count_by_localizacao')
          
          if (error) {
            throw error
          }

          // Inicializar todas as localizações com 0
          const counts: Record<string, number> = {}
          localizacoes.forEach(loc => {
            counts[loc.id] = 0
          })
          
          // Aplicar contagens reais retornadas pela função
          contagens?.forEach((item: { localizacao_id: string; count: number }) => {
            if (item.localizacao_id && Object.prototype.hasOwnProperty.call(counts, item.localizacao_id)) {
              counts[item.localizacao_id] = Number(item.count)
            }
          })
          
          setItensCadastrados(counts)
        } catch (error) {
          console.error('Erro ao buscar contagem de itens:', error)
          
          // Fallback: inicializar com zeros em caso de erro
          const fallbackCounts: Record<string, number> = {}
          localizacoes.forEach(loc => {
            fallbackCounts[loc.id] = 0
          })
          setItensCadastrados(fallbackCounts)
        }
      }
    }
    
    fetchItemCounts()
  }, [localizacoes])



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

  const handleGenerateLabel = (localizacao: Localizacao) => {
    // Implementar geração de etiqueta (QR Code, código de barras, etc.)
    const labelContent = `${localizacao.codigo}\n${localizacao.nome}`
    
    // Criar elemento para impressão
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta - ${localizacao.codigo}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .label { border: 2px solid #000; padding: 10px; width: 200px; text-align: center; }
              .code { font-weight: bold; font-size: 18px; }
              .name { font-size: 12px; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="code">${localizacao.codigo}</div>
              <div class="name">${localizacao.nome}</div>
              ${localizacao.descricao ? `<div style="font-size: 10px; margin-top: 5px;">${localizacao.descricao}</div>` : ''}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const formatLocation = (localizacao: Localizacao) => {
    const parts = []
    if (localizacao.predio) parts.push(`Prédio ${localizacao.predio}`)
    if (localizacao.andar) parts.push(`Andar ${localizacao.andar}`)
    if (localizacao.sala) parts.push(`Sala ${localizacao.sala}`)
    return parts.length > 0 ? parts.join(' - ') : localizacao.descricao || ''
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Localização"
          descricao="Posições físicas do almoxarifado e itens armazenados."
          migalhas={[{ label: 'Operação' }, { label: 'Localização' }]}
        />
        <TableSkeleton colunas={5} />
      </div>
    )
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'codigo',
      cabecalho: 'Código',
      fixa: true,
      semFiltro: true,
      valor: (l) => `${l.codigo ?? ''} ${l.nome ?? ''} ${l.descricao ?? ''}`.trim(),
      valorOrdenacao: (l) => l.codigo ?? '',
      celula: (l) => <span className="font-medium">{l.codigo}</span>,
    },
    {
      id: 'nome',
      cabecalho: 'Nome',
      semFiltro: true,
      valor: (l) => l.nome ?? '—',
      celula: (l) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{l.nome}</div>
          {l.descricao && (
            <div className="truncate text-xs text-muted-foreground" title={l.descricao}>
              {l.descricao}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'posicao',
      cabecalho: 'Posição',
      valor: (l) => formatLocation(l) || '—',
    },
    {
      id: 'itens',
      cabecalho: 'Itens',
      semFiltro: true,
      alinhamento: 'right',
      valor: (l) => String(itensCadastrados[l.id] || 0),
      valorOrdenacao: (l) => itensCadastrados[l.id] || 0,
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (l) => (l.ativo ? 'Ativo' : 'Inativo'),
      celula: (l) => <StatusBadge status={l.ativo ? 'ativo' : 'inativo'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Localização"
        descricao="Posições físicas do almoxarifado e itens armazenados."
        migalhas={[{ label: 'Operação' }, { label: 'Localização' }]}
        acoes={
          <>
            <Button asChild variant="outline">
              <Link to="/localizacao/mapa">
                <Map className="mr-2 h-4 w-4" />
                Ver mapa
              </Link>
            </Button>
            <Button asChild>
              <Link to="/cadastros/localizacao">
                <PlusCircle className="mr-2 h-4 w-4" />
                Gerenciar localizações
              </Link>
            </Button>
          </>
        }
      />

      <DataTable
        dados={localizacoes ?? []}
        colunas={colunas}
        idLinha={(l) => l.id}
        chaveUrl="loc"
        placeholderBusca="Buscar por código, nome ou descrição..."
        nomeArquivoCsv="localizacoes"
        acoesLinha={(localizacao) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => setEditingLocalizacao(localizacao)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => setDeletingLocalizacao(localizacao)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhuma localização cadastrada"
            descricao="Cadastre as posições do almoxarifado para localizar os materiais."
            icone={Tag}
          />
        }
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingLocalizacao} onOpenChange={() => setEditingLocalizacao(null)}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto fixed"
          style={{
            top: editDialogPosition.top,
            left: editDialogPosition.left,
            transform: editDialogPosition.transform
          }}
        >
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
        <AlertDialogContent className="z-[10000]">
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
