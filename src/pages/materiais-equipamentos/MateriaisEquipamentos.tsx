import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle, Edit, Trash2, Package, Wrench, Eye, RefreshCw, AlertTriangle, Copy, Tag, FileSpreadsheet } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { verificarStatusCalibracao } from '@/utils/calibracao'
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

import { MaterialEquipamentoForm } from '@/components/materiais-equipamentos/MaterialEquipamentoForm'
import { MaterialEquipamentoDialog } from '@/components/materiais-equipamentos/MaterialEquipamentoDialog'
import { MovimentacaoEstoque } from '@/components/materiais-equipamentos/MovimentacaoEstoque'
import { MaterialDependenciesDialog } from '@/components/materiais-equipamentos/MaterialDependenciesDialog'
import CentroCustoLabel from '@/components/materiais-equipamentos/CentroCustoLabel'
import { useMateriaisEquipamentos } from '@/hooks/useMateriaisEquipamentos'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { useSearchParams } from 'react-router-dom'
import { useAbrirItemDaUrl } from '@/hooks/useAbrirItemDaUrl'
import { supabase } from '@/lib/supabase'

import type { MaterialEquipamentoFormData } from '@/lib/validations'
import { gerarEtiquetasPDF } from '@/utils/etiquetasPdf'
import { ImportarCSVDialog } from '@/components/materiais-equipamentos/ImportarCSVDialog'
import { useToast } from '@/components/ui/use-toast'

