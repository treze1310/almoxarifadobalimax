import { useEffect, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { reportService } from '@/services/reportService'
import type { ReportRequest } from '@/types/reports'

/**
 * Pré-visualização do relatório (RF-15).
 *
 * Antes disso, a única forma de saber se o filtro estava certo era baixar o
 * PDF e abrir — e descobrir que o período estava errado depois do download.
 * Aqui o relatório aparece na tela como vai sair, e o download é um segundo
 * passo, no formato que a pessoa escolher.
 */

interface PreviaRelatorioDialogProps {
  /** Requisição já montada; `null` fecha o diálogo */
  requisicao: ReportRequest | null
  onFechar: () => void
  /** Baixa no formato escolhido, reaproveitando o fluxo que já existia */
  onBaixar: (formato: 'pdf' | 'excel' | 'csv') => Promise<void> | void
  formatosDisponiveis?: string[]
}

const ICONES: Record<string, typeof FileText> = {
  pdf: FileText,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
}

export const PreviaRelatorioDialog = ({
  requisicao,
  onFechar,
  onBaixar,
  formatosDisponiveis = ['pdf', 'excel', 'csv'],
}: PreviaRelatorioDialogProps) => {
  const [carregando, setCarregando] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [registros, setRegistros] = useState(0)
  const [baixando, setBaixando] = useState<string | null>(null)

  useEffect(() => {
    if (!requisicao) {
      setHtml(null)
      setErro(null)
      setRegistros(0)
      return
    }

    let cancelado = false
    setCarregando(true)
    setErro(null)

    reportService
      .previewReport(requisicao)
      .then((resultado) => {
        if (cancelado) return
        if (!resultado.success) {
          setErro(resultado.error ?? 'Erro ao montar o relatório')
          setHtml(null)
          return
        }
        setHtml(resultado.html ?? null)
        setRegistros(resultado.data?.rows.length ?? 0)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [requisicao])

  const baixar = async (formato: 'pdf' | 'excel' | 'csv') => {
    setBaixando(formato)
    try {
      await onBaixar(formato)
    } finally {
      setBaixando(null)
    }
  }

  return (
    <Dialog open={!!requisicao} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Prévia do relatório
            {registros > 0 && (
              <Badge variant="outline">{registros} registro(s)</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            É assim que o relatório vai sair. Confira o período e os filtros antes de baixar.
          </DialogDescription>
        </DialogHeader>

        {carregando && (
          <div className="flex items-center justify-center gap-2 py-20 text-ds-body text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Montando o relatório…
          </div>
        )}

        {!carregando && erro && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Não foi possível montar o relatório</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {!carregando && !erro && registros === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhum registro no filtro escolhido</AlertTitle>
            <AlertDescription>
              O relatório sairia em branco. Ajuste o período ou os filtros e veja a prévia de novo.
            </AlertDescription>
          </Alert>
        )}

        {!carregando && !erro && html && registros > 0 && (
          // O relatório é um HTML completo, com estilo próprio: o iframe isola
          // o CSS dele do resto da aplicação.
          <iframe
            title="Prévia do relatório"
            srcDoc={html}
            sandbox=""
            className="min-h-[55vh] w-full flex-1 rounded-md border bg-white"
          />
        )}

        <DialogFooter className="flex-wrap">
          <Button variant="outline" onClick={onFechar} disabled={!!baixando}>
            Fechar
          </Button>

          {formatosDisponiveis.map((formato) => {
            const Icone = ICONES[formato] ?? Download
            return (
              <Button
                key={formato}
                variant={formato === 'pdf' ? 'default' : 'outline'}
                onClick={() => baixar(formato as 'pdf' | 'excel' | 'csv')}
                disabled={registros === 0 || !!baixando || carregando || !!erro}
              >
                {baixando === formato ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icone className="mr-2 h-4 w-4" />
                )}
                Baixar {formato.toUpperCase()}
              </Button>
            )
          })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PreviaRelatorioDialog
