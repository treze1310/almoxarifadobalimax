import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, X } from 'lucide-react'
import type { Tables } from '@/types/database'

type Colaborador = Tables<'colaboradores'>

interface ResponsavelData {
  type: 'colaborador' | 'nome'
  colaborador_id?: string
  nome?: string
  displayName?: string
}

interface ResponsavelAutocompleteProps {
  value?: ResponsavelData
  onChange: (value: ResponsavelData | undefined) => void
  placeholder?: string
  disabled?: boolean
}

const ResponsavelAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Digite o nome do responsável...",
  disabled = false
}: ResponsavelAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('')
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [filteredColaboradores, setFilteredColaboradores] = useState<Colaborador[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Carregar colaboradores
  useEffect(() => {
    const fetchColaboradores = async () => {
      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, nome, matricula, cargo')
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao carregar colaboradores:', error)
        } else {
          setColaboradores(data || [])
        }
      } catch (err) {
        console.error('Erro na busca:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchColaboradores()
  }, [])

  // Sincronizar valor com input
  useEffect(() => {
    if (value) {
      if (value.type === 'colaborador') {
        setInputValue(value.displayName || '')
      } else {
        setInputValue(value.nome || '')
      }
    } else {
      setInputValue('')
    }
  }, [value])

  // Filtrar colaboradores baseado no input
  useEffect(() => {
    if (inputValue.trim().length >= 2) {
      const filtered = colaboradores.filter(colaborador =>
        colaborador.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
        colaborador.matricula.toLowerCase().includes(inputValue.toLowerCase()) ||
        (colaborador.cargo && colaborador.cargo.toLowerCase().includes(inputValue.toLowerCase()))
      )
      setFilteredColaboradores(filtered)
      setShowSuggestions(filtered.length > 0)
      setHighlightedIndex(-1)
    } else {
      setFilteredColaboradores([])
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }
  }, [inputValue, colaboradores])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Se o input está vazio, limpar seleção
    if (!newValue.trim()) {
      onChange(undefined)
      return
    }

    // Verificar se é exatamente um colaborador existente
    const exactMatch = colaboradores.find(c => 
      c.nome.toLowerCase() === newValue.toLowerCase()
    )

    if (exactMatch) {
      onChange({
        type: 'colaborador',
        colaborador_id: exactMatch.id,
        displayName: `${exactMatch.nome} (${exactMatch.matricula})`
      })
    } else {
      // Nome avulso
      onChange({
        type: 'nome',
        nome: newValue.trim(),
        displayName: newValue.trim()
      })
    }
  }

  const handleSelectColaborador = (colaborador: Colaborador) => {
    const displayName = `${colaborador.nome} (${colaborador.matricula})`
    setInputValue(displayName)
    onChange({
      type: 'colaborador',
      colaborador_id: colaborador.id,
      displayName: displayName
    })
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredColaboradores.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredColaboradores.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredColaboradores.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredColaboradores.length) {
          handleSelectColaborador(filteredColaboradores[highlightedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const clearSelection = () => {
    setInputValue('')
    onChange(undefined)
    inputRef.current?.focus()
  }

  const handleFocus = () => {
    if (inputValue.trim().length >= 2 && filteredColaboradores.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // Delay para permitir clique nas sugestões
    setTimeout(() => {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }, 150)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="responsavel">Responsável</Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="responsavel"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-8 ${showSuggestions && filteredColaboradores.length > 0 ? 'border-blue-300 ring-1 ring-blue-200' : ''}`}
        />
        
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSelection}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Sugestões */}
        {showSuggestions && filteredColaboradores.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredColaboradores.map((colaborador, index) => (
              <div
                key={colaborador.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent ${
                  index === highlightedIndex ? 'bg-accent' : ''
                }`}
                onClick={() => handleSelectColaborador(colaborador)}
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{colaborador.nome}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    Mat: {colaborador.matricula} • {colaborador.cargo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indicador do tipo de responsável */}
      {value && (
        <div className="text-xs text-muted-foreground">
          {value.type === 'colaborador' ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Colaborador cadastrado
            </span>
          ) : (
            <span className="text-orange-600">
              Responsável específico deste romaneio
            </span>
          )}
        </div>
      )}

      {loading && inputValue.trim().length >= 2 && (
        <div className="text-xs text-muted-foreground">
          Carregando colaboradores...
        </div>
      )}

      {inputValue.trim().length > 0 && inputValue.trim().length < 2 && (
        <div className="text-xs text-muted-foreground">
          Digite pelo menos 2 caracteres para ver sugestões
        </div>
      )}
    </div>
  )
}

export default ResponsavelAutocomplete