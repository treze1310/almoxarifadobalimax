import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { enderecoWeb, enderecoWebLegivel } from '@/lib/enderecoWeb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlusCircle, Edit, Trash2, Building2 } from 'lucide-react'
import { formatarCNPJ, formatarCPF } from '@/lib/dadosPessoais'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
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
import { FornecedorForm } from '@/components/fornecedores/FornecedorForm'
import type { Tables } from '@/types/database'


type Fornecedor = Tables<'fornecedores'>

const normalizeSearchText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const onlyDigits = (value?: string | null) => (value || '').replace(/\D/g, '')

const FornecedoresPage = () => {
  const { data: fornecedores, loading, create, update, remove } = useSupabaseTable('fornecedores')
  
  const [search, setSearch] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [deletingFornecedor, setDeletingFornecedor] = useState<Fornecedor | null>(null)

  const handleCreate = async (data: any) => {
    const result = await create(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingFornecedor) return
    const result = await update(editingFornecedor.id, data)
    if (result.error === null) {
      setEditingFornecedor(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingFornecedor) return
    const result = await remove(deletingFornecedor.id)
    if (result.error === null) {
      setDeletingFornecedor(null)
    }
  }

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return null
    const numbers = cnpj.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return null
    const numbers = cpf.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return null
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Fornecedores"
          descricao="Fornecedores de materiais e serviços."
          migalhas={[{ label: 'Cadastros' }, { label: 'Fornecedores' }]}
        />
        <TableSkeleton colunas={5} />
      </div>
    )
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'nome',
      cabecalho: 'Fornecedor',
      fixa: true,
      semFiltro: true,
      valor: (f) =>
        `${f.nome ?? ''} ${f.cnpj ?? ''} ${f.cpf ?? ''} ${f.contato ?? ''} ${f.email ?? ''}`.trim(),
      valorOrdenacao: (f) => f.nome ?? '',
      celula: (f) => <span className="font-medium">{f.nome}</span>,
    },
    {
      id: 'documento',
      cabecalho: 'Documento',
      semFiltro: true,
      valor: (f) => (f.cnpj ? formatarCNPJ(f.cnpj) : f.cpf ? formatarCPF(f.cpf) : '—'),
    },
    {
      id: 'tipo_fornecimento',
      cabecalho: 'Tipo de fornecimento',
      valor: (f) => f.tipo_fornecimento || '—',
    },
    {
      id: 'site',
      cabecalho: 'Site',
      semFiltro: true,
      valor: (f) => enderecoWebLegivel(f.site) || '—',
      celula: (f) => {
        const url = enderecoWeb(f.site)
        if (!url) return <span className="text-muted-foreground">—</span>
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            // A linha inteira abre o cadastro; o link não pode disparar os dois
            onClick={(e) => e.stopPropagation()}
            className="inline-flex max-w-[220px] items-center gap-1 text-primary hover:underline"
            title={url}
          >
            <span className="truncate">{enderecoWebLegivel(f.site)}</span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </a>
        )
      },
    },
    {
      id: 'contato',
      cabecalho: 'Contato',
      semFiltro: true,
      valor: (f) => f.contato || f.email || '—',
      celula: (f) => (
        <div className="space-y-0.5">
          {f.contato && <div className="truncate">{f.contato}</div>}
          {f.email && <div className="text-xs text-muted-foreground">{f.email}</div>}
          {!f.contato && !f.email && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (f) => (f.ativo ? 'Ativo' : 'Inativo'),
      celula: (f) => <StatusBadge status={f.ativo ? 'ativo' : 'inativo'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Fornecedores"
        descricao="Fornecedores de materiais e serviços."
        migalhas={[{ label: 'Cadastros' }, { label: 'Fornecedores' }]}
        acoes={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo fornecedor
          </Button>
        }
      />

      <DataTable
        dados={fornecedores}
        colunas={colunas}
        idLinha={(f) => f.id}
        chaveUrl="forn"
        placeholderBusca="Buscar por nome, tipo, CNPJ/CPF ou e-mail..."
        nomeArquivoCsv="fornecedores"
        acoesLinha={(fornecedor) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar"
              onClick={() => setEditingFornecedor(fornecedor)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
              onClick={() => setDeletingFornecedor(fornecedor)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhum fornecedor cadastrado"
            icone={Building2}
            acao={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo fornecedor
              </Button>
            }
          />
        }
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo fornecedor.
            </DialogDescription>
          </DialogHeader>
          <FornecedorForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingFornecedor} onOpenChange={() => setEditingFornecedor(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Altere os dados do fornecedor conforme necessário.
            </DialogDescription>
          </DialogHeader>
          {editingFornecedor && (
            <FornecedorForm 
              initialData={editingFornecedor}
              onSubmit={handleUpdate} 
              onCancel={() => setEditingFornecedor(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingFornecedor} onOpenChange={() => setDeletingFornecedor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor "{deletingFornecedor?.nome}"? 
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

export default FornecedoresPage
