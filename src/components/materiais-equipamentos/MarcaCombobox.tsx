import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

interface MarcaComboboxProps {
  value?: string
  onChange: (value: string | undefined) => void
  marcas: Tables<'marcas'>[]
  onMarcaCreated?: (marca: Tables<'marcas'>) => void
  disabled?: boolean
}

export function MarcaCombobox({ 
  value, 
  onChange, 
  marcas, 
  onMarcaCreated,
  disabled = false 
}: MarcaComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [newMarcaDialogOpen, setNewMarcaDialogOpen] = useState(false)
  const [newMarcaName, setNewMarcaName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const activeMarcas = marcas.filter(marca => marca.ativo)
  
  const selectedMarca = activeMarcas.find(marca => marca.id === value)
  
  // Filtrar marcas baseado na pesquisa
  const filteredMarcas = activeMarcas.filter(marca =>
    marca.nome.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleCreateMarca = async () => {
    if (!newMarcaName.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da marca é obrigatório',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      // Verificar se a marca já existe
      const { data: existing } = await supabase
        .from('marcas')
        .select('id, nome')
        .ilike('nome', newMarcaName.trim())
        .single()

      if (existing) {
        toast({
          title: 'Aviso',
          description: 'Uma marca com esse nome já existe',
          variant: 'destructive',
        })
        return
      }

      // Criar nova marca
      const { data: newMarca, error } = await supabase
        .from('marcas')
        .insert({
          nome: newMarcaName.trim(),
          ativo: true
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Marca "${newMarca.nome}" criada com sucesso!`,
      })

      // Selecionar a nova marca
      onChange(newMarca.id)
      
      // Notificar o componente pai sobre a nova marca
      onMarcaCreated?.(newMarca)
      
      // Limpar e fechar
      setNewMarcaName('')
      setNewMarcaDialogOpen(false)
      setOpen(false)
      
    } catch (error: any) {
      console.error('Erro ao criar marca:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar nova marca',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenNewMarcaDialog = useCallback(() => {
    setNewMarcaName(searchValue)
    setNewMarcaDialogOpen(true)
  }, [searchValue])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedMarca ? (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedMarca.nome}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedMarca.codigo || 'S/C'}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Selecione uma marca...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Pesquisar marca..." 
                value={searchValue}
                onValueChange={setSearchValue}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <div className="mb-2">Nenhuma marca encontrada</div>
                  {searchValue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenNewMarcaDialog}
                      className="mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar "{searchValue}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              {filteredMarcas.length > 0 && (
                <CommandGroup>
                  {filteredMarcas.map((marca) => (
                    <CommandItem
                      key={marca.id}
                      value={marca.id}
                      onSelect={(selectedValue) => {
                        onChange(selectedValue === value ? undefined : selectedValue)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === marca.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="truncate">{marca.nome}</span>
                        {marca.codigo && (
                          <Badge variant="outline" className="text-xs">
                            {marca.codigo}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {searchValue && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={handleOpenNewMarcaDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar nova marca "{searchValue}"
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog para criar nova marca */}
      <Dialog open={newMarcaDialogOpen} onOpenChange={setNewMarcaDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Marca</DialogTitle>
            <DialogDescription>
              Adicione uma nova marca que não existe na lista.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="marca-name" className="text-right text-sm font-medium">
                Nome
              </label>
              <Input
                id="marca-name"
                value={newMarcaName}
                onChange={(e) => setNewMarcaName(e.target.value)}
                placeholder="Nome da marca"
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateMarca()
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewMarcaDialogOpen(false)
                setNewMarcaName('')
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateMarca}
              disabled={isCreating || !newMarcaName.trim()}
            >
              {isCreating ? 'Criando...' : 'Criar Marca'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}