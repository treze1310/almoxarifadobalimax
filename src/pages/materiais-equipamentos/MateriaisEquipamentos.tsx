import React, { useState, useEffect, useCallback } from 'react'
import { generateMaterialCode } from '@/services/materialCodeService'
import { contar } from '@/lib/plural'
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
import { DataTable, type ColunaDataTable, type ConsultaServidor } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { buscarTodasAsPaginas } from '@/lib/consultaPaginada'

import type { MaterialEquipamentoFormData } from '@/lib/validations'
import { gerarEtiquetasPDF } from '@/utils/etiquetasPdf'
import { ImportarCSVDialog } from '@/components/materiais-equipamentos/ImportarCSVDialog'
import { useToast } from '@/components/ui/use-toast'

const MateriaisEquipamentosPage = () => {
  const { toast } = useToast()
  const [importarAberto, setImportarAberto] = useState(false)
  // A planilha de edição em lote traz todos os itens, não só a página aberta
  const [materiaisParaPlanilha, setMateriaisParaPlanilha] = useState<any[]>([])
  const { 
    loading, 
    fetchMateriais,
    buscarPagina,
    createMaterial, 
    updateMaterial, 
    deleteMaterial,
    checkMaterialDependencies,
    deleteMaterialWithDependencies
  } = useMateriaisEquipamentos()

  /**
   * A tela abre para procurar um item específico, então busca, filtros,
   * ordenação e paginação acontecem no banco (RNF-01): chegam 25 linhas por
   * vez, e não os 2.209 itens do cadastro.
   */
  const [paginaDeDados, setPaginaDeDados] = useState<{ dados: any[]; total: number }>({
    dados: [],
    total: 0,
  })
  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [consulta, setConsulta] = useState<ConsultaServidor | null>(null)

  // Opções dos filtros por coluna: no modo servidor a página carregada não tem
  // todos os valores possíveis, então vêm dos próprios cadastros.
  const [listasDeFiltro, setListasDeFiltro] = useState<{
    categorias: Array<{ rotulo: string; valor: string }>
    marcas: Array<{ rotulo: string; valor: string }>
    localizacoes: Array<{ rotulo: string; valor: string }>
  }>({ categorias: [], marcas: [], localizacoes: [] })

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
  /**
   * A paleta de comandos e a central de notificações mandam `?item=<id>`. Com
   * a listagem paginada no banco, o item pode não estar na página carregada —
   * então é buscado direto pelo id.
   */
  const itemDaUrl = searchParams.get('item')
  useEffect(() => {
    if (!itemDaUrl) return
    const abrir = async () => {
      const { data } = await supabase
        .from('materiais_equipamentos')
        .select('*')
        .eq('id', itemDaUrl)
        .maybeSingle()
      if (data) setEditingMaterial(data)
      const novos = new URLSearchParams(searchParams)
      novos.delete('item')
      setSearchParams(novos, { replace: true })
    }
    void abrir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemDaUrl])

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

  // Opções dos filtros, carregadas uma vez
  useEffect(() => {
    const carregarListas = async () => {
      const [cat, mar, loc] = await Promise.all([
        supabase.from('categorias').select('nome').eq('ativo', true).order('nome'),
        supabase.from('marcas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('localizacao').select('id, codigo, nome').eq('ativo', true).order('codigo'),
      ])
      setListasDeFiltro({
        categorias: (cat.data ?? []).map((c: any) => ({ rotulo: c.nome, valor: c.nome })),
        marcas: (mar.data ?? []).map((m: any) => ({ rotulo: m.nome, valor: m.id })),
        localizacoes: (loc.data ?? []).map((l: any) => ({ rotulo: l.nome, valor: l.id })),
      })
    }
    void carregarListas()
  }, [])

  // Busca a página sempre que a consulta ou os filtros da tela mudam
  const recarregarPagina = useCallback(async () => {
    if (!consulta) return
    setCarregandoPagina(true)
    try {
      const filtros = { ...consulta.filtros }
      // O filtro de estoque crítico da tela vira filtro de banco; `precisa_repor`
      // é coluna gerada, então o banco resolve sem trazer linha nenhuma a mais.
      if (filtroEstoqueBaixo) filtros.precisa_repor = ['true']

      const resultado = await buscarPagina({
        busca: consulta.busca,
        pagina: consulta.pagina,
        tamanhoPagina: consulta.tamanhoPagina,
        ordenarPor: consulta.ordenacao.coluna || undefined,
        ascendente: consulta.ordenacao.direcao !== 'desc',
        filtros,
        apenasInativos: showInactive,
      })
      setPaginaDeDados({ dados: resultado.data, total: resultado.total })
    } finally {
      setCarregandoPagina(false)
    }
  }, [consulta, filtroEstoqueBaixo, showInactive, buscarPagina])

  useEffect(() => {
    void recarregarPagina()
  }, [recarregarPagina])

  // Contadores dos alertas: contagem no banco, sem trazer as linhas
  const [contadores, setContadores] = useState({ estoqueBaixo: 0, calibracao: 0 })
  useEffect(() => {
    const contar = async () => {
      const limite = new Date()
      limite.setDate(limite.getDate() + 30)
      const [critico, calib] = await Promise.all([
        supabase
          .from('materiais_equipamentos')
          .select('id', { count: 'exact', head: true })
          .eq('ativo', true)
          .eq('precisa_repor', true),
        supabase
          .from('materiais_equipamentos')
          .select('id', { count: 'exact', head: true })
          .eq('ativo', true)
          .eq('requer_calibracao', true)
          .lte('proxima_calibracao', limite.toISOString().slice(0, 10)),
      ])
      setContadores({ estoqueBaixo: critico.count ?? 0, calibracao: calib.count ?? 0 })
    }
    void contar()
  }, [paginaDeDados])


  // A página já vem filtrada e ordenada do banco. O filtro de calibração
  // continua local: o estado depende de um cálculo (vence em X meses) que não
  // existe como coluna — e, por ser local, ele vale sobre a página carregada.
  const filteredMateriais = filtroCalibracaoVencida
    ? paginaDeDados.dados.filter((material: any) => {
        const st = verificarStatusCalibracao(
          material.requer_calibracao,
          material.proxima_calibracao,
          material.frequencia_calibracao_meses,
        )
        return st.status === 'vencida' || st.status === 'proxima_vencimento'
      })
    : paginaDeDados.dados

  const handleCreate = async (data: MaterialEquipamentoFormData) => {
    const result = await createMaterial(data)
    if (result.error === null) {
      setIsCreateDialogOpen(false)
    }
  }

  /**
   * Clonar: abre o cadastro pré-preenchido com os dados do item.
   *
   * O nome é mantido igual, sem "(Cópia)": dois itens podem ter o mesmo nome e
   * é o código que os distingue, então renomear só dava trabalho de apagar o
   * sufixo. O que não vem junto é o que pertence à peça original — o código,
   * o número de série e o saldo.
   */
  const handleCloneClick = (materialDaLista: any) => {
    void abrirCompleto(materialDaLista, (material: any) => {
      const { id, codigo, created_at, updated_at, ...rest } = material
      setCloningMaterial({
        ...rest,
        clonadoDe: { codigo, nome: material.nome },
        numero_serie: '',
        estoque_atual: 0,
      })
    })
  }

  const handleCloneSubmit = async (data: MaterialEquipamentoFormData) => {
    const payload = { ...data }
    // Clonar copia tudo menos o código: o item novo precisa do seu próprio.
    if (!payload.codigo) {
      payload.codigo = (await generateMaterialCode()).codigo
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
        description: `${contar(ignorados.length, 'item tem', 'itens têm')} código que não vira código de barras: ${ignorados
          .map((i) => i.codigo)
          .join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Etiquetas geradas',
      description: `${contar(gerados, 'etiqueta', 'etiquetas')} na folha. Imprima em escala 100%, sem "ajustar à página".`,
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
      campoServidor: 'codigo',
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
    {
      id: 'tipo',
      cabecalho: 'Tipo',
      valor: (m) => m.tipo ?? '—',
      campoServidor: 'tipo',
      opcoesFiltro: [
        { rotulo: 'material', valor: 'material' },
        { rotulo: 'equipamento', valor: 'equipamento' },
      ],
    },
    {
      id: 'categoria',
      cabecalho: 'Categoria',
      valor: (m) => m.categoria || 'Sem categoria',
      campoServidor: 'categoria',
      opcoesFiltro: listasDeFiltro.categorias,
    },
    {
      id: 'localizacao',
      cabecalho: 'Localização',
      valor: (m) => m.localizacao?.nome || 'Não definida',
      campoServidor: 'localizacao_id',
      opcoesFiltro: listasDeFiltro.localizacoes,
    },
    {
      id: 'marca',
      cabecalho: 'Marca/Modelo',
      valor: (m) => m.marcas?.nome || 'Sem marca',
      campoServidor: 'marca_id',
      opcoesFiltro: listasDeFiltro.marcas,
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
      campoServidor: 'situacao_estoque',
      opcoesFiltro: [
        { rotulo: 'Zerado', valor: 'zerado' },
        { rotulo: 'No mínimo', valor: 'baixo' },
        { rotulo: 'Normal', valor: 'normal' },
      ],
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
      campoServidor: 'valor_unitario',
    },
    {
      id: 'calibracao',
      cabecalho: 'Calibração',
      // O estado da calibração é calculado (vence em X meses), não existe
      // como coluna no banco — por isso não filtra nem ordena no servidor.
      semFiltro: true,
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
      campoServidor: 'status',
      opcoesFiltro: [
        { rotulo: getStatusLabel('ativo'), valor: 'ativo' },
        { rotulo: getStatusLabel('inativo'), valor: 'inativo' },
        { rotulo: getStatusLabel('manutencao'), valor: 'manutencao' },
        { rotulo: getStatusLabel('descartado'), valor: 'descartado' },
      ],
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
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { data } = await buscarTodasAsPaginas<any>((de, ate) =>
                    supabase
                      .from('materiais_equipamentos')
                      .select(
                        'id, codigo, nome, unidade_medida, codigo_barras, valor_unitario, estoque_minimo, ponto_pedido, estoque_maximo, reposicao_automatica',
                      )
                      .order('codigo')
                      .range(de, ate),
                  )
                  setMateriaisParaPlanilha(data)
                  setImportarAberto(true)
                }}
              >
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
                  {contadores.calibracao > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                      {contadores.calibracao}
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
                  {contadores.estoqueBaixo > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                      {contadores.estoqueBaixo}
                    </Badge>
                  )}
                </span>
              </label>
            </div>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">
            {contar(paginaDeDados.total, 'item', 'itens')}
          </Badge>
        </div>
      </div>

      {/* Alerta de estoque baixo/zerado */}
      {contadores.estoqueBaixo > 0 && (
        <Alert variant="destructive" className="cursor-pointer" onClick={() => setFiltroEstoqueBaixo(true)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção: estoque baixo ou zerado</AlertTitle>
          <AlertDescription>
            {contadores.estoqueBaixo} {contadores.estoqueBaixo === 1 ? 'item está' : 'itens estão'} no
            ponto de pedido ou com estoque zerado. Clique para filtrar.
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
        carregando={carregandoPagina && paginaDeDados.dados.length === 0}
        placeholderBusca="Buscar por código, nome, modelo ou descrição..."
        nomeArquivoCsv="materiais-equipamentos"
        servidor={{ total: paginaDeDados.total, onConsulta: setConsulta }}
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
              {cloningMaterial?.clonadoDe ? (
                <>
                  Copiado de <strong>{cloningMaterial.clonadoDe.codigo}</strong> —{' '}
                  {cloningMaterial.clonadoDe.nome}. O código já vem sugerido e pode ser trocado;
                  número de série e saldo entram zerados.
                </>
              ) : (
                'Os dados foram copiados do item original. Revise o código sugerido e salve.'
              )}
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
        materiais={materiaisParaPlanilha}
        onFechar={() => setImportarAberto(false)}
        onImportado={() => fetchMateriais({ includeInactive: showInactive })}
      />

    </div>
  )
}

export default MateriaisEquipamentosPage
