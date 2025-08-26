import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Edit, Save, RotateCcw, Search, Grid, Package, MapPin, Settings, Trash2, Maximize } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { useSupabaseTable } from '@/hooks/useSupabase'
import type { Tables } from '@/types/database'

type Localizacao = Tables<'localizacao'>

interface Position {
  x: number
  y: number
}

interface LocalizacaoLocal extends Localizacao {
  width?: number
  height?: number
  tempPosition?: { x: number; y: number }
}

const MapaPage = () => {
  const { data: localizacoes, loading, update } = useSupabaseTable('localizacao')
  const { toast } = useToast()
  
  const [editMode, setEditMode] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocalizacaoLocal | null>(null)
  const [draggedLocation, setDraggedLocation] = useState<LocalizacaoLocal | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const [mapSize, setMapSize] = useState({ width: 800, height: 600 })
  const [customMapSize, setCustomMapSize] = useState({ width: 100, height: 75 }) // em vh/vw
  const [localLocalizacoes, setLocalLocalizacoes] = useState<LocalizacaoLocal[]>([])
  const [showSizeControls, setShowSizeControls] = useState(false)
  
  // Sincronizar dados locais com dados do banco
  useEffect(() => {
    if (localizacoes) {
      setLocalLocalizacoes(localizacoes.map(loc => ({
        ...loc,
        width: (loc as any).width || 80, // usar width do banco ou padrão
        height: (loc as any).height || 48  // usar height do banco ou padrão
      })))
    }
  }, [localizacoes])
  
  // Filtrar localizações baseado na busca
  const filteredLocalizacoes = localLocalizacoes?.filter(loc => 
    loc.codigo.toLowerCase().includes(search.toLowerCase()) ||
    loc.nome.toLowerCase().includes(search.toLowerCase())
  ) || []

  // Configurar tamanho do mapa
  useEffect(() => {
    const updateMapSize = () => {
      const container = document.getElementById('map-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        setMapSize({ width: rect.width - 32, height: rect.height - 32 })
      }
    }
    
    updateMapSize()
    window.addEventListener('resize', updateMapSize)
    return () => window.removeEventListener('resize', updateMapSize)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, localizacao: LocalizacaoLocal) => {
    if (!editMode || isResizing) return
    
    setDraggedLocation(localizacao)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', localizacao.id)
    
    // Criar uma imagem de drag personalizada (opcional)
    const dragImage = document.createElement('div')
    dragImage.textContent = localizacao.codigo
    dragImage.style.background = 'rgba(59, 130, 246, 0.8)'
    dragImage.style.color = 'white'
    dragImage.style.padding = '4px 8px'
    dragImage.style.borderRadius = '4px'
    dragImage.style.fontSize = '12px'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 20, 10)
    
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [editMode, isResizing])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!editMode || !draggedLocation || isResizing) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [editMode, draggedLocation, isResizing])

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!editMode || !draggedLocation || isResizing) return
    
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    
    // Calcular posição relativa corrigindo para o centro do elemento
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Limitar às bordas do mapa considerando que o elemento é centralizado
    const clampedX = Math.max(5, Math.min(95, x))
    const clampedY = Math.max(5, Math.min(95, y))
    
    // Atualizar localizações locais
    setLocalLocalizacoes(prev => 
      prev.map(loc => 
        loc.id === draggedLocation.id 
          ? { ...loc, posicao_x: Math.round(clampedX), posicao_y: Math.round(clampedY) }
          : loc
      )
    )
    
    setHasChanges(true)
    setDraggedLocation(null)
    setIsDragging(false)
    
    toast({
      title: 'Posição atualizada',
      description: `${draggedLocation.codigo} movido para ${Math.round(clampedX)}, ${Math.round(clampedY)}%`
    })
  }, [editMode, draggedLocation, isResizing, toast])
  
  // Handlers de redimensionamento
  const handleMouseDown = useCallback((e: React.MouseEvent, localizacao: LocalizacaoLocal, handle: string) => {
    if (!editMode) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setSelectedLocation(localizacao)
    setIsResizing(true)
    setResizeHandle(handle)
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = localizacao.width || 80
    const startHeight = localizacao.height || 48
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      let newWidth = startWidth
      let newHeight = startHeight
      
      switch (handle) {
        case 'se': // sudeste
          newWidth = Math.max(40, startWidth + deltaX)
          newHeight = Math.max(24, startHeight + deltaY)
          break
        case 'sw': // sudoeste
          newWidth = Math.max(40, startWidth - deltaX)
          newHeight = Math.max(24, startHeight + deltaY)
          break
        case 'ne': // nordeste
          newWidth = Math.max(40, startWidth + deltaX)
          newHeight = Math.max(24, startHeight - deltaY)
          break
        case 'nw': // noroeste
          newWidth = Math.max(40, startWidth - deltaX)
          newHeight = Math.max(24, startHeight - deltaY)
          break
      }
      
      // Limitar tamanhos máximos
      newWidth = Math.min(200, newWidth)
      newHeight = Math.min(120, newHeight)
      
      setLocalLocalizacoes(prev => 
        prev.map(loc => 
          loc.id === localizacao.id 
            ? { ...loc, width: newWidth, height: newHeight }
            : loc
        )
      )
      
      setHasChanges(true)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      setResizeHandle('')
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [editMode])

  const handleSaveChanges = async () => {
    if (!hasChanges) return
    
    try {
      // Salvar todas as localizações que foram modificadas
      const changedLocations = localLocalizacoes.filter(loc => {
        const original = localizacoes?.find(orig => orig.id === loc.id)
        if (!original) return false
        
        const originalWidth = (original as any).width || 80
        const originalHeight = (original as any).height || 48
        
        const hasPositionChange = original.posicao_x !== loc.posicao_x || original.posicao_y !== loc.posicao_y
        const hasSizeChange = originalWidth !== loc.width || originalHeight !== loc.height
        
        
        return hasPositionChange || hasSizeChange
      })
      
      if (changedLocations.length === 0) {
        toast({
          title: 'Nenhuma mudança',
          description: 'Não há alterações para salvar'
        })
        setHasChanges(false)
        return
      }
      
      const updates = changedLocations.map(async (loc) => {
        const result = await update(loc.id, {
          posicao_x: loc.posicao_x,
          posicao_y: loc.posicao_y,
          width: loc.width,
          height: loc.height
        })
        
        return result
      })
      
      const results = await Promise.all(updates)
      
      // Verificar se todas as atualizações foram bem-sucedidas
      const successCount = results.filter(result => result && result.error === null).length
      
      setHasChanges(false)
      setSelectedLocation(null)
      
      if (successCount === changedLocations.length) {
        toast({
          title: 'Sucesso',
          description: `${successCount} localização(ões) atualizada(s)!`
        })
      } else {
        toast({
          title: 'Parcialmente salvo',
          description: `${successCount}/${changedLocations.length} localizações salvas`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao salvar mudanças:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar as mudanças',
        variant: 'destructive'
      })
    }
  }

  const handleResetPositions = () => {
    // Restaurar estado original
    if (localizacoes) {
      setLocalLocalizacoes(localizacoes.map(loc => ({
        ...loc,
        width: (loc as any).width || 80,
        height: (loc as any).height || 48
      })))
    }
    setSelectedLocation(null)
    setHasChanges(false)
    setIsDragging(false)
    setIsResizing(false)
    toast({
      title: 'Mudanças descartadas',
      description: 'Posições e tamanhos restaurados'
    })
  }

  const handleResetAllPositions = async () => {
    try {
      // Resetar todas as posições no banco de dados
      const resetResult = await Promise.all(
        localLocalizacoes.map(async (loc) => {
          return update(loc.id, {
            posicao_x: null,
            posicao_y: null,
            width: 80,
            height: 48
          })
        })
      )
      
      const successCount = resetResult.filter(result => result && result.error === null).length
      
      if (successCount === localLocalizacoes.length) {
        toast({
          title: 'Posições resetadas',
          description: `Todas as ${successCount} localizações foram resetadas`
        })
      } else {
        toast({
          title: 'Reset parcial',
          description: `${successCount}/${localLocalizacoes.length} localizações resetadas`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao resetar posições:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao resetar posições',
        variant: 'destructive'
      })
    }
  }

  const getLocationColor = (localizacao: Localizacao) => {
    if (!localizacao.ativo) return 'bg-gray-400/20 border-gray-400'
    
    // Cores baseadas no tipo de localização
    if (localizacao.nome.toLowerCase().includes('receb')) return 'bg-blue-500/20 border-blue-500'
    if (localizacao.nome.toLowerCase().includes('expedi')) return 'bg-orange-500/20 border-orange-500'
    if (localizacao.nome.toLowerCase().includes('armario')) return 'bg-purple-500/20 border-purple-500'
    if (localizacao.nome.toLowerCase().includes('prateleira')) return 'bg-green-500/20 border-green-500'
    if (localizacao.nome.toLowerCase().includes('estoque')) return 'bg-primary/20 border-primary'
    
    return 'bg-slate-500/20 border-slate-500'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/localizacao">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Mapa Visual do Almoxarifado</h1>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/localizacao">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Mapa Visual do Almoxarifado</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Edit className="h-4 w-4" />
            <Switch
              checked={editMode}
              onCheckedChange={setEditMode}
            />
            <span className="text-sm">Modo Edição</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Controles de tamanho do layout */}
            <Button
              onClick={() => setShowSizeControls(!showSizeControls)}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Layout
            </Button>
            
            {/* Reset geral */}
            <Button
              onClick={handleResetAllPositions}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Posições
            </Button>
            
            {editMode && hasChanges && (
              <>
                <Button onClick={handleResetPositions} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Descartar
                </Button>
                <Button onClick={handleSaveChanges} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4">
        <Badge variant="secondary">
          <MapPin className="h-3 w-3 mr-1" />
          {filteredLocalizacoes.length} localizações
        </Badge>
        <Badge variant="outline">
          <Grid className="h-3 w-3 mr-1" />
          {filteredLocalizacoes.filter(loc => loc.posicao_x !== null && loc.posicao_y !== null).length} posicionadas
        </Badge>
        {editMode && (
          <Badge variant="outline" className="text-blue-600">
            <Edit className="h-3 w-3 mr-1" />
            {isResizing ? 'Redimensionando...' : isDragging ? 'Movendo...' : 'Modo Edição'}
          </Badge>
        )}
        {selectedLocation && editMode && (
          <Badge variant="outline" className="text-green-600">
            <Package className="h-3 w-3 mr-1" />
            {selectedLocation.codigo} selecionada
          </Badge>
        )}
      </div>

      {/* Controles de Tamanho do Layout */}
      {showSizeControls && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Maximize className="h-4 w-4" />
                Tamanho do Layout Interativo
              </h3>
              <p className="text-sm text-muted-foreground">
                Ajuste as dimensões da área de visualização do mapa
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm">Largura:</label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={customMapSize.width}
                  onChange={(e) => setCustomMapSize(prev => ({ ...prev, width: parseInt(e.target.value) || 100 }))}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">vw</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm">Altura:</label>
                <Input
                  type="number"
                  min="40"
                  max="90"
                  value={customMapSize.height}
                  onChange={(e) => setCustomMapSize(prev => ({ ...prev, height: parseInt(e.target.value) || 75 }))}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">vh</span>
              </div>
              <Button
                onClick={() => setCustomMapSize({ width: 100, height: 75 })}
                variant="outline"
                size="sm"
              >
                Padrão
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Mapa */}
      <Card 
        className="transition-all duration-300"
        style={{ 
          height: `${customMapSize.height}vh`,
          width: `${customMapSize.width}vw`,
          maxWidth: '100%'
        }}
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Layout Interativo do Almoxarifado
          </CardTitle>
          {editMode && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                🖱️ <strong>Arraste</strong> as localizações para movê-las no mapa
              </p>
              <p className="text-sm text-muted-foreground">
                🔵 <strong>Clique</strong> em uma localização e puxe os <strong>pontos azuis nos cantos</strong> para redimensionar
              </p>
              <p className="text-sm text-muted-foreground">
                💾 Use <strong>"Salvar"</strong> para persistir as mudanças
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div
              id="map-container"
              className="relative w-full h-full bg-muted/10 rounded-lg border-2 border-dashed border-muted overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ minHeight: '500px' }}
            >
              {/* Grid de fundo */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #000 1px, transparent 1px),
                    linear-gradient(to bottom, #000 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px'
                }}
              />
              
              {/* Localizações posicionadas */}
              {filteredLocalizacoes
                .filter(loc => loc.posicao_x !== null && loc.posicao_y !== null)
                .map((localizacao) => (
                  <Tooltip key={localizacao.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-lg border-2 
                          ${getLocationColor(localizacao)} 
                          ${editMode && !isResizing ? 'cursor-move hover:scale-105' : 'cursor-pointer'}
                          ${selectedLocation?.id === localizacao.id ? 'ring-2 ring-blue-500' : ''}
                          ${isDragging && draggedLocation?.id === localizacao.id ? 'opacity-50' : 'opacity-90'}
                          ${isResizing && selectedLocation?.id === localizacao.id ? 'ring-2 ring-orange-500' : ''}
                          transition-all duration-200 flex items-center justify-center text-xs font-medium relative group`}
                        style={{
                          left: `${localizacao.posicao_x}%`,
                          top: `${localizacao.posicao_y}%`,
                          width: `${localizacao.width || 80}px`,
                          height: `${localizacao.height || 48}px`,
                        }}
                        draggable={editMode && !isResizing}
                        onDragStart={(e) => handleDragStart(e, localizacao)}
                        onClick={() => {
                          if (!editMode) setSelectedLocation(localizacao)
                          if (editMode && !isResizing) setSelectedLocation(localizacao)
                        }}
                      >
                        <div className="text-center pointer-events-none">
                          <div className="font-bold text-[10px] leading-tight">{localizacao.codigo}</div>
                          <div className="text-[8px] opacity-75 truncate leading-tight">
                            {localizacao.nome.split(' ').slice(0, 2).join(' ')}
                          </div>
                        </div>
                        
                        {/* Handles de redimensionamento - apenas no modo edição */}
                        {editMode && selectedLocation?.id === localizacao.id && (
                          <>
                            {/* Handle sudeste */}
                            <div
                              className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border border-white cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transform: 'translate(50%, 50%)' }}
                              onMouseDown={(e) => handleMouseDown(e, localizacao, 'se')}
                            />
                            {/* Handle sudoeste */}
                            <div
                              className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transform: 'translate(-50%, 50%)' }}
                              onMouseDown={(e) => handleMouseDown(e, localizacao, 'sw')}
                            />
                            {/* Handle nordeste */}
                            <div
                              className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transform: 'translate(50%, -50%)' }}
                              onMouseDown={(e) => handleMouseDown(e, localizacao, 'ne')}
                            />
                            {/* Handle noroeste */}
                            <div
                              className="absolute top-0 left-0 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transform: 'translate(-50%, -50%)' }}
                              onMouseDown={(e) => handleMouseDown(e, localizacao, 'nw')}
                            />
                          </>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">
                      <div className="space-y-1">
                        <p className="font-medium">{localizacao.codigo} - {localizacao.nome}</p>
                        {localizacao.descricao && (
                          <p className="text-xs text-muted-foreground">{localizacao.descricao}</p>
                        )}
                        <div className="text-xs space-y-1">
                          {localizacao.predio && <p>Prédio: {localizacao.predio}</p>}
                          {localizacao.andar && <p>Andar: {localizacao.andar}</p>}
                          {localizacao.sala && <p>Sala: {localizacao.sala}</p>}
                          <p>Posição: X:{localizacao.posicao_x}%, Y:{localizacao.posicao_y}%</p>
                          {editMode && <p>Tamanho: {localizacao.width || 80}x{localizacao.height || 48}px</p>}
                          <p>Status: {localizacao.ativo ? 'Ativo' : 'Inativo'}</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              
              {/* Localizações não posicionadas */}
              <div className="absolute top-4 right-4 max-w-64">
                <div className="bg-white/95 dark:bg-black/95 backdrop-blur-sm rounded-lg border p-3 shadow-lg">
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Não Posicionadas ({filteredLocalizacoes.filter(loc => loc.posicao_x === null || loc.posicao_y === null).length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {filteredLocalizacoes
                      .filter(loc => loc.posicao_x === null || loc.posicao_y === null)
                      .map((localizacao) => (
                        <div
                          key={localizacao.id}
                          className={`p-2 rounded text-xs border ${getLocationColor(localizacao)} 
                            ${editMode ? 'cursor-move' : 'cursor-pointer'} hover:scale-105 transition-transform`}
                          draggable={editMode}
                          onDragStart={(e) => handleDragStart(e, localizacao)}
                          onClick={() => setSelectedLocation(localizacao)}
                        >
                          <div className="font-medium">{localizacao.codigo}</div>
                          <div className="text-[10px] opacity-75 truncate">{localizacao.nome}</div>
                        </div>
                      ))}
                  </div>
                  {editMode && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Arraste para o mapa para posicionar
                    </p>
                  )}
                </div>
              </div>
              
              {/* Instruções quando vazio */}
              {filteredLocalizacoes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">Nenhuma localização encontrada</p>
                    <p className="text-sm">
                      {search ? 'Tente outro termo de busca' : 'Cadastre localizações para visualizar no mapa'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  )
}

export default MapaPage
