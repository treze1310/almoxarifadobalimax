import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardData {
  valorTotalEstoque: number
  itensEmFalta: number
  solicitacoesPendentes: number
  movimentacoesDia: number
  loading: boolean
  error: string | null
}

interface ChartData {
  stockMovementData: Array<{ name: string; entradas: number; saidas: number }>
  requestStatusData: Array<{ name: string; value: number; fill: string }>
  costCenterData: Array<{ name: string; consumo: number }>
  topProductsData: Array<{ name: string; value: number }>
  loading: boolean
  error: string | null
}

export function useDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    valorTotalEstoque: 0,
    itensEmFalta: 0,
    solicitacoesPendentes: 0,
    movimentacoesDia: 0,
    loading: true,
    error: null
  })

  const [chartData, setChartData] = useState<ChartData>({
    stockMovementData: [],
    requestStatusData: [],
    costCenterData: [],
    topProductsData: [],
    loading: true,
    error: null
  })

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }))

      // Buscar valor total do estoque (estoque_atual * valor_unitario)
      const { data: materiaisData, error: materiaisError } = await supabase
        .from('materiais_equipamentos')
        .select('estoque_atual, valor_unitario')
        .eq('ativo', true)

      if (materiaisError) {
        console.error('Erro ao buscar materiais:', materiaisError)
        throw materiaisError
      }

      const valorTotalEstoque = materiaisData?.reduce((total, item) => {
        const estoque = Number(item.estoque_atual) || 0
        const valor = Number(item.valor_unitario) || 0
        const valorItem = estoque * valor
        return total + valorItem
      }, 0) || 0

      console.log('Valor total do estoque calculado:', valorTotalEstoque)

      // Buscar itens em falta (estoque_atual <= estoque_minimo)
      // Como o Supabase não permite comparar duas colunas diretamente,
      // vamos buscar todos os dados e filtrar no frontend
      const { data: itensParaVerificar, error: faltaError } = await supabase
        .from('materiais_equipamentos')
        .select('id, estoque_atual, estoque_minimo')
        .eq('ativo', true)

      if (faltaError) {
        console.error('Erro ao buscar itens para verificar falta:', faltaError)
        throw faltaError
      }

      const itensEmFalta = itensParaVerificar?.filter(item => {
        const estoqueAtual = Number(item.estoque_atual) || 0
        const estoqueMinimo = Number(item.estoque_minimo) || 0
        return estoqueAtual <= estoqueMinimo
      }).length || 0

      console.log('Total de itens em falta:', itensEmFalta)

      // Buscar solicitações pendentes
      const { data: solicitacoesPendentesData, error: solicitacoesError } = await supabase
        .from('solicitacoes')
        .select('id, status')
        .in('status', ['Pendente', 'Em Análise', 'Aguardando Aprovação', 'pendente', 'em_analise', 'aguardando_aprovacao'])

      if (solicitacoesError) {
        console.error('Erro ao buscar solicitações:', solicitacoesError)
        throw solicitacoesError
      }

      const solicitacoesPendentes = solicitacoesPendentesData?.length || 0
      console.log('Solicitações pendentes encontradas:', solicitacoesPendentes)

      // Buscar movimentações do dia (romaneios criados hoje)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const amanha = new Date(hoje)
      amanha.setDate(amanha.getDate() + 1)

      const { data: movimentacoesDiaData, error: movimentacoesError } = await supabase
        .from('romaneios')
        .select('id, created_at')
        .gte('created_at', hoje.toISOString())
        .lt('created_at', amanha.toISOString())

      if (movimentacoesError) {
        console.error('Erro ao buscar movimentações:', movimentacoesError)
        throw movimentacoesError
      }

      const movimentacoesDia = movimentacoesDiaData?.length || 0
      console.log('Movimentações do dia encontradas:', movimentacoesDia)

      const finalData = {
        valorTotalEstoque,
        itensEmFalta,
        solicitacoesPendentes,
        movimentacoesDia,
        loading: false,
        error: null
      }

      console.log('Dados finais do dashboard:', finalData)

      setDashboardData(finalData)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }))
    }
  }

  const fetchChartData = async () => {
    try {
      setChartData(prev => ({ ...prev, loading: true, error: null }))

      // Buscar dados de movimentações dos últimos 7 dias
      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - 6)
      dataInicio.setHours(0, 0, 0, 0)

      const stockMovementData = []
      for (let i = 0; i < 7; i++) {
        const data = new Date(dataInicio)
        data.setDate(data.getDate() + i)
        const proximaData = new Date(data)
        proximaData.setDate(proximaData.getDate() + 1)

        // Buscar entradas (romaneios de retirada e devolução para estoque)
        const { data: entradasData } = await supabase
          .from('romaneios')
          .select('id')
          .in('tipo', ['devolucao'])
          .gte('created_at', data.toISOString())
          .lt('created_at', proximaData.toISOString())

        // Buscar saídas (romaneios de retirada)
        const { data: saidasData } = await supabase
          .from('romaneios')
          .select('id')
          .eq('tipo', 'retirada')
          .gte('created_at', data.toISOString())
          .lt('created_at', proximaData.toISOString())

        stockMovementData.push({
          name: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          entradas: entradasData?.length || 0,
          saidas: saidasData?.length || 0
        })
      }

      // Buscar dados de status das solicitações
      const { data: statusData } = await supabase
        .from('solicitacoes')
        .select('status')

      const statusCount = statusData?.reduce((acc, item) => {
        const status = item.status || 'pendente'
        // Normalizar status para um formato padrão
        let normalizedStatus = status.toLowerCase()
        if (normalizedStatus === 'pendente' || normalizedStatus === 'em análise' || normalizedStatus === 'aguardando aprovação') {
          normalizedStatus = 'pendente'
        } else if (normalizedStatus === 'aprovado' || normalizedStatus === 'aprovada') {
          normalizedStatus = 'aprovado'
        } else if (normalizedStatus === 'negado' || normalizedStatus === 'negada') {
          normalizedStatus = 'negado'
        } else if (normalizedStatus === 'em compra') {
          normalizedStatus = 'em_compra'
        }
        acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      console.log('Status processados:', statusCount)

      const requestStatusData = [
        { name: 'Pendentes', value: statusCount['pendente'] || 0, fill: 'var(--color-Pendentes)' },
        { name: 'Aprovadas', value: statusCount['aprovado'] || 0, fill: 'var(--color-Aprovadas)' },
        { name: 'Negadas', value: statusCount['negado'] || 0, fill: 'var(--color-Negadas)' },
        { name: 'Em Compra', value: statusCount['em_compra'] || 0, fill: 'var(--color-Em Compra)' },
        { name: 'Canceladas', value: statusCount['cancelada'] || 0, fill: 'var(--color-Canceladas)' }
      ]

      // Buscar consumo por centro de custo (baseado nos romaneios)
      const { data: centrosCustoData } = await supabase
        .from('romaneios')
        .select(`
          centro_custo_origem:centro_custo_origem_id(codigo, descricao),
          romaneios_itens(valor_total)
        `)
        .eq('tipo', 'retirada')

      const consumoPorCentro = centrosCustoData?.reduce((acc, romaneio) => {
        const centro = romaneio.centro_custo_origem
        if (centro) {
          const valorTotal = romaneio.romaneios_itens?.reduce((sum, item) => 
            sum + (item.valor_total || 0), 0) || 0
          
          const nome = centro.descricao || centro.codigo
          acc[nome] = (acc[nome] || 0) + valorTotal
        }
        return acc
      }, {} as Record<string, number>) || {}

      const costCenterData = Object.entries(consumoPorCentro)
        .map(([name, consumo]) => ({ name, consumo }))
        .sort((a, b) => b.consumo - a.consumo)
        .slice(0, 5)

      // Buscar top produtos mais movimentados
      const { data: topProdutosData } = await supabase
        .from('romaneios_itens')
        .select(`
          material_equipamento_id,
          quantidade,
          materiais_equipamentos(nome)
        `)
        .not('material_equipamento_id', 'is', null)

      const produtoMovimentacao = topProdutosData?.reduce((acc, item) => {
        const nome = item.materiais_equipamentos?.nome
        if (nome) {
          acc[nome] = (acc[nome] || 0) + (item.quantidade || 0)
        }
        return acc
      }, {} as Record<string, number>) || {}

      const topProductsData = Object.entries(produtoMovimentacao)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      setChartData({
        stockMovementData,
        requestStatusData,
        costCenterData,
        topProductsData,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error)
      setChartData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }))
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchChartData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`
    } else {
      return formatCurrency(value)
    }
  }

  return {
    ...dashboardData,
    ...chartData,
    formatCurrency,
    formatCompactCurrency,
    refetch: fetchDashboardData,
    refetchCharts: fetchChartData
  }
}