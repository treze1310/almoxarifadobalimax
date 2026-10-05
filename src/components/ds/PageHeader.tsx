import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Migalha {
  label: string
  href?: string
}

interface PageHeaderProps {
  titulo: string
  descricao?: string
  migalhas?: Migalha[]
  /** Ação primária fica à direita, conforme o molde de página do PRD */
  acoes?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho único de página: breadcrumb → título → descrição → ações.
 *
 * Existia para resolver os "títulos de página com 3 tamanhos e recuos
 * diferentes" apontados no PRD. Toda tela deve usar este componente.
 */
export const PageHeader = ({
  titulo,
  descricao,
  migalhas,
  acoes,
  className,
}: PageHeaderProps) => (
  <div className={cn('space-y-3', className)}>
    {migalhas && migalhas.length > 0 && (
      <nav aria-label="Trilha de navegação" className="flex items-center gap-1 text-xs text-muted-foreground">
        {migalhas.map((migalha, i) => (
          <span key={`${migalha.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
            {migalha.href ? (
              <Link to={migalha.href} className="hover:text-foreground hover:underline">
                {migalha.label}
              </Link>
            ) : (
              <span className="text-foreground">{migalha.label}</span>
            )}
          </span>
        ))}
      </nav>
    )}

    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-ds-page truncate">{titulo}</h1>
        {descricao && <p className="text-ds-body text-muted-foreground">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  </div>
)

export default PageHeader
