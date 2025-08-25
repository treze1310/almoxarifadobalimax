import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColaboradorClickableLabel } from '@/components/colaboradores/ColaboradorClickableLabel'
import { supabase } from '@/lib/supabase'
import { User } from 'lucide-react'

interface Colaborador {
  id: string
  nome: string
  matricula: string | null
  cargo: string | null
  setor: string | null
  ativo: boolean | null
}

interface ColaboradorSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  showCurrentSelection?: boolean
  onColaboradorUpdated?: () => void
}

export function ColaboradorSelector({
  value,
  onValueChange,
  label = "Colaborador",
  placeholder = "Selecione um colaborador",
  required = false,
  disabled = false,
  showCurrentSelection = true,
  onColaboradorUpdated
}: ColaboradorSelectorProps) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null)

  useEffect(() => {
    loadColaboradores()
  }, [])

  useEffect(() => {
    if (value && colaboradores.length > 0) {
      const colaborador = colaboradores.find(c => c.id === value)
      setSelectedColaborador(colaborador || null)
    } else {
      setSelectedColaborador(null)
    }
  }, [value, colaboradores])

  const loadColaboradores = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, matricula, cargo, setor, ativo')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setColaboradores(data || [])
    } catch (error) {
      console.error('Error loading colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleColaboradorUpdated = () => {
    loadColaboradores()
    onColaboradorUpdated?.()
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="colaborador-selector">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger id="colaborador-selector">
          <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {colaboradores.map((colaborador) => (
            <SelectItem key={colaborador.id} value={colaborador.id}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="font-medium">{colaborador.nome}</span>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    {colaborador.matricula && <span>Mat: {colaborador.matricula}</span>}
                    {colaborador.cargo && <span>• {colaborador.cargo}</span>}
                    {colaborador.setor && <span>• {colaborador.setor}</span>}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCurrentSelection && selectedColaborador && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Selecionado:</span>
            <ColaboradorClickableLabel
              colaboradorId={selectedColaborador.id}
              colaboradorNome={selectedColaborador.nome}
              colaboradorMatricula={selectedColaborador.matricula}
              colaboradorCargo={selectedColaborador.cargo}
              colaboradorSetor={selectedColaborador.setor}
              variant="default"
              onColaboradorUpdated={handleColaboradorUpdated}
            />
          </div>
        </div>
      )}
    </div>
  )
}