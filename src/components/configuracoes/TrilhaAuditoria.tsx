import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, RefreshCw } from 'lucide-react'
import { consultarAuditoria, type EntradaAuditoria } from '@/services/auditoriaService'

const ROTULOS: Record<string, string> = {
  'solicitacao.aprovar': 'Solicitação aprovada',
  'solicitacao.rejeitar': 'Solicitação rejeitada',
  'solicitacao.concluir': 'Solicitação concluída',
  'solicitacao.cancelar': 'Solicitação cancelada',
  'solicitacao.excluir': 'Solicitação excluída',
  'material.criar': 'Material criado',
  'material.editar': 'Material editado',
  'material.excluir': 'Material excluído',
  'estoque.movimentar': 'Estoque movimentado',
  'usuario.criar': 'Usuário criado',
  'usuario.excluir': 'Usuário excluído',
  'usuario.perfil_alterado': 'Perfil do usuário alterado',
  'usuario.senha_redefinida': 'Senha redefinida',
  'usuario.status_alterado': 'Status do usuário alterado',
  'perfil.permissoes_alteradas': 'Permissões do perfil alteradas',
  'seguranca.acesso_negado': 'Acesso negado',
  'colaborador.cpf_consultado': 'CPF completo consultado',
  'romaneio.cancelar': 'Romaneio cancelado',
  'nfe.conferir': 'NF-e conferida',
  'nfe.lancar_estoque': 'NF-e lançada no estoque',
  'romaneio.retirada_assistida': 'Retirada assistida concluída',
  'solicitacoes.reposicao_automatica': 'Solicitação de reposição automática',
}

const destrutiva = (acao: string) =>
  acao.endsWith('.excluir') ||
  acao.endsWith('.rejeitar') ||
  acao.endsWith('.cancelar') ||
  acao === 'seguranca.acesso_negado'

export const TrilhaAuditoria = () => {
  const [entradas, setEntradas] = useState<EntradaAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await consultarAuditoria(200)
    setEntradas(data)
    setErro(error)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Trilha de Auditoria</CardTitle>
          <CardDescription>
            Registro de quem executou as ações sensíveis do sistema. Os registros não podem ser
            alterados nem apagados.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : erro ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Não foi possível carregar a trilha: {erro}
          </p>
        ) : entradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma ação registrada ainda. A partir de agora, aprovações, exclusões, movimentações
            de estoque e alterações de usuários e perfis aparecem aqui.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Quando</TableHead>
                  <TableHead className="min-w-[180px]">Quem</TableHead>
                  <TableHead className="min-w-[200px]">Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="py-2 text-xs">
                      {new Date(e.timestamp).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-sm">{e.usuarios?.nome || 'Desconhecido'}</div>
                      <div className="text-xs text-muted-foreground">{e.usuarios?.email}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={destrutiva(e.acao) ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {ROTULOS[e.acao] || e.acao}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {e.dados_novos || e.dados_anteriores ? (
                        <code className="text-xs text-muted-foreground">
                          {JSON.stringify(e.dados_novos ?? e.dados_anteriores).slice(0, 120)}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TrilhaAuditoria
