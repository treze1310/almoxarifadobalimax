import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Shield, Calendar, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { ColaboradorForm } from './ColaboradorForm'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ColaboradorFormData } from '@/lib/validations'

interface ColaboradorEditDialogProps {
  colaboradorId: string | null
  isOpen: boolean
  onClose: () => void
  onColaboradorUpdated?: () => void
}

interface ColaboradorDetalhado extends Tables<'colaboradores'> {
  empresa?: { nome: string; cnpj: string | null; logo_url: string | null }
  centro_custo?: { codigo: string; descricao: string | null }
}

interface EPIVinculadoRomaneio {
  romaneio_id: string
  romaneio_numero: string
  romaneio_data: string
  item_id: string
  quantidade: number
  material_nome: string
  material_codigo: string
  numero_ca?: string | null
  data_devolucao?: string | null
  status: 'retirado' | 'devolvido' | 'parcialmente_devolvido'
}

export function ColaboradorEditDialog({ 
  colaboradorId, 
  isOpen, 
  onClose, 
  onColaboradorUpdated 
}: ColaboradorEditDialogProps) {
  console.log('🔍 ColaboradorEditDialog rendered with:', { colaboradorId, isOpen, hasOnClose: !!onClose })
  
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [colaborador, setColaborador] = useState<ColaboradorDetalhado | null>(null)
  const [episRomaneio, setEpisRomaneio] = useState<EPIVinculadoRomaneio[]>([])
  const [loadingEpis, setLoadingEpis] = useState(false)
  const [activeTab, setActiveTab] = useState<'dados' | 'epis'>('dados')

  useEffect(() => {
    if (isOpen && colaboradorId) {
      console.log('🔄 Loading colaborador details for ID:', colaboradorId)
      loadColaboradorDetails()
      loadEPIsRomaneio()
    }
  }, [isOpen, colaboradorId])

  const loadColaboradorDetails = async () => {
    if (!colaboradorId) return

    setLoading(true)
    try {
      console.log('📋 Fetching colaborador details...')
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          empresa:empresas(nome, cnpj, logo_url),
          centro_custo:centros_custo(codigo, descricao)
        `)
        .eq('id', colaboradorId)
        .single()

      if (error) throw error
      console.log('✅ Colaborador details loaded:', data?.nome)
      setColaborador(data)
    } catch (error) {
      console.error('❌ Error loading colaborador details:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do colaborador",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadEPIsRomaneio = async () => {
    if (!colaboradorId) return

    setLoadingEpis(true)
    try {
      console.log('📋 Fetching EPIs from romaneios for colaborador...')
      const { data, error } = await supabase
        .from('romaneios')
        .select(`
          id,
          numero,
          data_romaneio,
          tipo,
          romaneios_itens (
            id,
            quantidade,
            data_devolucao,
            materiais_equipamentos:material_equipamento_id (
              id,
              codigo,
              nome,
              numero_ca,
              tipo
            )
          )
        `)
        .eq('colaborador_id', colaboradorId)
        .eq('tipo', 'retirada')
        .order('data_romaneio', { ascending: false })

      if (error) throw error

      const episFormatados: EPIVinculadoRomaneio[] = []
      
      data?.forEach(romaneio => {
        romaneio.romaneios_itens?.forEach(item => {
          if (item.materiais_equipamentos?.is_epi) {
            episFormatados.push({
              romaneio_id: romaneio.id,
              romaneio_numero: romaneio.numero,
              romaneio_data: romaneio.data_romaneio,
              item_id: item.id,
              quantidade: item.quantidade,
              material_nome: item.materiais_equipamentos.nome,
              material_codigo: item.materiais_equipamentos.codigo,
              numero_ca: item.materiais_equipamentos.numero_ca,
              data_devolucao: item.data_devolucao,
              status: item.data_devolucao ? 'devolvido' : 'retirado'
            })
          }
        })
      })

      console.log('✅ EPIs from romaneios loaded:', episFormatados.length, 'items')
      setEpisRomaneio(episFormatados)
    } catch (error) {
      console.error('❌ Error loading EPIs from romaneios:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar EPIs vinculados por romaneio",
        variant: "destructive",
      })
    } finally {
      setLoadingEpis(false)
    }
  }

  if (!isOpen) return null

  // Buscar o elemento main para fazer o portal
  const mainElement = document.querySelector('main')
  if (!mainElement) return null

  const dialogContent = (
    <>
      {/* Overlay - apenas na área do main */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          borderRadius: '0'
        }}
      />
      
      {/* Dialog Container */}
      <div 
        className="bg-white rounded-lg shadow-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(90%, 640px)',
          maxHeight: '90%',
          zIndex: 9999,
          margin: 0,
          padding: 0,
          boxSizing: 'border-box'
        }}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h2 className="text-lg font-semibold">
                {loading ? 'Carregando...' : colaborador?.nome || `Colaborador ${colaboradorId}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('dados')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'dados'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                <User className="w-4 h-4 mr-2 inline" />
                Dados do Colaborador
              </button>
              <button
                onClick={() => setActiveTab('epis')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'epis'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                <Shield className="w-4 h-4 mr-2 inline" />
                EPIs Vinculados ({episRomaneio.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">{activeTab === 'dados' ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Editar dados do colaborador
              </p>
            
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              ) : colaborador ? (
                <ColaboradorForm
                  initialData={colaborador}
                  onSubmit={async (data: ColaboradorFormData) => {
                    try {
                      setLoading(true)
                      const { data: updated, error } = await supabase
                        .from('colaboradores')
                        .update(data)
                        .eq('id', colaboradorId as string)
                        .select()
                        .single()
                      if (error) throw error
                      setColaborador(updated as any)
                      onColaboradorUpdated?.()
                      toast({ title: 'Sucesso', description: 'Colaborador atualizado com sucesso.' })
                      onClose()
                    } catch (error) {
                      console.error('Erro ao atualizar colaborador:', error)
                      toast({ title: 'Erro', description: 'Não foi possível atualizar o colaborador.', variant: 'destructive' })
                    } finally {
                      setLoading(false)
                    }
                  }}
                  onCancel={onClose}
                />
              ) : (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground">Colaborador não encontrado</p>
                  <button 
                    onClick={onClose} 
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Aba EPIs */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">EPIs Vinculados por Romaneios de Retirada</h3>
              </div>
              
              {loadingEpis ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando EPIs...</p>
                </div>
              ) : episRomaneio.length > 0 ? (
                <div className="space-y-4">
                  {episRomaneio.map((epi) => (
                    <div key={`${epi.romaneio_id}-${epi.item_id}`} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900">{epi.material_nome}</h4>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div className="flex items-center gap-4">
                              <span><Package className="w-4 h-4 inline mr-1" />Código: {epi.material_codigo}</span>
                              {epi.numero_ca && <span><Shield className="w-4 h-4 inline mr-1" />CA: {epi.numero_ca}</span>}
                            </div>
                            <div><Calendar className="w-4 h-4 inline mr-1" />Quantidade: {epi.quantidade}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={epi.status === 'devolvido' ? 'destructive' : 'default'}
                            className="mb-2"
                          >
                            {epi.status === 'devolvido' ? 'Devolvido' : 'Em Uso'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 text-xs text-gray-500 bg-white rounded p-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Romaneio:</span> {epi.romaneio_numero}
                          </div>
                          <div>
                            <span className="font-medium">Retirado em:</span> {format(new Date(epi.romaneio_data), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                          {epi.data_devolucao && (
                            <div className="col-span-2">
                              <span className="font-medium">Devolvido em:</span> {format(new Date(epi.data_devolucao), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum EPI Encontrado</h3>
                  <p className="text-gray-600">Este colaborador não possui EPIs vinculados através de romaneios de retirada.</p>
                </div>
              )}
            </div>
          )}
          </div>
      </div>
    </>
  )

  return createPortal(dialogContent, mainElement)
}
