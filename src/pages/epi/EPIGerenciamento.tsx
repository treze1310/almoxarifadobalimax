import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  User, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Filter, 
  FileText,
  Plus,
  Download
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { epiService, EPIComAtribuicao } from '@/services/epiService'
import { EPIAtribuicaoDialog } from '@/components/epi/EPIAtribuicaoDialog'
import { FichaEPIPDF } from '@/components/epi/FichaEPIPDF'
import { ColaboradorClickableLabel } from '@/components/colaboradores/ColaboradorClickableLabel'
import { format, isAfter, isBefore, addDays } from 'date-fns'
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de EPIs</h1>
          <p className="text-muted-foreground">
            Controle e acompanhamento de Equipamentos de Proteção Individual
          </p>
        </div>
        
        <Dialog open={showAtribuicaoDialog} onOpenChange={setShowAtribuicaoDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Atribuir EPI
            </Button>
          </DialogTrigger>
          <EPIAtribuicaoDialog onSuccess={handleAtribuicaoSuccess} />
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total EPIs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.total_epis}</div>
            <p className="text-xs text-muted-foreground">EPIs cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EPIs Atribuídos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.epis_atribuidos}</div>
            <p className="text-xs text-muted-foreground">Em uso pelos colaboradores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencendo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.epis_vencendo}</div>
            <p className="text-xs text-muted-foreground">Próximos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{estatisticas.epis_vencidos}</div>
            <p className="text-xs text-muted-foreground">Precisam ser substituídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por EPI, colaborador, código ou CA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="vence_breve">Vence em breve</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de EPIs */}
      <div className="grid gap-4">
        {filteredEPIs.map((epi) => (
          <Card key={epi.atribuicao_id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {epi.nome}
                    {getStatusBadge(epi)}
                  </CardTitle>
                  <CardDescription className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <span><strong>Código:</strong> {epi.codigo}</span>
                    <span><strong>CA:</strong> {epi.numero_ca || 'N/A'}</span>
                    <div className="flex items-center gap-2">
                      <strong>Colaborador:</strong>
                      {epi.colaborador_id && epi.colaborador_nome ? (
                        <ColaboradorClickableLabel
                          colaboradorId={epi.colaborador_id}
                          colaboradorNome={epi.colaborador_nome}
                          colaboradorMatricula={epi.colaborador_matricula}
                          colaboradorCargo={epi.colaborador_cargo}
                          colaboradorSetor={epi.colaborador_setor}
                          variant="default"
                          onColaboradorUpdated={loadEPIsAtribuidos}
                        />
                      ) : (
                        <span>{epi.colaborador_nome || 'N/A'}</span>
                      )}
                    </div>
                    <span><strong>Matrícula:</strong> {epi.colaborador_matricula || 'N/A'}</span>
                  </CardDescription>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateFichaEPI(epi.atribuicao_id || '')}
                    disabled={!epi.atribuicao_id}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Ficha
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Data de Atribuição:</strong><br />
                  {epi.data_atribuicao ? format(new Date(epi.data_atribuicao), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                </div>
                <div>
                  <strong>Data de Vencimento:</strong><br />
                  {epi.data_vencimento ? format(new Date(epi.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                </div>
                <div>
                  <strong>Quantidade:</strong><br />
                  {epi.quantidade_atribuida || 1}
                </div>
              </div>
              {epi.observacoes_atribuicao && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <strong>Observações:</strong> {epi.observacoes_atribuicao}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {filteredEPIs.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum EPI encontrado com os filtros aplicados' 
                  : 'Nenhum EPI atribuído ainda'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}