import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useMateriaisEquipamentos } from '@/hooks/useMateriaisEquipamentos'
import { useRomaneios } from '@/hooks/useRomaneios'
import { ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

interface CentroCustoLabelProps {
  materialId: string
  centroCusto: {
    codigo: string
    nome: string
  }
}

const CentroCustoLabel = ({ materialId, centroCusto }: CentroCustoLabelProps) => {
  const [loading, setLoading] = useState(false)
  const [romaneioDialogOpen, setRomaneioDialogOpen] = useState(false)
  const [romaneioDetalhes, setRomaneioDetalhes] = useState<any>(null)
  const { findRomaneioEntrada } = useMateriaisEquipamentos()
  const { getRomaneioById } = useRomaneios()
  const { toast } = useToast()

  const handleCentroCustoClick = async () => {
    setLoading(true)
    try {
      const { data: romaneio, error } = await findRomaneioEntrada(materialId)
      
      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao buscar romaneio de entrada',
          variant: 'destructive',
        })
        return
      }

      if (!romaneio) {
        toast({
          title: 'Informação',
          description: 'Nenhum romaneio de entrada encontrado para este material',
          variant: 'default',
        })
        return
      }

      // Buscar detalhes completos do romaneio
      const { data: romaneioCompleto } = await getRomaneioById(romaneio.id)
      if (romaneioCompleto) {
        setRomaneioDetalhes(romaneioCompleto)
        setRomaneioDialogOpen(true)
      }
    } catch (error) {
      console.error('Erro ao buscar romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao buscar romaneio',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pendente': return 'secondary'
      case 'aprovado': return 'default'
      case 'retirado': return 'default'
      case 'devolvido': return 'default'
      case 'cancelado': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-left font-normal justify-start"
        onClick={handleCentroCustoClick}
        disabled={loading}
      >
        <div className="text-sm">
          <div className="font-medium flex items-center gap-1">
            {centroCusto.codigo}
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ExternalLink className="h-3 w-3" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">{centroCusto.nome}</div>
        </div>
      </Button>

      {/* Dialog com detalhes do romaneio */}
      <Dialog open={romaneioDialogOpen} onOpenChange={setRomaneioDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Romaneio de Entrada - {romaneioDetalhes?.numero}
            </DialogTitle>
            <DialogDescription>
              Romaneio que moveu este material para o centro de custo atual
            </DialogDescription>
          </DialogHeader>
          
          {romaneioDetalhes && (
            <div className="space-y-4">
              {/* Informações básicas */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Tipo</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {romaneioDetalhes.tipo}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={getStatusBadgeVariant(romaneioDetalhes.status || 'pendente')}>
                        {romaneioDetalhes.status || 'pendente'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Data</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(romaneioDetalhes.data_romaneio || romaneioDetalhes.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Responsável</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneioDetalhes.responsavel_retirada || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Centros de custo */}
              {(romaneioDetalhes.centro_custo_origem || romaneioDetalhes.centro_custo_destino) && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      {romaneioDetalhes.centro_custo_origem && (
                        <div>
                          <p className="text-sm font-medium">Centro de Custo Origem</p>
                          <p className="text-sm text-muted-foreground">
                            {romaneioDetalhes.centro_custo_origem.codigo} - {romaneioDetalhes.centro_custo_origem.empresas?.nome || romaneioDetalhes.centro_custo_origem.descricao}
                          </p>
                        </div>
                      )}
                      {romaneioDetalhes.centro_custo_destino && (
                        <div>
                          <p className="text-sm font-medium">Centro de Custo Destino</p>
                          <p className="text-sm text-muted-foreground">
                            {romaneioDetalhes.centro_custo_destino.codigo} - {romaneioDetalhes.centro_custo_destino.empresas?.nome || romaneioDetalhes.centro_custo_destino.descricao}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Colaborador */}
              {romaneioDetalhes.colaboradores && (
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <p className="text-sm font-medium">Solicitante</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneioDetalhes.colaboradores.nome}
                        {romaneioDetalhes.colaboradores.matricula && 
                          ` (${romaneioDetalhes.colaboradores.matricula})`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Observações */}
              {romaneioDetalhes.observacoes && (
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <p className="text-sm font-medium">Observações</p>
                      <p className="text-sm text-muted-foreground">
                        {romaneioDetalhes.observacoes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Itens do romaneio */}
              {romaneioDetalhes.romaneios_itens && romaneioDetalhes.romaneios_itens.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <p className="text-sm font-medium mb-3">
                        Itens ({romaneioDetalhes.romaneios_itens.length})
                      </p>
                      <div className="space-y-2">
                        {romaneioDetalhes.romaneios_itens.map((item: any, index: number) => (
                          <div key={item.id || index} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {item.materiais_equipamentos?.nome || 'Item não especificado'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Código: {item.materiais_equipamentos?.codigo || 'N/A'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">Qtd: {item.quantidade}</p>
                                {item.numero_serie && (
                                  <p className="text-xs text-muted-foreground">
                                    S/N: {item.numero_serie}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CentroCustoLabel