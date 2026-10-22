import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ehErroDeChunk, recarregarSeForErroDeChunk } from '@/lib/erroDeChunk'

interface Props {
  children: React.ReactNode
}

interface State {
  erro: Error | null
}

/**
 * Captura erros de render em qualquer tela. Sem isto, uma exceção derruba a
 * aplicação inteira para tela branca, sem nenhuma mensagem ao usuário.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    // Depois de um deploy, a aba antiga não acha mais o arquivo da tela que
    // está abrindo. Não é erro desta tela e recarregar resolve — uma vez só.
    if (recarregarSeForErroDeChunk(erro)) return

    console.error('[ErrorBoundary] erro não tratado:', erro, info.componentStack)
  }

  private recarregar = () => {
    this.setState({ erro: null })
    window.location.reload()
  }

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Algo deu errado nesta tela</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {ehErroDeChunk(erro)
              ? 'O sistema foi atualizado enquanto esta aba estava aberta. Recarregue para pegar a versão nova.'
              : 'O erro foi registrado no console do navegador. Você pode recarregar a página e tentar novamente — seus dados não foram perdidos.'}
          </p>
        </div>
        <details className="max-w-xl text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Detalhes técnicos
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded border bg-muted p-2 text-left text-xs">
            {erro.message}
          </pre>
        </details>
        <Button onClick={this.recarregar} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Recarregar
        </Button>
      </div>
    )
  }
}

export default ErrorBoundary
