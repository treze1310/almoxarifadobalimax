import { useState, useEffect } from 'react'
import { Search, Building2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSupabaseTable } from '@/hooks/useSupabase'
import type { Tables } from '@/types/database'
import { cn } from '@/lib/utils'
import { getCentroCustoDisplayName, getCentroCustoFullText } from '@/utils/centroCustoUtils'

interface CentroCustoSelectorProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
}

type CentroCustoComEmpresa = Tables<'centros_custo'> & {
  empresas?: { nome: string } | null
}

export function CentroCustoSelector({ 
  value, 
  onChange, 
  placeholder = "Selecione um centro de custo",
  label = "Centro de Custo",
  disabled = false 
}: CentroCustoSelectorProps) {
  const [centrosCusto, setCentrosCusto] = useState<CentroCustoComEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load centros de custo with empresa data
  useEffect(() => {
    const loadCentrosCusto = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('centros_custo')
          .select(`
            *,
            empresas:empresa_id(nome)
          `)
          .eq('ativo', true)
          .order('codigo', { ascending: true })
        
        if (error) {
          console.error('Error loading centros de custo:', error)
        } else {
          setCentrosCusto(data || [])
        }
      } catch (err) {
        console.error('Exception loading centros de custo:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCentrosCusto()
  }, [])

  // Ensure centrosCusto is an array and filter only active cost centers
  const activeCentrosCusto = centrosCusto.filter(cc => cc.ativo)

  // Filter based on search term
  const filteredCentrosCusto = activeCentrosCusto.filter(cc => {
    const searchLower = searchTerm.toLowerCase()
    const empresaNome = cc.empresas?.nome || ''
    const descricao = cc.descricao || ''
    
    return cc.codigo.toLowerCase().includes(searchLower) ||
           empresaNome.toLowerCase().includes(searchLower) ||
           descricao.toLowerCase().includes(searchLower)
  })

  // Debug logging - for troubleshooting
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('CentroCustoSelector Debug:', {
        loading,
        centrosCustoLength: centrosCusto?.length || 0,
        activeDataLength: activeCentrosCusto.length,
        filteredDataLength: filteredCentrosCusto.length
      })
    }
  }, [loading, centrosCusto, activeCentrosCusto.length, filteredCentrosCusto.length])

  // Find selected cost center
  const selectedCentroCusto = activeCentrosCusto.find(cc => cc.id === value)

  const handleSelect = (centroCusto: CentroCustoComEmpresa) => {
    onChange(centroCusto.id)
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
  }

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedCentroCusto && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {selectedCentroCusto ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{selectedCentroCusto.codigo}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCentroCusto.empresas?.nome || 'Sem empresa'}
                  </Badge>
                </div>
                {selectedCentroCusto.descricao && (
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedCentroCusto.descricao}
                  </span>
                )}
              </div>
            ) : (
              placeholder
            )}
          </div>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar {label}</DialogTitle>
          <DialogDescription>
            Pesquise e selecione o centro de custo desejado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por código, empresa ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <ScrollArea className="h-[400px] w-full border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Carregando centros de custo...
                    </TableCell>
                  </TableRow>
                ) : filteredCentrosCusto.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Nenhum centro de custo encontrado com essa pesquisa.' : activeCentrosCusto.length === 0 ? 'Nenhum centro de custo ativo encontrado.' : 'Digite para pesquisar centros de custo.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCentrosCusto.map((centroCusto) => (
                    <TableRow 
                      key={centroCusto.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        centroCusto.id === value && "bg-muted"
                      )}
                      onClick={() => handleSelect(centroCusto)}
                    >
                      <TableCell className="font-mono">
                        <Badge variant={centroCusto.id === value ? "default" : "outline"}>
                          {centroCusto.codigo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {centroCusto.id === value && <Check className="h-4 w-4 text-green-600" />}
                          <span>{centroCusto.empresas?.nome || 'Sem empresa'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {centroCusto.descricao || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={centroCusto.id === value ? "default" : "ghost"}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelect(centroCusto)
                          }}
                        >
                          {centroCusto.id === value ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            "Selecionar"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!selectedCentroCusto}
            >
              Limpar Seleção
            </Button>
            <div className="text-sm text-muted-foreground">
              {filteredCentrosCusto.length} centro(s) de custo encontrado(s)
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}