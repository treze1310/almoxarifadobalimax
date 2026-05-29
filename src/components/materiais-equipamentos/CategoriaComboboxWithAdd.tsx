import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'

interface CategoriaComboboxWithAddProps {
  /** Nome da categoria selecionada (gravado na coluna `categoria`) */
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CategoriaComboboxWithAdd({
  value,
  onValueChange,
  placeholder = 'Selecione o tipo...',
  disabled = false,
}: CategoriaComboboxWithAddProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [creating, setCreating] = useState(false)
  const { data: categorias, fetchData: refetchCategorias } = useSupabaseTable('categorias')
  const { toast } = useToast()

  const activeCategorias = (categorias || []).filter((c) => c.ativo)
  const filtered = activeCategorias.filter((c) =>
    c.nome.toLowerCase().includes(searchValue.toLowerCase()),
  )

  const termo = searchValue.trim()
  const jaExiste = activeCategorias.some(
    (c) => c.nome.toLowerCase() === termo.toLowerCase(),
  )

  const handleSelect = (nome: string) => {
    onValueChange(nome)
    setOpen(false)
    setSearchValue('')
  }

  const handleCreate = async (nome: string) => {
    const limpo = nome.trim()
    if (!limpo) return
    setCreating(true)
    try {
      const { data: nova, error } = await supabase
        .from('categorias')
        .insert([{ nome: limpo }])
        .select()
        .single()

      if (error) throw error

      toast({ title: 'Sucesso', description: `Categoria "${limpo}" criada!` })
      await refetchCategorias()
      onValueChange(nova.nome)
      setOpen(false)
      setSearchValue('')
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message?.includes('duplicate')
          ? 'Já existe uma categoria com esse nome.'
          : 'Erro ao criar categoria',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10001]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ou digitar nova..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {termo ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => handleCreate(termo)}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>
                    Adicionar <span className="font-medium">"{termo}"</span>
                  </span>
                </button>
              ) : (
                <span className="block py-4 text-center text-sm text-muted-foreground">
                  Digite para buscar ou criar.
                </span>
              )}
            </CommandEmpty>

            <CommandGroup>
              {/* Opção de adicionar quando o termo digitado não existe ainda */}
              {termo && !jaExiste && (
                <CommandItem
                  value={`__add__${termo}`}
                  onSelect={() => handleCreate(termo)}
                  className="flex items-center gap-2 border-b text-primary"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    Adicionar "{termo}"
                  </span>
                </CommandItem>
              )}

              {filtered.map((categoria) => (
                <CommandItem
                  key={categoria.id}
                  value={categoria.nome}
                  onSelect={() => handleSelect(categoria.nome)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === categoria.nome ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{categoria.nome}</span>
                    {categoria.descricao && (
                      <span className="text-xs text-muted-foreground">
                        {categoria.descricao}
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
  )
}
