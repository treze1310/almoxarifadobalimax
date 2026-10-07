import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  PackageX,
  Clock,
  TrendingUp,
  Users,
  Building,
  FileText,
  ShoppingCart,
  ArrowUpRight,
  Plus,
  RotateCcw,
  Send,
  Search,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ds/PageHeader'
import { KpiCard } from '@/components/ds/KpiCard'

interface DashboardMetrics {
  totalMateriais: number
  materiaisAtivos: number
  estoqueTotal: number
  valorTotal: number
  /** Soma de zerados + no minimo. Vem da coluna situacao_estoque (RF-02) */
  itensEstoqueCritico: number
  itensZerados: number
  itensAbaixoMinimo: number
  romaneiosHoje: number
  solicitacoesPendentes: number
  colaboradoresAtivos: number
  empresasAtivas: number
  valorMovimentado30d: number
  percentualOcupacao: number
  /**
   * Variacoes calculadas sobre o historico real (RF-01). `null` significa
   * "sem base de comparacao" e o indicador nao e exibido.
   */
  variacaoMateriais: number | null
  variacaoMovimentacoes: number | null
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
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMateriais: 0,
    materiaisAtivos: 0,
    estoqueTotal: 0,
    valorTotal: 0,
    itensEstoqueCritico: 0,
    itensZerados: 0,
    itensAbaixoMinimo: 0,
    romaneiosHoje: 0,
    solicitacoesPendentes: 0,
    colaboradoresAtivos: 0,
    empresasAtivas: 0,
    valorMovimentado30d: 0,
    percentualOcupacao: 0,
    variacaoMateriais: null,
    variacaoMovimentacoes: null,
  })
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [comprasMensais, setComprasMensais] = useState<Array<{ mes: string; total: number; quantidade: number }>>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Os indicadores são calculados no banco (RF-01/RNF-01). A tela antes
      // baixava 2.209 materiais e 870 movimentações para somar no navegador —
      // cerca de 400 kB por abertura, contra 400 bytes agora.
      const { data: indicadores, error: erroIndicadores } = await supabase.rpc('painel_indicadores')
      if (erroIndicadores) throw erroIndicadores

      const i = (indicadores ?? {}) as Record<string, number>

      const itensEstoqueCritico = (i.itens_zerados ?? 0) + (i.itens_abaixo_minimo ?? 0)

      // RF-01: variação só existe quando há base de comparação real
      const variacaoMovimentacoes =
        i.movimentacoes_mes_anterior > 0
          ? ((i.movimentacoes_mes_atual - i.movimentacoes_mes_anterior) /
              i.movimentacoes_mes_anterior) * 100
          : null

      const variacaoMateriais =
        i.materiais_ate_mes_anterior > 0
          ? ((i.total_materiais - i.materiais_ate_mes_anterior) / i.materiais_ate_mes_anterior) * 100
          : null

      const percentualOcupacao =
        i.capacidade_estimada > 0 ? (i.estoque_total / i.capacidade_estimada) * 100 : 0

      setMetrics({
        totalMateriais: i.total_materiais ?? 0,
        materiaisAtivos: i.materiais_ativos ?? 0,
        estoqueTotal: i.estoque_total ?? 0,
        valorTotal: i.valor_total ?? 0,
        itensEstoqueCritico,
        itensZerados: i.itens_zerados ?? 0,
        itensAbaixoMinimo: i.itens_abaixo_minimo ?? 0,
        romaneiosHoje: i.romaneios_hoje ?? 0,
        solicitacoesPendentes: i.solicitacoes_pendentes ?? 0,
        colaboradoresAtivos: i.colaboradores_ativos ?? 0,
        empresasAtivas: i.empresas_ativas ?? 0,
        valorMovimentado30d: i.valor_movimentado_30d ?? 0,
        percentualOcupacao: Math.min(percentualOcupacao, 100),
        variacaoMateriais,
        variacaoMovimentacoes,
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

      // Compras mensais (últimos 12 meses) a partir das NF-e importadas
      const inicioJanela = new Date()
      inicioJanela.setMonth(inicioJanela.getMonth() - 11)
      inicioJanela.setDate(1)
      const inicioStr = inicioJanela.toISOString().split('T')[0]

      const { data: comprasData } = await supabase
        .from('nfe_importacao')
        .select('data_emissao, valor_total')
        .gte('data_emissao', inicioStr)

      // Montar buckets dos últimos 12 meses (com zeros)
      const buckets = new Map<string, { mes: string; total: number; quantidade: number }>()
      const base = new Date()
      base.setDate(1)
      for (let i = 11; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
        buckets.set(chave, { mes: label, total: 0, quantidade: 0 })
      }

      ;(comprasData || []).forEach((nfe) => {
        if (!nfe.data_emissao) return
        const d = new Date(nfe.data_emissao)
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const bucket = buckets.get(chave)
        if (bucket) {
          bucket.total += nfe.valor_total || 0
          bucket.quantidade += 1
        }
      })

      setComprasMensais(Array.from(buckets.values()))

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
      title: 'Nova Retirada',
      description: 'Bipar os itens e colher a assinatura',
      icon: Plus,
      href: '/romaneios/retirada',
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

  // RF-01: `variacao` nulo = sem base de comparação, e o indicador não aparece.
  const mainCards = [
    {
      title: 'Total de Materiais',
      value: loading ? '...' : metrics.totalMateriais.toLocaleString(),
      subtitle: `${metrics.materiaisAtivos} ativos`,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      variacao: metrics.variacaoMateriais,
      link: '/materiais-equipamentos',
      tom: 'neutro' as const,
    },
    {
      title: 'Valor do Estoque',
      value: loading ? '...' : formatCurrency(metrics.valorTotal),
      subtitle: `${metrics.estoqueTotal.toLocaleString()} unidades`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      variacao: null,
      link: '/materiais-equipamentos',
      tom: 'neutro' as const,
    },
    {
      title: 'Estoque Crítico',
      value: loading ? '...' : metrics.itensEstoqueCritico.toString(),
      subtitle: `${metrics.itensZerados} zerados · ${metrics.itensAbaixoMinimo} no mínimo`,
      icon: PackageX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      variacao: null,
      link: '/materiais-equipamentos?estoque=critico',
      tom: 'critico' as const,
    },
    {
      title: 'Movimentações Hoje',
      value: loading ? '...' : metrics.romaneiosHoje.toString(),
      subtitle: `${metrics.solicitacoesPendentes} solicitações pendentes`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      variacao: metrics.variacaoMovimentacoes,
      link: '/romaneios',
      tom: 'atencao' as const,
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
    <div className="space-y-6">
      <PageHeader
        titulo="Dashboard"
        descricao="Visão geral do almoxarifado: estoque, movimentações e pendências."
      />

      <div className="flex flex-col gap-4">
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

      {/* KPIs do design system: valor, variação real e link para a lista filtrada */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainCards.map((card) => (
          <KpiCard
            key={card.title}
            rotulo={card.title}
            valor={card.value}
            detalhe={card.subtitle}
            icone={card.icon}
            variacao={card.variacao}
            link={card.link}
            carregando={loading}
            tom={card.tom}
          />
        ))}
      </div>

      {/* Compras Mensais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Compras Mensais (últimos 12 meses)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-72">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : comprasMensais.every((m) => m.total === 0) ? (
            <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
              <p>Nenhuma compra registrada no período</p>
              <p className="text-xs">As compras são contabilizadas a partir das NF-e importadas</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={comprasMensais} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={70}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      style: 'currency',
                      currency: 'BRL',
                    }).format(value as number)
                  }
                />
                <Tooltip
                  formatter={(value: number, _name, props: any) => [
                    formatCurrency(value),
                    `${props?.payload?.quantidade || 0} NF-e`,
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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