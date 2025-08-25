import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

const relatorios = [
  {
    title: 'Inventário Completo',
    description: 'Lista detalhada de todos os produtos em estoque.',
  },
  {
    title: 'Movimentação por Período',
    description: 'Detalhes de entradas e saídas de produtos.',
  },
  {
    title: 'Consumo por Centro de Custo',
    description: 'Produtos consumidos por cada centro de custo.',
  },
  {
    title: 'Análise ABC de Produtos',
    description: 'Classificação de produtos por valor de consumo.',
  },
  {
    title: 'Relatórios Fiscais (Bloco K)',
    description: 'Relatórios de movimentação para fins fiscais.',
  },
]

const RelatoriosPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {relatorios.map((relatorio) => (
          <Card key={relatorio.title}>
            <CardHeader>
              <CardTitle>{relatorio.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{relatorio.description}</p>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RelatoriosPage
