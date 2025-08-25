import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FilePlus,
  PackageX,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowDownUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Link } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'

// Dados de movimentação agora vêm do hook useDashboard

const lineChartConfig = {
  entradas: {
    label: 'Entradas',
    color: 'hsl(var(--chart-2))',
  },
  saidas: {
    label: 'Saídas',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig

// Dados de status das solicitações agora vêm do hook useDashboard

const pieChartConfig = {
  value: { label: 'Value' },
  Pendentes: { label: 'Pendentes', color: 'hsl(var(--chart-3))' },
  Aprovadas: { label: 'Aprovadas', color: 'hsl(var(--chart-2))' },
  Negadas: { label: 'Negadas', color: 'hsl(var(--chart-4))' },
  'Em Compra': { label: 'Em Compra', color: 'hsl(var(--chart-1))' },
  Canceladas: { label: 'Canceladas', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig

// Dados de consumo por centro de custo agora vêm do hook useDashboard

const barChartConfig = {
  consumo: {
    label: 'Consumo',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

// Dados de top produtos agora vêm do hook useDashboard

const DashboardPage = () => {
  const { 
    valorTotalEstoque, 
    itensEmFalta, 
    solicitacoesPendentes, 
    movimentacoesDia, 
    stockMovementData,
    requestStatusData,
    costCenterData,
    topProductsData,
    loading, 
    formatCompactCurrency 
  } = useDashboard()

  const kpiData = [
    {
      title: 'Itens em Falta',
      value: loading ? '...' : itensEmFalta.toString(),
      icon: PackageX,
      color: 'text-destructive',
      link: '/materiais-equipamentos',
    },
    {
      title: 'Solicitações Pendentes',
      value: loading ? '...' : solicitacoesPendentes.toString(),
      icon: AlertTriangle,
      color: 'text-warning',
      link: '#',
    },
    {
      title: 'Movimentações do Dia',
      value: loading ? '...' : movimentacoesDia.toString(),
      icon: Clock,
      color: 'text-primary',
      link: '#',
    },
    {
      title: 'Valor Total em Estoque',
      value: loading ? '...' : formatCompactCurrency(valorTotalEstoque),
      icon: DollarSign,
      color: 'text-success',
      link: '/materiais-equipamentos',
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in-up">
      {/* 📱 Header responsivo */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Visão geral do seu almoxarifado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/romaneios/novo?tipo=retirada">
              <FilePlus className="mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">Novo Romaneio</span>
              <span className="sm:hidden">Romaneio</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/romaneios/novo?tipo=devolucao">
              <ArrowDownUp className="mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">Nova Devolução</span>
              <span className="sm:hidden">Devolução</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 📱 KPIs responsivos - 2 colunas em mobile, 4 em desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="p-3 lg:p-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
              <CardTitle className="text-xs lg:text-sm font-medium leading-tight">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-3 w-3 lg:h-4 lg:w-4 ${kpi.color} shrink-0`} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg lg:text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">
                <Link to={kpi.link} className="hover:underline">
                  Ver detalhes
                </Link>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 📱 Gráficos responsivos - empilhados em mobile */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">
              Movimentação de Estoque (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center h-[200px] lg:h-[300px]">
                <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ChartContainer
                config={lineChartConfig}
                className="h-[200px] lg:h-[300px] w-full"
              >
                <LineChart data={stockMovementData}>
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    dataKey="entradas"
                    type="monotone"
                    stroke="var(--color-entradas)"
                    strokeWidth={2}
                  />
                  <Line
                    dataKey="saidas"
                    type="monotone"
                    stroke="var(--color-saidas)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">
              Status das Solicitações de Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center h-[200px] lg:h-[300px]">
                <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ChartContainer
                config={pieChartConfig}
                className="h-[200px] lg:h-[300px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" />}
                  />
                  <Pie data={requestStatusData} dataKey="value" nameKey="name">
                    {requestStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 📱 Gráficos inferiores - empilhados em mobile */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">
              Consumo por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center h-[200px] lg:h-[300px]">
                <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ChartContainer
                config={barChartConfig}
                className="h-[200px] lg:h-[300px] w-full"
              >
                <BarChart data={costCenterData} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="consumo" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={60}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="consumo" fill="var(--color-consumo)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">
              Top 5 Produtos Mais Movimentados
            </CardTitle>
            <CardDescription className="text-sm">
              Baseado nas movimentações dos últimos 30 dias.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center h-[150px] lg:h-[200px]">
                <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-primary"></div>
              </div>
            ) : topProductsData.length > 0 ? (
              <ul className="space-y-3 lg:space-y-4">
                {topProductsData.map((product) => (
                  <li key={product.name} className="flex items-center">
                    <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 font-medium text-sm lg:text-base truncate">
                      {product.name}
                    </span>
                    <span className="font-semibold text-sm lg:text-base shrink-0">
                      {product.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-[150px] lg:h-[200px] text-muted-foreground">
                <p className="text-sm lg:text-base">Nenhuma movimentação encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
