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

interface EmpresaComboboxProps {
  value?: string
  onChange: (value: string | undefined) => void
  empresas: Tables<'empresas'>[]
  onEmpresaCreated?: (empresa: Tables<'empresas'>) => void
  disabled?: boolean
}

export function EmpresaCombobox({ 
  value, 
  onChange, 
  empresas, 
  onEmpresaCreated,
  disabled = false 
}: EmpresaComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [newEmpresaDialogOpen, setNewEmpresaDialogOpen] = useState(false)
  const [newEmpresaName, setNewEmpresaName] = useState('')
  const [newEmpresaCnpj, setNewEmpresaCnpj] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const activeEmpresas = empresas.filter(empresa => empresa.ativo)
  
  const selectedEmpresa = activeEmpresas.find(empresa => empresa.id === value)
  
  // Filtrar empresas baseado na pesquisa
  const filteredEmpresas = activeEmpresas.filter(empresa =>
    empresa.nome.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleCreateEmpresa = async () => {
    if (!newEmpresaName.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da empresa é obrigatório',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      // Verificar se a empresa já existe
      const { data: existing } = await supabase
        .from('empresas')
        .select('id, nome')
        .ilike('nome', newEmpresaName.trim())
        .single()

      if (existing) {
        toast({
          title: 'Aviso',
          description: 'Uma empresa com esse nome já existe',
          variant: 'destructive',
        })
        return
      }

      // Criar nova empresa
      const { data: newEmpresa, error } = await supabase
        .from('empresas')
        .insert({
          nome: newEmpresaName.trim(),
          cnpj: newEmpresaCnpj.trim() || null,
          ativo: true
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Empresa "${newEmpresa.nome}" criada com sucesso!`,
      })

      // Selecionar a nova empresa
      onChange(newEmpresa.id)
      
      // Notificar o componente pai sobre a nova empresa
      onEmpresaCreated?.(newEmpresa)
      
      // Limpar e fechar
      setNewEmpresaName('')
      setNewEmpresaCnpj('')
      setNewEmpresaDialogOpen(false)
      setOpen(false)
      
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar nova empresa',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenNewEmpresaDialog = useCallback(() => {
    setNewEmpresaName(searchValue)
    setNewEmpresaDialogOpen(true)
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
            {selectedEmpresa ? (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedEmpresa.nome}</span>
                {selectedEmpresa.cnpj && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedEmpresa.cnpj}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecione uma empresa...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Pesquisar empresa..." 
                value={searchValue}
                onValueChange={setSearchValue}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <div className="mb-2">Nenhuma empresa encontrada</div>
                  {searchValue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenNewEmpresaDialog}
                      className="mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar "{searchValue}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              {filteredEmpresas.length > 0 && (
                <CommandGroup>
                  {filteredEmpresas.map((empresa) => (
                    <CommandItem
                      key={empresa.id}
                      value={empresa.id}
                      onSelect={(selectedValue) => {
                        onChange(selectedValue === value ? undefined : selectedValue)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === empresa.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="truncate">{empresa.nome}</span>
                        {empresa.cnpj && (
                          <Badge variant="outline" className="text-xs">
                            {empresa.cnpj}
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
                    <CommandItem onSelect={handleOpenNewEmpresaDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar nova empresa "{searchValue}"
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog para criar nova empresa */}
      <Dialog open={newEmpresaDialogOpen} onOpenChange={setNewEmpresaDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Empresa</DialogTitle>
            <DialogDescription>
              Adicione uma nova empresa que não existe na lista.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="empresa-name" className="text-right text-sm font-medium">
                Nome *
              </label>
              <Input
                id="empresa-name"
                value={newEmpresaName}
                onChange={(e) => setNewEmpresaName(e.target.value)}
                placeholder="Nome da empresa"
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCreateEmpresa()
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="empresa-cnpj" className="text-right text-sm font-medium">
                CNPJ
              </label>
              <Input
                id="empresa-cnpj"
                value={newEmpresaCnpj}
                onChange={(e) => setNewEmpresaCnpj(e.target.value)}
                placeholder="XX.XXX.XXX/XXXX-XX"
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCreateEmpresa()
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewEmpresaDialogOpen(false)
                setNewEmpresaName('')
                setNewEmpresaCnpj('')
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateEmpresa}
              disabled={isCreating || !newEmpresaName.trim()}
            >
              {isCreating ? 'Criando...' : 'Criar Empresa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}