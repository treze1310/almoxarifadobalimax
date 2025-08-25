import React, { useState, useEffect } from 'react'
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, Package, Wrench, Tag, Eye, RefreshCw } from 'lucide-react'
import { verificarStatusCalibracao } from '@/utils/calibracao'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
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

import type { MaterialEquipamentoFormData } from '@/lib/validations'

const MateriaisEquipamentosPage = () => {
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
  
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [filtroCalibracaoVencida, setFiltroCalibracaoVencida] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<any>(null)
  const [movimentacaoMaterial, setMovimentacaoMaterial] = useState<any>(null)
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false)
  const [materialWithDependencies, setMaterialWithDependencies] = useState<any>(null)
  const [dialogPosition, setDialogPosition] = useState({ top: '50vh', left: '50vw' })

  // Calcular posição central da viewport atual quando abre qualquer dialog
  useEffect(() => {
    const updateDialogPosition = () => {
      if (isCreateDialogOpen || editingMaterial || deletingMaterial || movimentacaoMaterial) {
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
  }, [isCreateDialogOpen, editingMaterial, deletingMaterial, movimentacaoMaterial])

  // Hook para centralização inteligente dos dialogs
  const createDialogPosition = useCenteredDialog(isCreateDialogOpen)
  const editDialogPosition = useCenteredDialog(!!editingMaterial)

  // Fetch data with relationships
  React.useEffect(() => {
    fetchMateriais({ includeInactive: showInactive })
  }, [fetchMateriais, showInactive])

  const filteredMateriais = materiaisEquipamentos.filter(material => {
    const matchesSearch = search === '' ||
      material.codigo.toLowerCase().includes(search.toLowerCase()) ||
      material.nome.toLowerCase().includes(search.toLowerCase()) ||
      (material.descricao && material.descricao.toLowerCase().includes(search.toLowerCase())) ||
      (material.categoria && material.categoria.toLowerCase().includes(search.toLowerCase())) ||
      (material.subcategoria && material.subcategoria.toLowerCase().includes(search.toLowerCase())) ||
      (material.marcas?.nome && material.marcas.nome.toLowerCase().includes(search.toLowerCase()))
    
    // Filtro para calibração vencida
    let matchesCalibracaoVencida = true
    if (filtroCalibracaoVencida) {
      const statusCalibracao = verificarStatusCalibracao(
        material.requer_calibracao,
        material.proxima_calibracao,
        material.frequencia_calibracao_meses
      )
      matchesCalibracaoVencida = statusCalibracao.status === 'vencida' || 
                                 statusCalibracao.status === 'proxima_vencimento'
    }
    
    return matchesSearch && matchesCalibracaoVencida
  })

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Materiais e Equipamentos</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 📱 Header responsivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-xl md:text-2xl font-bold">Materiais e Equipamentos</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              console.log('🔄 Forçando atualização dos materiais...')
              fetchMateriais({ includeInactive: showInactive })
            }} 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
            <span className="sm:hidden">🔄</span>
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="flex-1 sm:flex-none">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Novo Item</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* 📱 Filtros responsivos */}
      <div className="space-y-3">
        {/* 📱 Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
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
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">
            {filteredMateriais.length} item{filteredMateriais.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
        <Eye className="h-3 w-3" />
        Clique para editar ou clique com o botão direito para mais opções
      </div>

      {/* 📱 MOBILE: Cards layout */}
      <div className="lg:hidden space-y-3">
        {filteredMateriais.length > 0 ? (
          filteredMateriais.map((material) => (
            <ContextMenu key={material.id}>
              <ContextMenuTrigger asChild>
                <div 
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setEditingMaterial(material)}
                >
                  {/* 📱 Header do card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {material.tipo === 'equipamento' ? (
                        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">{material.codigo}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 shrink-0">
                            {material.tipo}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{material.nome}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Badge variant={getStatusColor(material.status)} className="text-xs">
                        {getStatusLabel(material.status)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMaterial(material)}>
                            <Edit className="mr-2 h-3 w-3" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMovimentacaoMaterial(material)}>
                            <Package className="mr-2 h-3 w-3" />
                            Movimentar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeletingMaterial(material)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* 📱 Informações principais */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Categoria</span>
                      <div className="font-medium">
                        {material.categoria || '-'}
                        {material.subcategoria && (
                          <div className="text-xs text-muted-foreground">{material.subcategoria}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Localização</span>
                      <div className="font-medium">
                        {material.localizacao?.nome || (
                          <span className="text-muted-foreground">Não definida</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Estoque</span>
                      <div className="font-medium">
                        {material.quantidade_atual || 0} {material.unidade_medida || 'UN'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Valor</span>
                      <div className="font-medium">
                        {formatCurrency(material.valor_unitario)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 📱 Informações adicionais */}
                  {(material.marcas?.nome || material.centros_custo) && (
                    <div className="pt-2 border-t text-xs space-y-1">
                      {material.marcas?.nome && (
                        <div className="flex items-center space-x-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span>{material.marcas.nome}</span>
                          {material.modelo && <span className="text-muted-foreground">• {material.modelo}</span>}
                        </div>
                      )}
                      {material.centros_custo && (
                        <div>
                          <CentroCustoLabel
                            materialId={material.id}
                            centroCusto={{
                              codigo: material.centros_custo.codigo,
                              nome: material.centros_custo.nome,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => setEditingMaterial(material)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setMovimentacaoMaterial(material)}>
                  <Package className="mr-2 h-4 w-4" />
                  Movimentar Estoque
                </ContextMenuItem>
                <ContextMenuItem 
                  onClick={() => setDeletingMaterial(material)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum material encontrado</p>
          </div>
        )}
      </div>

      {/* 📱 DESKTOP: Table layout */}
      <div className="hidden lg:block border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Tipo/Categoria</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Calibração</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMateriais.length > 0 ? (
              filteredMateriais.map((material) => (
                <ContextMenu key={material.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50 transition-colors h-12"
                      onClick={() => setEditingMaterial(material)}
                    >
                  <TableCell className="py-2">
                    <div className="flex items-center space-x-2">
                      {material.tipo === 'equipamento' ? (
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{material.codigo}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                            {material.tipo}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{material.nome}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-sm">
                      {material.categoria && (
                        <div className="font-medium">{material.categoria}</div>
                      )}
                      {material.subcategoria && (
                        <div className="text-xs text-muted-foreground">{material.subcategoria}</div>
                      )}
                      {!material.categoria && !material.subcategoria && '-'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-sm">
                      {material.localizacao?.nome || (
                        <span className="text-xs text-muted-foreground">Não definida</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-sm">
                      {material.marcas?.nome && (
                        <div className="flex items-center space-x-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span>{material.marcas.nome}</span>
                        </div>
                      )}
                      {material.modelo && (
                        <div className="text-xs text-muted-foreground">{material.modelo}</div>
                      )}
                      {!material.marcas?.nome && !material.modelo && '-'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {material.centros_custo ? (
                      <CentroCustoLabel
                        materialId={material.id}
                        centroCusto={{
                          codigo: material.centros_custo.codigo,
                          nome: material.centros_custo.empresas?.nome || material.centros_custo.descricao
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-center text-sm">
                      <div className="font-medium">{material.estoque_atual}</div>
                      <div className="text-xs text-muted-foreground">
                        Min: {material.estoque_minimo} {material.unidade_medida}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {formatCurrency(material.valor_unitario)}
                  </TableCell>
                  <TableCell className="py-2">
                    {(() => {
                      const statusCalibracao = verificarStatusCalibracao(
                        material.requer_calibracao,
                        material.proxima_calibracao,
                        material.frequencia_calibracao_meses
                      )
                      
                      return (
                        <div>
                          <Badge 
                            variant={statusCalibracao.cor} 
                            className="text-xs px-1 py-0 h-4 mb-1"
                          >
                            {statusCalibracao.icone}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {statusCalibracao.mensagem}
                          </div>
                        </div>
                      )
                    })()}
                  </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={getStatusColor(material.status)} className="text-xs px-2 py-0 h-5">
                          {getStatusLabel(material.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    
                      <ContextMenuItem onClick={() => setEditingMaterial(material)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </ContextMenuItem>
                    
                    
                      <ContextMenuItem onClick={() => setMovimentacaoMaterial(material)}>
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        Movimentar Estoque
                      </ContextMenuItem>
                    
                    
                      <ContextMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteClick(material)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </ContextMenuItem>
                    
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  {search ? 'Nenhum item encontrado com os critérios de busca.' : 'Nenhum item cadastrado.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  )
}

export default MateriaisEquipamentosPage
