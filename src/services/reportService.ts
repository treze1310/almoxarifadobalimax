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
    console.log('🧪 Gerando relatório de teste para diagnóstico')
    
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
    return (value * 100).toFixed(2) + '%'
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  private formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR') + ' ' + 
           new Date(date).toLocaleTimeString('pt-BR')
  }

  private calcularAnaliseABC(dados: any[]): ABCDistribution {
    // Ordenar por valor decrescente
    const dadosOrdenados = dados.sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
    const totalValor = dadosOrdenados.reduce((sum, item) => sum + (item.valor_total || 0), 0)
    const totalItens = dadosOrdenados.length

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

    console.log('🔍 Executando query de Inventário Geral com filtros:', filtros)

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

    if (!filtros.incluirInativos) {
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
      console.error('❌ Erro na query do inventário geral:', error)
      throw error
    }
    
    console.log('📊 Query executada - Inventário Geral:', {
      registrosEncontrados: data?.length || 0,
      filtrosAplicados: filtros
    })

    if (!data || data.length === 0) {
      console.warn('⚠️ Nenhum registro encontrado para inventário geral')
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
      const categorias = [...new Set(data.map(item => item.categoria))]
      grupos = categorias.map(categoria => ({
        categoria: categoria || 'Sem Categoria',
        itens: dadosComValorTotal.filter(item => item.categoria === categoria),
        subtotal: dadosComValorTotal
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
      rows: dadosComValorTotal.map(item => ({
        codigo: item.codigo,
        nome: item.nome,
        categoria: item.categoria || '-',
        unidade_medida: item.unidade_medida || 'UN',
        estoque_atual: item.estoque_atual || 0,
        valor_unitario: item.valor_unitario || 0,
        valor_total: item.valor_total,
        localizacao: item.localizacao?.nome || '-',
        status: (item.estoque_atual || 0) <= (item.estoque_minimo || 0) ? 'CRÍTICO' : 
                item.ativo ? 'ATIVO' : 'INATIVO',
        classificacaoABC: item.classificacaoABC || '-'
      })),
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

    // Validar período obrigatório
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
      columns,
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

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(VALIDACAO_REGRAS.mensagens.nenhumRegistro)
    }

    // Agrupar consumo por centro de custo e categoria
    const consumoPorCentro = data.reduce((acc, mov) => {
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
      
      categorias.forEach(categoria => {
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
      columns,
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
        case 'status':
          return `<span class="status status-${value.toString().toLowerCase()}">${value}</span>`
        default:
          return String(value)
      }
    }

    const filtrosTexto = Object.entries(data.filtrosAplicados)
      .filter(([key, value]) => value && value !== 'todos' && value !== 'todas')
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ')

    // Garantir que temos dados mínimos
    const totalRegistros = data.summary?.totalRegistros || data.rows?.length || 0
    const numeroRelatorio = data.summary?.numeroRelatorio || `REL-${Date.now()}`

    console.log('🎨 Gerando HTML com dados:', {
      titulo: data.titulo,
      totalRegistros,
      colunas: data.columns?.length || 0,
      linhas: data.rows?.length || 0,
      grupos: data.grupos?.length || 0
    })

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.titulo || 'Relatório'}</title>
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
          
          .status-crítico { background: ${CORES_PADRAO.alerta.critico}; color: white; }
          .status-alerta { background: ${CORES_PADRAO.alerta.alerta}; color: white; }
          .status-atenção { background: ${CORES_PADRAO.alerta.atencao}; color: black; }
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
          <h1>${data.titulo}</h1>
          <div class="header-info">
            <span>Relatório: ${data.summary.numeroRelatorio}</span>
            <span>${data.periodo}</span>
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
            <div class="grupo ${grupo.categoria.toLowerCase().includes('crítica') ? 'critica' : 
                                   grupo.categoria.toLowerCase().includes('alerta') ? 'alerta' :
                                   grupo.categoria.toLowerCase().includes('atenção') ? 'atencao' : 'normal'}">
              <div class="grupo-titulo">
                ${grupo.categoria} (${grupo.itens.length} itens${grupo.subtotal ? ` - ${this.formatCurrency(grupo.subtotal)}` : ''})
              </div>
              ${grupo.itens.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      ${data.columns.map(col => `
                        <th class="${col.align ? 'text-' + col.align : ''}">${col.label}</th>
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
                  <th class="${col.align ? 'text-' + col.align : ''}">${col.label}</th>
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
      
      // Simular data da última contagem
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
      periodo: `Análise em ${this.formatDate(hoje.toISOString())} - Ciclo: ${ciclo}`,
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
        observacoes: `Análise de inventário rotativo com ciclo ${ciclo}. Acuracidade geral: ${acuracidadeGeral.toFixed(1)}%`,
        geradoPor: 'Sistema',
        geradoEm: new Date().toISOString(),
        numeroRelatorio
      }
    }
  }

  async generateReport(request: ReportRequest): Promise<ReportResponse> {
    const inicioExecucao = Date.now()
    
    try {
      console.log('🚀 Iniciando geração de relatório:', {
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
          reportData = await this.generateMovimentacao(request.filtros as MovimentacaoFilter)
          break
        case 'vencimento-validade':
          reportData = await this.generateVencimentoValidade(request.filtros as VencimentoValidadeFilter)
          break
        case 'consumo-centro-custo':
          reportData = await this.generateConsumoCentroCusto(request.filtros as ConsumoCentroCustoFilter)
          break
        case 'fornecedores':
          reportData = await this.generateFornecedores(request.filtros as FornecedoresFilter)
          break
        case 'requisicoes-pendentes':
          reportData = await this.generateRequisicoesPendentes(request.filtros as RequisicoesFilter)
          break
        case 'analise-abc-xyz':
          reportData = await this.generateAnaliseABCXYZ(request.filtros as AnaliseABCXYZFilter)
          break
        case 'inventario-rotativo':
          reportData = await this.generateInventarioRotativo(request.filtros as InventarioRotativoFilter)
          break
        default:
          throw new Error(`Tipo de relatório '${request.reportId}' não encontrado`)
      }

      console.log('📊 Dados do relatório gerados:', {
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
        console.log('🎨 Gerando HTML para PDF...')
        const htmlContent = this.generateHTMLReport(reportData)
        
        // Log do tamanho do HTML gerado
        console.log('📄 HTML gerado:', {
          tamanhoHTML: htmlContent.length,
          contemDados: htmlContent.includes('<tr>'),
          contemTabelas: htmlContent.includes('<table>')
        })

        const filename = `${reportData.summary.numeroRelatorio}.pdf`
        
        const success = await pdfService.generatePDF({
          filename,
          htmlContent,
          onStart: () => console.log('🖨️ Iniciando conversão para PDF...'),
          onFinish: () => console.log('✅ PDF gerado com sucesso!'),
          onError: (error) => console.error('❌ Erro na conversão PDF:', error)
        })

        if (!success) {
          throw new Error('Erro ao gerar PDF - verifique os logs do console para mais detalhes')
        }
      }

      const fimExecucao = Date.now()
      const tempoExecucao = ((fimExecucao - inicioExecucao) / 1000).toFixed(1) + 's'

      console.log('✅ Relatório gerado com sucesso em:', tempoExecucao)

      return { 
        success: true, 
        data: reportData,
        numeroRelatorio: reportData.summary.numeroRelatorio,
        executionTime: tempoExecucao
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar relatório:', error)
      return { 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }
    }
  }
}

export const reportService = new ReportService()
export default reportService