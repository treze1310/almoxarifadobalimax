'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ComboboxOption {
  value: string
  label: string
}

export interface CustomItem {
  descricao: string
  unidade_medida?: string
  codigo?: string
}

interface ComboboxWithCustomProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  onCustomItemAdd: (item: CustomItem) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
  disabled?: boolean
  allowCustom?: boolean
}

export const ComboboxWithCustom = ({
  options,
  value,
  onChange,
  onCustomItemAdd,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyPlaceholder = 'No options found.',
  disabled = false,
  allowCustom = true,
}: ComboboxWithCustomProps) => {
  const [open, setOpen] = React.useState(false)
  const [customDialogOpen, setCustomDialogOpen] = React.useState(false)
  const [customItem, setCustomItem] = React.useState<CustomItem>({
    descricao: '',
    unidade_medida: '',
    codigo: ''
  })

  const selectedOption = options.find((option) => option.value === value)

  const handleCustomItemSubmit = () => {
    if (customItem.descricao.trim()) {
      onCustomItemAdd(customItem)
      setCustomItem({ descricao: '', unidade_medida: '', codigo: '' })
      setCustomDialogOpen(false)
      setOpen(false)
    }
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
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>
                <div className="text-center p-2">
                  <p className="text-sm text-muted-foreground mb-2">{emptyPlaceholder}</p>
                  {allowCustom && (
                    <Button
                      size="sm"
                      onClick={() => setCustomDialogOpen(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item Avulso
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? '' : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
                {allowCustom && options.length > 0 && (
                  <CommandItem onSelect={() => setCustomDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Item Avulso
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Item Avulso</DialogTitle>
            <DialogDescription>
              Adicione um item que não está cadastrado no estoque. Este item será usado apenas nesta requisição.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={customItem.descricao}
                onChange={(e) => setCustomItem({ ...customItem, descricao: e.target.value })}
                placeholder="Digite a descrição do item..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={customItem.codigo}
                  onChange={(e) => setCustomItem({ ...customItem, codigo: e.target.value })}
                  placeholder="Ex: AVL001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Input
                  id="unidade"
                  value={customItem.unidade_medida}
                  onChange={(e) => setCustomItem({ ...customItem, unidade_medida: e.target.value })}
                  placeholder="Ex: UN, KG, M"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCustomDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCustomItemSubmit}
              disabled={!customItem.descricao.trim()}
            >
              Adicionar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}