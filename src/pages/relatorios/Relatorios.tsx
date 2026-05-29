import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Package,
  TrendingUp,
  Building,
  BarChart3,
  FileText,
  Calendar,
  ClipboardList,
  PieChart,
  RotateCcw,
  AlertTriangle,
  FileDown,
  Filter,
  Download,
  Activity,
  ArrowLeft
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import { useReports } from '@/hooks/useReports'
import { ReportRequest, REPORT_CONFIGS } from '@/types/reports'
import RelatorioInterativo from '@/components/relatorios/RelatorioInterativo'

const RelatoriosPage = () => {
  const { toast } = useToast()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const [activeInteractiveReport, setActiveInteractiveReport] = useState<{
    id: string
    titulo: string
  } | null>(null)

  // Hook para centralização inteligente do dialog de relatórios (funciona com zoom)
  const dialogPosition = useCenteredDialog(!!selectedReport)

  // Forçar reposicionamento dos diálogos para lidar com zoom e scroll
  useEffect(() => {
    if (selectedReport) {
      // Pequeno delay para permitir que o DOM se atualize
      setTimeout(() => {
        const dialogElements = document.querySelectorAll('[role="dialog"]')
        dialogElements.forEach((dialog) => {
          if (dialog instanceof HTMLElement) {
            const viewportHeight = window.innerHeight
            const viewportWidth = window.innerWidth
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
            
            const centerY = scrollTop + (viewportHeight / 2)
            const centerX = scrollLeft + (viewportWidth / 2)
            
            dialog.style.position = 'fixed'
            dialog.style.top = `${centerY}px`
            dialog.style.left = `${centerX}px`
            dialog.style.transform = 'translate(-50%, -50%)'
            dialog.style.zIndex = '9999'
          }
        })
      }, 100)
    }
  }, [selectedReport])
  
  const { isGenerating, generateReport, validateFilters, filterOptions } = useReports({
    onSuccess: (response) => {
      const reportConfig = REPORT_CONFIGS.find(config => config.id === selectedReport)
      toast({
        title: 'Relatório gerado com sucesso!',
        description: `O relatório "${reportConfig?.titulo}" foi gerado e o download iniciará automaticamente.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao gerar relatório',
        description: error || 'Ocorreu um erro interno. Tente novamente.',
        variant: 'destructive'
      })
    }
  })

  const getIcon = (iconName: string) => {
    const icons = {
      Package: Package,
      TrendingUp: TrendingUp,
      Building: Building,
      BarChart3: BarChart3,
      FileText: FileText,
      Calendar: Calendar,
      ClipboardList: ClipboardList,
      PieChart: PieChart,
      RotateCcw: RotateCcw,
      AlertTriangle: AlertTriangle,
      Activity: Activity
    }
    const IconComponent = icons[iconName as keyof typeof icons] || FileText
    return <IconComponent className="h-5 w-5" />
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Estoque': 'bg-blue-100 text-blue-800',
      'Movimentação': 'bg-green-100 text-green-800', 
      'Qualidade': 'bg-purple-100 text-purple-800',
      'Custos': 'bg-yellow-100 text-yellow-800',
      'Compras': 'bg-orange-100 text-orange-800',
      'Operações': 'bg-teal-100 text-teal-800',
      'Estratégico': 'bg-indigo-100 text-indigo-800',
      'Controle': 'bg-red-100 text-red-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryLabel = (category: string) => {
    return category
  }

  const handleGenerateReport = async () => {
    if (!selectedReport) return

    const reportConfig = REPORT_CONFIGS.find(config => config.id === selectedReport)
    if (!reportConfig) return

    // Validar filtros
    const validationError = validateFilters(selectedReport, filters)
    
    if (validationError) {
      toast({
        title: 'Dados inválidos',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    const request: ReportRequest = {
      reportId: selectedReport,
      filtros: filters,
      formato: format,
      titulo: reportConfig.titulo
    }

    const success = await generateReport(request)
    
    if (success) {
      setSelectedReport(null)
      setFilters({})
    }
  }

  const handleInteractiveReport = (config: typeof REPORT_CONFIGS[0]) => {
    setActiveInteractiveReport({
      id: config.id,
      titulo: config.titulo
    })
  }

  const renderFilters = (config: typeof REPORT_CONFIGS[0]) => {
    return (
      <div className="space-y-4">
        {(config.filtrosObrigatorios.includes('dataInicio') || config.filtrosObrigatorios.includes('dataFim')) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filters.dataInicio || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filters.dataFim || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
          </div>
        )}

        {config.filtrosOpcionais.includes('categoria') && (
          <div>
            <Label>Categoria</Label>
            <Select
              value={filters.categoria || 'todas'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, categoria: value === 'todas' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {filterOptions.categories.map(category => (
                  <SelectItem key={category.id} value={category.nome}>
                    {category.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosOpcionais.includes('tipoMovimentacao') && (
          <div>
            <Label>Tipo de Movimentação</Label>
            <Select
              value={filters.tipoMovimentacao || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipoMovimentacao: value === 'todos' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosOpcionais.includes('centroCusto') && (
          <div>
            <Label>Centro de Custo</Label>
            <Select
              value={filters.centroCusto || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, centroCusto: value === 'todos' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os centros de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os centros de custo</SelectItem>
                {filterOptions.centrosCusto.map(centro => (
                  <SelectItem key={centro.id} value={centro.id}>
                    {centro.codigo} - {centro.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosOpcionais.includes('incluirInativos') && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluirInativos"
              checked={filters.incluirInativos || false}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, incluirInativos: checked }))}
            />
            <Label htmlFor="incluirInativos">Incluir produtos inativos</Label>
          </div>
        )}

        {config.filtrosOpcionais.includes('incluirZerados') && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluirZerados"
              checked={filters.incluirZerados || false}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, incluirZerados: checked }))}
            />
            <Label htmlFor="incluirZerados">Incluir estoque zerado</Label>
          </div>
        )}

        {/* Filtro específico para inventário geral */}
        {config.filtrosObrigatorios.includes('agruparPor') && (
          <div>
            <Label>Agrupar Por</Label>
            <Select
              value={filters.agruparPor || 'categoria'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, agruparPor: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="categoria">Categoria</SelectItem>
                <SelectItem value="localizacao">Localização</SelectItem>
                <SelectItem value="fornecedor">Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtros específicos para análise ABC/XYZ */}
        {config.filtrosObrigatorios.includes('criterioABC') && (
          <>
            <div>
              <Label>Critério ABC</Label>
              <Select
                value={filters.criterioABC || 'valor'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, criterioABC: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Valor</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                  <SelectItem value="movimentacao">Movimentação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Critério XYZ</Label>
              <Select
                value={filters.criterioXYZ || 'giro'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, criterioXYZ: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="giro">Giro</SelectItem>
                  <SelectItem value="variabilidade">Variabilidade</SelectItem>
                  <SelectItem value="sazonalidade">Sazonalidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Filtros específicos para outros relatórios */}
        {config.filtrosObrigatorios.includes('formato') && (
          <div>
            <Label>Formato do Relatório</Label>
            <Select
              value={filters.formato || 'analitico'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, formato: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analitico">Analítico</SelectItem>
                <SelectItem value="sintetico">Sintético</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosObrigatorios.includes('tipoMaterial') && (
          <div>
            <Label>Tipo de Material</Label>
            <Select
              value={filters.tipoMaterial || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipoMaterial: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="epi">EPIs</SelectItem>
                <SelectItem value="medicamento">Medicamentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosObrigatorios.includes('ordenarPor') && (
          <div>
            <Label>Ordenar Por</Label>
            <Select
              value={filters.ordenarPor || 'leadtime'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, ordenarPor: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leadtime">Lead Time</SelectItem>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="participacao">Participação</SelectItem>
                <SelectItem value="pontualidade">Pontualidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosObrigatorios.includes('aging') && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="aging"
              checked={filters.aging || false}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, aging: checked }))}
            />
            <Label htmlFor="aging">Incluir análise de aging</Label>
          </div>
        )}

        {config.filtrosObrigatorios.includes('ciclo') && (
          <div>
            <Label>Ciclo de Inventário</Label>
            <Select
              value={filters.ciclo || 'mensal'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, ciclo: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosOpcionais.includes('material') && (
          <div>
            <Label>Material/Equipamento</Label>
            <Select
              value={filters.material || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, material: value === 'todos' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os materiais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os materiais</SelectItem>
                {filterOptions.materiais.map(material => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.codigo} - {material.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosOpcionais.includes('responsavel') && (
          <div>
            <Label>Responsável</Label>
            <Select
              value={filters.responsavel || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, responsavel: value === 'todos' ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {filterOptions.colaboradores.map(colaborador => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {config.filtrosOpcionais.includes('diasAlerta') && (
          <div>
            <Label htmlFor="diasAlerta">Dias de Alerta</Label>
            <Input
              id="diasAlerta"
              type="number"
              min="1"
              max="365"
              value={filters.diasAlerta || 30}
              onChange={(e) => setFilters(prev => ({ ...prev, diasAlerta: parseInt(e.target.value) }))}
            />
          </div>
        )}
      </div>
    )
  }

  const handleTestReport = async () => {
    const request: ReportRequest = {
      reportId: 'test-report',
      filtros: {},
      formato: 'pdf',
      titulo: 'Relatório de Teste - Diagnóstico'
    }

    const success = await generateReport(request)
    
    if (success) {
      console.log('✅ Relatório de teste gerado com sucesso!')
    }
  }

  // Se há um relatório interativo ativo, mostrar apenas ele
  if (activeInteractiveReport) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        {/* Container centralizado com largura máxima */}
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveInteractiveReport(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <h1 className="text-2xl font-bold">Relatórios</h1>
              </div>
            </div>

            <RelatorioInterativo
              reportId={activeInteractiveReport.id}
              titulo={activeInteractiveReport.titulo}
              onClose={() => setActiveInteractiveReport(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Container centralizado com largura máxima */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTestReport}
            disabled={isGenerating}
          >
            🧪 Teste Diagnóstico
          </Button>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {REPORT_CONFIGS.length} relatórios disponíveis
          </span>
        </div>
      </div>

      {/* Cards de Relatórios agrupados por categoria */}
      {['Estoque', 'Movimentação', 'Qualidade', 'Custos', 'Compras', 'Operações', 'Estratégico', 'Controle'].map(category => {
        const categoryReports = REPORT_CONFIGS.filter(config => config.categoria === category)
        if (categoryReports.length === 0) return null

        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{getCategoryLabel(category)}</h2>
              <Badge className={getCategoryColor(category)}>
                {categoryReports.length} relatório{categoryReports.length > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryReports.map((config) => (
                <Card key={config.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getIcon(config.icon)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{config.titulo}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {getCategoryLabel(config.categoria)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {config.descricao}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {config.formatosDisponiveis.map(fmt => (
                        <Badge key={fmt} variant="secondary" className="text-xs">
                          {fmt.toUpperCase()}
                        </Badge>
                      ))}
                    </div>

                    {config.isInteractive ? (
                      <div className="space-y-2">
                        <Button 
                          variant="default" 
                          className="w-full"
                          onClick={() => handleInteractiveReport(config)}
                        >
                          <Activity className="mr-2 h-4 w-4" />
                          Visualizar Interativo
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => {
                                setSelectedReport(config.id.replace('-interativa', ''))
                                const defaultFilters: Record<string, any> = {}
                                defaultFilters.formato = 'analitico'
                                setFilters(defaultFilters)
                                setFormat('pdf')
                              }}
                            >
                              <FileDown className="mr-2 h-4 w-4" />
                              Gerar PDF
                            </Button>
                          </DialogTrigger>
                          
                          {selectedReport === config.id.replace('-interativa', '') && (
                            <DialogContent className="max-w-md" aria-describedby="dialog-description">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  {getIcon(config.icon)}
                                  {config.titulo}
                                </DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-6">
                                <p id="dialog-description" className="sr-only">
                                  Configure os filtros e formato para gerar o relatório {config.titulo}
                                </p>
                                <div>
                                  <Label>Formato do Relatório</Label>
                                  <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {config.formatosDisponiveis.map(fmt => (
                                        <SelectItem key={fmt} value={fmt}>
                                          {fmt.toUpperCase()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {renderFilters(REPORT_CONFIGS.find(c => c.id === config.id.replace('-interativa', '')) || config)}

                                <div className="flex gap-3">
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setSelectedReport(null)}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    className="flex-1"
                                    onClick={handleGenerateReport}
                                    disabled={isGenerating}
                                  >
                                    {isGenerating ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Gerando...
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Download className="h-4 w-4" />
                                        Gerar
                                      </div>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          )}
                        </Dialog>
                      </div>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              setSelectedReport(config.id)
                              // Inicializar filtros com valores padrão baseados nos filtros obrigatórios
                              const defaultFilters: Record<string, any> = {}
                              
                              if (config.filtrosObrigatorios.includes('agruparPor')) {
                                defaultFilters.agruparPor = 'categoria'
                              }
                              if (config.filtrosObrigatorios.includes('formato')) {
                                defaultFilters.formato = 'analitico'
                              }
                              if (config.filtrosObrigatorios.includes('tipoMaterial')) {
                                defaultFilters.tipoMaterial = 'todos'
                              }
                              if (config.filtrosObrigatorios.includes('ordenarPor')) {
                                defaultFilters.ordenarPor = 'leadtime'
                              }
                              if (config.filtrosObrigatorios.includes('aging')) {
                                defaultFilters.aging = true
                              }
                              if (config.filtrosObrigatorios.includes('ciclo')) {
                                defaultFilters.ciclo = 'mensal'
                              }
                              if (config.filtrosObrigatorios.includes('criterioABC')) {
                                defaultFilters.criterioABC = 'valor'
                                defaultFilters.criterioXYZ = 'giro'
                              }
                              
                              setFilters(defaultFilters)
                              setFormat('pdf')
                            }}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Gerar Relatório
                          </Button>
                        </DialogTrigger>
                        
                        {selectedReport === config.id && (
                          <DialogContent className="max-w-md" aria-describedby="dialog-description">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getIcon(config.icon)}
                                {config.titulo}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              <p id="dialog-description" className="sr-only">
                                Configure os filtros e formato para gerar o relatório {config.titulo}
                              </p>
                              <div>
                                <Label>Formato do Relatório</Label>
                                <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {config.formatosDisponiveis.map(fmt => (
                                      <SelectItem key={fmt} value={fmt}>
                                        {fmt.toUpperCase()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {renderFilters(config)}

                              <div className="flex gap-3">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setSelectedReport(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  className="flex-1"
                                  onClick={handleGenerateReport}
                                  disabled={isGenerating}
                                >
                                  {isGenerating ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Gerando...
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Download className="h-4 w-4" />
                                      Gerar
                                    </div>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
        </div>
      </div>
    </div>
  )
}

export default RelatoriosPage
