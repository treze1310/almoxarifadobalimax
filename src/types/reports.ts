export interface BaseReportFilter {
  dataInicio?: string
  dataFim?: string
  categoria?: string
  localizacao?: string
  centroCusto?: string
  fornecedor?: string
  status?: 'ativo' | 'inativo' | 'todos'
  valorMinimo?: number
  valorMaximo?: number
}

export interface ReportColumn {
  key: string
  label: string
  type?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'percentage' | 'status'
  width?: string
  align?: 'left' | 'center' | 'right'
  formatter?: (value: any) => string
}

export interface ABCDistribution {
  A: { count: number; value: number; percentage: number }
  B: { count: number; value: number; percentage: number }
  C: { count: number; value: number; percentage: number }
}

export interface XYZDistribution {
  X: { count: number; percentage: number } // Alto giro
  Y: { count: number; percentage: number } // Médio giro
  Z: { count: number; percentage: number } // Baixo giro
}

export interface KPIMetrics {
  taxaAtendimento: number // Meta: >95%
  acuracidadeInventario: number // Meta: >98%
  giroEstoque: number // Meta: >6x ano
  taxaRuptura: number // Meta: <2%
  taxaObsolescencia: number // Meta: <5%
  coberturaEstoque: number // Meta: 30-45 dias
}

export interface ReportSummary {
  totalRegistros: number
  valorTotal?: number
  itensAtivos?: number
  itensCriticos?: number
  itensEstoqueBaixo?: number
  itensEstoqueExcesso?: number
  variacao?: number
  observacoes?: string
  geradoPor: string
  geradoEm: string
  numeroRelatorio: string
}

export interface ReportData {
  reportId: string
  titulo: string
  periodo: string
  filtrosAplicados: Record<string, any>
  columns: ReportColumn[]
  rows: Record<string, any>[]
  grupos?: Array<{
    categoria: string
    itens: Record<string, any>[]
    subtotal?: number
  }>
  graficos?: Array<{
    tipo: 'pizza' | 'barras' | 'linha' | 'matriz'
    titulo: string
    dados: any[]
    configuracao?: Record<string, any>
  }>
  kpis?: KPIMetrics
  abcAnalysis?: ABCDistribution
  xyzAnalysis?: XYZDistribution
  comparativo?: {
    periodoAnterior: any
    variacao: number
    tendencia: 'alta' | 'baixa' | 'estavel'
  }
  totals?: Record<string, number>
  summary: ReportSummary
}

// 1. INVENTÁRIO GERAL
export interface InventarioGeralFilter extends BaseReportFilter {
  incluirInativos?: boolean
  incluirZerados?: boolean
  agruparPor: 'categoria' | 'localizacao' | 'fornecedor'
  incluirAnaliseABC?: boolean
}

// 2. MOVIMENTAÇÃO
export interface MovimentacaoFilter extends BaseReportFilter {
  tipoMovimentacao?: 'entrada' | 'saida' | 'ajuste' | 'todos'
  responsavel?: string
  formato: 'analitico' | 'sintetico'
  incluirGraficos?: boolean
}

// 3. VENCIMENTO E VALIDADE
export interface VencimentoValidadeFilter extends BaseReportFilter {
  diasAlerta?: number
  incluirVencidos?: boolean
  tipoMaterial: 'epi' | 'medicamento' | 'todos'
  criticidade?: 'critica' | 'alerta' | 'atencao' | 'normal' | 'todas'
}

// 4. CONSUMO POR CENTRO DE CUSTO
export interface ConsumoCentroCustoFilter extends BaseReportFilter {
  comparativoAnterior?: boolean
  incluirVariacao?: boolean
  limitarTop?: number
}

// 5. FORNECEDORES
export interface FornecedoresFilter extends BaseReportFilter {
  incluirPerformance?: boolean
  incluirHistoricoPrecos?: boolean
  ordenarPor: 'leadtime' | 'qualidade' | 'participacao' | 'pontualidade'
}

// 6. REQUISIÇÕES PENDENTES
export interface RequisicoesFilter extends BaseReportFilter {
  prioridade?: 'alta' | 'media' | 'baixa' | 'todas'
  aging: boolean
  responsavelAtendimento?: string
}

// 7. ANÁLISE ABC/XYZ
export interface AnaliseABCXYZFilter extends BaseReportFilter {
  criterioABC: 'valor' | 'quantidade' | 'movimentacao'
  criterioXYZ: 'giro' | 'variabilidade' | 'sazonalidade'
  incluirMatriz?: boolean
  incluirSugestoes?: boolean
}

// 8. INVENTÁRIO ROTATIVO
export interface InventarioRotativoFilter extends BaseReportFilter {
  ciclo?: 'semanal' | 'mensal' | 'trimestral'
  incluirDivergencias?: boolean
  incluirTendencias?: boolean
}

export interface ReportRequest {
  reportId: string
  titulo?: string
  filtros: BaseReportFilter
  formato: 'pdf' | 'excel' | 'csv'
  incluirGraficos?: boolean
  salvarTemplate?: boolean
  nomeTemplate?: string
}

