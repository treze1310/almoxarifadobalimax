import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from '@/components/ds/StatusBadge'

export interface AbaDrawer {
  id: string
  rotulo: string
  conteudo: React.ReactNode
  /** Some quando false — útil para abas que dependem de permissão */
  visivel?: boolean
}

interface DetailDrawerProps {
  aberto: boolean
  onFechar: () => void
  /** Número ou código do documento, exibido no cabeçalho */
  titulo: string
  descricao?: string
  status?: string | null
  generoStatus?: 'masculino' | 'feminino'
  abas: AbaDrawer[]
  /** Barra de ações do rodapé, montada conforme permissão e status */
  acoes?: React.ReactNode
  largura?: 'md' | 'lg' | 'xl'
}

const larguras = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
} as const

/**
 * Painel lateral de detalhe. Abrir um registro mantém a lista visível, em vez
 * de trocar de página ou abrir um modal grande — princípio do PRD.
 */
export const DetailDrawer = ({
  aberto,
  onFechar,
  titulo,
  descricao,
  status,
  generoStatus = 'masculino',
  abas,
  acoes,
  largura = 'lg',
}: DetailDrawerProps) => {
  const abasVisiveis = abas.filter((aba) => aba.visivel !== false)

  return (
    <Sheet open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <SheetContent side="right" className={`${larguras[largura]} flex w-full flex-col gap-4 p-0`}>
        <SheetHeader className="space-y-2 border-b p-6 pb-4 text-left">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-ds-section">{titulo}</SheetTitle>
            {status && <StatusBadge status={status} genero={generoStatus} />}
          </div>
          {descricao && <SheetDescription>{descricao}</SheetDescription>}
        </SheetHeader>

        {abasVisiveis.length > 1 ? (
          <Tabs defaultValue={abasVisiveis[0].id} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-6 w-auto self-start">
              {abasVisiveis.map((aba) => (
                <TabsTrigger key={aba.id} value={aba.id}>
                  {aba.rotulo}
                </TabsTrigger>
              ))}
            </TabsList>
            {abasVisiveis.map((aba) => (
              <TabsContent key={aba.id} value={aba.id} className="min-h-0 flex-1">
                <ScrollArea className="h-full px-6 pb-6">{aba.conteudo}</ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
            {abasVisiveis[0]?.conteudo}
          </ScrollArea>
        )}

        {acoes && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 p-4">
            {acoes}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default DetailDrawer
