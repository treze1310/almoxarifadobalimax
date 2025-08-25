import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { FichaImpressao } from '@/components/colaboradores/FichaImpressao'
import { Colaborador, RetiradaHistorico } from '@/types'

interface PrintData {
  colaborador: Colaborador
  historico: RetiradaHistorico[]
  tipoFicha: 'EPI' | 'Materiais' | 'Completa'
}

const FichaPrintPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [printData, setPrintData] = useState<PrintData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const dataString = localStorage.getItem('fichaPrintData')
      if (dataString) {
        const data = JSON.parse(dataString)
        // Re-hydrate dates
        data.colaborador.dataAdmissao = new Date(data.colaborador.dataAdmissao)
        if (data.colaborador.dataDemissao) {
          data.colaborador.dataDemissao = new Date(
            data.colaborador.dataDemissao,
          )
        }
        data.historico.forEach((item: RetiradaHistorico) => {
          item.data = new Date(item.data)
          item.associationDate = new Date(item.associationDate)
        })
        setPrintData(data)
        localStorage.removeItem('fichaPrintData')
      }
    } catch (error) {
      console.error('Failed to load print data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => window.print(), 500)
      return () => clearTimeout(timer)
    }
  }, [printData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          Carregando dados para impressão...
        </p>
      </div>
    )
  }

  if (!printData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-4">
          Dados da Ficha não Encontrados
        </h1>
        <p className="text-muted-foreground mb-6">
          Não foi possível carregar os dados para impressão. Por favor, tente
          gerar a ficha novamente.
        </p>
        <Button onClick={() => navigate(`/cadastros/colaboradores`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Colaboradores
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="p-4 print:hidden flex justify-between items-center bg-gray-100 dark:bg-gray-800 border-b">
        <h2 className="text-lg font-semibold">Pré-visualização de Impressão</h2>
        <div className="space-x-2">
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>
      <FichaImpressao
        colaborador={printData.colaborador}
        historico={printData.historico}
        tipoFicha={printData.tipoFicha}
      />
    </div>
  )
}

export default FichaPrintPage
