import { useCallback, useEffect, useMemo, useState } from 'react'
import { contar } from '@/lib/plural'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  FileText,
  HardHat,
  Loader2,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { supabase } from '@/lib/supabase'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { cn } from '@/lib/utils'

/**
 * Central de notificações (RF-19).
 *
 * Os alertas não ficam guardados numa tabela própria: são derivados do estado
 * atual pela função `alertas_do_usuario()`, que já filtra pelo que o perfil
 * pode ler. Assim um alerta some sozinho quando o motivo dele deixa de
 * existir — repôs o estoque, a nota foi lançada — sem ninguém precisar
 * limpar nada. O que se guarda é só o que cada pessoa já leu.
 */

interface Alerta {
  chave: string
  tipo: 'estoque' | 'compras' | 'nfe' | 'epi'
  severidade: 'alta' | 'media'
  titulo: string
  descricao: string | null
  destino: string | null
  em: string | null
  lido: boolean
}

const ICONES = {
  estoque: Package,
  compras: ShoppingCart,
  nfe: FileText,
  epi: HardHat,
} as const

/** De quanto em quanto tempo a lista é refeita, com a aba aberta */
const INTERVALO_MS = 5 * 60 * 1000

export const CentralNotificacoes = () => {
  const navigate = useNavigate()
  const { usuario } = usePermissoes()

  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [carregando, setCarregando] = useState(false)
  const [aberta, setAberta] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const { data } = await supabase.rpc('alertas_do_usuario')
      setAlertas((data as Alerta[]) ?? [])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!usuario?.id) return
    carregar()
    const id = setInterval(carregar, INTERVALO_MS)
    return () => clearInterval(id)
  }, [carregar, usuario?.id])

  const naoLidos = useMemo(() => alertas.filter((a) => !a.lido), [alertas])

  const marcarLido = async (chaves: string[]) => {
    if (!usuario?.id || chaves.length === 0) return

    // Otimista: a lista responde na hora, e o banco confirma depois
    setAlertas((atuais) =>
      atuais.map((a) => (chaves.includes(a.chave) ? { ...a, lido: true } : a)),
    )

    await supabase
      .from('alertas_lidos')
      .upsert(
        chaves.map((chave) => ({ usuario_id: usuario.id, chave })),
        { onConflict: 'usuario_id,chave' },
      )
  }

  const abrir = async (alerta: Alerta) => {
    await marcarLido([alerta.chave])
    setAberta(false)
    if (alerta.destino) navigate(alerta.destino)
  }

  if (!usuario?.id) return null

  return (
    <Popover open={aberta} onOpenChange={setAberta}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            naoLidos.length > 0
              ? `Notificações: ${contar(naoLidos.length, 'não lida', 'não lidas')}`
              : 'Notificações'
          }
        >
          <Bell className="h-5 w-5" />
          {naoLidos.length > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
                naoLidos.some((a) => a.severidade === 'alta')
                  ? 'bg-destructive'
                  : 'bg-status-pendente',
              )}
            >
              {naoLidos.length > 9 ? '9+' : naoLidos.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-ds-body font-medium">Notificações</span>
          <div className="flex items-center gap-1">
            {carregando && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {naoLidos.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => marcarLido(naoLidos.map((a) => a.chave))}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {alertas.length === 0 ? (
            <p className="px-3 py-10 text-center text-ds-body text-muted-foreground">
              {carregando ? 'Carregando…' : 'Nada pendente por aqui.'}
            </p>
          ) : (
            <ul className="divide-y">
              {alertas.map((alerta) => {
                const Icone = ICONES[alerta.tipo] ?? Bell
                return (
                  <li key={alerta.chave}>
                    <button
                      type="button"
                      onClick={() => abrir(alerta)}
                      className={cn(
                        'flex w-full gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
                        alerta.lido && 'opacity-55',
                      )}
                    >
                      <Icone
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          alerta.severidade === 'alta'
                            ? 'text-destructive'
                            : 'text-status-pendente',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-ds-body font-medium leading-snug">
                          {alerta.titulo}
                        </span>
                        {alerta.descricao && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {alerta.descricao}
                          </span>
                        )}
                      </span>
                      {!alerta.lido && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default CentralNotificacoes
