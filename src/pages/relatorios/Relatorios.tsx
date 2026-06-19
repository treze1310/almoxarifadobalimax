import { useLayoutEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Download
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useReports } from '@/hooks/useReports'
import { ReportRequest, REPORT_CONFIGS } from '@/types/reports'

type ReportSelectOption = {
  value: string
  label: string
}

type ReportNativeSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: ReportSelectOption[]
  placeholder?: string
}

const ReportNativeSelect = ({ value, onValueChange, options, placeholder }: ReportNativeSelectProps) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger>
      <SelectValue placeholder={placeholder || 'Selecione'} />
    </SelectTrigger>
    <SelectContent
      className="z-[10001] max-h-52 border bg-white text-slate-900 shadow-md"
      position="popper"
      side="bottom"
      align="start"
      sideOffset={4}
      avoidCollisions={false}
    >
      {options.map(option => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

const RelatoriosPage = () => {
  const { toast } = useToast()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const { isGenerating, generateReport, validateFilters, filterOptions } = useReports({
    onSuccess: () => {
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

  const applyReportDialogCenter = () => {
    const viewport = window.visualViewport
    const viewportTop = viewport?.offsetTop ?? 0
    const viewportLeft = viewport?.offsetLeft ?? 0
    const viewportWidth = viewport?.width ?? window.innerWidth
    const viewportHeight = viewport?.height ?? window.innerHeight

    document.documentElement.style.setProperty(
      '--relatorios-dialog-top',
      `${viewportTop + viewportHeight / 2}px`,
    )
    document.documentElement.style.setProperty(
      '--relatorios-dialog-left',
      `${viewportLeft + viewportWidth / 2}px`,
    )
  }

  useLayoutEffect(() => {
    if (!selectedReport) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const viewport = window.visualViewport

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    applyReportDialogCenter()
    viewport?.addEventListener('resize', applyReportDialogCenter)
    viewport?.addEventListener('scroll', applyReportDialogCenter)
    window.addEventListener('resize', applyReportDialogCenter)
    window.addEventListener('scroll', applyReportDialogCenter, true)

    return () => {
      viewport?.removeEventListener('resize', applyReportDialogCenter)
      viewport?.removeEventListener('scroll', applyReportDialogCenter)
      window.removeEventListener('resize', applyReportDialogCenter)
      window.removeEventListener('scroll', applyReportDialogCenter, true)
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      document.documentElement.style.removeProperty('--relatorios-dialog-top')
      document.documentElement.style.removeProperty('--relatorios-dialog-left')
    }
  }, [selectedReport])

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
      AlertTriangle: AlertTriangle
    }
    const IconComponent = icons[iconName as keyof typeof icons] || FileText
    return <IconComponent className="h-5 w-5" />
  }

  const getCategoryLabel = (category: string) => {
    return category
  }

  const getDefaultDateRange = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)

    return {
      dataInicio: start.toISOString().split('T')[0],
      dataFim: end.toISOString().split('T')[0],
    }
  }

  const buildDefaultFilters = (config: typeof REPORT_CONFIGS[0]) => {
    const defaultFilters: Record<string, any> = {}

    if (config.filtrosObrigatorios.includes('dataInicio') || config.filtrosObrigatorios.includes('dataFim')) {
      Object.assign(defaultFilters, getDefaultDateRange())
    }
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

    return defaultFilters
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

  const renderFilters = (config: typeof REPORT_CONFIGS[0]) => {
    return (
      <div className="space-y-4">
        {(config.filtrosObrigatorios.includes('dataInicio') ||
          config.filtrosObrigatorios.includes('dataFim') ||
          config.filtrosOpcionais.includes('dataInicio') ||
          config.filtrosOpcionais.includes('dataFim')) && (
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

        {config.filtrosOpcionais.includes('localizacao') && (
          <div>
            <Label>Localização</Label>
            <ReportNativeSelect
              value={filters.localizacao || 'todas'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, localizacao: value === 'todas' ?undefined : value }))}
              options={[
                { value: 'todas', label: 'Todas as localizações' },
                ...filterOptions.localizacoes.map(localizacao => ({
                  value: localizacao.id,
                  label: localizacao.nome
                }))
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('fornecedor') && (
          <div>
            <Label>Fornecedor</Label>
            <ReportNativeSelect
              value={filters.fornecedor || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, fornecedor: value === 'todos' ?undefined : value }))}
              options={[
                { value: 'todos', label: 'Todos os fornecedores' },
                ...filterOptions.fornecedores.map(fornecedor => ({
                  value: fornecedor.id,
                  label: fornecedor.nome
                }))
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('status') && (
          <div>
            <Label>Status</Label>
            <ReportNativeSelect
              value={filters.status || 'ativo'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={[
                { value: 'ativo', label: 'Ativos' },
                { value: 'inativo', label: 'Inativos' },
                { value: 'todos', label: 'Todos' }
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('categoria') && (
          <div>
            <Label>Categoria</Label>
            <ReportNativeSelect
              value={filters.categoria || 'todas'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, categoria: value === 'todas' ?undefined : value }))}
              options={[
                { value: 'todas', label: 'Todas as categorias' },
                ...filterOptions.categories.map(category => ({
                  value: category.nome,
                  label: category.nome
                }))
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('tipoMovimentacao') && (
          <div>
            <Label>Tipo de Movimentação</Label>
            <ReportNativeSelect
              value={filters.tipoMovimentacao || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipoMovimentacao: value === 'todos' ?undefined : value }))}
              options={[
                { value: 'todos', label: 'Todos os tipos' },
                { value: 'entrada', label: 'Entrada' },
                { value: 'saida', label: 'Saída' },
                { value: 'ajuste', label: 'Ajuste' }
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('centroCusto') && (
          <div>
            <Label>Centro de Custo</Label>
            <ReportNativeSelect
              value={filters.centroCusto || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, centroCusto: value === 'todos' ?undefined : value }))}
              options={[
                { value: 'todos', label: 'Todos os centros de custo' },
                ...filterOptions.centrosCusto.map(centro => ({
                  value: centro.id,
                  label: `${centro.codigo} - ${centro.descricao}`
                }))
              ]}
            />
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
            <ReportNativeSelect
              value={filters.agruparPor || 'categoria'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, agruparPor: value }))}
              options={[
                { value: 'categoria', label: 'Categoria' },
                { value: 'localizacao', label: 'Localização' },
                { value: 'fornecedor', label: 'Fornecedor' }
              ]}
            />
          </div>
        )}

        {/* Filtros específicos para análise ABC/XYZ */}
        {config.filtrosObrigatorios.includes('criterioABC') && (
          <>
            <div>
              <Label>Critério ABC</Label>
              <ReportNativeSelect
                value={filters.criterioABC || 'valor'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, criterioABC: value }))}
                options={[
                  { value: 'valor', label: 'Valor' },
                  { value: 'quantidade', label: 'Quantidade' },
                  { value: 'movimentacao', label: 'Movimentação' }
                ]}
              />
            </div>
            <div>
              <Label>Critério XYZ</Label>
              <ReportNativeSelect
                value={filters.criterioXYZ || 'giro'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, criterioXYZ: value }))}
                options={[
                  { value: 'giro', label: 'Giro' },
                  { value: 'variabilidade', label: 'Variabilidade' },
                  { value: 'sazonalidade', label: 'Sazonalidade' }
                ]}
              />
            </div>
          </>
        )}

        {/* Filtros específicos para outros relatórios */}
        {config.filtrosObrigatorios.includes('formato') && (
          <div>
            <Label>Formato do Relatório</Label>
            <ReportNativeSelect
              value={filters.formato || 'analitico'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, formato: value }))}
              options={[
                { value: 'analitico', label: 'Analítico' },
                { value: 'sintetico', label: 'Sintético' }
              ]}
            />
          </div>
        )}

        {config.filtrosObrigatorios.includes('tipoMaterial') && (
          <div>
            <Label>Tipo de Material</Label>
            <ReportNativeSelect
              value={filters.tipoMaterial || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipoMaterial: value }))}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'epi', label: 'EPIs' },
                { value: 'medicamento', label: 'Medicamentos' }
              ]}
            />
          </div>
        )}

        {config.filtrosObrigatorios.includes('ordenarPor') && (
          <div>
            <Label>Ordenar Por</Label>
            <ReportNativeSelect
              value={filters.ordenarPor || 'leadtime'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, ordenarPor: value }))}
              options={[
                { value: 'leadtime', label: 'Lead Time' },
                { value: 'qualidade', label: 'Qualidade' },
                { value: 'participacao', label: 'Participação' },
                { value: 'pontualidade', label: 'Pontualidade' }
              ]}
            />
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
            <ReportNativeSelect
              value={filters.ciclo || 'mensal'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, ciclo: value }))}
              options={[
                { value: 'semanal', label: 'Semanal' },
                { value: 'mensal', label: 'Mensal' },
                { value: 'trimestral', label: 'Trimestral' }
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('material') && (
          <div>
            <Label>Material/Equipamento</Label>
            <ReportNativeSelect
              value={filters.material || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, material: value === 'todos' ?undefined : value }))}
              options={[
                { value: 'todos', label: 'Todos os materiais' },
                ...filterOptions.materiais.map(material => ({
                  value: material.id,
                  label: `${material.codigo} - ${material.nome}`
                }))
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('responsavel') && (
          <div>
            <Label>Responsável</Label>
            <ReportNativeSelect
              value={filters.responsavel || 'todos'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, responsavel: value === 'todos' ?undefined : value }))}
              options={[
                { value: 'todos', label: 'Todos os responsáveis' },
                ...filterOptions.colaboradores.map(colaborador => ({
                  value: colaborador.id,
                  label: colaborador.nome
                }))
              ]}
            />
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

        {config.filtrosOpcionais.includes('prioridade') && (
          <div>
            <Label>Prioridade</Label>
            <ReportNativeSelect
              value={filters.prioridade || 'todas'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, prioridade: value === 'todas' ?undefined : value }))}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'alta', label: 'Alta/Urgente' },
                { value: 'media', label: 'Normal' },
                { value: 'baixa', label: 'Baixa' }
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('criticidade') && (
          <div>
            <Label>Criticidade</Label>
            <ReportNativeSelect
              value={filters.criticidade || 'todas'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, criticidade: value === 'todas' ?undefined : value }))}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'critica', label: 'Crítica' },
                { value: 'alerta', label: 'Alerta' },
                { value: 'atencao', label: 'Atenção' },
                { value: 'normal', label: 'Normal' }
              ]}
            />
          </div>
        )}

        {config.filtrosOpcionais.includes('limitarTop') && (
          <div>
            <Label htmlFor="limitarTop">Limitar Top</Label>
            <Input
              id="limitarTop"
              type="number"
              min="1"
              max="100"
              value={filters.limitarTop || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, limitarTop: e.target.value ?parseInt(e.target.value) : undefined }))}
              placeholder="Ex: 10"
            />
          </div>
        )}

        {[
          ['incluirAnaliseABC', 'Incluir análise ABC'],
          ['incluirVencidos', 'Incluir itens vencidos'],
          ['incluirPerformance', 'Incluir métricas de performance'],
          ['incluirHistoricoPrecos', 'Incluir histórico de preços'],
          ['comparativoAnterior', 'Comparar com período anterior'],
          ['incluirVariacao', 'Incluir variação'],
          ['incluirGraficos', 'Incluir gráficos'],
          ['incluirMatriz', 'Incluir matriz'],
          ['incluirSugestoes', 'Incluir sugestões'],
          ['incluirDivergencias', 'Incluir divergências'],
          ['incluirTendencias', 'Incluir tendências'],
        ].filter(([key]) => config.filtrosOpcionais.includes(key)).map(([key, label]) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox
              id={key}
              checked={filters[key] || false}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, [key]: checked }))}
            />
            <Label htmlFor={key}>{label}</Label>
          </div>
        ))}
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
      console.log('Relatório de teste gerado com sucesso!')
    }
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
            Teste Diagnóstico
          </Button>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {REPORT_CONFIGS.length} relatórios disponíveis
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {REPORT_CONFIGS.map((config) => (
          <Card key={config.id} className="hover:shadow-sm transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  {getIcon(config.icon)}
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-sm leading-tight">{config.titulo}</CardTitle>
                  <Badge variant="outline" className="text-[11px] leading-none">
                    {getCategoryLabel(config.categoria)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <p className="text-xs text-muted-foreground leading-snug">
                {config.descricao}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {config.formatosDisponiveis.map(fmt => (
                  <Badge key={fmt} variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {fmt.toUpperCase()}
                  </Badge>
                ))}
              </div>

              <Dialog
                open={selectedReport === config.id}
                onOpenChange={(open) => {
                  if (!open && selectedReport === config.id) {
                    setSelectedReport(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      applyReportDialogCenter()
                      setSelectedReport(config.id)
                      setFilters(buildDefaultFilters(config))
                      setFormat('pdf')
                    }}
                  >
                    <FileDown className="mr-2 h-3.5 w-3.5" />
                    Gerar Relatório
                  </Button>
                </DialogTrigger>
                
                {selectedReport === config.id && (
                  <DialogContent
                    className="relatorios-report-dialog max-w-md"
                    aria-describedby="dialog-description"
                  >
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
                        <ReportNativeSelect
                          value={format}
                          onValueChange={(value) => setFormat(value as 'pdf' | 'excel' | 'csv')}
                          options={config.formatosDisponiveis.map(fmt => ({
                            value: fmt,
                            label: fmt.toUpperCase()
                          }))}
                        />
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
                          {isGenerating ?(
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
            </CardContent>
          </Card>
        ))}
      </div>
        </div>
      </div>
    </div>
  )
}

export default RelatoriosPage
