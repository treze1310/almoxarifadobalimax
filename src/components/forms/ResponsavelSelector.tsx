import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Tables } from '@/types/database'

type Colaborador = Tables<'colaboradores'>

interface ResponsavelData {
  type: 'colaborador' | 'nome'
  colaborador_id?: string
  nome?: string
  displayName?: string
}

interface ResponsavelSelectorProps {
  value?: ResponsavelData
  onChange: (value: ResponsavelData | undefined) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}

const ResponsavelSelector = ({ 
  value, 
  onChange, 
  placeholder = "Selecione ou digite o responsável...",
  disabled = false,
  error 
}: ResponsavelSelectorProps) => {
  const { usuario } = useAuth()
  const [open, setOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(false)
  const [newResponsavelName, setNewResponsavelName] = useState("")

  // Carregar colaboradores
  useEffect(() => {
    const fetchColaboradores = async () => {
      console.log('Iniciando carregamento de colaboradores...')
      console.log('Usuário autenticado:', usuario?.email)
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, nome, matricula, cargo')
          .eq('ativo', true)
          .order('nome')

        console.log('Resposta do Supabase:', { data, error })
        if (error) throw error
        console.log('Colaboradores carregados:', data?.length || 0, data)
        setColaboradores(data || [])
      } catch (error) {
        console.error('Erro ao carregar colaboradores:', error)
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

  const handleAddNewResponsavel = () => {
    if (newResponsavelName.trim()) {
      onChange({
        type: 'nome',
        nome: newResponsavelName.trim(),
        displayName: newResponsavelName.trim()
      })
      setNewResponsavelName("")
      setAddDialogOpen(false)
      setOpen(false)
    }
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
      
      {/* Input principal para digitação direta */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id="responsavel"
            value={getDisplayValue()}
            onChange={(e) => handleDirectInput(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pr-20",
              error && "border-destructive focus-visible:ring-destructive"
            )}
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

        {/* Botão para abrir seletor */}
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
              <CommandInput 
                placeholder="Buscar colaborador..." 
              />
              <CommandList>
                <CommandEmpty>
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhum colaborador encontrado
                    </p>
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar novo responsável
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Responsável</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="new-responsavel">Nome do Responsável</Label>
                            <Input
                              id="new-responsavel"
                              value={newResponsavelName}
                              onChange={(e) => setNewResponsavelName(e.target.value)}
                              placeholder="Digite o nome do responsável..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddNewResponsavel()
                                }
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setAddDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleAddNewResponsavel}>
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CommandEmpty>

                <CommandGroup heading="Colaboradores Cadastrados">
                  {colaboradores.map((colaborador) => {
                    console.log('Renderizando colaborador:', colaborador.nome)
                    return (
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
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value?.type === 'colaborador' && value.colaborador_id === colaborador.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  )})}
                </CommandGroup>

                {colaboradores.length > 0 && (
                  <CommandGroup>
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                      <DialogTrigger asChild>
                        <CommandItem onSelect={() => setAddDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar novo responsável
                        </CommandItem>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Responsável</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="new-responsavel-2">Nome do Responsável</Label>
                            <Input
                              id="new-responsavel-2"
                              value={newResponsavelName}
                              onChange={(e) => setNewResponsavelName(e.target.value)}
                              placeholder="Digite o nome do responsável..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddNewResponsavel()
                                }
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setAddDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleAddNewResponsavel}>
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mostrar informações do selecionado */}
      {value && (
        <div className="text-xs text-muted-foreground">
          {value.type === 'colaborador' ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Colaborador cadastrado
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Responsável específico deste romaneio
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export default ResponsavelSelector