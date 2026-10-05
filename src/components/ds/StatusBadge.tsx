import { cn } from '@/lib/utils'
import { STATUS, normalizarStatus, rotuloStatus } from '@/lib/status'

interface StatusBadgeProps {
  status: string | null | undefined
  /** Gênero do documento: romaneio (masculino) ou solicitação (feminino) */
  genero?: 'masculino' | 'feminino'
  className?: string
}

/**
 * Badge de status do design system. Lê o mapa central em `src/lib/status.ts` —
 * nenhum módulo define cor de status por conta própria.
 */
export const StatusBadge = ({ status, genero = 'masculino', className }: StatusBadgeProps) => {
  const chave = normalizarStatus(status)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-control)] border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        chave
          ? STATUS[chave].classe
          : 'bg-muted text-muted-foreground border-border',
        className,
      )}
    >
      {rotuloStatus(status, genero)}
    </span>
  )
}

export default StatusBadge
