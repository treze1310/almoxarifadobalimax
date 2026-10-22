import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { SelectValue } from '@/components/ui/select'
import { TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  User, 
  AlertTriangle, 
  Calendar, 
  FileText,
  Plus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { epiService, EPIComAtribuicao } from '@/services/epiService'
import { PageHeader } from '@/components/ds/PageHeader'
import { DataTable, type ColunaDataTable } from '@/components/ds/DataTable'
import { StatusBadge } from '@/components/ds/StatusBadge'
import { KpiCard } from '@/components/ds/KpiCard'
import { CardsSkeleton, EmptyState, TableSkeleton } from '@/components/ds/EstadosPagina'
import { EPIAtribuicaoDialog } from '@/components/epi/EPIAtribuicaoDialog'
import { FichaEPIPDF } from '@/components/epi/FichaEPIPDF'
import { ColaboradorClickableLabel } from '@/components/colaboradores/ColaboradorClickableLabel'
import { format, isBefore, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
// Dynamic imports para jsPDF e html2canvas

interface Colaborador {
  id: string
  nome: string
  matricula: string | null
  setor: string | null
}

interface MaterialEPI {
  id: string
  nome: string
  codigo: string
  numero_ca: string | null
  estoque_atual: number | null
}

export default function EPIGerenciamento() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [materiaisEPI, setMateriaisEPI] = useState<MaterialEPI[]>([])
  const [episAtribuidos, setEpisAtribuidos] = useState<EPIComAtribuicao[]>([])
  const [selectedColaborador, setSelectedColaborador] = useState('')
  const [showAtribuicaoDialog, setShowAtribuicaoDialog] = useState(false)
  const [estatisticas, setEstatisticas] = useState({
    total_epis: 0,
    epis_atribuidos: 0,
    epis_vencendo: 0,
    epis_vencidos: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadColaboradores(),
        loadMateriaisEPI(),
        loadEPIsAtribuidos(),
        loadEstatisticas()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos EPIs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadColaboradores = async () => {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, matricula, setor')
      .eq('ativo', true)
      .order('nome')

    if (error) throw error
    setColaboradores(data || [])
  }

  const loadMateriaisEPI = async () => {
    const { data, error } = await supabase
      .from('materiais_equipamentos')
      .select('id, nome, codigo, numero_ca, estoque_atual')
      .eq('is_epi', true)
      .eq('ativo', true)
      .order('nome')

    if (error) throw error
    setMateriaisEPI(data || [])
  }

  const loadEPIsAtribuidos = async () => {
    const data = await epiService.getAllEPIsAtribuidos()
    setEpisAtribuidos(data)
  }

  const loadEstatisticas = async () => {
    const stats = await epiService.getEstatisticasEPI()
    setEstatisticas(stats)
  }

  const generateFichaEPI = async (atribuicaoId: string) => {
    try {
      const ficha = await epiService.getFichaEPI(atribuicaoId)
      
      // Create a temporary div to render the PDF content
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      document.body.appendChild(tempDiv)

      // Render the component using React
      const { createRoot } = await import('react-dom/client')
      const root = createRoot(tempDiv)
      
      await new Promise<void>((resolve) => {
        root.render(<FichaEPIPDF ficha={ficha} />)
        setTimeout(resolve, 1000) // Give time for rendering
      })

      // Convert to PDF
      const jsPDFModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      const jsPDF = jsPDFModule.default
      const html2canvas = html2canvasModule.default

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`Ficha_EPI_${ficha.colaborador.nome}_${ficha.epi.codigo}.pdf`)

      // Clean up
      root.unmount()
      document.body.removeChild(tempDiv)

      toast({
        title: "Sucesso",
        description: "Ficha de EPI gerada com sucesso!",
      })
    } catch (error) {
      console.error('Error generating EPI form:', error)
      toast({
        title: "Erro",
        description: "Erro ao gerar ficha de EPI",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (epi: EPIComAtribuicao) => {
    const hoje = new Date()
    
    if (epi.data_vencimento) {
      const dataVencimento = new Date(epi.data_vencimento)
      const vencimentoProximo = addDays(hoje, 30)
      
      if (isBefore(dataVencimento, hoje)) {
        return <Badge variant="destructive">Vencido</Badge>
      } else if (isBefore(dataVencimento, vencimentoProximo)) {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Vence em breve</Badge>
      }
    }
    
    return <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
  }

  const filteredEPIs = episAtribuidos.filter(epi => {
    const matchesSearch = 
      epi.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epi.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epi.colaborador_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epi.numero_ca?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'all') return true
    if (statusFilter === 'ativo') return epi.status_calculado === 'ativo'
    if (statusFilter === 'vencido') return epi.status_calculado === 'vencido'
    if (statusFilter === 'vence_breve') return epi.status_calculado === 'vence_breve'
    
    return true
  })

  const handleAtribuicaoSuccess = () => {
    setShowAtribuicaoDialog(false)
    loadEPIsAtribuidos()
    loadEstatisticas()
    toast({
      title: "Sucesso",
      description: "EPI atribuído com sucesso!",
    })
  }

  const colunas: ColunaDataTable<EPIComAtribuicao>[] = [
    {
      id: 'epi',
      cabecalho: 'EPI',
      fixa: true,
      semFiltro: true,
      valor: (e) => `${e.codigo ?? ''} ${e.nome ?? ''} ${e.numero_ca ?? ''}`.trim(),
      valorOrdenacao: (e) => e.nome ?? '',
      celula: (e) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{e.nome}</div>
          <div className="text-xs text-muted-foreground">
            {e.codigo} {e.numero_ca ? `• CA ${e.numero_ca}` : ''}
          </div>
        </div>
      ),
    },
    {
      id: 'colaborador',
      cabecalho: 'Colaborador',
      valor: (e) => e.colaborador_nome || '—',
      celula: (e) =>
        e.colaborador_id && e.colaborador_nome ? (
          <ColaboradorClickableLabel
            colaboradorId={e.colaborador_id}
            colaboradorNome={e.colaborador_nome}
            colaboradorMatricula={e.colaborador_matricula ?? undefined}
            colaboradorCargo={e.colaborador_cargo ?? undefined}
            colaboradorSetor={e.colaborador_setor ?? undefined}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'atribuicao',
      cabecalho: 'Atribuído em',
      semFiltro: true,
      valor: (e) =>
        e.data_atribuicao ? format(new Date(e.data_atribuicao), 'dd/MM/yyyy', { locale: ptBR }) : '—',
      valorOrdenacao: (e) => e.data_atribuicao ?? '',
    },
    {
      id: 'vencimento',
      cabecalho: 'Vencimento',
      semFiltro: true,
      valor: (e) =>
        e.data_vencimento ? format(new Date(e.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '—',
      valorOrdenacao: (e) => e.data_vencimento ?? '',
    },
    {
      id: 'situacao',
      cabecalho: 'Situação',
      // status_calculado vem da view: em_dia, vencendo, vencido ou sem_validade
      valor: (e) =>
        ({
          em_dia: 'Em dia',
          vencendo: 'Vence em breve',
          vencido: 'Vencido',
          sem_validade: 'Sem validade',
        })[e.status_calculado ?? ''] ?? (e.status_calculado || '—'),
      celula: (e) => {
        const mapa: Record<string, string> = {
          em_dia: 'concluido',
          vencendo: 'pendente',
          vencido: 'rejeitado',
          sem_validade: 'rascunho',
        }
        return <StatusBadge status={mapa[e.status_calculado ?? ''] ?? 'rascunho'} />
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Controle de EPI"
          descricao="Equipamentos de proteção individual atribuídos aos colaboradores."
          migalhas={[{ label: 'Operação' }, { label: 'EPI' }]}
        />
        <CardsSkeleton />
        <TableSkeleton colunas={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Controle de EPI"
        descricao="Equipamentos de proteção individual atribuídos aos colaboradores."
        migalhas={[{ label: 'Operação' }, { label: 'EPI' }]}
        acoes={
          <Dialog open={showAtribuicaoDialog} onOpenChange={setShowAtribuicaoDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Atribuir EPI
              </Button>
            </DialogTrigger>
            <EPIAtribuicaoDialog onSuccess={handleAtribuicaoSuccess} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          rotulo="Total de EPIs"
          valor={estatisticas.total_epis}
          detalhe="EPIs cadastrados"
          icone={Package}
        />
        <KpiCard
          rotulo="EPIs atribuídos"
          valor={estatisticas.epis_atribuidos}
          detalhe="Em uso"
          icone={User}
        />
        <KpiCard
          rotulo="Vencendo"
          valor={estatisticas.epis_vencendo}
          detalhe="Próximos 30 dias"
          icone={Calendar}
          tom="atencao"
        />
        <KpiCard
          rotulo="Vencidos"
          valor={estatisticas.epis_vencidos}
          detalhe="Substituição necessária"
          icone={AlertTriangle}
          tom="critico"
        />
      </div>

      <DataTable
        dados={episAtribuidos}
        colunas={colunas}
        idLinha={(e) => e.atribuicao_id}
        chaveUrl="epi"
        placeholderBusca="Buscar por EPI, colaborador, código ou CA..."
        nomeArquivoCsv="epis-atribuidos"
        acoesLinha={(epi) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Gerar ficha de EPI"
            disabled={!epi.atribuicao_id}
            onClick={() => generateFichaEPI(epi.atribuicao_id || '')}
          >
            <FileText className="h-4 w-4" />
          </Button>
        )}
        vazio={
          <EmptyState
            titulo="Nenhum EPI atribuído"
            descricao="Use “Atribuir EPI” para vincular um equipamento a um colaborador."
            icone={Package}
          />
        }
      />
    </div>
  )
}
