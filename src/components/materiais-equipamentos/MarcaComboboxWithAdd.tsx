import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { MarcaForm } from '@/components/marcas/MarcaForm'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import type { Tables } from '@/types/database'
import type { MarcaFormData } from '@/lib/validations'

interface MarcaComboboxWithAddProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function MarcaComboboxWithAdd({ 
  value, 
  onValueChange, 
  placeholder = "Selecione uma marca...",
  disabled = false 
}: MarcaComboboxWithAddProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { data: marcas, fetchData: refetchMarcas } = useSupabaseTable('marcas')
  const { toast } = useToast()

  // Hook para centralização inteligente do dialog (igual ao de Material/Equipamento)
  const addDialogPosition = useCenteredDialog(isAddDialogOpen)

  // Filter active brands and apply search
  const activeMarcas = marcas?.filter(marca => marca.ativo) || []
  const filteredMarcas = activeMarcas.filter(marca => 
    marca.nome.toLowerCase().includes(searchValue.toLowerCase())
  )

  // Get selected brand name
  const selectedMarca = activeMarcas.find(marca => marca.id === value)

  const handleCreateMarca = async (data: MarcaFormData) => {
    try {
      const { data: newMarca, error } = await supabase
        .from('marcas')
        .insert([data])
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Marca criada com sucesso!',
      })

      // Refresh the list
      await refetchMarcas()
      
      // Select the new brand
      onValueChange(newMarca.id)
      
      // Close dialogs
      setIsAddDialogOpen(false)
      setOpen(false)
    } catch (error) {
      console.error('Error creating marca:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar marca',
        variant: 'destructive',
      })
    }
  }

  const handleSelectMarca = (marcaId: string) => {
    onValueChange(marcaId)
    setOpen(false)
  }

  const handleOpenAddDialog = () => {
    setIsAddDialogOpen(true)
    setOpen(false)
  }

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
            {selectedMarca ? selectedMarca.nome : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar marca..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 p-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma marca encontrada.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddDialog}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Criar nova marca
                  </Button>
                </div>
              </CommandEmpty>
              
              <CommandGroup>
                {/* Add new brand option */}
                <CommandItem
                  onSelect={handleOpenAddDialog}
                  className="flex items-center gap-2 border-b"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium text-primary">Criar nova marca</span>
                </CommandItem>
                
                {/* Existing brands */}
                {filteredMarcas.map((marca) => (
                  <CommandItem
                    key={marca.id}
                    value={marca.id}
                    onSelect={() => handleSelectMarca(marca.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === marca.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{marca.nome}</span>
                      {marca.descricao && (
                        <span className="text-xs text-muted-foreground">
                          {marca.descricao}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add New Brand Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent 
          className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto items-start fixed"
          style={{
            top: addDialogPosition.top,
            left: addDialogPosition.left,
            transform: addDialogPosition.transform
          }}
        >
          <DialogHeader>
            <DialogTitle>Nova Marca</DialogTitle>
            <DialogDescription>
              Crie uma nova marca para ser utilizada nos materiais e equipamentos.
            </DialogDescription>
          </DialogHeader>
          <MarcaForm
            onSubmit={handleCreateMarca}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