const MateriaisEquipamentosPage = () => {
  const { toast } = useToast()
  const [importarAberto, setImportarAberto] = useState(false)
  const { 
    materiaisEquipamentos, 
    loading, 
    fetchMateriais,
    createMaterial, 
    updateMaterial, 
    deleteMaterial,
    checkMaterialDependencies,
    deleteMaterialWithDependencies
  } = useMateriaisEquipamentos()

  const { can } = usePermissoes()
  const podeCriar = can('materiais', 'create')
  const podeEditar = can('materiais', 'update')
  const podeExcluir = can('materiais', 'delete')
  const podeMovimentar = can('estoque', 'update')
  
  const [showInactive, setShowInactive] = useState(false)
  const [filtroCalibracaoVencida, setFiltroCalibracaoVencida] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtroEstoqueBaixo, setFiltroEstoqueBaixo] = useState(
    searchParams.get('estoque') === 'critico'
  )
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)

  /**
   * A listagem traz só as colunas que a tabela mostra — com 2.209 itens, trazer
   * tudo são megabytes a cada abertura. O formulário precisa do registro
   * inteiro, então ele é buscado na hora de abrir.
   */
  const abrirCompleto = async (material: any, destino: (m: any) => void) => {
    const { data } = await supabase
      .from('materiais_equipamentos')
      .select('*')
      .eq('id', material.id)
      .maybeSingle()
    destino(data ?? material)
  }
  const [deletingMaterial, setDeletingMaterial] = useState<any>(null)
  const [movimentacaoMaterial, setMovimentacaoMaterial] = useState<any>(null)
  const [cloningMaterial, setCloningMaterial] = useState<any>(null)
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false)
  const [materialWithDependencies, setMaterialWithDependencies] = useState<any>(null)
  const [dialogPosition, setDialogPosition] = useState({ top: '50vh', left: '50vw' })

  // Calcular posição central da viewport atual quando abre qualquer dialog
  useEffect(() => {
    const updateDialogPosition = () => {
      if (isCreateDialogOpen || editingMaterial || deletingMaterial || movimentacaoMaterial || cloningMaterial) {
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
    }

    updateDialogPosition()
  }, [isCreateDialogOpen, editingMaterial, deletingMaterial, movimentacaoMaterial, cloningMaterial])


  // Abre o item vindo da paleta de comandos (?item=<id>)
  useAbrirItemDaUrl(materiaisEquipamentos, (m) => m.id, (m) => abrirCompleto(m, setEditingMaterial))

  // Mantém o filtro de estoque crítico refletido na URL, para o link do
  // Dashboard funcionar e o estado ser compartilhável (RF-08).
  useEffect(() => {
    const atual = searchParams.get('estoque') === 'critico'
    if (atual === filtroEstoqueBaixo) return
    const novos = new URLSearchParams(searchParams)
    if (filtroEstoqueBaixo) novos.set('estoque', 'critico')
    else novos.delete('estoque')
    setSearchParams(novos, { replace: true })
  }, [filtroEstoqueBaixo, searchParams, setSearchParams])

  // Fetch data with relationships
  React.useEffect(() => {
    fetchMateriais({ includeInactive: showInactive })
  }, [fetchMateriais, showInactive])

  // RF-02: a classificação vem da coluna gerada `situacao_estoque`, calculada no
  // banco. O Dashboard, este alerta e este filtro leem a mesma fonte.
  // RF-10 soma aqui o item que chegou no ponto de pedido sem ter chegado no mínimo.
  const isEstoqueBaixoOuZerado = (material: any) =>
    material.situacao_estoque === 'zerado' ||
    material.situacao_estoque === 'baixo' ||
    material.precisa_repor === true

  /**
   * Filtros próprios desta tela (inativos, calibração e estoque crítico).
   * Busca, filtro por coluna e ordenação são responsabilidade do DataTable.
   */
  const filteredMateriais = materiaisEquipamentos.filter((material) => {
    // "Mostrar inativos": quando marcado, exibe APENAS inativos
    const matchesAtivo = showInactive ? material.ativo === false : material.ativo !== false

    let matchesCalibracaoVencida = true
    if (filtroCalibracaoVencida) {
      const statusCalibracao = verificarStatusCalibracao(
        material.requer_calibracao,
        material.proxima_calibracao,
        material.frequencia_calibracao_meses,
      )
      matchesCalibracaoVencida =
        statusCalibracao.status === 'vencida' || statusCalibracao.status === 'proxima_vencimento'
    }

    const matchesEstoqueBaixo = !filtroEstoqueBaixo || isEstoqueBaixoOuZerado(material)

    return matchesAtivo && matchesCalibracaoVencida && matchesEstoqueBaixo
  })

  // Contar itens com estoque baixo ou zerado (apenas ativos)
  const itensEstoqueBaixo = materiaisEquipamentos.filter(
    material => material.ativo !== false && isEstoqueBaixoOuZerado(material)
  )

  // Contar equipamentos com problemas de calibração
  const equipamentosComProblemasCalibração = materiaisEquipamentos.filter(material => {
    if (!material.requer_calibracao) return false
    const statusCalibracao = verificarStatusCalibracao(
      material.requer_calibracao,
      material.proxima_calibracao,
      material.frequencia_calibracao_meses
    )
    return statusCalibracao.status === 'vencida' || 
           statusCalibracao.status === 'proxima_vencimento'
  }).length

  const handleCreate = async (data: MaterialEquipamentoFormData) => {
    const result = await createMaterial(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  // Clonar: abre o formulário de criação pré-preenchido com os dados do item
  const handleCloneClick = (materialDaLista: any) => {
    void abrirCompleto(materialDaLista, (material: any) => {
      const { id, codigo, created_at, updated_at, ...rest } = material
      setCloningMaterial({
        ...rest,
        nome: `${material.nome} (Cópia)`,
        numero_serie: '',
        estoque_atual: 0,
      })
    })
  }

  const handleCloneSubmit = async (data: MaterialEquipamentoFormData) => {
    const payload = { ...data }
    // O formulário só gera código automático em cadastros sem dados iniciais
    if (!payload.codigo) {
      payload.codigo = String(Math.floor(Math.random() * 90000) + 10000)
    }
    const result = await createMaterial(payload)
    if (result.error === null) {
      setCloningMaterial(null)
    }
  }

  const handleUpdate = async (data: MaterialEquipamentoFormData) => {
    if (!editingMaterial) return
    const result = await updateMaterial(editingMaterial.id, data)
    if (result.error === null) {
      setEditingMaterial(null)
    }
  }

  const handleDeleteClick = async (material: any) => {
    // Primeiro verificar se tem dependências
    const { data: dependencies, error } = await checkMaterialDependencies(material.id)
    
    if (error) {
      console.error('Erro ao verificar dependências:', error)
      return
    }

    if (dependencies && !dependencies.canDelete) {
      // Mostrar diálogo de dependências
      setMaterialWithDependencies(material)
      setDependenciesDialogOpen(true)
    } else {
      // Pode excluir normalmente
      setDeletingMaterial(material)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return
    const result = await deleteMaterial(deletingMaterial.id)
    if (result.error === null) {
      setDeletingMaterial(null)
    }
  }

  const handleDependenciesResolved = () => {
    setDependenciesDialogOpen(false)
    setMaterialWithDependencies(null)
    // Recarregar dados
    fetchMateriais({ includeInactive: showInactive })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'default'
      case 'inativo': return 'secondary'
      case 'manutencao': return 'destructive'
      case 'descartado': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo'
      case 'inativo': return 'Inativo'
      case 'manutencao': return 'Manutenção'
      case 'descartado': return 'Descartado'
      default: return status
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  /** Colunas da listagem, no padrão do design system */
  /**
   * Etiqueta do item: o código do cadastro vira código de barras, que é o que
   * o leitor da retirada assistida procura. Equipamento sem etiqueta é o que
   * impede o controle por número de item.
   */
  const imprimirEtiquetas = (lista: any[]) => {
    const { gerados, ignorados } = gerarEtiquetasPDF(
      lista.map((m) => ({
        codigo: m.codigo,
        nome: m.nome,
        unidade: m.unidade_medida,
        localizacao: m.localizacao?.nome
          ? `${m.localizacao.codigo ?? ''} ${m.localizacao.nome}`.trim()
          : null,
      })),
    )

    if (ignorados.length > 0) {
      toast({
        title: 'Alguns itens ficaram de fora',
        description: `${ignorados.length} item(ns) têm código que não vira código de barras: ${ignorados
          .map((i) => i.codigo)
          .join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Etiquetas geradas',
      description: `${gerados} etiqueta(s) na folha. Imprima em escala 100%, sem "ajustar à página".`,
    })
  }

  const colunas: ColunaDataTable<any>[] = [
    {
      id: 'item',
      cabecalho: 'Item',
      fixa: true,
      semFiltro: true,
      valor: (m) => `${m.codigo ?? ''} ${m.nome ?? ''}`.trim(),
      valorOrdenacao: (m) => m.codigo ?? '',
      celula: (m) => (
        <div className="flex items-center gap-2">
          {m.tipo === 'equipamento' ? (
            <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <div className="font-medium">{m.codigo}</div>
            <div className="truncate text-xs text-muted-foreground" title={m.nome}>
              {m.nome}
            </div>
          </div>
        </div>
      ),
    },
    { id: 'tipo', cabecalho: 'Tipo', valor: (m) => m.tipo ?? '—' },
    { id: 'categoria', cabecalho: 'Categoria', valor: (m) => m.categoria || 'Sem categoria' },
    {
      id: 'localizacao',
      cabecalho: 'Localização',
      valor: (m) => m.localizacao?.nome || 'Não definida',
    },
    {
      id: 'marca',
      cabecalho: 'Marca/Modelo',
      valor: (m) => m.marcas?.nome || 'Sem marca',
      celula: (m) => (
        <div className="min-w-0">
          <div className="truncate">{m.marcas?.nome || '—'}</div>
          {m.modelo && <div className="text-xs text-muted-foreground">{m.modelo}</div>}
        </div>
      ),
    },
    {
      id: 'centro_custo',
      cabecalho: 'Centro de custo',
      valor: (m) => m.centros_custo?.codigo || 'Sem centro de custo',
      celula: (m) =>
        m.centros_custo ? (
          <CentroCustoLabel
            materialId={m.id}
            centroCusto={{
              codigo: m.centros_custo.codigo,
              nome: m.centros_custo.empresas?.nome || m.centros_custo.descricao,
            }}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'estoque',
      cabecalho: 'Estoque',
      alinhamento: 'right',
      // RF-02: situação vem da coluna gerada no banco.
      // RF-10: `precisa_repor` olha o ponto de pedido, que pode estar acima do mínimo.
      valor: (m) =>
        m.situacao_estoque === 'zerado'
          ? 'Zerado'
          : m.situacao_estoque === 'baixo'
            ? 'No mínimo'
            : m.precisa_repor
              ? 'No ponto de pedido'
              : 'Normal',
      valorOrdenacao: (m) => m.estoque_atual ?? 0,
      celula: (m) => (
        <div className="text-right">
          <div
            className={
              m.situacao_estoque === 'zerado'
                ? 'font-medium text-destructive'
                : m.situacao_estoque === 'baixo'
                  ? 'font-medium text-status-pendente'
                  : 'font-medium'
            }
          >
            {m.estoque_atual ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">
            Mín: {m.estoque_minimo ?? 0}
            {m.ponto_pedido != null && ` · Pedir em ${m.ponto_pedido}`} {m.unidade_medida}
          </div>
        </div>
      ),
    },
    {
      id: 'valor',
      cabecalho: 'Valor',
      semFiltro: true,
      alinhamento: 'right',
      valor: (m) => formatCurrency(m.valor_unitario),
      valorOrdenacao: (m) => m.valor_unitario ?? 0,
    },
    {
      id: 'calibracao',
      cabecalho: 'Calibração',
      valor: (m) => {
        const st = verificarStatusCalibracao(
          m.requer_calibracao,
          m.proxima_calibracao,
          m.frequencia_calibracao_meses,
        )
        return st.mensagem
      },
      celula: (m) => {
        const st = verificarStatusCalibracao(
          m.requer_calibracao,
          m.proxima_calibracao,
          m.frequencia_calibracao_meses,
        )
        return (
          <div className="flex items-center gap-1">
            <span aria-hidden>{st.icone}</span>
            <span className="text-xs text-muted-foreground">{st.mensagem}</span>
          </div>
        )
      },
    },
    {
      id: 'status',
      cabecalho: 'Status',
      valor: (m) => getStatusLabel(m.status),
      celula: (m) => <StatusBadge status={m.status} />,
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Materiais e Equipamentos"
          descricao="Itens de estoque, equipamentos, calibração e localização."
          migalhas={[{ label: 'Operação' }, { label: 'Materiais e Equipamentos' }]}
        />
        <TableSkeleton colunas={7} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Materiais e Equipamentos"
        descricao="Itens de estoque, equipamentos, calibração e localização."
        migalhas={[{ label: 'Operação' }, { label: 'Materiais e Equipamentos' }]}
        acoes={
          <>
            <Button
              onClick={() => fetchMateriais({ includeInactive: showInactive })}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            {podeEditar && (
              <Button variant="outline" size="sm" onClick={() => setImportarAberto(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Editar em lote
              </Button>
            )}
            {podeCriar && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo item
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-3">
      {/* 📱 Checkboxes e contador */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showInactive" className="text-sm text-muted-foreground cursor-pointer">
                Mostrar inativos
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="filtroCalibracaoVencida"
                checked={filtroCalibracaoVencida}
                onChange={(e) => setFiltroCalibracaoVencida(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="filtroCalibracaoVencida" className="text-sm text-muted-foreground cursor-pointer">
                <span className="flex items-center gap-1">
                  🔴 <span className="hidden sm:inline">Calibração vencida/próxima</span>
                  <span className="sm:hidden">Vencidas</span>
                  {equipamentosComProblemasCalibração > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                      {equipamentosComProblemasCalibração}
                    </Badge>
                  )}
                </span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="filtroEstoqueBaixo"
                checked={filtroEstoqueBaixo}
                onChange={(e) => setFiltroEstoqueBaixo(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="filtroEstoqueBaixo" className="text-sm text-muted-foreground cursor-pointer">
                <span className="flex items-center gap-1">
                  📦 <span className="hidden sm:inline">Estoque baixo/zerado</span>
                  <span className="sm:hidden">Estoque baixo</span>
                  {itensEstoqueBaixo.length > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                      {itensEstoqueBaixo.length}
                    </Badge>
                  )}
                </span>
              </label>
            </div>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">
            {filteredMateriais.length} item{filteredMateriais.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Alerta de estoque baixo/zerado */}
      {itensEstoqueBaixo.length > 0 && (
        <Alert variant="destructive" className="cursor-pointer" onClick={() => setFiltroEstoqueBaixo(true)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção: estoque baixo ou zerado</AlertTitle>
          <AlertDescription>
            {itensEstoqueBaixo.length} {itensEstoqueBaixo.length === 1 ? 'item está' : 'itens estão'} com
            estoque no mínimo ou zerado.{' '}
            {itensEstoqueBaixo.filter(m => (m.estoque_atual || 0) === 0).length > 0 && (
              <>({itensEstoqueBaixo.filter(m => (m.estoque_atual || 0) === 0).length} zerado(s)) </>
            )}
            Clique para filtrar.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
        <Eye className="h-3 w-3" />
        Clique para editar ou clique com o botão direito para mais opções
      </div>

      <DataTable
        dados={filteredMateriais}
        colunas={colunas}
        idLinha={(m) => m.id}
        chaveUrl="mat"
        placeholderBusca="Buscar por código, nome, categoria ou marca..."
        nomeArquivoCsv="materiais-equipamentos"
        onLinhaClick={(m) => podeEditar && abrirCompleto(m, setEditingMaterial)}
        acoesEmLote={(ids, limparSelecao) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              imprimirEtiquetas(filteredMateriais.filter((m) => ids.includes(m.id)))
              limparSelecao()
            }}
          >
            <Tag className="mr-2 h-4 w-4" />
            Gerar etiquetas
          </Button>
        )}
        acoesLinha={(material) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Etiqueta do item"
              aria-label="Etiqueta do item"
              onClick={() => imprimirEtiquetas([material])}
            >
              <Tag className="h-4 w-4" />
            </Button>
            {podeEditar && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Editar"
                aria-label="Editar"
                onClick={() => abrirCompleto(material, setEditingMaterial)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {podeCriar && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Clonar"
                aria-label="Clonar"
                onClick={() => handleCloneClick(material)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {podeMovimentar && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Movimentar estoque"
                aria-label="Movimentar estoque"
                onClick={() => setMovimentacaoMaterial(material)}
              >
                <Package className="h-4 w-4" />
              </Button>
            )}
            {podeExcluir && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Excluir"
                aria-label="Excluir"
                onClick={() => handleDeleteClick(material)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!podeEditar && !podeCriar && !podeExcluir && (
              <span className="text-xs text-muted-foreground">Somente leitura</span>
            )}
          </>
        )}
        vazio={
          <EmptyState
            titulo="Nenhum material encontrado"
            descricao="Cadastre o primeiro item para começar a controlar o estoque."
            icone={Package}
            acao={
              podeCriar ? (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo item
                </Button>
              ) : undefined
            }
          />
        }
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent 
          className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto items-start"
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 9999,
            maxHeight: '90vh',
            width: 'min(95vw, 800px)',
            overflowY: 'auto'
          }}
        >
          <DialogHeader>
            <DialogTitle>Novo Material/Equipamento</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo item.
            </DialogDescription>
          </DialogHeader>
          <MaterialEquipamentoForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={!!cloningMaterial} onOpenChange={() => setCloningMaterial(null)}>
        <DialogContent
          className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto items-start"
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 9999,
            maxHeight: '90vh',
            width: 'min(95vw, 800px)',
            overflowY: 'auto'
          }}
        >
          <DialogHeader>
            <DialogTitle>Clonar Material/Equipamento</DialogTitle>
            <DialogDescription>
              Os dados foram copiados do item original. Revise e salve para criar um novo item
              (um novo código será gerado automaticamente).
            </DialogDescription>
          </DialogHeader>
          {cloningMaterial && (
            <MaterialEquipamentoForm
              initialData={cloningMaterial}
              onSubmit={handleCloneSubmit}
              onCancel={() => setCloningMaterial(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <MaterialEquipamentoDialog
        open={!!editingMaterial}
        onOpenChange={() => setEditingMaterial(null)}
        material={editingMaterial}
        onDelete={handleDeleteClick}
        onSubmit={handleUpdate}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingMaterial} onOpenChange={() => setDeletingMaterial(null)}>
        <AlertDialogContent
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item "{deletingMaterial?.codigo} - {deletingMaterial?.nome}"? 
              Esta ação não pode ser desfeita e pode afetar outros registros relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Movimentação Estoque Dialog */}
      <Dialog open={!!movimentacaoMaterial} onOpenChange={() => setMovimentacaoMaterial(null)}>
        <DialogContent 
          className="sm:max-w-[600px]"
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 9999,
            width: 'min(95vw, 600px)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              Gerencie o estoque de "{movimentacaoMaterial?.codigo} - {movimentacaoMaterial?.nome}"
            </DialogDescription>
          </DialogHeader>
          {movimentacaoMaterial && (
            <MovimentacaoEstoque
              materialId={movimentacaoMaterial.id}
              materialNome={movimentacaoMaterial.nome}
              estoqueAtual={movimentacaoMaterial.estoque_atual}
              unidadeMedida={movimentacaoMaterial.unidade_medida}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Dependências */}
      <MaterialDependenciesDialog
        open={dependenciesDialogOpen}
        onOpenChange={setDependenciesDialogOpen}
        materialId={materialWithDependencies?.id}
        materialName={materialWithDependencies?.nome}
        onDeleted={handleDependenciesResolved}
      />

      {/* RF-11: edição em lote por planilha */}
      <ImportarCSVDialog
        aberto={importarAberto}
        materiais={materiaisEquipamentos as any[]}
        onFechar={() => setImportarAberto(false)}
        onImportado={() => fetchMateriais({ includeInactive: showInactive })}
      />

    </div>
  )
}

export default MateriaisEquipamentosPage
