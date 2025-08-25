import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NFeImportBatch } from '@/types'
import { CheckCircle, XCircle, AlertTriangle, FilePlus } from 'lucide-react'
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
        <div className="flex justify-center space-x-4 pt-4">
          <Button onClick={onStartNewImport}>
            <FilePlus className="mr-2 h-4 w-4" />
            Nova Importação
          </Button>
          <Button variant="outline" asChild>
            <Link to="/nfe/historico">Ver Histórico</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
