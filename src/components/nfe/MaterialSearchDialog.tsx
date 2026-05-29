import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, Package } from 'lucide-react'

export interface MatchedMaterial {
  id: string
  codigo: string
  nome: string
  estoque_atual: number
  unidade_medida: string | null
  tipo: string | null
  categoria: string | null
}

interface MaterialSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Texto inicial da busca (geralmente a descrição do item da NFe) */
  initialSearch?: string
  onSelect: (material: MatchedMaterial) => void
}

export const MaterialSearchDialog = ({
  open,
  onOpenChange,
  initialSearch = '',
  onSelect,
}: MaterialSearchDialogProps) => {
  const [search, setSearch] = useState(initialSearch)
  const [results, setResults] = useState<MatchedMaterial[]>([])
  const [loading, setLoading] = useState(false)

  // Resetar busca ao abrir
  useEffect(() => {
    if (open) {
      setSearch(initialSearch)
    }
  }, [open, initialSearch])

  const runSearch = useCallback(async (term: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('materiais_equipamentos')
        .select('id, codigo, nome, estoque_atual, unidade_medida, tipo, categoria')
        .eq('ativo', true)
        .order('nome', { ascending: true })
        .limit(50)

      const trimmed = term.trim()
      if (trimmed) {
        query = query.or(
          `codigo.ilike.%${trimmed}%,nome.ilike.%${trimmed}%,descricao.ilike.%${trimmed}%`,
        )
      }

      const { data, error } = await query
      if (error) throw error
      setResults(
        (data || []).map((m) => ({
          id: m.id,
          codigo: m.codigo,
          nome: m.nome,
          estoque_atual: m.estoque_atual ?? 0,
          unidade_medida: m.unidade_medida,
          tipo: m.tipo ?? null,
          categoria: m.categoria ?? null,
        })),
      )
    } catch (error) {
      console.error('Erro ao buscar materiais:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar com debounce sempre que o termo mudar (e o dialog estiver aberto)
  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => runSearch(search), 300)
    return () => clearTimeout(handle)
  }, [search, open, runSearch])

  const handleSelect = (material: MatchedMaterial) => {
    onSelect(material)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular a material/equipamento existente</DialogTitle>
          <DialogDescription>
            Selecione um item já cadastrado. O estoque dele será somado à
            quantidade desta nota na importação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center border rounded-md px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nome ou descrição..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
        </div>

        <ScrollArea className="h-[320px] -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              Nenhum material encontrado.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => handleSelect(material)}
                  className="w-full text-left flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{material.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: {material.codigo}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Estoque: {material.estoque_atual}
                    {material.unidade_medida ? ` ${material.unidade_medida}` : ''}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
