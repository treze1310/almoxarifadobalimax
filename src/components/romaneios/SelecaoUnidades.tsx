import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/lib/supabase'
import { contar } from '@/lib/plural'
import { cn } from '@/lib/utils'

/**
 * Escolha de quais peças saem no romaneio.
 *
 * Em equipamento acompanhado peça a peça não basta dizer "1 esmerilhadeira":
 * é preciso dizer qual, porque é essa que volta, que vai para manutenção e que
 * aparece na ficha do colaborador. Só aparecem as peças disponíveis — o que
 * está com outra pessoa não pode sair duas vezes —, mais as que já estão neste
 * romaneio, para a edição não perder o que foi escolhido antes.
 */

export interface UnidadeDisponivel {
  id: string
  codigo: string
  numero_serie: string | null
  patrimonio_anterior: string | null
  status: string
  localizacao?: { codigo: string; nome: string } | null
}

interface SelecaoUnidadesProps {
  materialId: string
  /** Ids das peças já escolhidas nesta linha */
  valor: string[]
  onChange: (ids: string[]) => void
  /** Peças que já estão neste romaneio e devem continuar selecionáveis */
  jaNoRomaneio?: string[]
  /**
   * Peças escolhidas em outra linha do mesmo romaneio. Ficam fora da lista:
   * a mesma peça em duas linhas é recusada pelo banco, e é melhor não deixar
   * escolher do que explicar o erro depois.
   */
  ocupadas?: string[]
  disabled?: boolean
}

export const SelecaoUnidades = ({
  materialId,
  valor,
  onChange,
  jaNoRomaneio = [],
  ocupadas = [],
  disabled = false,
}: SelecaoUnidadesProps) => {
  const [aberto, setAberto] = useState(false)
  const [unidades, setUnidades] = useState<UnidadeDisponivel[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!materialId) {
      setUnidades([])
      return
    }

    setCarregando(true)
    setErro(null)
    try {
      let query = supabase
        .from('material_unidades')
        .select(
          'id, codigo, numero_serie, patrimonio_anterior, status, localizacao:localizacao_id (codigo, nome)',
        )
        .eq('material_equipamento_id', materialId)
        .order('sequencia')

      // Disponíveis, mais as que já saíram neste romaneio (caso de edição)
      query =
        jaNoRomaneio.length > 0
          ? query.or(`status.eq.disponivel,id.in.(${jaNoRomaneio.join(',')})`)
          : query.eq('status', 'disponivel')

      const { data, error } = await query
      if (error) throw error
      setUnidades((data as unknown as UnidadeDisponivel[]) ?? [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar as peças')
      setUnidades([])
    } finally {
      setCarregando(false)
    }
    // jaNoRomaneio é estável por linha; recarregar a cada render travaria o popover
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const alternar = (id: string) => {
    onChange(valor.includes(id) ? valor.filter((v) => v !== id) : [...valor, id])
  }

  const disponiveis = unidades.filter(
    (u) => valor.includes(u.id) || !ocupadas.includes(u.id),
  )
  const escolhidas = unidades.filter((u) => valor.includes(u.id))

  return (
    <div className="space-y-1">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={aberto}
            className="w-full justify-between font-normal"
            disabled={disabled || !materialId}
          >
            <span className="truncate">
              {carregando
                ? 'Carregando peças...'
                : escolhidas.length > 0
                  ? contar(escolhidas.length, 'peça escolhida', 'peças escolhidas')
                  : 'Escolher as peças'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10001]" align="start">
          <Command>
            <CommandInput placeholder="Buscar por número, série ou patrimônio..." />
            <CommandList>
              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {erro ?? 'Nenhuma peça disponível para este item.'}
                  </CommandEmpty>
                  <CommandGroup>
                    {disponiveis.map((unidade) => (
                      <CommandItem
                        key={unidade.id}
                        value={`${unidade.codigo} ${unidade.numero_serie ?? ''} ${unidade.patrimonio_anterior ?? ''}`}
                        onSelect={() => alternar(unidade.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            valor.includes(unidade.id) ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm">{unidade.codigo}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {unidade.numero_serie && `Série ${unidade.numero_serie} · `}
                            {unidade.patrimonio_anterior && `Patrimônio ${unidade.patrimonio_anterior} · `}
                            {unidade.localizacao
                              ? `${unidade.localizacao.codigo} ${unidade.localizacao.nome}`
                              : 'sem localização'}
                          </div>
                        </div>
                        {unidade.status !== 'disponivel' && (
                          <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                            {unidade.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {escolhidas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {escolhidas.map((unidade) => (
            <Badge
              key={unidade.id}
              variant="secondary"
              className="cursor-pointer gap-1 font-mono text-[10px]"
              title="Clique para tirar esta peça do romaneio"
              onClick={() => !disabled && alternar(unidade.id)}
            >
              <Tag className="h-3 w-3" />
              {unidade.codigo}
            </Badge>
          ))}
        </div>
      )}

      {!carregando && disponiveis.length === 0 && (
        <p className="text-xs text-destructive">
          {erro ?? 'Nenhuma peça disponível: todas estão em uso, em manutenção ou ainda não foram cadastradas.'}
        </p>
      )}
    </div>
  )
}

export default SelecaoUnidades
