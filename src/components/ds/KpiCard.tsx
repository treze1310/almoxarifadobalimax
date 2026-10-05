import React from 'react'
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  rotulo: string
  valor: string | number
  detalhe?: string
  icone?: React.ElementType
  /**
   * Variação percentual sobre o período anterior. `null` ou `undefined`
   * significa "sem base de comparação" e **nada é exibido** — o PRD proíbe
   * indicador inventado (RF-01).
   */
  variacao?: number | null
  /** Para onde o card leva: a lista já filtrada pelo que ele mostra */
  link?: string
  carregando?: boolean
  /** Realça o card quando o número exige atenção (ex.: estoque crítico) */
  tom?: 'neutro' | 'atencao' | 'critico'
  className?: string
}

const tons = {
  neutro: 'text-muted-foreground',
  atencao: 'text-status-pendente',
  critico: 'text-destructive',
} as const

export const KpiCard = ({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  variacao,
  link,
  carregando = false,
  tom = 'neutro',
  className,
}: KpiCardProps) => {
  const conteudo = (
    <Card
      className={cn(
        'h-full transition-colors',
        link && 'cursor-pointer hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-ds-body font-medium text-muted-foreground">{rotulo}</p>
            {carregando ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{valor}</p>
            )}
            {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
          </div>
          {Icone && (
            <span className="rounded-full bg-muted p-3">
              <Icone className={cn('h-5 w-5', tons[tom])} aria-hidden />
            </span>
          )}
        </div>

        {variacao !== null && variacao !== undefined && !carregando && (
          <div className="mt-4 flex items-center gap-2">
            {variacao >= 0 ? (
              <TrendingUp className="h-4 w-4 text-status-concluido" aria-hidden />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" aria-hidden />
            )}
            <span
              className={cn(
                'text-ds-body font-medium',
                variacao >= 0 ? 'text-status-concluido' : 'text-destructive',
              )}
            >
              {variacao >= 0 ? '+' : ''}
              {variacao.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (!link) return conteudo
  return (
    <Link to={link} className="block focus:outline-none">
      {conteudo}
    </Link>
  )
}

export default KpiCard
