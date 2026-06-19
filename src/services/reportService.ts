import { supabase } from '@/lib/supabase'
import { pdfService } from './pdfService'
import {
  CORES_PADRAO,
  FONTES_PADRAO,
  MARGENS_PDF,
  VALIDACAO_REGRAS
} from '@/types/reports'
import type {
  ReportRequest,
  ReportResponse,
  ReportData,
  ReportSummary,
  KPIMetrics,
  ABCDistribution,
  XYZDistribution,
  InventarioGeralFilter,
  MovimentacaoFilter,
  VencimentoValidadeFilter,
  ConsumoCentroCustoFilter,
  FornecedoresFilter,
  RequisicoesFilter,
  AnaliseABCXYZFilter,
  InventarioRotativoFilter
} from '@/types/reports'

class ReportService {
  
  private gerarNumeroRelatorio(tipoRelatorio: string): string {
    const prefix = tipoRelatorio.substring(0, 3).toUpperCase()
    const timestamp = new Date().getTime().toString().slice(-6)
    return `${prefix}-${new Date().getFullYear()}-${timestamp}`
  }

  // Método de teste para diagnosticar problemas
  async generateTestReport(): Promise<ReportData> {
    console.log(' Gerando relatório de teste para diagnóstico')
    
    const dadosTeste = Array.from({ length: 5 }, (_, i) => ({
      codigo: `TST${String(i + 1).padStart(3, '0')}`,
      nome: `Material de Teste ${i + 1}`,
      categoria: i % 2 === 0 ? 'Categoria A' : 'Categoria B',
      unidade_medida: 'UN',
      estoque_atual: Math.floor(Math.random() * 100) + 1,
      valor_unitario: (Math.random() * 100 + 10).toFixed(2),
      valor_total: 0,
      localizacao: `Setor ${i + 1}`,
      status: 'ATIVO'
    }))

    // Calcular valor total
    dadosTeste.forEach(item => {
      item.valor_total = parseFloat(item.valor_unitario) * item.estoque_atual
    })

    return {
      reportId: 'test-report',
      titulo: 'RELATÓRIO DE TESTE - DIAGNÓSTICO',
      periodo: `Teste em ${new Date().toLocaleDateString('pt-BR')}`,
      filtrosAplicados: { teste: true },
      columns: [
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'categoria', label: 'Categoria', type: 'text' },
        { key: 'estoque_atual', label: 'Estoque', type: 'number', align: 'right' },
        { key: 'valor_unitario', label: 'Valor Unit.', type: 'currency', align: 'right' },
        { key: 'valor_total', label: 'Valor Total', type: 'currency', align: 'right' },
        { key: 'status', label: 'Status', type: 'status', align: 'center' }
      ],
      rows: dadosTeste,
      totals: {
        totalItens: dadosTeste.length,
        valorTotal: dadosTeste.reduce((sum, item) => sum + item.valor_total, 0)
      },
      summary: {
        totalRegistros: dadosTeste.length,
        valorTotal: dadosTeste.reduce((sum, item) => sum + item.valor_total, 0),
        geradoPor: 'Sistema - Teste',
        geradoEm: new Date().toISOString(),
        numeroRelatorio: this.gerarNumeroRelatorio('test')
      }
    }
  }

  private validarPeriodo(dataInicio?: string, dataFim?: string): string | null {
    if (!dataInicio || !dataFim) return null
    
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    const diffDays = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays > VALIDACAO_REGRAS.periodoMaximo) {
      return VALIDACAO_REGRAS.mensagens.periodoExtenso
    }
    
    return null
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  private formatPercentage(value: number): string {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return '0,00%'

    const percentage = Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue
    return `${percentage.toFixed(2).replace('.', ',')}%`
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  private formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR') + ' ' + 
           new Date(date).toLocaleTimeString('pt-BR')
  }

  private fixMojibake(value: any): string {
    if (value === null || value === undefined) return ''

    return String(value)
      .replace(/\u00c3[\u0080]/g, '\u00c0')
      .replace(/\u00c3[\u0081]/g, '\u00c1')
      .replace(/\u00c3[\u0082]/g, '\u00c2')
      .replace(/\u00c3[\u0083\u0192]/g, '\u00c3')
      .replace(/\u00c3[\u0087\u2021]/g, '\u00c7')
      .replace(/\u00c3[\u0089]/g, '\u00c9')
      .replace(/\u00c3[\u008a\u0160]/g, '\u00ca')
      .replace(/\u00c3[\u008d]/g, '\u00cd')
      .replace(/\u00c3[\u0093\u201c]/g, '\u00d3')
      .replace(/\u00c3[\u0094\u201d]/g, '\u00d4')
      .replace(/\u00c3[\u0095\u2022]/g, '\u00d5')
      .replace(/\u00c3[\u009a\u0161]/g, '\u00da')
      .replace(/\u00c3\u00a0/g, '\u00e0')
      .replace(/\u00c3\u00a1/g, '\u00e1')
      .replace(/\u00c3\u00a2/g, '\u00e2')
      .replace(/\u00c3\u00a3/g, '\u00e3')
      .replace(/\u00c3\u00a7/g, '\u00e7')
      .replace(/\u00c3\u00a9/g, '\u00e9')
      .replace(/\u00c3\u00aa/g, '\u00ea')
      .replace(/\u00c3\u00ad/g, '\u00ed')
      .replace(/\u00c3\u00b3/g, '\u00f3')
      .replace(/\u00c3\u00b4/g, '\u00f4')
      .replace(/\u00c3\u00b5/g, '\u00f5')
      .replace(/\u00c3\u00ba/g, '\u00fa')
      .replace(/\u00c2\u00ba/g, '\u00ba')
      .replace(/\u00e2\u2030\u00a4/g, '\u2264')
  }

  private getReportPeriod(filtros: { dataInicio?: string; dataFim?: string }, fallback = 'Analise geral'): string {
    if (filtros.dataInicio && filtros.dataFim) {
      return `${this.formatDate(filtros.dataInicio)} ate ${this.formatDate(filtros.dataFim)}`
    }

    if (filtros.dataInicio) {
      return `A partir de ${this.formatDate(filtros.dataInicio)}`
    }

    if (filtros.dataFim) {
      return `Ate ${this.formatDate(filtros.dataFim)}`
    }

    return fallback
  }

  private isDateInRange(dateValue?: string | null, dataInicio?: string, dataFim?: string): boolean {
    if (!dateValue) return false

    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return false

    if (dataInicio && date < new Date(dataInicio)) return false
    if (dataFim && date > new Date(dataFim)) return false

    return true
  }

  private calcularAnaliseABC(dados: any[]): ABCDistribution {
    // Ordenar por valor decrescente
    const dadosOrdenados = [...dados].sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
    const totalValor = dadosOrdenados.reduce((sum, item) => sum + (item.valor_total || 0), 0)
    const totalItens = dadosOrdenados.length

    if (totalItens === 0 || totalValor <= 0) {
      return {
        A: { count: 0, value: 0, percentage: 0 },
        B: { count: 0, value: 0, percentage: 0 },
        C: { count: totalItens, value: 0, percentage: totalItens > 0 ? 100 : 0 }
      }
    }

    let valorAcumulado = 0
    let contadorA = 0, contadorB = 0, contadorC = 0
    let valorA = 0, valorB = 0, valorC = 0

    dadosOrdenados.forEach((item, index) => {
      valorAcumulado += item.valor_total || 0
      const percentualAcumulado = valorAcumulado / totalValor

      if (percentualAcumulado <= 0.8) {
        contadorA++
        valorA += item.valor_total || 0
        item.classificacaoABC = 'A'
      } else if (percentualAcumulado <= 0.95) {
        contadorB++
        valorB += item.valor_total || 0
        item.classificacaoABC = 'B'
      } else {
        contadorC++
        valorC += item.valor_total || 0
        item.classificacaoABC = 'C'
      }
    })

    return {
      A: { count: contadorA, value: valorA, percentage: (valorA / totalValor) * 100 },
      B: { count: contadorB, value: valorB, percentage: (valorB / totalValor) * 100 },
      C: { count: contadorC, value: valorC, percentage: (valorC / totalValor) * 100 }
    }
  }

  private calcularKPIs(dados: any[], tipoRelatorio: string): KPIMetrics {
    // KPIs básicos - implementação simplificada
    // Em produção, esses cálculos seriam mais complexos e baseados em dados históricos
    
    const totalItens = dados.length
    if (totalItens === 0) {
      return {
        taxaAtendimento: 0,
        acuracidadeInventario: 0,
        giroEstoque: 0,
        taxaRuptura: 0,
        taxaObsolescencia: 0,
        coberturaEstoque: 0
      }
    }

    const itensComEstoque = dados.filter(item => (item.estoque_atual || 0) > 0).length
    const itensComMovimento = dados.filter(item => (item.quantidade || 0) > 0).length
    
    return {
      taxaAtendimento: itensComEstoque / totalItens * 100 || 0, // Simplificado
      acuracidadeInventario: 98.5, // Valor fixo para exemplo
      giroEstoque: itensComMovimento / totalItens * 12 || 0, // Simplificado
      taxaRuptura: (totalItens - itensComEstoque) / totalItens * 100 || 0,
      taxaObsolescencia: 2.3, // Valor fixo para exemplo
      coberturaEstoque: 35 // Valor fixo para exemplo
    }
  }

  // 1. RELATÓRIO DE INVENTÁRIO GERAL
  async generateInventarioGeral(filtros: InventarioGeralFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    console.log(' Executando query de Inventário Geral com filtros:', filtros)

    let query = supabase
      .from('materiais_equipamentos')
      .select(`
        *,
        marcas (nome),
        localizacao (nome)
      `)

    // Aplicar filtros
    if (filtros.categoria && filtros.categoria !== 'todos') {
      query = query.eq('categoria', filtros.categoria)
    }

    if (filtros.localizacao && filtros.localizacao !== 'todas') {
      query = query.eq('localizacao_id', filtros.localizacao)
    }

    if (filtros.status && filtros.status !== 'todos') {
      query = query.eq('ativo', filtros.status === 'ativo')
    } else if (!filtros.incluirInativos) {
      query = query.eq('ativo', true)
    }

    if (!filtros.incluirZerados) {
      query = query.gt('estoque_atual', 0)
    }

    if (filtros.valorMinimo) {
      query = query.gte('valor_unitario', filtros.valorMinimo)
    }

    if (filtros.valorMaximo) {
      query = query.lte('valor_unitario', filtros.valorMaximo)
    }

    const { data, error } = await query

    if (error) {
      console.error(' Erro na query do inventário geral:', error)
      throw error
    }
    
    console.log(' Query executada - Inventário Geral:', {
      registrosEncontrados: data?.length || 0,
      filtrosAplicados: filtros
    })

    if (!data || data.length === 0) {
      console.warn(' Nenhum registro encontrado para inventário geral')
      throw new Error('Nenhum material foi encontrado com os filtros aplicados. Verifique se existem materiais cadastrados e ativos no sistema.')
    }

    // Calcular métricas
    const valorTotalInventario = data.reduce((sum, item) => 
      sum + ((item.valor_unitario || 0) * (item.estoque_atual || 0)), 0)
    
    const quantidadeSKUs = data.length
    const itensAtivos = data.filter(item => item.ativo).length
    const itensCriticos = data.filter(item => (item.estoque_atual || 0) <= (item.estoque_minimo || 0)).length
    
    // Preparar dados com valor total para análise ABC
    const dadosComValorTotal = data.map(item => ({
      ...item,
      valor_total: (item.valor_unitario || 0) * (item.estoque_atual || 0)
    }))

    const inventarioRows = dadosComValorTotal.map(item => ({
      codigo: item.codigo,
      nome: item.nome,
      categoria: item.categoria || '-',
      unidade_medida: item.unidade_medida || 'UN',
      estoque_atual: item.estoque_atual || 0,
      valor_unitario: item.valor_unitario || 0,
      valor_total: item.valor_total,
      localizacao: item.localizacao?.nome || '-',
      status: (item.estoque_atual || 0) <= (item.estoque_minimo || 0) ? 'CRITICO' :
              item.ativo ? 'ATIVO' : 'INATIVO',
      classificacaoABC: item.classificacaoABC || '-'
    }))

    // Análise ABC se solicitada
    let abcAnalysis: ABCDistribution | undefined
    if (filtros.incluirAnaliseABC) {
      abcAnalysis = this.calcularAnaliseABC(dadosComValorTotal)
    }

    // KPIs
    const kpis = this.calcularKPIs(dadosComValorTotal, 'inventario-geral')

    // Agrupar por categoria se solicitado (padrão: categoria)
    let grupos
    const agruparPor = filtros.agruparPor || 'categoria'
    if (agruparPor === 'categoria') {
      const categorias = [...new Set(inventarioRows.map(item => item.categoria))]
      grupos = categorias.map(categoria => ({
        categoria: categoria || 'Sem Categoria',
        itens: inventarioRows.filter(item => item.categoria === categoria),
        subtotal: inventarioRows
          .filter(item => item.categoria === categoria)
          .reduce((sum, item) => sum + item.valor_total, 0)
      }))
    }

    const numeroRelatorio = this.gerarNumeroRelatorio('inventario-geral')
    const agora = new Date().toISOString()

    return {
      reportId: 'inventario-geral',
      titulo: 'RELATÓRIO DE INVENTÁRIO GERAL',
      periodo: 'Posição atual',
      filtrosAplicados: filtros,
      columns: [
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'categoria', label: 'Categoria', type: 'text' },
        { key: 'unidade_medida', label: 'UN', type: 'text', align: 'center' },
        { key: 'estoque_atual', label: 'Qtd Atual', type: 'number', align: 'right' },
        { key: 'valor_unitario', label: 'V. Unit', type: 'currency', align: 'right' },
        { key: 'valor_total', label: 'V. Total', type: 'currency', align: 'right' },
        { key: 'localizacao', label: 'Localização', type: 'text' },
        { key: 'status', label: 'Status', type: 'status', align: 'center' }
      ],
      rows: inventarioRows,
      grupos,
      kpis,
      abcAnalysis,
      summary: {
        totalRegistros: quantidadeSKUs,
        valorTotal: valorTotalInventario,
        itensAtivos,
        itensCriticos,
        geradoPor: 'Sistema', // TODO: pegar usuário logado
        geradoEm: agora,
        numeroRelatorio
      }
    }
  }

  // 2. RELATÓRIO DE MOVIMENTAÇÃO
  async generateMovimentacao(filtros: MovimentacaoFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    // Validar período obrigatério
    const validacaoPeriodo = this.validarPeriodo(filtros.dataInicio, filtros.dataFim)
    if (validacaoPeriodo) {
      throw new Error(validacaoPeriodo)
    }

    let query = supabase
      .from('movimentacao_estoque')
      .select(`
        *,
        materiais_equipamentos!material_equipamento_id (codigo, nome, unidade_medida),
        usuarios!usuario_id (nome)
      `)
      .gte('data_movimentacao', filtros.dataInicio!)
      .lte('data_movimentacao', filtros.dataFim!)
      .order('data_movimentacao', { ascending: false })

    // Aplicar filtros opcionais
    if (filtros.tipoMovimentacao && filtros.tipoMovimentacao !== 'todos') {
      query = query.eq('tipo_movimentacao', filtros.tipoMovimentacao)
    }

    if (filtros.categoria && filtros.categoria !== 'todas') {
      query = query.eq('materiais_equipamentos.categoria', filtros.categoria)
    }

    if (filtros.responsavel && filtros.responsavel !== 'todos') {
      query = query.eq('usuario_id', filtros.responsavel)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    // Calcular métricas essenciais
    const totalEntradas = data.filter(m => m.tipo_movimentacao === 'entrada')
      .reduce((sum, m) => sum + m.quantidade, 0)
    
    const totalSaidas = data.filter(m => m.tipo_movimentacao === 'saida')
      .reduce((sum, m) => sum + m.quantidade, 0)
    
    const totalAjustes = data.filter(m => m.tipo_movimentacao === 'ajuste')
      .reduce((sum, m) => sum + Math.abs(m.quantidade), 0)

    const volumeMovimentado = data.reduce((sum, m) => 
      sum + ((m.valor_unitario || 0) * Math.abs(m.quantidade)), 0)

    const taxaAjustes = totalAjustes / (totalEntradas + totalSaidas + totalAjustes) * 100

    // Formato analítico vs sintético (padrão: analítico)
    let columns, rows
    const formato = filtros.formato || 'analitico'

    if (formato === 'analitico') {
      columns = [
        { key: 'data_movimentacao', label: 'Data/Hora', type: 'datetime' },
        { key: 'tipo_movimentacao', label: 'Mov', type: 'text', align: 'center' },
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'quantidade', label: 'Qtd', type: 'number', align: 'right' },
        { key: 'unidade', label: 'UN', type: 'text', align: 'center' },
        { key: 'valor_unitario', label: 'Valor', type: 'currency', align: 'right' },
        { key: 'saldo', label: 'Saldo', type: 'number', align: 'right' },
        { key: 'responsavel', label: 'Responsável', type: 'text' },
        { key: 'observacoes', label: 'Observação', type: 'text' }
      ]

      rows = data.map(mov => ({
        data_movimentacao: mov.data_movimentacao,
        tipo_movimentacao: mov.tipo_movimentacao.toUpperCase(),
        codigo: mov.materiais_equipamentos?.codigo || '-',
        nome: mov.materiais_equipamentos?.nome || '-',
        quantidade: mov.quantidade,
        unidade: mov.materiais_equipamentos?.unidade_medida || 'UN',
        valor_unitario: mov.valor_unitario || 0,
        saldo: mov.quantidade_atual || 0,
        responsavel: mov.usuarios?.nome || '-',
        observacoes: mov.observacoes || '-'
      }))
    } else {
      // Formato sintético - agrupar por material
      const materiais = [...new Set(data.map(m => m.material_equipamento_id))]
      
      columns = [
        { key: 'codigo', label: 'Material', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'saldo_inicial', label: 'Saldo Inicial', type: 'number', align: 'right' },
        { key: 'entradas', label: 'Entradas', type: 'number', align: 'right' },
        { key: 'saidas', label: 'Saídas', type: 'number', align: 'right' },
        { key: 'ajustes', label: 'Ajustes', type: 'number', align: 'right' },
        { key: 'saldo_final', label: 'Saldo Final', type: 'number', align: 'right' },
        { key: 'variacao', label: 'Variação %', type: 'percentage', align: 'right' }
      ]

      rows = materiais.map(materialId => {
        const movimentacoesMaterial = data.filter(m => m.material_equipamento_id === materialId)
        const material = movimentacoesMaterial[0]?.materiais_equipamentos
        
        const entradas = movimentacoesMaterial
          .filter(m => m.tipo_movimentacao === 'entrada')
          .reduce((sum, m) => sum + m.quantidade, 0)
        
        const saidas = movimentacoesMaterial
          .filter(m => m.tipo_movimentacao === 'saida')
          .reduce((sum, m) => sum + m.quantidade, 0)
        
        const ajustes = movimentacoesMaterial
          .filter(m => m.tipo_movimentacao === 'ajuste')
          .reduce((sum, m) => sum + m.quantidade, 0)

        const saldoInicial = movimentacoesMaterial[movimentacoesMaterial.length - 1]?.quantidade_anterior || 0
        const saldoFinal = movimentacoesMaterial[0]?.quantidade_atual || 0
        const variacao = saldoInicial !== 0 ? ((saldoFinal - saldoInicial) / saldoInicial) : 0

        return {
          codigo: material?.codigo || '-',
          nome: material?.nome || '-',
          saldo_inicial: saldoInicial,
          entradas,
          saidas,
          ajustes,
          saldo_final: saldoFinal,
          variacao
        }
      })
    }

    const numeroRelatorio = this.gerarNumeroRelatorio('movimentacao')

    return {
      reportId: 'movimentacao',
      titulo: 'RELATÓRIO DE MOVIMENTAÇÃO',
      periodo: `${this.formatDate(filtros.dataInicio!)} até ${this.formatDate(filtros.dataFim!)}`,
      filtrosAplicados: filtros,
      columns: columns as any,
      rows,
      totals: {
        totalEntradas,
        totalSaidas,
        totalAjustes,
        volumeMovimentado,
        taxaAjustes
      },
      kpis: this.calcularKPIs(data, 'movimentacao'),
      summary: {
        totalRegistros: data.length,
        valorTotal: volumeMovimentado,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  // 3. RELATÓRIO DE VENCIMENTO E VALIDADE
  async generateVencimentoValidade(filtros: VencimentoValidadeFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    let query = supabase
      .from('materiais_equipamentos')
      .select(`
        *,
        marcas (nome),
        localizacao (nome)
      `)
      .not('validade_ca', 'is', null)

    // Filtrar por tipo de material (padrão: todos)
    const tipoMaterial = filtros.tipoMaterial || 'todos'
    if (tipoMaterial === 'epi') {
      query = query.eq('is_epi', true)
    }

    if (filtros.categoria && filtros.categoria !== 'todas') {
      query = query.eq('categoria', filtros.categoria)
    }

    if (filtros.localizacao && filtros.localizacao !== 'todas') {
      query = query.eq('localizacao_id', filtros.localizacao)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    const hoje = new Date()
    const diasAlerta = filtros.diasAlerta || 30

    // Classificar por criticidade conforme layout padrão
    const dadosClassificados = data
      .map(item => {
        if (!item.validade_ca) return null
        
        const dataVencimento = new Date(item.validade_ca)
        const diffTime = dataVencimento.getTime() - hoje.getTime()
        const diasVencimento = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        let criticidade: string
        let cor: string
        let acaoRequerida: string

        if (diasVencimento < -30) {
          criticidade = 'CRÍTICA'
          cor = CORES_PADRAO.alerta.critico
          acaoRequerida = 'DESCARTE IMEDIATO'
        } else if (diasVencimento <= 30) {
          criticidade = 'ALERTA'
          cor = CORES_PADRAO.alerta.alerta
          acaoRequerida = 'REPOSIÇÃO URGENTE'
        } else if (diasVencimento <= 60) {
          criticidade = 'ATENÇÃO'
          cor = CORES_PADRAO.alerta.atencao
          acaoRequerida = 'PROGRAMAR REPOSIÇÃO'
        } else {
          criticidade = 'NORMAL'
          cor = CORES_PADRAO.alerta.normal
          acaoRequerida = 'ACOMPANHAR'
        }

        // Filtrar por criticidade se especificado
        if (filtros.criticidade && filtros.criticidade !== 'todas') {
          if (filtros.criticidade !== criticidade.toLowerCase()) return null
        }

        // Filtrar vencidos se não incluído
        if (!filtros.incluirVencidos && diasVencimento < 0) return null

        return {
          ...item,
          diasVencimento,
          criticidade,
          cor,
          acaoRequerida,
          valorRisco: (item.valor_unitario || 0) * (item.estoque_atual || 0)
        }
      })
      .filter(Boolean)
      .sort((a, b) => a!.diasVencimento - b!.diasVencimento) as any[]

    // Calcular métricas essenciais
    const totalItens = dadosClassificados.length
    const itensVencidos = dadosClassificados.filter(item => item.diasVencimento < 0).length
    const percentualVencidos = (itensVencidos / totalItens) * 100
    const valorEmRisco = dadosClassificados
      .filter(item => item.diasVencimento <= 30)
      .reduce((sum, item) => sum + item.valorRisco, 0)

    // Agrupar por seções conforme layout padrão
    const grupos = [
      {
        categoria: 'SEÇÃO CRÍTICA (Vencidos há mais de 30 dias)',
        itens: dadosClassificados.filter(item => item.diasVencimento < -30),
        subtotal: dadosClassificados.filter(item => item.diasVencimento < -30)
          .reduce((sum, item) => sum + item.valorRisco, 0)
      },
      {
        categoria: 'SEÇÃO ALERTA (Vencimento nos próximos 30 dias)',
        itens: dadosClassificados.filter(item => item.diasVencimento >= 0 && item.diasVencimento <= 30),
        subtotal: dadosClassificados.filter(item => item.diasVencimento >= 0 && item.diasVencimento <= 30)
          .reduce((sum, item) => sum + item.valorRisco, 0)
      },
      {
        categoria: 'SEÇÃO ATENÇÃO (Vencimento entre 31-60 dias)',
        itens: dadosClassificados.filter(item => item.diasVencimento >= 31 && item.diasVencimento <= 60),
        subtotal: dadosClassificados.filter(item => item.diasVencimento >= 31 && item.diasVencimento <= 60)
          .reduce((sum, item) => sum + item.valorRisco, 0)
      },
      {
        categoria: 'SEÇÃO NORMAL (Vencimento superior a 60 dias)',
        itens: dadosClassificados.filter(item => item.diasVencimento > 60),
        subtotal: dadosClassificados.filter(item => item.diasVencimento > 60)
          .reduce((sum, item) => sum + item.valorRisco, 0)
      }
    ]

    const numeroRelatorio = this.gerarNumeroRelatorio('vencimento-validade')

    return {
      reportId: 'vencimento-validade',
      titulo: 'RELATÓRIO DE VENCIMENTO E VALIDADE',
      periodo: `Análise em ${this.formatDate(hoje.toISOString())}`,
      filtrosAplicados: filtros,
      columns: [
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'lote', label: 'Lote', type: 'text' },
        { key: 'estoque_atual', label: 'Qtd', type: 'number', align: 'right' },
        { key: 'validade_ca', label: 'Venc.', type: 'date', align: 'center' },
        { key: 'diasVencimento', label: 'Dias p/ Vencer', type: 'number', align: 'right' },
        { key: 'acaoRequerida', label: 'Ação Requerida', type: 'status', align: 'center' }
      ],
      rows: dadosClassificados.map(item => ({
        codigo: item.codigo,
        nome: item.nome,
        lote: item.numero_ca || '-',
        estoque_atual: item.estoque_atual || 0,
        validade_ca: item.validade_ca,
        diasVencimento: item.diasVencimento,
        acaoRequerida: item.acaoRequerida,
        criticidade: item.criticidade
      })),
      grupos,
      totals: {
        totalItens,
        itensVencidos,
        percentualVencidos,
        valorEmRisco
      },
      kpis: this.calcularKPIs(dadosClassificados, 'vencimento-validade'),
      summary: {
        totalRegistros: totalItens,
        valorTotal: valorEmRisco,
        itensCriticos: dadosClassificados.filter(item => item.criticidade === 'CRÍTICA').length,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  // 4. RELATÓRIO DE CONSUMO POR CENTRO DE CUSTO
  async generateConsumoCentroCusto(filtros: ConsumoCentroCustoFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    const validacaoPeriodo = this.validarPeriodo(filtros.dataInicio, filtros.dataFim)
    if (validacaoPeriodo) {
      throw new Error(validacaoPeriodo)
    }

    let query = supabase
      .from('movimentacao_estoque')
      .select(`
        *,
        materiais_equipamentos!material_equipamento_id (codigo, nome, categoria),
        solicitacoes!romaneio_id (centro_custo_id),
        centros_custo!solicitacoes(centro_custo_id) (codigo, descricao)
      `)
      .eq('tipo_movimentacao', 'saida')
      .gte('data_movimentacao', filtros.dataInicio!)
      .lte('data_movimentacao', filtros.dataFim!)

    if (filtros.centroCusto && filtros.centroCusto !== 'todos') {
      query = query.eq('solicitacoes.centro_custo_id', filtros.centroCusto)
    }

    if (filtros.categoria && filtros.categoria !== 'todas') {
      query = query.eq('materiais_equipamentos.categoria', filtros.categoria)
    }

    const { data, error } = (await query) as any

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    // Agrupar consumo por centro de custo e categoria
    const consumoPorCentro = data.reduce((acc: any, mov: any) => {
      const centroCusto = mov.centros_custo ? 
        `${mov.centros_custo.codigo} - ${mov.centros_custo.descricao}` : 
        'Sem Centro de Custo'
      
      const categoria = mov.materiais_equipamentos?.categoria || 'Sem Categoria'
      
      if (!acc[centroCusto]) {
        acc[centroCusto] = { total: 0, categorias: {} }
      }
      
      if (!acc[centroCusto].categorias[categoria]) {
        acc[centroCusto].categorias[categoria] = 0
      }
      
      const valor = (mov.valor_unitario || 0) * mov.quantidade
      acc[centroCusto].total += valor
      acc[centroCusto].categorias[categoria] += valor
      
      return acc
    }, {} as any)

    // Converter para formato de matriz
    const centrosCusto = Object.keys(consumoPorCentro)
    const categorias = [...new Set(data.map(mov => mov.materiais_equipamentos?.categoria).filter(Boolean))]
    
    const rows = centrosCusto.map(centro => {
      const row: any = {
        centro_custo: centro,
        total: consumoPorCentro[centro].total
      }
      
      categorias.forEach((categoria: any) => {
        row[categoria] = consumoPorCentro[centro].categorias[categoria] || 0
      })
      
      return row
    })

    // Ordenar por consumo total (limitando se especificado)
    rows.sort((a, b) => b.total - a.total)
    if (filtros.limitarTop) {
      rows.splice(filtros.limitarTop)
    }

    // Colunas dinâmicas baseadas nas categorias
    const columns = [
      { key: 'centro_custo', label: 'Centro de Custo', type: 'text' },
      ...categorias.map(categoria => ({
        key: categoria,
        label: categoria,
        type: 'currency' as const,
        align: 'right' as const
      })),
      { key: 'total', label: 'Total', type: 'currency', align: 'right' }
    ]

    const consumoTotal = rows.reduce((sum, row) => sum + row.total, 0)
    const numeroRelatorio = this.gerarNumeroRelatorio('consumo-centro-custo')

    return {
      reportId: 'consumo-centro-custo',
      titulo: 'RELATÓRIO DE CONSUMO POR CENTRO DE CUSTO',
      periodo: `${this.formatDate(filtros.dataInicio!)} até ${this.formatDate(filtros.dataFim!)}`,
      filtrosAplicados: filtros,
      columns: columns as any,
      rows,
      totals: {
        consumoTotal,
        centrosCustoAtivos: centrosCusto.length
      },
      kpis: this.calcularKPIs(data, 'consumo-centro-custo'),
      summary: {
        totalRegistros: rows.length,
        valorTotal: consumoTotal,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private generateHTMLReport(data: ReportData): string {
    const formatValue = (value: any, column: any) => {
      if (value === null || value === undefined) return '-'
      
      switch (column.type) {
        case 'currency':
          return this.formatCurrency(Number(value))
        case 'percentage':
          return this.formatPercentage(Number(value))
        case 'date':
          return this.formatDate(value)
        case 'datetime':
          return this.formatDateTime(value)
        case 'number':
          return Number(value).toLocaleString('pt-BR')
        case 'status': {
          const label = this.fixMojibake(value)
          const statusClass = label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9-]/g, '-')
          return `<span class="status status-${statusClass}">${label}</span>`
        }
        default:
          return this.fixMojibake(value)
      }
    }

    const filtrosTexto = Object.entries(data.filtrosAplicados)
      .filter(([key, value]) => value && value !== 'todos' && value !== 'todas')
      .map(([key, value]) => `${this.fixMojibake(key)}: ${this.fixMojibake(value)}`)
      .join(' | ')

    const getGroupClass = (categoria: any) => {
      const normalized = this.fixMojibake(categoria)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      if (normalized.includes('critica')) return 'critica'
      if (normalized.includes('alerta')) return 'alerta'
      if (normalized.includes('atencao')) return 'atencao'
      return 'normal'
    }

    // Garantir que temos dados mínimos
    const totalRegistros = data.summary?.totalRegistros || data.rows?.length || 0
    const numeroRelatorio = data.summary?.numeroRelatorio || `REL-${Date.now()}`

    console.log(' Gerando HTML com dados:', {
      titulo: data.titulo,
      totalRegistros,
      colunas: data.columns?.length || 0,
      linhas: data.rows?.length || 0,
      grupos: data.grupos?.length || 0
    })

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.fixMojibake(data.titulo || 'Relatório')}</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          @page {
            margin: ${MARGENS_PDF.superior} ${MARGENS_PDF.laterais} ${MARGENS_PDF.inferior} ${MARGENS_PDF.laterais};
            size: A4;
          }
          
          html, body { 
            font-family: Arial, sans-serif; 
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
            background: white;
            min-height: 100vh;
          }
          
          .header {
            background: ${CORES_PADRAO.cabecalho};
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 5px;
          }
          
          .header h1 {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .header-info {
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            margin-top: 10px;
          }
          
          .periodo {
            color: ${CORES_PADRAO.tituloSecao};
            font-weight: bold;
            margin: 10px 0;
            font-size: 11pt;
          }
          
          .filtros {
            background: #f8f9fa;
            padding: 10px;
            border-left: 4px solid ${CORES_PADRAO.cabecalho};
            margin-bottom: 20px;
            font-size: 8pt;
          }
          
          .kpis {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .kpi {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            text-align: center;
          }
          
          .kpi-label {
            font-size: 8pt;
            color: #666;
            margin-bottom: 5px;
          }
          
          .kpi-value {
            font-size: 12pt;
            font-weight: bold;
            color: ${CORES_PADRAO.cabecalho};
          }
          
          .kpi.critical .kpi-value { color: ${CORES_PADRAO.alerta.critico}; }
          .kpi.warning .kpi-value { color: ${CORES_PADRAO.alerta.alerta}; }
          .kpi.good .kpi-value { color: ${CORES_PADRAO.alerta.normal}; }
          
          .grupos {
            margin: 20px 0;
          }
          
          .grupo {
            margin-bottom: 30px;
          }
          
          .grupo-titulo {
            background: ${CORES_PADRAO.tituloSecao};
            color: white;
            padding: 10px;
            font-weight: bold;
            font-size: 11pt;
          }
          
          .grupo.critica .grupo-titulo { background: ${CORES_PADRAO.alerta.critico}; }
          .grupo.alerta .grupo-titulo { background: ${CORES_PADRAO.alerta.alerta}; }
          .grupo.atencao .grupo-titulo { background: ${CORES_PADRAO.alerta.atencao}; color: #000; }
          .grupo.normal .grupo-titulo { background: ${CORES_PADRAO.alerta.normal}; }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 8pt;
          }
          
          th, td {
            border: 1px solid #dee2e6;
            padding: 6px 4px;
            text-align: left;
            vertical-align: middle;
          }
          
          th {
            background: ${CORES_PADRAO.linhaAlternada};
            font-weight: bold;
            color: ${CORES_PADRAO.tituloSecao};
            font-size: 8pt;
            text-transform: uppercase;
          }
          
          tr:nth-child(even) {
            background: ${CORES_PADRAO.linhaAlternada};
          }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .status {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7pt;
            font-weight: bold;
          }
          
          .status-critico { background: ${CORES_PADRAO.alerta.critico}; color: white; }
          .status-alerta { background: ${CORES_PADRAO.alerta.alerta}; color: white; }
          .status-atencao { background: ${CORES_PADRAO.alerta.atencao}; color: black; }
          .status-normal { background: ${CORES_PADRAO.alerta.normal}; color: white; }
          .status-ativo { background: ${CORES_PADRAO.alerta.normal}; color: white; }
          .status-inativo { background: #6b7280; color: white; }
          
          .totais {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #dee2e6;
          }
          
          .totais h3 {
            color: ${CORES_PADRAO.tituloSecao};
            margin-bottom: 10px;
            font-size: 11pt;
          }
          
          .totais-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .total-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #e9ecef;
          }
          
          .total-label {
            font-size: 8pt;
            color: #666;
            margin-bottom: 5px;
          }
          
          .total-value {
            font-size: 12pt;
            font-weight: bold;
            color: ${CORES_PADRAO.cabecalho};
          }
          
          .rodape {
            margin-top: 30px;
            text-align: center;
            font-size: 8pt;
            font-style: italic;
            color: #666;
            border-top: 1px solid #e5e5e5;
            padding-top: 15px;
          }
          
          .assinaturas {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            font-size: 8pt;
          }
          
          .assinatura {
            text-align: center;
            width: 30%;
          }
          
          .linha-assinatura {
            border-top: 1px solid #333;
            margin-top: 30px;
            padding-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.fixMojibake(data.titulo)}</h1>
          <div class="header-info">
            <span>Relatório: ${data.summary.numeroRelatorio}</span>
            <span>${this.fixMojibake(data.periodo)}</span>
            <span>Gerado em: ${this.formatDateTime(data.summary.geradoEm)}</span>
          </div>
        </div>

        ${filtrosTexto ? `
          <div class="filtros">
            <strong>Filtros aplicados:</strong> ${filtrosTexto}
          </div>
        ` : ''}

        ${data.kpis ? `
          <div class="totais">
            <h3>Indicadores de Performance (KPIs)</h3>
            <div class="kpis">
              <div class="kpi ${data.kpis.taxaAtendimento >= 95 ? 'good' : data.kpis.taxaAtendimento >= 85 ? 'warning' : 'critical'}">
                <div class="kpi-label">Taxa de Atendimento</div>
                <div class="kpi-value">${data.kpis.taxaAtendimento.toFixed(1)}%</div>
              </div>
              <div class="kpi ${data.kpis.acuracidadeInventario >= 98 ? 'good' : data.kpis.acuracidadeInventario >= 95 ? 'warning' : 'critical'}">
                <div class="kpi-label">Acuracidade Inventário</div>
                <div class="kpi-value">${data.kpis.acuracidadeInventario.toFixed(1)}%</div>
              </div>
              <div class="kpi ${data.kpis.giroEstoque >= 6 ? 'good' : data.kpis.giroEstoque >= 4 ? 'warning' : 'critical'}">
                <div class="kpi-label">Giro de Estoque</div>
                <div class="kpi-value">${data.kpis.giroEstoque.toFixed(1)}x</div>
              </div>
              <div class="kpi ${data.kpis.taxaRuptura <= 2 ? 'good' : data.kpis.taxaRuptura <= 5 ? 'warning' : 'critical'}">
                <div class="kpi-label">Taxa de Ruptura</div>
                <div class="kpi-value">${data.kpis.taxaRuptura.toFixed(1)}%</div>
              </div>
              <div class="kpi ${data.kpis.coberturaEstoque >= 30 && data.kpis.coberturaEstoque <= 45 ? 'good' : 'warning'}">
                <div class="kpi-label">Cobertura Estoque</div>
                <div class="kpi-value">${data.kpis.coberturaEstoque.toFixed(0)} dias</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${data.grupos ? 
          data.grupos.map(grupo => `
            <div class="grupo ${getGroupClass(grupo.categoria)}">
              <div class="grupo-titulo">
                ${this.fixMojibake(grupo.categoria)} (${grupo.itens.length} itens${grupo.subtotal ? ` - ${this.formatCurrency(grupo.subtotal)}` : ''})
              </div>
              ${grupo.itens.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      ${data.columns.map(col => `
                        <th class="${col.align ? 'text-' + col.align : ''}">${this.fixMojibake(col.label)}</th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${grupo.itens.slice(0, 20).map((row: any) => `
                      <tr>
                        ${data.columns.map(col => `
                          <td class="${col.align ? 'text-' + col.align : ''}">${formatValue(row[col.key], col)}</td>
                        `).join('')}
                      </tr>
                    `).join('')}
                    ${grupo.itens.length > 20 ? `
                      <tr><td colspan="${data.columns.length}" style="text-align: center; font-style: italic;">
                        ... e mais ${grupo.itens.length - 20} itens
                      </td></tr>
                    ` : ''}
                  </tbody>
                </table>
              ` : '<p style="padding: 20px; text-align: center; color: #666;">Nenhum item nesta seção</p>'}
            </div>
          `).join('') 
        : `
          <table>
            <thead>
              <tr>
                ${data.columns.map(col => `
                  <th class="${col.align ? 'text-' + col.align : ''}">${this.fixMojibake(col.label)}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.rows.slice(0, 50).map((row: any) => `
                <tr>
                  ${data.columns.map(col => `
                    <td class="${col.align ? 'text-' + col.align : ''}">${formatValue(row[col.key], col)}</td>
                  `).join('')}
                </tr>
              `).join('')}
              ${data.rows.length > 50 ? `
                <tr><td colspan="${data.columns.length}" style="text-align: center; font-style: italic;">
                  ... e mais ${data.rows.length - 50} registros
                </td></tr>
              ` : ''}
            </tbody>
          </table>
        `}

        ${data.abcAnalysis ? `
          <div class="totais">
            <h3>Análise ABC</h3>
            <div class="totais-grid">
              <div class="total-item">
                <div class="total-label">Classe A (Alto Valor)</div>
                <div class="total-value">${data.abcAnalysis.A.count} itens (${data.abcAnalysis.A.percentage.toFixed(1)}%)</div>
              </div>
              <div class="total-item">
                <div class="total-label">Classe B (Médio Valor)</div>
                <div class="total-value">${data.abcAnalysis.B.count} itens (${data.abcAnalysis.B.percentage.toFixed(1)}%)</div>
              </div>
              <div class="total-item">
                <div class="total-label">Classe C (Baixo Valor)</div>
                <div class="total-value">${data.abcAnalysis.C.count} itens (${data.abcAnalysis.C.percentage.toFixed(1)}%)</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${data.totals || data.summary ? `
          <div class="totais">
            <h3>Resumo Executivo</h3>
            <div class="totais-grid">
              <div class="total-item">
                <div class="total-label">Total de Registros</div>
                <div class="total-value">${data.summary.totalRegistros.toLocaleString('pt-BR')}</div>
              </div>
              ${data.summary.valorTotal ? `
                <div class="total-item">
                  <div class="total-label">Valor Total</div>
                  <div class="total-value">${this.formatCurrency(data.summary.valorTotal)}</div>
                </div>
              ` : ''}
              ${data.summary.itensCriticos ? `
                <div class="total-item">
                  <div class="total-label">Itens Críticos</div>
                  <div class="total-value">${data.summary.itensCriticos}</div>
                </div>
              ` : ''}
              ${data.totals?.totalEntradas ? `
                <div class="total-item">
                  <div class="total-label">Total Entradas</div>
                  <div class="total-value">${data.totals.totalEntradas.toLocaleString('pt-BR')}</div>
                </div>
              ` : ''}
              ${data.totals?.totalSaidas ? `
                <div class="total-item">
                  <div class="total-label">Total Saídas</div>
                  <div class="total-value">${data.totals.totalSaidas.toLocaleString('pt-BR')}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <div class="assinaturas">
          <div class="assinatura">
            <div class="linha-assinatura">Almoxarife</div>
          </div>
          <div class="assinatura">
            <div class="linha-assinatura">Gestor</div>
          </div>
          <div class="assinatura">
            <div class="linha-assinatura">Contador</div>
          </div>
        </div>

        <div class="rodape">
          <p>Relatório gerado automaticamente pelo Sistema de Almoxarifado</p>
          <p>Número: ${numeroRelatorio} | ${totalRegistros} registro(s) | Gerado por: ${data.summary?.geradoPor || 'Sistema'}</p>
        </div>

        <!-- Elemento para garantir conteúdo mínimo -->
        <div style="height: 1px; width: 100%; background: transparent;"></div>
      </body>
      </html>
    `

    return this.fixMojibake(html)
  }

  // 5. RELATÓRIO DE FORNECEDORES
  async generateFornecedores(filtros: FornecedoresFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    let query = supabase
      .from('fornecedores')
      .select('*')
      .eq('ativo', true)

    // Aplicar filtros básicos (relacionamentos removidos por simplicidade)
    if (filtros.fornecedor && filtros.fornecedor !== 'todos') {
      query = query.eq('id', filtros.fornecedor)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    // Calcular métricas de performance por fornecedor (dados simulados)
    const fornecedoresProcessados = data.map(fornecedor => {
      // Métricas simuladas para demonstração
      const participacao = Math.random() * 50000 + 5000 // R$ 5.000 a R$ 55.000
      const leadTimeMedio = Math.floor(Math.random() * 20) + 5 // 5 a 25 dias
      const taxaCumprimento = Math.random() * 15 + 85 // 85% a 100%
      const indiceQualidade = Math.random() * 5 + 95 // 95% a 100%
      
      return {
        ...fornecedor,
        leadTimeMedio,
        taxaCumprimento,
        indiceQualidade,
        participacao,
        totalMateriais: Math.floor(Math.random() * 20) + 5, // 5 a 25 materiais
        totalNotas: Math.floor(Math.random() * 10) + 2 // 2 a 12 notas
      }
    })

    // Ordenar conforme critério (padrão: leadtime)
    const ordenarPor = filtros.ordenarPor || 'leadtime'
    switch (ordenarPor) {
      case 'leadtime':
        fornecedoresProcessados.sort((a, b) => a.leadTimeMedio - b.leadTimeMedio)
        break
      case 'qualidade':
        fornecedoresProcessados.sort((a, b) => b.indiceQualidade - a.indiceQualidade)
        break
      case 'participacao':
        fornecedoresProcessados.sort((a, b) => b.participacao - a.participacao)
        break
      case 'pontualidade':
        fornecedoresProcessados.sort((a, b) => b.taxaCumprimento - a.taxaCumprimento)
        break
    }

    const participacaoTotal = fornecedoresProcessados.reduce((sum, f) => sum + f.participacao, 0)
    const leadTimeGeral = fornecedoresProcessados.reduce((sum, f) => sum + f.leadTimeMedio, 0) / fornecedoresProcessados.length
    const numeroRelatorio = this.gerarNumeroRelatorio('fornecedores')

    return {
      reportId: 'fornecedores',
      titulo: 'RELATÓRIO DE PERFORMANCE DE FORNECEDORES',
      periodo: filtros.dataInicio && filtros.dataFim ? 
        `${this.formatDate(filtros.dataInicio)} até ${this.formatDate(filtros.dataFim)}` : 
        'Análise geral',
      filtrosAplicados: filtros,
      columns: [
        { key: 'razao_social', label: 'Fornecedor', type: 'text' },
        { key: 'cnpj', label: 'CNPJ', type: 'text' },
        { key: 'leadTimeMedio', label: 'Lead Time (dias)', type: 'number', align: 'center' },
        { key: 'taxaCumprimento', label: 'Pontualidade (%)', type: 'percentage', align: 'right' },
        { key: 'indiceQualidade', label: 'Qualidade (%)', type: 'percentage', align: 'right' },
        { key: 'participacao', label: 'Valor Fornecido', type: 'currency', align: 'right' },
        { key: 'totalMateriais', label: 'SKUs', type: 'number', align: 'center' }
      ],
      rows: fornecedoresProcessados.map(fornecedor => ({
        razao_social: fornecedor.razao_social,
        cnpj: fornecedor.cnpj,
        leadTimeMedio: fornecedor.leadTimeMedio,
        taxaCumprimento: fornecedor.taxaCumprimento,
        indiceQualidade: fornecedor.indiceQualidade,
        participacao: fornecedor.participacao,
        totalMateriais: fornecedor.totalMateriais
      })),
      kpis: {
        taxaAtendimento: 95.2,
        acuracidadeInventario: 98.1,
        giroEstoque: leadTimeGeral,
        taxaRuptura: 1.8,
        taxaObsolescencia: 2.1,
        coberturaEstoque: 38
      },
      totals: {
        totalFornecedores: fornecedoresProcessados.length,
        participacaoTotal,
        leadTimeGeral
      },
      summary: {
        totalRegistros: fornecedoresProcessados.length,
        valorTotal: participacaoTotal,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  // 6. RELATÓRIO DE REQUISIÇÕES PENDENTES
  async generateRequisicoesPendentes(filtros: RequisicoesFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    let query = supabase
      .from('solicitacoes')
      .select(`
        *,
        usuarios!usuario_id (nome),
        centros_custo!centro_custo_id (codigo, descricao),
        solicitacoes_itens (
          *,
          materiais_equipamentos (codigo, nome, categoria)
        )
      `)
      .in('status', ['pendente', 'em_andamento', 'parcial'])

    // Aplicar filtros
    if (filtros.prioridade && filtros.prioridade !== 'todas') {
      query = query.eq('prioridade', filtros.prioridade)
    }

    if (filtros.centroCusto && filtros.centroCusto !== 'todos') {
      query = query.eq('centro_custo_id', filtros.centroCusto)
    }

    if (filtros.responsavelAtendimento && filtros.responsavelAtendimento !== 'todos') {
      query = query.eq('responsavel_atendimento', filtros.responsavelAtendimento)
    }

    if (filtros.dataInicio) {
      query = query.gte('data_solicitacao', filtros.dataInicio)
    }

    if (filtros.dataFim) {
      query = query.lte('data_solicitacao', filtros.dataFim)
    }

    const { data, error } = await query.order('data_solicitacao', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    const hoje = new Date()
    
    // Processar requisições com aging
    const requisicoesProcessadas = data.map(solicitacao => {
      const dataSolicitacao = new Date(solicitacao.data_solicitacao)
      const aging = Math.floor((hoje.getTime() - dataSolicitacao.getTime()) / (1000 * 60 * 60 * 24))
      
      const valorTotal = (solicitacao.solicitacoes_itens || [])
        .reduce((sum, item) => sum + ((item.materiais_equipamentos?.valor_unitario || 0) * item.quantidade_solicitada), 0)
      
      // Classificar aging
      let classificacaoAging: string
      if (aging <= 3) {
        classificacaoAging = 'NORMAL'
      } else if (aging <= 7) {
        classificacaoAging = 'ATENÇÃO'
      } else if (aging <= 15) {
        classificacaoAging = 'ALERTA'
      } else {
        classificacaoAging = 'CRÍTICO'
      }
      
      return {
        ...solicitacao,
        aging,
        classificacaoAging,
        valorTotal,
        totalItens: solicitacao.solicitacoes_itens?.length || 0
      }
    })

    // Calcular métricas
    const backlogQuantidade = requisicoesProcessadas.length
    const backlogValor = requisicoesProcessadas.reduce((sum, req) => sum + req.valorTotal, 0)
    const tempoMedioAtendimento = requisicoesProcessadas.reduce((sum, req) => sum + req.aging, 0) / backlogQuantidade
    
    const requisicoesNoPrazo = requisicoesProcessadas.filter(req => req.aging <= 7).length
    const taxaAtendimentoPrazo = (requisicoesNoPrazo / backlogQuantidade) * 100

    // Agrupar por aging se solicitado (padrão: true)
    let grupos
    const aging = filtros.aging !== undefined ? filtros.aging : true
    if (aging) {
      grupos = [
        {
          categoria: 'CRÍTICO - Mais de 15 dias',
          itens: requisicoesProcessadas.filter(req => req.aging > 15),
          subtotal: requisicoesProcessadas.filter(req => req.aging > 15).reduce((sum, req) => sum + req.valorTotal, 0)
        },
        {
          categoria: 'ALERTA - 8 a 15 dias',
          itens: requisicoesProcessadas.filter(req => req.aging >= 8 && req.aging <= 15),
          subtotal: requisicoesProcessadas.filter(req => req.aging >= 8 && req.aging <= 15).reduce((sum, req) => sum + req.valorTotal, 0)
        },
        {
          categoria: 'ATENÇÃO - 4 a 7 dias',
          itens: requisicoesProcessadas.filter(req => req.aging >= 4 && req.aging <= 7),
          subtotal: requisicoesProcessadas.filter(req => req.aging >= 4 && req.aging <= 7).reduce((sum, req) => sum + req.valorTotal, 0)
        },
        {
          categoria: 'NORMAL - Até 3 dias',
          itens: requisicoesProcessadas.filter(req => req.aging <= 3),
          subtotal: requisicoesProcessadas.filter(req => req.aging <= 3).reduce((sum, req) => sum + req.valorTotal, 0)
        }
      ]
    }

    const numeroRelatorio = this.gerarNumeroRelatorio('requisicoes-pendentes')

    return {
      reportId: 'requisicoes-pendentes',
      titulo: 'RELATÓRIO DE REQUISIÇÕES PENDENTES',
      periodo: `Análise em ${this.formatDate(hoje.toISOString())}`,
      filtrosAplicados: filtros,
      columns: [
        { key: 'numero_solicitacao', label: 'Nº Solicitação', type: 'text' },
        { key: 'data_solicitacao', label: 'Data', type: 'date' },
        { key: 'solicitante', label: 'Solicitante', type: 'text' },
        { key: 'centro_custo', label: 'Centro Custo', type: 'text' },
        { key: 'prioridade', label: 'Prioridade', type: 'status', align: 'center' },
        { key: 'aging', label: 'Aging (dias)', type: 'number', align: 'center' },
        { key: 'totalItens', label: 'Itens', type: 'number', align: 'center' },
        { key: 'valorTotal', label: 'Valor', type: 'currency', align: 'right' },
        { key: 'status', label: 'Status', type: 'status', align: 'center' }
      ],
      rows: requisicoesProcessadas.map(req => ({
        numero_solicitacao: req.numero_solicitacao,
        data_solicitacao: req.data_solicitacao,
        solicitante: req.usuarios?.nome || '-',
        centro_custo: req.centros_custo ? `${req.centros_custo.codigo} - ${req.centros_custo.descricao}` : '-',
        prioridade: req.prioridade?.toUpperCase() || 'NORMAL',
        aging: req.aging,
        totalItens: req.totalItens,
        valorTotal: req.valorTotal,
        status: req.status?.toUpperCase() || 'PENDENTE',
        classificacaoAging: req.classificacaoAging
      })),
      grupos,
      kpis: {
        taxaAtendimento: taxaAtendimentoPrazo,
        acuracidadeInventario: 98.5,
        giroEstoque: 8.2,
        taxaRuptura: ((backlogQuantidade / 1000) * 100), // Simulado
        taxaObsolescencia: 1.8,
        coberturaEstoque: 42
      },
      totals: {
        backlogQuantidade,
        backlogValor,
        tempoMedioAtendimento,
        taxaAtendimentoPrazo
      },
      summary: {
        totalRegistros: backlogQuantidade,
        valorTotal: backlogValor,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  // 7. RELATÓRIO DE ANÁLISE ABC/XYZ
  async generateAnaliseABCXYZ(filtros: AnaliseABCXYZFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    const validacaoPeriodo = this.validarPeriodo(filtros.dataInicio, filtros.dataFim)
    if (validacaoPeriodo) {
      throw new Error(validacaoPeriodo)
    }

    let query = supabase
      .from('materiais_equipamentos')
      .select(`
        *,
        movimentacao_estoque!material_equipamento_id (
          quantidade,
          data_movimentacao,
          valor_unitario
        )
      `)
      .eq('ativo', true)

    if (filtros.categoria && filtros.categoria !== 'todas') {
      query = query.eq('categoria', filtros.categoria)
    }

    if (filtros.localizacao && filtros.localizacao !== 'todas') {
      query = query.eq('localizacao_id', filtros.localizacao)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    // Filtrar movimentações por período
    const dataInicio = new Date(filtros.dataInicio!)
    const dataFim = new Date(filtros.dataFim!)

    const materiaisProcessados = data.map(material => {
      const movimentacoesPeriodo = (material.movimentacao_estoque || [])
        .filter(mov => {
          const dataMovimentacao = new Date(mov.data_movimentacao)
          return dataMovimentacao >= dataInicio && dataMovimentacao <= dataFim
        })

      // Calcular métricas para ABC e XYZ
      const valorTotal = (material.valor_unitario || 0) * (material.estoque_atual || 0)
      const quantidadeMovimentada = movimentacoesPeriodo.reduce((sum, mov) => sum + Math.abs(mov.quantidade), 0)
      const frequenciaMovimentacao = movimentacoesPeriodo.length
      
      // Cálculo simplificado do giro
      const giroEstoque = material.estoque_atual > 0 ? quantidadeMovimentada / material.estoque_atual : 0
      
      // Variabilidade da demanda (desvio padrão das movimentações)
      const mediaDemanda = quantidadeMovimentada / (movimentacoesPeriodo.length || 1)
      const variabilidade = movimentacoesPeriodo.length > 1 ? 
        Math.sqrt(movimentacoesPeriodo.reduce((sum, mov) => sum + Math.pow(Math.abs(mov.quantidade) - mediaDemanda, 2), 0) / movimentacoesPeriodo.length) : 0

      return {
        ...material,
        valorTotal,
        quantidadeMovimentada,
        frequenciaMovimentacao,
        giroEstoque,
        variabilidade,
        mediaDemanda
      }
    })

    // Classificação ABC baseada no critério escolhido (padrão: valor)
    let dadosParaABC = [...materiaisProcessados]
    const criterioABC = filtros.criterioABC || 'valor'
    switch (criterioABC) {
      case 'valor':
        dadosParaABC.sort((a, b) => b.valorTotal - a.valorTotal)
        break
      case 'quantidade':
        dadosParaABC.sort((a, b) => b.quantidadeMovimentada - a.quantidadeMovimentada)
        break
      case 'movimentacao':
        dadosParaABC.sort((a, b) => b.frequenciaMovimentacao - a.frequenciaMovimentacao)
        break
    }

    // Classificação XYZ baseada no critério escolhido (padrão: giro)
    let dadosParaXYZ = [...materiaisProcessados]
    const criterioXYZ = filtros.criterioXYZ || 'giro'
    switch (criterioXYZ) {
      case 'giro':
        dadosParaXYZ.sort((a, b) => b.giroEstoque - a.giroEstoque)
        break
      case 'variabilidade':
        dadosParaXYZ.sort((a, b) => a.variabilidade - b.variabilidade) // Menor variabilidade = X
        break
      case 'sazonalidade':
        // Simplificado - usar frequência como proxy para sazonalidade
        dadosParaXYZ.sort((a, b) => b.frequenciaMovimentacao - a.frequenciaMovimentacao)
        break
    }

    // Aplicar classificação ABC
    const totalItens = materiaisProcessados.length
    materiaisProcessados.forEach((material, index) => {
      const posicaoABC = dadosParaABC.findIndex(item => item.id === material.id)
      const percentualABC = (posicaoABC + 1) / totalItens

      if (percentualABC <= 0.2) {
        material.classificacaoABC = 'A'
      } else if (percentualABC <= 0.5) {
        material.classificacaoABC = 'B'
      } else {
        material.classificacaoABC = 'C'
      }
    })

    // Aplicar classificação XYZ
    materiaisProcessados.forEach((material, index) => {
      const posicaoXYZ = dadosParaXYZ.findIndex(item => item.id === material.id)
      const percentualXYZ = (posicaoXYZ + 1) / totalItens

      if (percentualXYZ <= 0.33) {
        material.classificacaoXYZ = 'X'
      } else if (percentualXYZ <= 0.67) {
        material.classificacaoXYZ = 'Y'
      } else {
        material.classificacaoXYZ = 'Z'
      }

      // Combinação ABC/XYZ
      material.classificacaoCombinada = `${material.classificacaoABC}${material.classificacaoXYZ}`
    })

    // Gerar distribuições
    const abcDistribution = this.calcularAnaliseABC(materiaisProcessados)
    
    const xyzDistribution: XYZDistribution = {
      X: {
        count: materiaisProcessados.filter(m => m.classificacaoXYZ === 'X').length,
        percentage: (materiaisProcessados.filter(m => m.classificacaoXYZ === 'X').length / totalItens) * 100
      },
      Y: {
        count: materiaisProcessados.filter(m => m.classificacaoXYZ === 'Y').length,
        percentage: (materiaisProcessados.filter(m => m.classificacaoXYZ === 'Y').length / totalItens) * 100
      },
      Z: {
        count: materiaisProcessados.filter(m => m.classificacaoXYZ === 'Z').length,
        percentage: (materiaisProcessados.filter(m => m.classificacaoXYZ === 'Z').length / totalItens) * 100
      }
    }

    // Matriz 3x3 se solicitada (padrão: false)
    let grupos
    const incluirMatriz = filtros.incluirMatriz || false
    if (incluirMatriz) {
      const combinacoes = ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ']
      grupos = combinacoes.map(combinacao => {
        const itens = materiaisProcessados.filter(m => m.classificacaoCombinada === combinacao)
        return {
          categoria: `Quadrante ${combinacao}`,
          itens,
          subtotal: itens.reduce((sum, item) => sum + item.valorTotal, 0)
        }
      })
    }

    const numeroRelatorio = this.gerarNumeroRelatorio('analise-abc-xyz')

    return {
      reportId: 'analise-abc-xyz',
      titulo: 'RELATÓRIO DE ANÁLISE ABC/XYZ',
      periodo: `${this.formatDate(filtros.dataInicio!)} até ${this.formatDate(filtros.dataFim!)}`,
      filtrosAplicados: filtros,
      columns: [
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'categoria', label: 'Categoria', type: 'text' },
        { key: 'valorTotal', label: 'Valor Total', type: 'currency', align: 'right' },
        { key: 'giroEstoque', label: 'Giro', type: 'number', align: 'right' },
        { key: 'classificacaoABC', label: 'ABC', type: 'status', align: 'center' },
        { key: 'classificacaoXYZ', label: 'XYZ', type: 'status', align: 'center' },
        { key: 'classificacaoCombinada', label: 'Combinada', type: 'status', align: 'center' }
      ],
      rows: materiaisProcessados.map(material => ({
        codigo: material.codigo,
        nome: material.nome,
        categoria: material.categoria || '-',
        valorTotal: material.valorTotal,
        giroEstoque: material.giroEstoque,
        classificacaoABC: material.classificacaoABC,
        classificacaoXYZ: material.classificacaoXYZ,
        classificacaoCombinada: material.classificacaoCombinada
      })),
      grupos,
      abcAnalysis: abcDistribution,
      xyzAnalysis: xyzDistribution,
      kpis: this.calcularKPIs(materiaisProcessados, 'analise-abc-xyz'),
      summary: {
        totalRegistros: totalItens,
        valorTotal: materiaisProcessados.reduce((sum, m) => sum + m.valorTotal, 0),
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  // 8. RELATÓRIO DE INVENTÁRIO ROTATIVO
  async generateInventarioRotativo(filtros: InventarioRotativoFilter): Promise<ReportData> {
    // Verificar se filtros foi passado
    if (!filtros) {
      filtros = {}
    }

    // Este relatório necessitaria de uma tabela específica para controles de inventário
    // Por simplicidade, vamos simular com dados dos materiais
    
    let query = supabase
      .from('materiais_equipamentos')
      .select(`
        *,
        localizacao (nome),
        movimentacao_estoque!material_equipamento_id (
          *
        )
      `)
      .eq('ativo', true)

    if (filtros.categoria && filtros.categoria !== 'todas') {
      query = query.eq('categoria', filtros.categoria)
    }

    if (filtros.localizacao && filtros.localizacao !== 'todas') {
      query = query.eq('localizacao_id', filtros.localizacao)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    const hoje = new Date()
    
    // Simular dados de inventário rotativo
    const materiaisInventario = data.map(material => {
      // Simular contagem física vs sistema
      const estoqueNominale = material.estoque_atual || 0
      const estoqueFisico = estoqueNominale + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3) : 0)
      
      const divergencia = estoqueFisico - estoqueNominale
      const divergenciaPercentual = estoqueNominale > 0 ? (divergencia / estoqueNominale) * 100 : 0
      const acuracidade = Math.abs(divergenciaPercentual) <= 2 ? 100 : 100 - Math.abs(divergenciaPercentual)
      
      // Simular data da Última contagem
      const diasDesdeContagem = Math.floor(Math.random() * 90)
      const dataUltimaContagem = new Date(hoje.getTime() - (diasDesdeContagem * 24 * 60 * 60 * 1000))
      
      // Classificar necessidade de contagem baseada no ciclo (padrão: mensal)
      let proximaContagem: Date
      const ciclo = filtros.ciclo || 'mensal'
      switch (ciclo) {
        case 'semanal':
          proximaContagem = new Date(dataUltimaContagem.getTime() + (7 * 24 * 60 * 60 * 1000))
          break
        case 'mensal':
          proximaContagem = new Date(dataUltimaContagem.getTime() + (30 * 24 * 60 * 60 * 1000))
          break
        case 'trimestral':
          proximaContagem = new Date(dataUltimaContagem.getTime() + (90 * 24 * 60 * 60 * 1000))
          break
        default:
          proximaContagem = new Date(dataUltimaContagem.getTime() + (30 * 24 * 60 * 60 * 1000))
      }

      const diasParaContagem = Math.ceil((proximaContagem.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      
      let statusContagem: string
      if (diasParaContagem < 0) {
        statusContagem = 'VENCIDO'
      } else if (diasParaContagem <= 3) {
        statusContagem = 'URGENTE'
      } else if (diasParaContagem <= 7) {
        statusContagem = 'PRÓXIMO'
      } else {
        statusContagem = 'OK'
      }

      return {
        ...material,
        estoqueNominale,
        estoqueFisico,
        divergencia,
        divergenciaPercentual,
        acuracidade,
        dataUltimaContagem,
        proximaContagem,
        diasParaContagem,
        statusContagem,
        valorDivergencia: (material.valor_unitario || 0) * Math.abs(divergencia)
      }
    })

    // Calcular métricas gerais
    const acuracidadeGeral = materiaisInventario.reduce((sum, item) => sum + item.acuracidade, 0) / materiaisInventario.length
    const itensComDivergencia = materiaisInventario.filter(item => Math.abs(item.divergencia) > 0).length
    const valorTotalDivergencias = materiaisInventario.reduce((sum, item) => sum + item.valorDivergencia, 0)
    
    const divergenciasPorCategoria = materiaisInventario.reduce((acc, item) => {
      const categoria = item.categoria || 'Sem Categoria'
      if (!acc[categoria]) {
        acc[categoria] = { total: 0, comDivergencia: 0, acuracidade: 0 }
      }
      acc[categoria].total++
      if (Math.abs(item.divergencia) > 0) acc[categoria].comDivergencia++
      acc[categoria].acuracidade += item.acuracidade
      return acc
    }, {} as any)

    // Processar acuracidade por categoria
    Object.keys(divergenciasPorCategoria).forEach(categoria => {
      divergenciasPorCategoria[categoria].acuracidade = 
        divergenciasPorCategoria[categoria].acuracidade / divergenciasPorCategoria[categoria].total
    })

    // Agrupar por divergências se solicitado (padrão: false)
    let grupos
    const incluirDivergencias = filtros.incluirDivergencias || false
    if (incluirDivergencias) {
      grupos = [
        {
          categoria: 'DIVERGÊNCIAS CRÍTICAS (>5%)',
          itens: materiaisInventario.filter(item => Math.abs(item.divergenciaPercentual) > 5),
          subtotal: materiaisInventario.filter(item => Math.abs(item.divergenciaPercentual) > 5)
            .reduce((sum, item) => sum + item.valorDivergencia, 0)
        },
        {
          categoria: 'DIVERGÊNCIAS MODERADAS (2-5%)',
          itens: materiaisInventario.filter(item => Math.abs(item.divergenciaPercentual) > 2 && Math.abs(item.divergenciaPercentual) <= 5),
          subtotal: materiaisInventario.filter(item => Math.abs(item.divergenciaPercentual) > 2 && Math.abs(item.divergenciaPercentual) <= 5)
            .reduce((sum, item) => sum + item.valorDivergencia, 0)
        },
        {
          categoria: 'DIVERGÊNCIAS MENORES (≤2%)',
          itens: materiaisInventario.filter(item => Math.abs(item.divergenciaPercentual) > 0 && Math.abs(item.divergenciaPercentual) <= 2),
          subtotal: materiaisInventario.filter(item => Math.abs(item.divergenciaPercentual) > 0 && Math.abs(item.divergenciaPercentual) <= 2)
            .reduce((sum, item) => sum + item.valorDivergencia, 0)
        },
        {
          categoria: 'SEM DIVERGÊNCIAS',
          itens: materiaisInventario.filter(item => item.divergencia === 0),
          subtotal: 0
        }
      ]
    }

    const numeroRelatorio = this.gerarNumeroRelatorio('inventario-rotativo')

    return {
      reportId: 'inventario-rotativo',
      titulo: 'RELATÓRIO DE INVENTÁRIO ROTATIVO',
      periodo: `Análise em ${this.formatDate(hoje.toISOString())} - Ciclo: ${filtros.ciclo || 'mensal'}`,
      filtrosAplicados: filtros,
      columns: [
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nome', label: 'Descrição', type: 'text' },
        { key: 'categoria', label: 'Categoria', type: 'text' },
        { key: 'estoqueNominale', label: 'Est. Sistema', type: 'number', align: 'right' },
        { key: 'estoqueFisico', label: 'Est. Físico', type: 'number', align: 'right' },
        { key: 'divergencia', label: 'Divergência', type: 'number', align: 'right' },
        { key: 'divergenciaPercentual', label: 'Div. %', type: 'percentage', align: 'right' },
        { key: 'acuracidade', label: 'Acuracidade %', type: 'percentage', align: 'right' },
        { key: 'dataUltimaContagem', label: 'Última Contagem', type: 'date' },
        { key: 'statusContagem', label: 'Status', type: 'status', align: 'center' }
      ],
      rows: materiaisInventario.map(item => ({
        codigo: item.codigo,
        nome: item.nome,
        categoria: item.categoria || '-',
        estoqueNominale: item.estoqueNominale,
        estoqueFisico: item.estoqueFisico,
        divergencia: item.divergencia,
        divergenciaPercentual: item.divergenciaPercentual,
        acuracidade: item.acuracidade,
        dataUltimaContagem: item.dataUltimaContagem.toISOString().split('T')[0],
        statusContagem: item.statusContagem
      })),
      grupos,
      kpis: {
        taxaAtendimento: 96.8,
        acuracidadeInventario: acuracidadeGeral,
        giroEstoque: 7.2,
        taxaRuptura: (itensComDivergencia / materiaisInventario.length) * 100,
        taxaObsolescencia: 1.5,
        coberturaEstoque: 41
      },
      totals: {
        totalItens: materiaisInventario.length,
        itensComDivergencia,
        acuracidadeGeral,
        valorTotalDivergencias,
        categoriasAnalisadas: Object.keys(divergenciasPorCategoria).length
      },
      summary: {
        totalRegistros: materiaisInventario.length,
        valorTotal: valorTotalDivergencias,
        observacoes: `Análise de inventário rotativo com ciclo ${filtros.ciclo || 'mensal'}. Acuracidade geral: ${acuracidadeGeral.toFixed(1)}%`,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private sanitizeFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|]+/g, '-')
  }

  private downloadTextFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = this.sanitizeFileName(filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  private formatExportValue(value: any, column: any): string {
    if (value === null || value === undefined) return ''

    switch (column.type) {
      case 'currency':
        return this.formatCurrency(Number(value))
      case 'percentage':
        return this.formatPercentage(Number(value))
      case 'date':
        return this.formatDate(value)
      case 'datetime':
        return this.formatDateTime(value)
      default:
        return this.fixMojibake(value)
    }
  }

  private generateCSVReport(data: ReportData): string {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const header = data.columns.map(column => escape(this.fixMojibake(column.label))).join(';')
    const rows = data.rows.map(row =>
      data.columns.map(column => escape(this.formatExportValue(row[column.key], column))).join(';')
    )

    return ['\ufeff' + this.fixMojibake(data.titulo), this.fixMojibake(data.periodo), '', header, ...rows].join('\r\n')
  }

  private generateExcelReport(data: ReportData): string {
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const headers = data.columns.map(column => `<th>${escape(this.fixMojibake(column.label))}</th>`).join('')
    const rows = data.rows.map(row => {
      const cells = data.columns
        .map(column => `<td>${escape(this.formatExportValue(row[column.key], column))}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    }).join('')

    return `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { background: #1f2937; color: #fff; font-weight: 700; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
        </style>
      </head>
      <body>
        <h1>${escape(this.fixMojibake(data.titulo))}</h1>
        <p>${escape(this.fixMojibake(data.periodo))}</p>
        <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      </body>
      </html>`
  }

  private async generateMovimentacaoCorrigida(filtros: MovimentacaoFilter): Promise<ReportData> {
    if (!filtros) filtros = {}

    const validacaoPeriodo = this.validarPeriodo(filtros.dataInicio, filtros.dataFim)
    if (validacaoPeriodo) throw new Error(validacaoPeriodo)

    let query = supabase
      .from('movimentacao_estoque')
      .select(`
        *,
        materiais_equipamentos!material_equipamento_id (codigo, nome, unidade_medida, categoria)
      `)
      .gte('data_movimentacao', filtros.dataInicio!)
      .lte('data_movimentacao', filtros.dataFim!)
      .order('data_movimentacao', { ascending: false })

    if (filtros.tipoMovimentacao && filtros.tipoMovimentacao !== 'todos') {
      query = query.eq('tipo_movimentacao', filtros.tipoMovimentacao)
    }

    if (filtros.responsavel && filtros.responsavel !== 'todos') {
      query = query.eq('usuario_id', filtros.responsavel)
    }

    const { data, error } = (await query) as any
    if (error) throw error

    let movimentacoes = data || []
    if (filtros.categoria && filtros.categoria !== 'todas') {
      movimentacoes = movimentacoes.filter((mov: any) => mov.materiais_equipamentos?.categoria === filtros.categoria)
    }

    if (movimentacoes.length === 0) throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)

    const usuariosPorId = new Map<string, string>()
    const usuarioIds = [...new Set(movimentacoes.map((mov: any) => mov.usuario_id).filter(Boolean))]
    if (usuarioIds.length > 0) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nome')
        .in('id', usuarioIds as string[])

      usuarios?.forEach(usuario => usuariosPorId.set(usuario.id, usuario.nome))
    }

    const totalEntradas = movimentacoes
      .filter((mov: any) => mov.tipo_movimentacao === 'entrada')
      .reduce((sum: number, mov: any) => sum + mov.quantidade, 0)
    const totalSaidas = movimentacoes
      .filter((mov: any) => mov.tipo_movimentacao === 'saida')
      .reduce((sum: number, mov: any) => sum + mov.quantidade, 0)
    const totalAjustes = movimentacoes
      .filter((mov: any) => mov.tipo_movimentacao === 'ajuste')
      .reduce((sum: number, mov: any) => sum + Math.abs(mov.quantidade), 0)
    const volumeMovimentado = movimentacoes
      .reduce((sum: number, mov: any) => sum + ((mov.valor_unitario || 0) * Math.abs(mov.quantidade)), 0)
    const totalMovimentado = totalEntradas + totalSaidas + totalAjustes
    const taxaAjustes = totalMovimentado > 0 ? (totalAjustes / totalMovimentado) * 100 : 0

    let columns
    let rows

    if ((filtros.formato || 'analitico') === 'analitico') {
      columns = [
        { key: 'data_movimentacao', label: 'Data/Hora', type: 'datetime' },
        { key: 'tipo_movimentacao', label: 'Mov', type: 'text', align: 'center' },
        { key: 'codigo', label: 'Codigo', type: 'text' },
        { key: 'nome', label: 'Descricao', type: 'text' },
        { key: 'quantidade', label: 'Qtd', type: 'number', align: 'right' },
        { key: 'unidade', label: 'UN', type: 'text', align: 'center' },
        { key: 'valor_unitario', label: 'Valor', type: 'currency', align: 'right' },
        { key: 'saldo', label: 'Saldo', type: 'number', align: 'right' },
        { key: 'responsavel', label: 'Responsavel', type: 'text' },
        { key: 'observacoes', label: 'Observacao', type: 'text' }
      ]
      rows = movimentacoes.map((mov: any) => ({
        data_movimentacao: mov.data_movimentacao,
        tipo_movimentacao: mov.tipo_movimentacao?.toUpperCase() || '-',
        codigo: mov.materiais_equipamentos?.codigo || '-',
        nome: mov.materiais_equipamentos?.nome || '-',
        quantidade: mov.quantidade,
        unidade: mov.materiais_equipamentos?.unidade_medida || 'UN',
        valor_unitario: mov.valor_unitario || 0,
        saldo: mov.quantidade_atual || 0,
        responsavel: usuariosPorId.get(mov.usuario_id) || '-',
        observacoes: mov.observacoes || '-'
      }))
    } else {
      const materiais = [...new Set(movimentacoes.map((mov: any) => mov.material_equipamento_id))]
      columns = [
        { key: 'codigo', label: 'Material', type: 'text' },
        { key: 'nome', label: 'Descricao', type: 'text' },
        { key: 'saldo_inicial', label: 'Saldo Inicial', type: 'number', align: 'right' },
        { key: 'entradas', label: 'Entradas', type: 'number', align: 'right' },
        { key: 'saidas', label: 'Saidas', type: 'number', align: 'right' },
        { key: 'ajustes', label: 'Ajustes', type: 'number', align: 'right' },
        { key: 'saldo_final', label: 'Saldo Final', type: 'number', align: 'right' },
        { key: 'variacao', label: 'Variacao %', type: 'percentage', align: 'right' }
      ]
      rows = materiais.map(materialId => {
        const movimentacoesMaterial = movimentacoes.filter((mov: any) => mov.material_equipamento_id === materialId)
        const material = movimentacoesMaterial[0]?.materiais_equipamentos
        const entradas = movimentacoesMaterial.filter((mov: any) => mov.tipo_movimentacao === 'entrada').reduce((sum: number, mov: any) => sum + mov.quantidade, 0)
        const saidas = movimentacoesMaterial.filter((mov: any) => mov.tipo_movimentacao === 'saida').reduce((sum: number, mov: any) => sum + mov.quantidade, 0)
        const ajustes = movimentacoesMaterial.filter((mov: any) => mov.tipo_movimentacao === 'ajuste').reduce((sum: number, mov: any) => sum + mov.quantidade, 0)
        const saldoInicial = movimentacoesMaterial[movimentacoesMaterial.length - 1]?.quantidade_anterior || 0
        const saldoFinal = movimentacoesMaterial[0]?.quantidade_atual || 0

        return {
          codigo: material?.codigo || '-',
          nome: material?.nome || '-',
          saldo_inicial: saldoInicial,
          entradas,
          saidas,
          ajustes,
          saldo_final: saldoFinal,
          variacao: saldoInicial !== 0 ? ((saldoFinal - saldoInicial) / saldoInicial) * 100 : 0
        }
      })
    }

    const numeroRelatorio = this.gerarNumeroRelatorio('movimentacao')
    return {
      reportId: 'movimentacao',
      titulo: 'RELATORIO DE MOVIMENTACAO',
      periodo: this.getReportPeriod(filtros),
      filtrosAplicados: filtros,
      columns: columns as any,
      rows,
      totals: { totalEntradas, totalSaidas, totalAjustes, volumeMovimentado, taxaAjustes },
      kpis: this.calcularKPIs(movimentacoes, 'movimentacao'),
      summary: {
        totalRegistros: movimentacoes.length,
        valorTotal: volumeMovimentado,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private async generateConsumoCentroCustoCorrigido(filtros: ConsumoCentroCustoFilter): Promise<ReportData> {
    if (!filtros) filtros = {}

    const validacaoPeriodo = this.validarPeriodo(filtros.dataInicio, filtros.dataFim)
    if (validacaoPeriodo) throw new Error(validacaoPeriodo)

    const { data, error } = (await supabase
      .from('movimentacao_estoque')
      .select(`
        *,
        materiais_equipamentos!material_equipamento_id (codigo, nome, categoria),
        romaneios!romaneio_id (
          centro_custo_destino_id,
          centro_custo_destino:centro_custo_destino_id (codigo, descricao)
        )
      `)
      .eq('tipo_movimentacao', 'saida')
      .gte('data_movimentacao', filtros.dataInicio!)
      .lte('data_movimentacao', filtros.dataFim!)) as any

    if (error) throw error

    let movimentos = data || []
    if (filtros.categoria && filtros.categoria !== 'todas') {
      movimentos = movimentos.filter((mov: any) => mov.materiais_equipamentos?.categoria === filtros.categoria)
    }
    if (filtros.centroCusto && filtros.centroCusto !== 'todos') {
      movimentos = movimentos.filter((mov: any) => mov.romaneios?.centro_custo_destino_id === filtros.centroCusto)
    }
    if (movimentos.length === 0) throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)

    const consumoPorCentro = movimentos.reduce((acc: any, mov: any) => {
      const centro = mov.romaneios?.centro_custo_destino
      const centroCusto = centro ? `${centro.codigo} - ${centro.descricao}` : 'Sem Centro de Custo'
      const categoria = mov.materiais_equipamentos?.categoria || 'Sem Categoria'
      const valor = (mov.valor_unitario || 0) * Math.abs(mov.quantidade || 0)

      acc[centroCusto] ||= { total: 0, categorias: {} }
      acc[centroCusto].categorias[categoria] ||= 0
      acc[centroCusto].total += valor
      acc[centroCusto].categorias[categoria] += valor
      return acc
    }, {})

    const categorias = [...new Set(movimentos.map((mov: any) => mov.materiais_equipamentos?.categoria || 'Sem Categoria'))]
    const rows = Object.keys(consumoPorCentro).map(centro => {
      const row: any = { centro_custo: centro, total: consumoPorCentro[centro].total }
      categorias.forEach((categoria: any) => {
        row[categoria] = consumoPorCentro[centro].categorias[categoria] || 0
      })
      return row
    }).sort((a, b) => b.total - a.total)

    if (filtros.limitarTop) rows.splice(filtros.limitarTop)

    const consumoTotal = rows.reduce((sum, row) => sum + row.total, 0)
    const numeroRelatorio = this.gerarNumeroRelatorio('consumo-centro-custo')
    return {
      reportId: 'consumo-centro-custo',
      titulo: 'RELATORIO DE CONSUMO POR CENTRO DE CUSTO',
      periodo: this.getReportPeriod(filtros),
      filtrosAplicados: filtros,
      columns: [
        { key: 'centro_custo', label: 'Centro de Custo', type: 'text' },
        ...categorias.map(categoria => ({ key: categoria, label: categoria, type: 'currency' as const, align: 'right' as const })),
        { key: 'total', label: 'Total', type: 'currency', align: 'right' }
      ],
      rows,
      totals: { consumoTotal, centrosCustoAtivos: rows.length },
      kpis: this.calcularKPIs(movimentos, 'consumo-centro-custo'),
      summary: {
        totalRegistros: rows.length,
        valorTotal: consumoTotal,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private async generateFornecedoresCorrigido(filtros: FornecedoresFilter): Promise<ReportData> {
    if (!filtros) filtros = {}

    let query = supabase.from('fornecedores').select('*').eq('ativo', true)
    if (filtros.fornecedor && filtros.fornecedor !== 'todos') query = query.eq('id', filtros.fornecedor)

    const { data: fornecedores, error } = await query
    if (error) throw error
    if (!fornecedores || fornecedores.length === 0) throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)

    const fornecedorIds = fornecedores.map(fornecedor => fornecedor.id)
    const { data: materiais } = await supabase
      .from('materiais_equipamentos')
      .select('fornecedor_id, categoria')
      .in('fornecedor_id', fornecedorIds)

    let nfeQuery = supabase
      .from('nfe_importacao')
      .select('fornecedor_id, data_emissao, data_importacao, valor_total, status')
      .in('fornecedor_id', fornecedorIds)

    if (filtros.dataInicio) nfeQuery = nfeQuery.gte('data_emissao', filtros.dataInicio)
    if (filtros.dataFim) nfeQuery = nfeQuery.lte('data_emissao', filtros.dataFim)

    const { data: notas } = await nfeQuery

    const fornecedoresProcessados = fornecedores.map(fornecedor => {
      const notasFornecedor = (notas || []).filter(nota => nota.fornecedor_id === fornecedor.id)
      const materiaisFornecedor = (materiais || []).filter(material => material.fornecedor_id === fornecedor.id)
      const participacao = notasFornecedor.reduce((sum, nota) => sum + (nota.valor_total || 0), 0)
      const leadTimes = notasFornecedor
        .map(nota => {
          if (!nota.data_importacao || !nota.data_emissao) return null
          return Math.max(0, Math.ceil((new Date(nota.data_importacao).getTime() - new Date(nota.data_emissao).getTime()) / (1000 * 60 * 60 * 24)))
        })
        .filter((value): value is number => value !== null)
      const leadTimeMedio = leadTimes.length ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length : 0
      const notasValidas = notasFornecedor.filter(nota => !['erro', 'cancelada', 'cancelado'].includes((nota.status || '').toLowerCase())).length
      const taxaCumprimento = notasFornecedor.length ? (notasValidas / notasFornecedor.length) * 100 : 0

      return {
        ...fornecedor,
        documento: fornecedor.cnpj || fornecedor.cpf || '-',
        leadTimeMedio,
        taxaCumprimento,
        indiceQualidade: taxaCumprimento,
        participacao,
        totalMateriais: materiaisFornecedor.length,
        totalNotas: notasFornecedor.length
      }
    })

    switch (filtros.ordenarPor || 'leadtime') {
      case 'qualidade':
        fornecedoresProcessados.sort((a, b) => b.indiceQualidade - a.indiceQualidade)
        break
      case 'participacao':
        fornecedoresProcessados.sort((a, b) => b.participacao - a.participacao)
        break
      case 'pontualidade':
        fornecedoresProcessados.sort((a, b) => b.taxaCumprimento - a.taxaCumprimento)
        break
      default:
        fornecedoresProcessados.sort((a, b) => a.leadTimeMedio - b.leadTimeMedio)
    }

    const participacaoTotal = fornecedoresProcessados.reduce((sum, fornecedor) => sum + fornecedor.participacao, 0)
    const leadTimeGeral = fornecedoresProcessados.length
      ? fornecedoresProcessados.reduce((sum, fornecedor) => sum + fornecedor.leadTimeMedio, 0) / fornecedoresProcessados.length
      : 0
    const numeroRelatorio = this.gerarNumeroRelatorio('fornecedores')

    return {
      reportId: 'fornecedores',
      titulo: 'RELATORIO DE PERFORMANCE DE FORNECEDORES',
      periodo: this.getReportPeriod(filtros),
      filtrosAplicados: filtros,
      columns: [
        { key: 'nome', label: 'Fornecedor', type: 'text' },
        { key: 'documento', label: 'Documento', type: 'text' },
        { key: 'tipo_fornecimento', label: 'Tipo de Fornecimento', type: 'text' },
        { key: 'leadTimeMedio', label: 'Lead Time (dias)', type: 'number', align: 'center' },
        { key: 'taxaCumprimento', label: 'Pontualidade (%)', type: 'percentage', align: 'right' },
        { key: 'indiceQualidade', label: 'Qualidade (%)', type: 'percentage', align: 'right' },
        { key: 'participacao', label: 'Valor Fornecido', type: 'currency', align: 'right' },
        { key: 'totalMateriais', label: 'SKUs', type: 'number', align: 'center' },
        { key: 'totalNotas', label: 'Notas', type: 'number', align: 'center' }
      ],
      rows: fornecedoresProcessados.map(fornecedor => ({
        nome: fornecedor.nome,
        documento: fornecedor.documento,
        tipo_fornecimento: fornecedor.tipo_fornecimento || '-',
        leadTimeMedio: fornecedor.leadTimeMedio,
        taxaCumprimento: fornecedor.taxaCumprimento,
        indiceQualidade: fornecedor.indiceQualidade,
        participacao: fornecedor.participacao,
        totalMateriais: fornecedor.totalMateriais,
        totalNotas: fornecedor.totalNotas
      })),
      kpis: {
        taxaAtendimento: fornecedoresProcessados.length ? fornecedoresProcessados.reduce((sum, fornecedor) => sum + fornecedor.taxaCumprimento, 0) / fornecedoresProcessados.length : 0,
        acuracidadeInventario: fornecedoresProcessados.length ? fornecedoresProcessados.reduce((sum, fornecedor) => sum + fornecedor.indiceQualidade, 0) / fornecedoresProcessados.length : 0,
        giroEstoque: leadTimeGeral,
        taxaRuptura: 0,
        taxaObsolescencia: 0,
        coberturaEstoque: fornecedoresProcessados.reduce((sum, fornecedor) => sum + fornecedor.totalMateriais, 0)
      },
      totals: { totalFornecedores: fornecedoresProcessados.length, participacaoTotal, leadTimeGeral },
      summary: {
        totalRegistros: fornecedoresProcessados.length,
        valorTotal: participacaoTotal,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private async generateRequisicoesPendentesCorrigido(filtros: RequisicoesFilter): Promise<ReportData> {
    if (!filtros) filtros = {}

    let query = supabase
      .from('solicitacoes')
      .select(`
        *,
        colaboradores:colaborador_id (nome),
        centros_custo:centro_custo_id (codigo, descricao),
        solicitacoes_itens (
          *,
          materiais_equipamentos:material_equipamento_id (codigo, nome, categoria)
        )
      `)
      .in('status', ['pendente', 'aprovada'])

    if (filtros.centroCusto && filtros.centroCusto !== 'todos') query = query.eq('centro_custo_id', filtros.centroCusto)
    if (filtros.dataInicio) query = query.gte('data_solicitacao', filtros.dataInicio)
    if (filtros.dataFim) query = query.lte('data_solicitacao', filtros.dataFim)

    const { data, error } = (await query.order('data_solicitacao', { ascending: true })) as any
    if (error) throw error

    const prioridadeMap: Record<string, string[]> = {
      alta: ['alta', 'urgente'],
      media: ['media', 'normal'],
      baixa: ['baixa']
    }

    let solicitacoes = data || []
    if (filtros.prioridade && filtros.prioridade !== 'todas') {
      solicitacoes = solicitacoes.filter((solicitacao: any) =>
        prioridadeMap[filtros.prioridade!]?.includes((solicitacao.urgencia || '').toLowerCase())
      )
    }
    if (solicitacoes.length === 0) throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)

    const hoje = new Date()
    const requisicoesProcessadas = solicitacoes.map((solicitacao: any) => {
      const dataSolicitacao = new Date(solicitacao.data_solicitacao || solicitacao.created_at)
      const aging = Math.floor((hoje.getTime() - dataSolicitacao.getTime()) / (1000 * 60 * 60 * 24))
      const valorTotal = (solicitacao.solicitacoes_itens || []).reduce((sum: number, item: any) => {
        const quantidade = item.quantidade || 0
        const valorUnitario = item.valor_unitario || 0
        return sum + (item.valor_total || quantidade * valorUnitario)
      }, 0)

      return {
        ...solicitacao,
        aging,
        classificacaoAging: aging > 15 ? 'CRITICO' : aging > 7 ? 'ALERTA' : aging > 3 ? 'ATENCAO' : 'NORMAL',
        valorTotal,
        totalItens: solicitacao.solicitacoes_itens?.length || 0
      }
    })

    const backlogQuantidade = requisicoesProcessadas.length
    const backlogValor = requisicoesProcessadas.reduce((sum: number, req: any) => sum + req.valorTotal, 0)
    const tempoMedioAtendimento = backlogQuantidade ? requisicoesProcessadas.reduce((sum: number, req: any) => sum + req.aging, 0) / backlogQuantidade : 0
    const requisicoesNoPrazo = requisicoesProcessadas.filter((req: any) => req.aging <= 7).length
    const taxaAtendimentoPrazo = backlogQuantidade ? (requisicoesNoPrazo / backlogQuantidade) * 100 : 0

    const numeroRelatorio = this.gerarNumeroRelatorio('requisicoes-pendentes')
    return {
      reportId: 'requisicoes-pendentes',
      titulo: 'RELATORIO DE REQUISICOES PENDENTES',
      periodo: this.getReportPeriod(filtros, `Analise em ${this.formatDate(hoje.toISOString())}`),
      filtrosAplicados: filtros,
      columns: [
        { key: 'numero_solicitacao', label: 'No Solicitacao', type: 'text' },
        { key: 'data_solicitacao', label: 'Data', type: 'date' },
        { key: 'solicitante', label: 'Solicitante', type: 'text' },
        { key: 'centro_custo', label: 'Centro Custo', type: 'text' },
        { key: 'prioridade', label: 'Prioridade', type: 'status', align: 'center' },
        { key: 'aging', label: 'Aging (dias)', type: 'number', align: 'center' },
        { key: 'totalItens', label: 'Itens', type: 'number', align: 'center' },
        { key: 'valorTotal', label: 'Valor', type: 'currency', align: 'right' },
        { key: 'status', label: 'Status', type: 'status', align: 'center' }
      ],
      rows: requisicoesProcessadas.map((req: any) => ({
        numero_solicitacao: req.numero,
        data_solicitacao: req.data_solicitacao,
        solicitante: req.colaboradores?.nome || '-',
        centro_custo: req.centros_custo ? `${req.centros_custo.codigo} - ${req.centros_custo.descricao}` : '-',
        prioridade: req.urgencia?.toUpperCase() || 'NORMAL',
        aging: req.aging,
        totalItens: req.totalItens,
        valorTotal: req.valorTotal,
        status: req.status?.toUpperCase() || 'PENDENTE'
      })),
      totals: { backlogQuantidade, backlogValor, tempoMedioAtendimento, taxaAtendimentoPrazo },
      kpis: {
        taxaAtendimento: taxaAtendimentoPrazo,
        acuracidadeInventario: 0,
        giroEstoque: tempoMedioAtendimento,
        taxaRuptura: 0,
        taxaObsolescencia: 0,
        coberturaEstoque: backlogQuantidade
      },
      summary: {
        totalRegistros: backlogQuantidade,
        valorTotal: backlogValor,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private async generateAnaliseABCXYZCorrigida(filtros: AnaliseABCXYZFilter): Promise<ReportData> {
    if (!filtros) filtros = {}

    const validacaoPeriodo = this.validarPeriodo(filtros.dataInicio, filtros.dataFim)
    if (validacaoPeriodo) throw new Error(validacaoPeriodo)

    let query = supabase
      .from('materiais_equipamentos')
      .select(`
        *,
        movimentacao_estoque!material_equipamento_id (quantidade, data_movimentacao, valor_unitario)
      `)
      .eq('ativo', true)

    if (filtros.categoria && filtros.categoria !== 'todas') query = query.eq('categoria', filtros.categoria)
    if (filtros.localizacao && filtros.localizacao !== 'todas') query = query.eq('localizacao_id', filtros.localizacao)

    const { data, error } = (await query) as any
    if (error) throw error
    if (!data || data.length === 0) throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)

    const materiaisProcessados = data.map((material: any) => {
      const movimentacoesPeriodo = (material.movimentacao_estoque || [])
        .filter((mov: any) => this.isDateInRange(mov.data_movimentacao, filtros.dataInicio, filtros.dataFim))
      const valorTotal = (material.valor_unitario || 0) * (material.estoque_atual || 0)
      const quantidadeMovimentada = movimentacoesPeriodo.reduce((sum: number, mov: any) => sum + Math.abs(mov.quantidade || 0), 0)
      const frequenciaMovimentacao = movimentacoesPeriodo.length
      const giroEstoque = material.estoque_atual > 0 ? quantidadeMovimentada / material.estoque_atual : 0
      const mediaDemanda = quantidadeMovimentada / (frequenciaMovimentacao || 1)
      const variabilidade = frequenciaMovimentacao > 1
        ? Math.sqrt(movimentacoesPeriodo.reduce((sum: number, mov: any) => sum + Math.pow(Math.abs(mov.quantidade || 0) - mediaDemanda, 2), 0) / frequenciaMovimentacao)
        : 0

      return { ...material, valorTotal, valor_total: valorTotal, quantidadeMovimentada, frequenciaMovimentacao, giroEstoque, variabilidade, mediaDemanda }
    })

    const dadosParaABC = [...materiaisProcessados]
    switch (filtros.criterioABC || 'valor') {
      case 'quantidade':
        dadosParaABC.sort((a, b) => b.quantidadeMovimentada - a.quantidadeMovimentada)
        break
      case 'movimentacao':
        dadosParaABC.sort((a, b) => b.frequenciaMovimentacao - a.frequenciaMovimentacao)
        break
      default:
        dadosParaABC.sort((a, b) => b.valorTotal - a.valorTotal)
    }

    const dadosParaXYZ = [...materiaisProcessados]
    switch (filtros.criterioXYZ || 'giro') {
      case 'variabilidade':
        dadosParaXYZ.sort((a, b) => a.variabilidade - b.variabilidade)
        break
      case 'sazonalidade':
        dadosParaXYZ.sort((a, b) => b.frequenciaMovimentacao - a.frequenciaMovimentacao)
        break
      default:
        dadosParaXYZ.sort((a, b) => b.giroEstoque - a.giroEstoque)
    }

    const totalItens = materiaisProcessados.length
    materiaisProcessados.forEach((material: any) => {
      const percentualABC = (dadosParaABC.findIndex(item => item.id === material.id) + 1) / totalItens
      material.classificacaoABC = percentualABC <= 0.2 ? 'A' : percentualABC <= 0.5 ? 'B' : 'C'
      const percentualXYZ = (dadosParaXYZ.findIndex(item => item.id === material.id) + 1) / totalItens
      material.classificacaoXYZ = percentualXYZ <= 0.33 ? 'X' : percentualXYZ <= 0.67 ? 'Y' : 'Z'
      material.classificacaoCombinada = `${material.classificacaoABC}${material.classificacaoXYZ}`
    })

    const numeroRelatorio = this.gerarNumeroRelatorio('analise-abc-xyz')
    return {
      reportId: 'analise-abc-xyz',
      titulo: 'RELATORIO DE ANALISE ABC/XYZ',
      periodo: this.getReportPeriod(filtros, 'Todo o historico'),
      filtrosAplicados: filtros,
      columns: [
        { key: 'codigo', label: 'Codigo', type: 'text' },
        { key: 'nome', label: 'Descricao', type: 'text' },
        { key: 'categoria', label: 'Categoria', type: 'text' },
        { key: 'valorTotal', label: 'Valor Total', type: 'currency', align: 'right' },
        { key: 'giroEstoque', label: 'Giro', type: 'number', align: 'right' },
        { key: 'classificacaoABC', label: 'ABC', type: 'status', align: 'center' },
        { key: 'classificacaoXYZ', label: 'XYZ', type: 'status', align: 'center' },
        { key: 'classificacaoCombinada', label: 'Combinada', type: 'status', align: 'center' }
      ],
      rows: materiaisProcessados.map((material: any) => ({
        codigo: material.codigo,
        nome: material.nome,
        categoria: material.categoria || '-',
        valorTotal: material.valorTotal,
        giroEstoque: material.giroEstoque,
        classificacaoABC: material.classificacaoABC,
        classificacaoXYZ: material.classificacaoXYZ,
        classificacaoCombinada: material.classificacaoCombinada
      })),
      abcAnalysis: this.calcularAnaliseABC(materiaisProcessados),
      xyzAnalysis: {
        X: { count: materiaisProcessados.filter((m: any) => m.classificacaoXYZ === 'X').length, percentage: (materiaisProcessados.filter((m: any) => m.classificacaoXYZ === 'X').length / totalItens) * 100 },
        Y: { count: materiaisProcessados.filter((m: any) => m.classificacaoXYZ === 'Y').length, percentage: (materiaisProcessados.filter((m: any) => m.classificacaoXYZ === 'Y').length / totalItens) * 100 },
        Z: { count: materiaisProcessados.filter((m: any) => m.classificacaoXYZ === 'Z').length, percentage: (materiaisProcessados.filter((m: any) => m.classificacaoXYZ === 'Z').length / totalItens) * 100 }
      },
      kpis: this.calcularKPIs(materiaisProcessados, 'analise-abc-xyz'),
      summary: {
        totalRegistros: totalItens,
        valorTotal: materiaisProcessados.reduce((sum: number, material: any) => sum + material.valorTotal, 0),
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  private async generateInventarioRotativoCorrigido(filtros: InventarioRotativoFilter): Promise<ReportData> {
    if (!filtros) filtros = {}

    let query = supabase
      .from('materiais_equipamentos')
      .select(`
        *,
        localizacao (nome),
        movimentacao_estoque!material_equipamento_id (data_movimentacao)
      `)
      .eq('ativo', true)

    if (filtros.categoria && filtros.categoria !== 'todas') query = query.eq('categoria', filtros.categoria)
    if (filtros.localizacao && filtros.localizacao !== 'todas') query = query.eq('localizacao_id', filtros.localizacao)

    const { data, error } = (await query) as any
    if (error) throw error
    if (!data || data.length === 0) throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)

    const hoje = new Date()
    const cicloDias = filtros.ciclo === 'semanal' ? 7 : filtros.ciclo === 'trimestral' ? 90 : 30
    const materiaisInventario = data.map((material: any) => {
      const movimentacoes = [...(material.movimentacao_estoque || [])]
        .filter((mov: any) => mov.data_movimentacao)
        .sort((a: any, b: any) => new Date(b.data_movimentacao).getTime() - new Date(a.data_movimentacao).getTime())
      const dataUltimaContagem = movimentacoes[0]?.data_movimentacao
        ? new Date(movimentacoes[0].data_movimentacao)
        : new Date(material.created_at || hoje)
      const proximaContagem = new Date(dataUltimaContagem.getTime() + cicloDias * 24 * 60 * 60 * 1000)
      const diasParaContagem = Math.ceil((proximaContagem.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      const estoqueNominale = material.estoque_atual || 0

      return {
        ...material,
        estoqueNominale,
        estoqueFisico: estoqueNominale,
        divergencia: 0,
        divergenciaPercentual: 0,
        acuracidade: 100,
        dataUltimaContagem,
        proximaContagem,
        diasParaContagem,
        statusContagem: diasParaContagem < 0 ? 'VENCIDO' : diasParaContagem <= 3 ? 'URGENTE' : diasParaContagem <= 7 ? 'PROXIMO' : 'OK',
        valorDivergencia: 0
      }
    })

    const numeroRelatorio = this.gerarNumeroRelatorio('inventario-rotativo')
    return {
      reportId: 'inventario-rotativo',
      titulo: 'RELATORIO DE INVENTARIO ROTATIVO',
      periodo: `Analise em ${this.formatDate(hoje.toISOString())} - Ciclo: ${filtros.ciclo || 'mensal'}`,
      filtrosAplicados: filtros,
      columns: [
        { key: 'codigo', label: 'Codigo', type: 'text' },
        { key: 'nome', label: 'Descricao', type: 'text' },
        { key: 'categoria', label: 'Categoria', type: 'text' },
        { key: 'estoqueNominale', label: 'Est. Sistema', type: 'number', align: 'right' },
        { key: 'estoqueFisico', label: 'Est. Fisico', type: 'number', align: 'right' },
        { key: 'divergencia', label: 'Divergencia', type: 'number', align: 'right' },
        { key: 'divergenciaPercentual', label: 'Div. %', type: 'percentage', align: 'right' },
        { key: 'acuracidade', label: 'Acuracidade %', type: 'percentage', align: 'right' },
        { key: 'dataUltimaContagem', label: 'Ultima Contagem', type: 'date' },
        { key: 'statusContagem', label: 'Status', type: 'status', align: 'center' }
      ],
      rows: materiaisInventario.map((item: any) => ({
        codigo: item.codigo,
        nome: item.nome,
        categoria: item.categoria || '-',
        estoqueNominale: item.estoqueNominale,
        estoqueFisico: item.estoqueFisico,
        divergencia: item.divergencia,
        divergenciaPercentual: item.divergenciaPercentual,
        acuracidade: item.acuracidade,
        dataUltimaContagem: item.dataUltimaContagem.toISOString().split('T')[0],
        statusContagem: item.statusContagem
      })),
      totals: {
        totalItens: materiaisInventario.length,
        itensComDivergencia: 0,
        acuracidadeGeral: 100,
        valorTotalDivergencias: 0,
        categoriasAnalisadas: new Set(materiaisInventario.map((item: any) => item.categoria || 'Sem Categoria')).size
      },
      kpis: {
        taxaAtendimento: 100,
        acuracidadeInventario: 100,
        giroEstoque: 0,
        taxaRuptura: 0,
        taxaObsolescencia: 0,
        coberturaEstoque: materiaisInventario.length
      },
      summary: {
        totalRegistros: materiaisInventario.length,
        valorTotal: 0,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  async generateReport(request: ReportRequest): Promise<ReportResponse> {
    const inicioExecucao = Date.now()
    
    try {
      console.log(' Iniciando geração de relatório:', {
        reportId: request.reportId,
        formato: request.formato,
        filtros: request.filtros
      })

      let reportData: ReportData

      switch (request.reportId) {
        case 'test-report':
          reportData = await this.generateTestReport()
          break
        case 'inventario-geral':
          reportData = await this.generateInventarioGeral(request.filtros as InventarioGeralFilter)
          break
        case 'movimentacao':
          reportData = await this.generateMovimentacaoCorrigida(request.filtros as MovimentacaoFilter)
          break
        case 'vencimento-validade':
          reportData = await this.generateVencimentoValidade(request.filtros as VencimentoValidadeFilter)
          break
        case 'consumo-centro-custo':
          reportData = await this.generateConsumoCentroCustoCorrigido(request.filtros as ConsumoCentroCustoFilter)
          break
        case 'fornecedores':
          reportData = await this.generateFornecedoresCorrigido(request.filtros as FornecedoresFilter)
          break
        case 'requisicoes-pendentes':
          reportData = await this.generateRequisicoesPendentesCorrigido(request.filtros as RequisicoesFilter)
          break
        case 'analise-abc-xyz':
          reportData = await this.generateAnaliseABCXYZCorrigida(request.filtros as AnaliseABCXYZFilter)
          break
        case 'inventario-rotativo':
          reportData = await this.generateInventarioRotativoCorrigido(request.filtros as InventarioRotativoFilter)
          break
        default:
          throw new Error(`Tipo de relatório '${request.reportId}' não encontrado`)
      }

      console.log(' Dados do relatório gerados:', {
        totalRegistros: reportData.summary.totalRegistros,
        totalLinhas: reportData.rows.length,
        possuiGrupos: !!reportData.grupos,
        possuiKPIs: !!reportData.kpis
      })

      // Validar se há dados suficientes
      if (reportData.rows.length === 0) {
        throw new Error('Nenhum registro encontrado com os filtros aplicados. Verifique os critérios de busca.')
      }

      // Sobrescrever título se fornecido na requisição
      if (request.titulo) {
        reportData.titulo = request.titulo
      }

      if (request.formato === 'pdf') {
        console.log(' Gerando HTML para PDF...')
        const htmlContent = this.generateHTMLReport(reportData)
        
        // Log do tamanho do HTML gerado
        console.log(' HTML gerado:', {
          tamanhoHTML: htmlContent.length,
          contemDados: htmlContent.includes('<tr>'),
          contemTabelas: htmlContent.includes('<table>')
        })

        const filename = `${reportData.summary.numeroRelatorio}.pdf`
        
        const success = await pdfService.generatePDF({
          filename,
          htmlContent,
          onStart: () => console.log(' Iniciando conversão para PDF...'),
          onFinish: () => console.log(' PDF gerado com sucesso!'),
          onError: (error) => console.error(' Erro na conversão PDF:', error)
        })

        if (!success) {
          throw new Error('Erro ao gerar PDF - verifique os logs do console para mais detalhes')
        }
      } else if (request.formato === 'csv') {
        const filename = `${reportData.summary.numeroRelatorio}.csv`
        this.downloadTextFile(filename, this.generateCSVReport(reportData), 'text/csv;charset=utf-8')
      } else if (request.formato === 'excel') {
        const filename = `${reportData.summary.numeroRelatorio}.xls`
        this.downloadTextFile(filename, this.generateExcelReport(reportData), 'application/vnd.ms-excel;charset=utf-8')
      } else {
        throw new Error(`Formato '${request.formato}' nao suportado`)
      }

      const fimExecucao = Date.now()
      const tempoExecucao = ((fimExecucao - inicioExecucao) / 1000).toFixed(1) + 's'

      console.log(' Relatório gerado com sucesso em:', tempoExecucao)

      return { 
        success: true, 
        data: reportData,
        numeroRelatorio: reportData.summary.numeroRelatorio,
        executionTime: tempoExecucao
      }
      
    } catch (error: any) {
      console.error(' Erro ao gerar relatório:', error)
      return { 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }
    }
  }
}

export const reportService = new ReportService()
export default reportService
