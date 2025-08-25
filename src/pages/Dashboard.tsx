import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Package,
  PackageX,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  FileText,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  Calendar,
  Eye,
  Plus,
  RotateCcw,
  Send,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

interface DashboardMetrics {
  totalMateriais: number
  materiaisAtivos: number
  estoqueTotal: number
  valorTotal: number
  itensEmFalta: number
  itensAbaixoMinimo: number
  romaneiosHoje: number
  solicitacoesPendentes: number
  colaboradoresAtivos: number
  empresasAtivas: number
  valorMovimentado30d: number
  percentualOcupacao: number
}

interface RecentActivity {
  id: string
  tipo: 'romaneio' | 'solicitacao' | 'movimentacao'
  descricao: string
  data: string
  status: string
  valor?: number
}

const DashboardPage = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMateriais: 0,
    materiaisAtivos: 0,
    estoqueTotal: 0,
    valorTotal: 0,
    itensEmFalta: 0,
    itensAbaixoMinimo: 0,
    romaneiosHoje: 0,
    solicitacoesPendentes: 0,
    colaboradoresAtivos: 0,
    empresasAtivas: 0,
    valorMovimentado30d: 0,
    percentualOcupacao: 0,
  })
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Buscar dados em paralelo para melhor performance
      const [
        materiaisResult,
        romaneiosHojeResult,
        solicitacoesResult,
        colaboradoresResult,
        empresasResult,
        movimentacaoResult
      ] = await Promise.all([
        // Materiais e estoque
        supabase
          .from('materiais_equipamentos')
          .select('estoque_atual, estoque_minimo, valor_unitario, ativo'),
        
        // Romaneios de hoje
        supabase
          .from('romaneios')
          .select('id, created_at, valor_total')
          .gte('created_at', new Date().toISOString().split('T')[0]),
        
        // Solicitações pendentes
        supabase
          .from('solicitacoes')
          .select('id, status')
          .in('status', ['pendente', 'em_andamento']),
        
        // Colaboradores ativos
        supabase
          .from('colaboradores')
          .select('id')
          .eq('ativo', true),
        
        // Empresas ativas
        supabase
          .from('empresas')
          .select('id')
          .eq('ativo', true),
        
        // Movimentações dos últimos 30 dias
        supabase
          .from('movimentacao_estoque')
          .select('valor_unitario, quantidade, tipo_movimentacao, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Processar dados dos materiais
      const materiais = materiaisResult.data || []
      const materiaisAtivos = materiais.filter(m => m.ativo).length
      
      let estoqueTotal = 0
      let valorTotal = 0
      let itensEmFalta = 0
      let itensAbaixoMinimo = 0

      materiais.forEach(material => {
        if (material.ativo) {
          const estoque = material.estoque_atual || 0
          const valor = material.valor_unitario || 0
          const minimo = material.estoque_minimo || 0
          
          estoqueTotal += estoque
          valorTotal += estoque * valor
          
          if (estoque === 0) {
            itensEmFalta++
          } else if (estoque <= minimo) {
            itensAbaixoMinimo++
          }
        }
      })

      // Processar outros dados
      const romaneiosHoje = romaneiosHojeResult.data?.length || 0
      const solicitacoesPendentes = solicitacoesResult.data?.length || 0
      const colaboradoresAtivos = colaboradoresResult.data?.length || 0
      const empresasAtivas = empresasResult.data?.length || 0

      // Calcular valor movimentado nos últimos 30 dias
      const movimentacoes = movimentacaoResult.data || []
      const valorMovimentado30d = movimentacoes.reduce((total, mov) => {
        const valor = (mov.valor_unitario || 0) * (mov.quantidade || 0)
        return total + valor
      }, 0)

      // Calcular percentual de ocupação do estoque
      const capacidadeTotal = materiais.reduce((total, m) => {
        return total + (m.estoque_minimo || 0) * 10 // Assumindo capacidade 10x o mínimo
      }, 0)
      const percentualOcupacao = capacidadeTotal > 0 ? (estoqueTotal / capacidadeTotal) * 100 : 0

      setMetrics({
        totalMateriais: materiais.length,
        materiaisAtivos,
        estoqueTotal,
        valorTotal,
        itensEmFalta,
        itensAbaixoMinimo,
        romaneiosHoje,
        solicitacoesPendentes,
        colaboradoresAtivos,
        empresasAtivas,
        valorMovimentado30d,
        percentualOcupacao: Math.min(percentualOcupacao, 100),
      })

      // Buscar atividades recentes
      const { data: atividades } = await supabase
        .from('romaneios')
        .select('id, numero, tipo, created_at, status, valor_total')
        .order('created_at', { ascending: false })
        .limit(5)

      const recentActivities: RecentActivity[] = (atividades || []).map(atividade => ({
        id: atividade.id,
        tipo: 'romaneio',
        descricao: `Romaneio ${atividade.numero} - ${atividade.tipo}`,
        data: new Date(atividade.created_at).toLocaleString('pt-BR'),
        status: atividade.status,
        valor: atividade.valor_total,
      }))

      setRecentActivities(recentActivities)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const quickActions = [
    {
      title: 'Novo Romaneio',
      description: 'Criar retirada de material',
      icon: Plus,
      href: '/romaneios/novo?tipo=retirada',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Nova Solicitação',
      description: 'Solicitar compra de material',
      icon: Send,
      href: '/solicitacoes/nova',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Consultar Estoque',
      description: 'Ver materiais disponíveis',
      icon: Search,
      href: '/materiais-equipamentos',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Devolução',
      description: 'Devolver material ao estoque',
      icon: RotateCcw,
      href: '/romaneios/novo?tipo=devolucao',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ]

  const mainCards = [
    {
      title: 'Total de Materiais',
      value: loading ? '...' : metrics.totalMateriais.toLocaleString(),
      subtitle: `${metrics.materiaisAtivos} ativos`,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+2.5%',
      trendUp: true,
    },
    {
      title: 'Valor do Estoque',
      value: loading ? '...' : formatCurrency(metrics.valorTotal),
      subtitle: `${metrics.estoqueTotal.toLocaleString()} unidades`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+8.2%',
      trendUp: true,
    },
    {
      title: 'Itens em Falta',
      value: loading ? '...' : metrics.itensEmFalta.toString(),
      subtitle: `${metrics.itensAbaixoMinimo} abaixo do mínimo`,
      icon: PackageX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '-12%',
      trendUp: false,
    },
    {
      title: 'Movimentações Hoje',
      value: loading ? '...' : metrics.romaneiosHoje.toString(),
      subtitle: `${metrics.solicitacoesPendentes} solicitações pendentes`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      trend: '+15%',
      trendUp: true,
    },
  ]

  const statsCards = [
    {
      title: 'Colaboradores Ativos',
      value: metrics.colaboradoresAtivos,
      icon: Users,
      color: 'text-indigo-600',
    },
    {
      title: 'Empresas Ativas',
      value: metrics.empresasAtivas,
      icon: Building,
      color: 'text-purple-600',
    },
    {
      title: 'Movimentado (30d)',
      value: formatCurrency(metrics.valorMovimentado30d),
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
  ]

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard do Almoxarifado
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visão geral completa do seu sistema de gestão
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              asChild
              variant="outline"
              className="h-auto p-4 flex-col space-y-2 hover:scale-105 transition-all"
            >
              <Link to={action.href}>
                <div className={`p-2 rounded-full ${action.color} text-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
              
              <div className="mt-4 flex items-center space-x-2">
                {card.trendUp ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    card.trendUp ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {card.trend}
                </span>
                <span className="text-xs text-muted-foreground">
                  vs. mês anterior
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ocupação do Estoque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Ocupação do Estoque</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Capacidade utilizada</span>
              <span className="font-medium">
                {metrics.percentualOcupacao.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={metrics.percentualOcupacao} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {metrics.estoqueTotal.toLocaleString()} unidades em estoque
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Adicionais */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold">Estatísticas</h3>
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="font-semibold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Atividades Recentes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Atividades Recentes</span>
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/romaneios">
                  Ver todas
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {activity.descricao}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.data}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                        {activity.valor && (
                          <p className="text-xs font-medium mt-1">
                            {formatCurrency(activity.valor)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage