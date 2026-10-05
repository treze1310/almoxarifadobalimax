import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc' | null

export interface ColumnFilterProps {
  /** Nome da coluna, exibido no topo do popover */
  title: string
  /** Valores distintos disponíveis para seleção */
  options: string[]
  /** Valores selecionados. Lista vazia = todos */
  selected: string[]
  onSelectedChange: (values: string[]) => void
  /** Ordenação opcional desta coluna */
  sortDirection?: SortDirection
  onSortChange?: (direction: SortDirection) => void
  className?: string
}

/**
 * Filtro de coluna no estilo planilha (Excel): lista de valores distintos com
 * busca, marcar/desmarcar todos e ordenação crescente/decrescente.
 */
export const ColumnFilter = ({
  title,
  options,
  selected,
  onSelectedChange,
  sortDirection = null,
  onSortChange,
  className,
}: ColumnFilterProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const isActive = selected.length > 0
  const visibleOptions = useMemo(() => {
    if (query === '') return options
    const q = query.toLowerCase()
    return options.filter((option) => option.toLowerCase().includes(q))
  }, [options, query])

  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((option) => selected.includes(option))

  const toggleOption = (option: string) => {
    onSelectedChange(
      selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option]
    )
  }

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      onSelectedChange(selected.filter((value) => !visibleOptions.includes(value)))
    } else {
      onSelectedChange(Array.from(new Set([...selected, ...visibleOptions])))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Filtrar ${title}`}
          className={cn(
            'h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground',
            (isActive || sortDirection) && 'text-primary',
            className
          )}
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : sortDirection === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <Filter className={cn('h-3.5 w-3.5', isActive && 'fill-current')} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{title}</span>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onSelectedChange([])}
            >
              <X className="mr-1 h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>

        {onSortChange && (
          <div className="flex gap-1 border-b px-2 py-1.5">
            <Button
              variant={sortDirection === 'asc' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 flex-1 justify-start text-xs"
              onClick={() => onSortChange(sortDirection === 'asc' ? null : 'asc')}
            >
              <ArrowUp className="mr-1 h-3 w-3" />
              Crescente
            </Button>
            <Button
              variant={sortDirection === 'desc' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 flex-1 justify-start text-xs"
              onClick={() => onSortChange(sortDirection === 'desc' ? null : 'desc')}
            >
              <ArrowDown className="mr-1 h-3 w-3" />
              Decrescente
            </Button>
          </div>
        )}

        <div className="p-2">
          <Input
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <ScrollArea className="max-h-60 overflow-y-auto px-2 pb-2">
          {visibleOptions.length > 0 ? (
            <div className="space-y-1">
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs font-medium hover:bg-muted">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleAllVisible}
                />
                (Selecionar todos)
              </label>
              {visibleOptions.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted"
                >
                  <Checkbox
                    checked={selected.includes(option)}
                    onCheckedChange={() => toggleOption(option)}
                  />
                  <span className="truncate" title={option}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              Nenhum valor encontrado
            </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default ColumnFilter