export interface ReportResponse {
  success: boolean
  data?: ReportData
  error?: string
  downloadUrl?: string
  reportId?: string
  numeroRelatorio?: string
  executionTime?: string
}

export interface ReportConfig {
  id: string
  titulo: string
  descricao: string
  icon: string
  categoria: string
  periodicidade: string
  kpis: string[]
  filtrosObrigatorios: string[]
  filtrosOpcionais: string[]
  formatosDisponiveis: string[]
  tempoExecucaoMedio: string
  requisitoPermissao: string
  isInteractive?: boolean
}

export const REPORT_CONFIGS = [
  // 1. INVENTÁRIO GERAL
  {
    id: 'inventario-geral',
    titulo: 'Relatório de Inventário Geral',
    descricao: 'Visão completa do estoque atual com análise de valor patrimonial',
    icon: 'Package',
    categoria: 'Estoque',
    periodicidade: 'Mensal',
    kpis: ['valorTotal', 'quantidadeSKUs', 'taxaOcupacao', 'curvaABC', 'acuracidade', 'giroEstoque', 'coberturaEstoque'],
    filtrosObrigatorios: ['agruparPor'],
    filtrosOpcionais: ['categoria', 'localizacao', 'status', 'valorMinimo', 'valorMaximo', 'incluirInativos', 'incluirZerados', 'incluirAnaliseABC'],
    formatosDisponiveis: ['pdf', 'excel', 'csv'],
    tempoExecucaoMedio: '3-5 segundos',
    requisitoPermissao: 'relatorios.inventario.visualizar'
  },
  
  // 2. MOVIMENTAÇÃO
  {
    id: 'movimentacao',
    titulo: 'Relatório de Movimentação',
    descricao: 'Rastrear todas as entradas, saídas e ajustes do período',
    icon: 'TrendingUp',
    categoria: 'Movimentação',
    periodicidade: 'Diário',
    kpis: ['volumeMovimentado', 'frequenciaMovimentacao', 'tempoMedioMovimentacao', 'taxaAjustes', 'sazonalidade', 'produtosSemMovimento', 'indiceRuptura'],
    filtrosObrigatorios: ['dataInicio', 'dataFim', 'formato'],
    filtrosOpcionais: ['tipoMovimentacao', 'categoria', 'localizacao', 'responsavel', 'centroCusto', 'incluirGraficos'],
    formatosDisponiveis: ['pdf', 'excel', 'csv'],
    tempoExecucaoMedio: '5-10 segundos',
    requisitoPermissao: 'relatorios.movimentacao.visualizar'
  },

  // 9. MOVIMENTAÇÃO INTERATIVA (Consulta em tempo real)
  {
    id: 'movimentacao-interativa',
    titulo: 'Consulta de Movimentação Interativa',
    descricao: 'Visualização em tempo real das movimentações com filtros dinâmicos',
    icon: 'Activity',
    categoria: 'Movimentação',
    periodicidade: 'Tempo Real',
    kpis: ['totalMovimentacoes', 'entradas', 'saidas', 'valorMovimentado'],
    filtrosObrigatorios: [],
    filtrosOpcionais: ['tipoMovimentacao', 'categoria', 'dataInicio', 'dataFim', 'material', 'responsavel'],
    formatosDisponiveis: ['pdf', 'excel'],
    tempoExecucaoMedio: '1-2 segundos',
    requisitoPermissao: 'relatorios.movimentacao.visualizar',
    isInteractive: true
  },
  
  // 3. VENCIMENTO E VALIDADE
  {
    id: 'vencimento-validade',
    titulo: 'Relatório de Vencimento e Validade',
    descricao: 'Controlar prazos de validade de EPIs, materiais perecíveis e certificações',
    icon: 'Calendar',
    categoria: 'Qualidade',
    periodicidade: 'Semanal',
    kpis: ['percentualVencidos', 'valorEmRisco', 'leadTimeReposicao', 'taxaDescarte'],
    filtrosObrigatorios: ['tipoMaterial'],
    filtrosOpcionais: ['diasAlerta', 'incluirVencidos', 'categoria', 'localizacao', 'criticidade'],
    formatosDisponiveis: ['pdf', 'excel'],
    tempoExecucaoMedio: '2-3 segundos',
    requisitoPermissao: 'relatorios.vencimento.visualizar'
  },
  
  // 4. CONSUMO POR CENTRO DE CUSTO
  {
    id: 'consumo-centro-custo',
    titulo: 'Relatório de Consumo por Centro de Custo',
    descricao: 'Analisar consumo por departamento/projeto',
    icon: 'Building',
    categoria: 'Custos',
    periodicidade: 'Semanal',
    kpis: ['consumoMedio', 'variacao', 'custoPorFuncionario', 'indiceEficiencia'],
    filtrosObrigatorios: ['dataInicio', 'dataFim'],
    filtrosOpcionais: ['centroCusto', 'categoria', 'comparativoAnterior', 'incluirVariacao', 'limitarTop'],
    formatosDisponiveis: ['pdf', 'excel', 'csv'],
    tempoExecucaoMedio: '4-6 segundos',
    requisitoPermissao: 'relatorios.consumo.visualizar'
  },
  
  // 5. FORNECEDORES
  {
    id: 'fornecedores',
    titulo: 'Relatório de Performance de Fornecedores',
    descricao: 'Avaliar performance e qualidade dos fornecedores',
    icon: 'Truck',
    categoria: 'Compras',
    periodicidade: 'Mensal',
    kpis: ['leadTimeMedio', 'taxaCumprimentoPrazo', 'indiceQualidade', 'participacaoFornecimento', 'historicoPrecos'],
    filtrosObrigatorios: ['ordenarPor'],
    filtrosOpcionais: ['fornecedor', 'categoria', 'dataInicio', 'dataFim', 'incluirPerformance', 'incluirHistoricoPrecos'],
    formatosDisponiveis: ['pdf', 'excel'],
    tempoExecucaoMedio: '3-4 segundos',
    requisitoPermissao: 'relatorios.fornecedores.visualizar'
  },
  
  // 6. REQUISIÇÕES PENDENTES
  {
    id: 'requisicoes-pendentes',
    titulo: 'Relatório de Requisições Pendentes',
    descricao: 'Controlar atendimento de solicitações em aberto',
    icon: 'ClipboardList',
    categoria: 'Operações',
    periodicidade: 'Diário',
    kpis: ['tempoMedioAtendimento', 'taxaAtendimentoPrazo', 'backlogQuantidade', 'backlogValor'],
    filtrosObrigatorios: ['aging'],
    filtrosOpcionais: ['prioridade', 'centroCusto', 'responsavelAtendimento', 'dataInicio', 'dataFim'],
    formatosDisponiveis: ['pdf', 'excel', 'csv'],
    tempoExecucaoMedio: '2-3 segundos',
    requisitoPermissao: 'relatorios.requisicoes.visualizar'
  },
  
  // 7. ANÁLISE ABC/XYZ
  {
    id: 'analise-abc-xyz',
    titulo: 'Relatório de Análise ABC/XYZ',
    descricao: 'Classificar itens por importância e criticidade',
    icon: 'Grid3x3',
    categoria: 'Estratégico',
    periodicidade: 'Mensal',
    kpis: ['distribuicaoPercentual', 'politicasEstoque', 'potencialReducaoCapital'],
    filtrosObrigatorios: ['criterioABC', 'criterioXYZ'],
    filtrosOpcionais: ['categoria', 'localizacao', 'dataInicio', 'dataFim', 'incluirMatriz', 'incluirSugestoes'],
    formatosDisponiveis: ['pdf', 'excel'],
    tempoExecucaoMedio: '6-8 segundos',
    requisitoPermissao: 'relatorios.abc.visualizar'
  },
  
  // 8. INVENTÁRIO ROTATIVO
  {
    id: 'inventario-rotativo',
    titulo: 'Relatório de Inventário Rotativo',
    descricao: 'Acompanhar contagens cíclicas e acuracidade',
    icon: 'RotateCcw',
    categoria: 'Controle',
    periodicidade: 'Mensal',
    kpis: ['acuracidadePorCategoria', 'divergenciasValorQuantidade', 'frequenciaAjustes', 'evolucaoAcuracidade'],
    filtrosObrigatorios: ['ciclo'],
    filtrosOpcionais: ['categoria', 'localizacao', 'dataInicio', 'dataFim', 'incluirDivergencias', 'incluirTendencias'],
    formatosDisponiveis: ['pdf', 'excel'],
    tempoExecucaoMedio: '4-5 segundos',
    requisitoPermissao: 'relatorios.inventario_rotativo.visualizar'
  }
]

