import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Layout de formulário do design system: grid de 12 colunas e seções
 * numeradas, conforme o PRD. Substitui os agrupamentos ad hoc que cada
 * formulário montava do seu jeito.
 */

interface FormSectionProps {
  /** Número da seção, exibido no marcador à esquerda do título */
  numero: number
  titulo: string
  descricao?: string
  children: React.ReactNode
  className?: string
}

export const FormSection = ({
  numero,
  titulo,
  descricao,
  children,
  className,
}: FormSectionProps) => (
  <Card className={className}>
    <CardContent className="space-y-4 p-6">
      <div className="flex items-start gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-ds-body font-semibold text-primary"
          aria-hidden
        >
          {numero}
        </span>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-ds-section">{titulo}</h2>
          {descricao && <p className="text-ds-body text-muted-foreground">{descricao}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">{children}</div>
    </CardContent>
  </Card>
)

/**
 * Campo dentro da grade. `span` é a largura em colunas de 12 no desktop;
 * no mobile todo campo ocupa a linha inteira.
 */
export const FormField = ({
  span = 6,
  children,
  className,
}: {
  span?: 3 | 4 | 6 | 8 | 9 | 12
  children: React.ReactNode
  className?: string
}) => {
  const larguras = {
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    6: 'md:col-span-6',
    8: 'md:col-span-8',
    9: 'md:col-span-9',
    12: 'md:col-span-12',
  } as const

  return <div className={cn('col-span-1', larguras[span], className)}>{children}</div>
}

/** Barra de ações do formulário, fixa ao final da página */
export const FormActions = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur',
      className,
    )}
  >
    {children}
  </div>
)

export default FormSection
