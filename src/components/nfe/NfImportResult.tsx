import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NFeImportBatch } from '@/types'
import { CheckCircle, XCircle, AlertTriangle, FilePlus, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

interface NfImportResultProps {
  result: Omit<NFeImportBatch, 'id' | 'importDate' | 'user'>
  onStartNewImport: () => void
}

export const NfImportResult = ({
  result,
  onStartNewImport,
}: NfImportResultProps) => {
  return (
    <Card className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Importação Concluída
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-muted rounded-lg">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{result.successCount}</p>
            <p className="text-sm text-muted-foreground">Importadas</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {result.totalFiles - result.successCount - result.errorCount}
            </p>
            <p className="text-sm text-muted-foreground">Com Avisos</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold">{result.errorCount}</p>
            <p className="text-sm text-muted-foreground">Com Erros</p>
          </div>
        </div>
        {/* O saldo não entra aqui: quem move estoque é o lançamento, depois
            da conferência. Sem dizer isso, o item fica com saldo zero e
            parece que a importação falhou. */}
        {result.successCount > 0 && (
          <div className="rounded-md border border-status-pendente/30 bg-status-pendente/10 px-4 py-3 text-ds-body">
            <p className="font-medium">A quantidade ainda não entrou no estoque.</p>
            <p className="text-ds-caption text-muted-foreground">
              Confira a nota item a item e lance no estoque: é o lançamento que gera a
              movimentação de entrada e, nos equipamentos, as unidades numeradas. Até lá, o
              item fica com o saldo que já tinha.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Button asChild>
            <Link to="/nfe/historico">
              <PackageCheck className="mr-2 h-4 w-4" />
              Conferir e lançar no estoque
            </Link>
          </Button>
          <Button variant="outline" onClick={onStartNewImport}>
            <FilePlus className="mr-2 h-4 w-4" />
            Nova Importação
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