// Validações padrão para todos os relatórios
export const VALIDACAO_REGRAS = {
  periodoMaximo: 365, // dias
  registrosMinimosPeriodo: 1,
  formatosPermitidos: ['pdf', 'excel', 'csv'],
  
  // Mensagens de validação
  mensagens: {
    periodoExtenso: 'Período muito extenso. Máximo permitido: 12 meses',
    nenhumRegistro: 'Nenhum registro encontrado com os filtros aplicados',
    semPermissao: 'Você não tem permissão para gerar este relatório',
    filtroInvalido: 'Filtros aplicados são mutuamente exclusivos',
    formatoInvalido: 'Formato de exportação não suportado'
  }
}

// Configurações de cores padrão conforme especificação
export const CORES_PADRAO = {
  cabecalho: '#1e40af', // Azul corporativo
  tituloSecao: '#374151', // Cinza escuro
  linhaAlternada: '#f9fafb', // Cinza claro
  alerta: {
    critico: '#dc2626', // Vermelho
    alerta: '#ea580c', // Laranja
    atencao: '#facc15', // Amarelo
    normal: '#16a34a' // Verde
  }
}

// Configurações de fontes conforme especificação
export const FONTES_PADRAO = {
  titulo: 'Arial Bold 14pt',
  subtitulo: 'Arial Bold 11pt',
  corpo: 'Arial Regular 10pt',
  rodape: 'Arial Italic 8pt'
}

// Configurações de margem para PDF
export const MARGENS_PDF = {
  superior: '2.5cm',
  inferior: '2cm',
  laterais: '1.5cm'
}