import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, User } from 'lucide-react'
import type { Tables } from '@/types/database'

type Colaborador = Tables<'colaboradores'>

interface ResponsavelData {
  type: 'colaborador' | 'nome'
  colaborador_id?: string
  nome?: string
  displayName?: string
}

interface ResponsavelSelectorSimpleProps {
  value?: ResponsavelData
  onChange: (value: ResponsavelData | undefined) => void
  placeholder?: string
  disabled?: boolean
}

const ResponsavelSelectorSimple = ({ 
  value, 
  onChange, 
  placeholder = "Selecione ou digite o responsável...",
  disabled = false
}: ResponsavelSelectorSimpleProps) => {
  const [open, setOpen] = useState(false)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchColaboradores = async () => {
      try {
        console.log('Buscando colaboradores diretamente...')
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, nome, matricula, cargo')
          .eq('ativo', true)
          .order('nome')

        console.log('Resultado da busca:', { data: data?.length || 0, error })
        
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

  const handleSelectColaborador = (colaborador: Colaborador) => {
    onChange({
      type: 'colaborador',
      colaborador_id: colaborador.id,
      displayName: `${colaborador.nome} (${colaborador.matricula})`
    })
    setOpen(false)
  }

  const handleDirectInput = (inputValue: string) => {
    if (inputValue.trim()) {
      onChange({
        type: 'nome',
        nome: inputValue.trim(),
        displayName: inputValue.trim()
      })
    } else {
      onChange(undefined)
    }
  }

  const getDisplayValue = () => {
    if (!value) return ""
    if (value.type === 'colaborador') {
      return value.displayName || "Colaborador selecionado"
    }
    return value.nome || ""
  }

  const clearSelection = () => {
    onChange(undefined)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="responsavel">Responsável</Label>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id="responsavel"
            value={getDisplayValue()}
            onChange={(e) => handleDirectInput(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-20"
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-12 top-0 h-full px-2"
              onClick={clearSelection}
              disabled={disabled}
            >
              ✕
            </Button>
          )}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={disabled}
            >
              <Search className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Buscar colaborador..." />
              <CommandList>
                <CommandEmpty>
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      Nenhum colaborador encontrado
                    </p>
                  </div>
                </CommandEmpty>

                <CommandGroup heading={`Colaboradores (${loading ? 'Carregando...' : colaboradores.length})`}>
                  {loading ? (
                    <CommandItem disabled>
                      <div className="flex items-center gap-3 w-full">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                        <span>Carregando colaboradores...</span>
                      </div>
                    </CommandItem>
                  ) : (
                    colaboradores
                      .filter(c => c.ativo)
                      .map((colaborador) => (
                    <CommandItem
                      key={colaborador.id}
                      value={`${colaborador.nome} ${colaborador.matricula} ${colaborador.cargo}`}
                      onSelect={() => handleSelectColaborador(colaborador)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{colaborador.nome}</div>
                          <div className="text-sm text-muted-foreground">
                            Mat: {colaborador.matricula} • {colaborador.cargo}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  )))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {value && (
        <div className="text-xs text-muted-foreground">
          {value.type === 'colaborador' ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Colaborador cadastrado
            </span>
          ) : (
            <span>Responsável específico deste romaneio</span>
          )}
        </div>
      )}
    </div>
  )
}

export default ResponsavelSelectorSimple