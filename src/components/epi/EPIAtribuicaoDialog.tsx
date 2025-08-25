import { useState, useEffect } from 'react'
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColaboradorSelector } from '@/components/forms/ColaboradorSelector'
import { Calendar, CalendarIcon, User, Package, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { supabase } from '@/lib/supabase'
import { epiService, EPIAtribuicaoInsert } from '@/services/epiService'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface Material {
  id: string
  nome: string
  codigo: string
  numero_ca: string | null
  periodo_troca_meses: number | null
  estoque_atual: number | null
}


interface EPIAtribuicaoDialogProps {
  materialId?: string
  colaboradorId?: string
  onSuccess?: () => void
}

export function EPIAtribuicaoDialog({ materialId, colaboradorId, onSuccess }: EPIAtribuicaoDialogProps) {
  const { toast } = useToast()
  // TODO: Implementar sistema de usuário simplificado
  const user = { id: 'temp-user-id' }
  const [loading, setLoading] = useState(false)
  const [materiais, setMateriais] = useState<Material[]>([])
  const [dataVencimento, setDataVencimento] = useState<Date>()

  const [formData, setFormData] = useState({
    material_equipamento_id: materialId || '',
    colaborador_id: colaboradorId || '',
    data_atribuicao: format(new Date(), 'yyyy-MM-dd'),
    data_vencimento: '',
    quantidade_atribuida: 1,
    numero_ca: '',
    observacoes: ''
  })

  useEffect(() => {
    loadMateriais()
  }, [])

  useEffect(() => {
    if (formData.material_equipamento_id) {
      const material = materiais.find(m => m.id === formData.material_equipamento_id)
      if (material?.periodo_troca_meses) {
        const vencimento = addMonths(new Date(formData.data_atribuicao), material.periodo_troca_meses)
        setDataVencimento(vencimento)
        setFormData(prev => ({ ...prev, data_vencimento: format(vencimento, 'yyyy-MM-dd') }))
      }
      if (material?.numero_ca) {
        setFormData(prev => ({ ...prev, numero_ca: material.numero_ca || '' }))
      }
    }
  }, [formData.material_equipamento_id, formData.data_atribuicao, materiais])

  const loadMateriais = async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .select('id, nome, codigo, numero_ca, periodo_troca_meses, estoque_atual')
        .eq('is_epi', true)
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setMateriais(data || [])
    } catch (error) {
      console.error('Error loading materials:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar materiais",
        variant: "destructive",
      })
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.material_equipamento_id || !formData.colaborador_id) {
        throw new Error('Material e colaborador são obrigatórios')
      }

      const atribuicao: EPIAtribuicaoInsert = {
        material_equipamento_id: formData.material_equipamento_id,
        colaborador_id: formData.colaborador_id,
        data_atribuicao: formData.data_atribuicao,
        data_vencimento: formData.data_vencimento || null,
        quantidade_atribuida: formData.quantidade_atribuida,
        numero_ca: formData.numero_ca || null,
        observacoes: formData.observacoes || null,
        atribuido_por: user?.id || null,
        status: 'ativo'
      }

      await epiService.atribuirEPI(atribuicao)

      toast({
        title: "Sucesso",
        description: "EPI atribuído com sucesso!",
      })

      onSuccess?.()
    } catch (error: any) {
      console.error('Error assigning EPI:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao atribuir EPI",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const materialSelecionado = materiais.find(m => m.id === formData.material_equipamento_id)
  const estoqueInsuficiente = materialSelecionado && materialSelecionado.estoque_atual !== null && 
    materialSelecionado.estoque_atual < formData.quantidade_atribuida

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Atribuir EPI ao Colaborador
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="material">Material/EPI *</Label>
            <Select 
              value={formData.material_equipamento_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, material_equipamento_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um EPI" />
              </SelectTrigger>
              <SelectContent>
                {materiais.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    <div className="flex flex-col">
                      <span>{material.nome}</span>
                      <span className="text-sm text-muted-foreground">
                        {material.codigo} {material.numero_ca && `• CA: ${material.numero_ca}`}
                        {material.estoque_atual !== null && ` • Estoque: ${material.estoque_atual}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {estoqueInsuficiente && (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Estoque insuficiente
              </div>
            )}
          </div>

          <ColaboradorSelector
            value={formData.colaborador_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, colaborador_id: value }))}
            label="Colaborador"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_atribuicao">Data de Atribuição *</Label>
            <Input
              type="date"
              value={formData.data_atribuicao}
              onChange={(e) => setFormData(prev => ({ ...prev, data_atribuicao: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_vencimento">Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataVencimento && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataVencimento ? (
                    format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecionar data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dataVencimento}
                  onSelect={(date) => {
                    setDataVencimento(date)
                    setFormData(prev => ({ 
                      ...prev, 
                      data_vencimento: date ? format(date, 'yyyy-MM-dd') : '' 
                    }))
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade *</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantidade_atribuida}
              onChange={(e) => setFormData(prev => ({ ...prev, quantidade_atribuida: parseInt(e.target.value) || 1 }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero_ca">Número do CA</Label>
          <Input
            value={formData.numero_ca}
            onChange={(e) => setFormData(prev => ({ ...prev, numero_ca: e.target.value }))}
            placeholder="Número do Certificado de Aprovação"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Observações sobre a atribuição do EPI"
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading || estoqueInsuficiente} className="flex-1">
            {loading ? 'Atribuindo...' : 'Atribuir EPI'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}