import React from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Padrão único de carregamento, vazio e erro.
 *
 * O PRD pede skeleton no lugar dos spinners — havia pelo menos 2 estilos
 * diferentes de spinner espalhados pelos módulos.
 */

interface EmptyStateProps {
  titulo: string
  descricao?: string
  icone?: React.ElementType
  acao?: React.ReactNode
  className?: string
}

export const EmptyState = ({
  titulo,
  descricao,
  icone: Icone = Inbox,
  acao,
  className,
}: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
    <Icone className="h-10 w-10 text-muted-foreground/60" aria-hidden />
    <div className="space-y-1">
      <p className="text-ds-section">{titulo}</p>
      {descricao && <p className="text-ds-body max-w-md text-muted-foreground">{descricao}</p>}
    </div>
    {acao}
  </div>
)

interface ErrorStateProps {
  titulo?: string
  descricao?: string
  onTentarNovamente?: () => void
  className?: string
}

export const ErrorState = ({
  titulo = 'Não foi possível carregar',
  descricao,
  onTentarNovamente,
  className,
}: ErrorStateProps) => (
  <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
    <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
    <div className="space-y-1">
      <p className="text-ds-section">{titulo}</p>
      {descricao && <p className="text-ds-body max-w-md text-muted-foreground">{descricao}</p>}
    </div>
    {onTentarNovamente && (
      <Button variant="outline" size="sm" onClick={onTentarNovamente}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Tentar novamente
      </Button>
    )}
  </div>
)

/** Skeleton de tabela: substitui o spinner de página inteira */
export const TableSkeleton = ({ linhas = 8, colunas = 5 }: { linhas?: number; colunas?: number }) => (
  <div className="space-y-2" aria-busy="true" aria-live="polite">
    <Skeleton className="h-9 w-full" />
    {Array.from({ length: linhas }).map((_, i) => (
      <div key={i} className="flex gap-2">
        {Array.from({ length: colunas }).map((_, j) => (
          <Skeleton key={j} className="h-10 flex-1" />
        ))}
      </div>
    ))}
  </div>
)

/** Skeleton de cards, para o Dashboard e telas mobile */
export const CardsSkeleton = ({ quantidade = 4 }: { quantidade?: number }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
    {Array.from({ length: quantidade }).map((_, i) => (
      <Skeleton key={i} className="h-32 w-full rounded-lg" />
    ))}
  </div>
)
