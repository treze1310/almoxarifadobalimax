import { useState, useEffect } from 'react'
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
import { MoreHorizontal, PlusCircle, Map, Edit, Trash2, Tag, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { LocalizacaoForm } from '@/components/localizacao/LocalizacaoForm'
import type { Tables } from '@/types/database'

type Localizacao = Tables<'localizacao'>

const LocalizacaoPage = () => {
  const { data: localizacoes, loading, update, remove } = useSupabaseTable('localizacao')
  const [search, setSearch] = useState('')
  const [editingLocalizacao, setEditingLocalizacao] = useState<Localizacao | null>(null)
  const [deletingLocalizacao, setDeletingLocalizacao] = useState<Localizacao | null>(null)
  const [itensCadastrados, setItensCadastrados] = useState<Record<string, number>>({})

  // Buscar contagem de itens por localização
  useEffect(() => {
    const fetchItemCounts = async () => {
      if (localizacoes.length > 0) {
        // Aqui você pode fazer uma query para contar quantos materiais estão em cada localização
        // Por enquanto, vamos simular com dados fictícios
        const counts: Record<string, number> = {}
        localizacoes.forEach(loc => {
          counts[loc.id] = Math.floor(Math.random() * 50) // Simulação
        })
        setItensCadastrados(counts)
      }
    }
    
    fetchItemCounts()
  }, [localizacoes])

  const filteredLocalizacoes = localizacoes?.filter(localizacao =>
    localizacao.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    localizacao.nome?.toLowerCase().includes(search.toLowerCase()) ||
    (localizacao.descricao && localizacao.descricao.toLowerCase().includes(search.toLowerCase()))
  ) || []

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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestão de Localização</h1>
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
        <h1 className="text-2xl font-bold">Gestão de Localização</h1>
        <div className="space-x-2">
          <Button asChild variant="outline">
            <Link to="/localizacao/mapa">
              <Map className="mr-2 h-4 w-4" />
              Ver Mapa Visual
            </Link>
          </Button>
          <Button asChild>
            <Link to="/cadastros/localizacao">
              <PlusCircle className="mr-2 h-4 w-4" />
              Gerenciar Localizações
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">
          {filteredLocalizacoes.length} localização{filteredLocalizacoes.length !== 1 ? 'ões' : ''}
        </Badge>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLocalizacoes.length > 0 ? (
              filteredLocalizacoes.map((localizacao) => (
                <TableRow key={localizacao.id}>
                  <TableCell className="font-medium">{localizacao.codigo}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{localizacao.nome}</div>
                      {localizacao.descricao && (
                        <div className="text-sm text-muted-foreground">
                          {localizacao.descricao.length > 50 
                            ? `${localizacao.descricao.substring(0, 50)}...`
                            : localizacao.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatLocation(localizacao) || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {itensCadastrados[localizacao.id] || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={localizacao.ativo ? 'default' : 'secondary'}>
                      {localizacao.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[10001]">
                        <DropdownMenuItem onClick={() => setEditingLocalizacao(localizacao)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateLabel(localizacao)}>
                          <Tag className="mr-2 h-4 w-4" />
                          Gerar Etiqueta
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeletingLocalizacao(localizacao)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {search ? 'Nenhuma localização encontrada com os critérios de busca.' : 'Nenhuma localização cadastrada.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingLocalizacao} onOpenChange={() => setEditingLocalizacao(null)}>
        <DialogContent className="sm:max-w-[600px] z-[9999]">
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
