import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { LocalizacaoComboboxWithAdd } from '@/components/materiais-equipamentos/LocalizacaoComboboxWithAdd'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { usePermissoes } from '@/contexts/PermissionsContext'

/**
 * Ficha de uma peça (FILHO) do item.
 *
 * O que é da peça e não do cadastro: o número de série do fabricante, o
 * patrimônio antigo, onde ela está e em que estado. O resto — nome, categoria,
 * marca — é do item PAI e se edita lá, uma vez só para todas as peças.
 *
 * Os campos de origem (nota, valor e data de aquisição) ficam só de leitura:
 * vieram do lançamento da NF-e e são o que prova de onde a peça veio.
 */

export interface UnidadeDaTela {
  id: string
  codigo: string
  sequencia: number
  numero_serie: string | null
  patrimonio_anterior: string | null
  status: string
  data_aquisicao: string | null
  valor_aquisicao: number | null
  observacoes: string | null
  localizacao_id?: string | null
  localizacao?: { codigo: string; nome: string } | null
  colaboradores?: { nome: string } | null
  nfe_importacao?: { id: string; numero_nfe: string | null } | null
}

export const STATUS_UNIDADE: Record<string, string> = {
  disponivel: 'Disponível',
  em_uso: 'Em uso',
  manutencao: 'Em manutenção',
  baixado: 'Baixado',
  extraviado: 'Extraviado',
}

interface UnidadeDialogProps {
  unidade: UnidadeDaTela | null
  /** Nome do item PAI, só para situar quem abriu a ficha */
  nomeDoItem?: string
  onOpenChange: (aberto: boolean) => void
  /** Chamado depois de salvar ou excluir, para a lista recarregar */
  onSalvo: () => void
}

export const UnidadeDialog = ({
  unidade,
  nomeDoItem,
  onOpenChange,
  onSalvo,
}: UnidadeDialogProps) => {
  const { toast } = useToast()
  const { can, isAdmin } = usePermissoes()
  const podeEditar = can('materiais', 'update')
  const podeExcluir = isAdmin

  const [numeroSerie, setNumeroSerie] = useState('')
  const [patrimonio, setPatrimonio] = useState('')
  const [status, setStatus] = useState('disponivel')
  const [localizacaoId, setLocalizacaoId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  // Cada peça aberta recomeça com o que está gravado nela
  useEffect(() => {
    if (!unidade) return
    setNumeroSerie(unidade.numero_serie ?? '')
    setPatrimonio(unidade.patrimonio_anterior ?? '')
    setStatus(unidade.status)
    setLocalizacaoId(unidade.localizacao_id ?? '')
    setObservacoes(unidade.observacoes ?? '')
  }, [unidade])

  const salvar = async () => {
    if (!unidade) return

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('material_unidades')
        .update({
          numero_serie: numeroSerie.trim() || null,
          patrimonio_anterior: patrimonio.trim() || null,
          status,
          localizacao_id: localizacaoId || null,
          observacoes: observacoes.trim() || null,
        })
        .eq('id', unidade.id)

      if (error) throw error

      toast({ title: `Peça ${unidade.codigo} salva` })
      onSalvo()
      onOpenChange(false)
    } catch (erro) {
      toast({
        title: 'Erro ao salvar a peça',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!unidade) return

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('material_unidades')
        .delete()
        .eq('id', unidade.id)

      if (error) throw error

      toast({
        title: `Peça ${unidade.codigo} excluída`,
        description: 'O número dela não será reaproveitado nas próximas peças.',
      })
      onSalvo()
      onOpenChange(false)
    } catch (erro) {
      toast({
        title: 'Erro ao excluir a peça',
        description:
          erro instanceof Error
            ? `${erro.message}. Peça que já saiu em romaneio não pode ser excluída — dê baixa nela.`
            : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
      setConfirmandoExclusao(false)
    }
  }

  return (
    <>
      <Dialog open={!!unidade} onOpenChange={onOpenChange}>
        <DialogContent tamanho="md" className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono">{unidade?.codigo}</DialogTitle>
            <DialogDescription>
              {nomeDoItem ? `${nomeDoItem} · peça ${unidade?.sequencia}` : `Peça ${unidade?.sequencia}`}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="unidade-serie">Número de série</Label>
                <Input
                  id="unidade-serie"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  placeholder="O que vem gravado na peça"
                  disabled={!podeEditar}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unidade-patrimonio">Patrimônio anterior</Label>
                <Input
                  id="unidade-patrimonio"
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(e.target.value)}
                  placeholder="Número do sistema antigo"
                  disabled={!podeEditar}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unidade-status">Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={!podeEditar}>
                  <SelectTrigger id="unidade-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {Object.entries(STATUS_UNIDADE).map(([valor, rotulo]) => (
                      <SelectItem key={valor} value={valor}>
                        {rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {unidade?.colaboradores && (
                  <p className="text-xs text-muted-foreground">
                    Hoje está com {unidade.colaboradores.nome}.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Localização</Label>
                <LocalizacaoComboboxWithAdd
                  value={localizacaoId}
                  onValueChange={setLocalizacaoId}
                  placeholder="Onde esta peça fica"
                  disabled={!podeEditar}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unidade-observacoes">Observações</Label>
              <Textarea
                id="unidade-observacoes"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Avaria, acessório que acompanha, detalhe de manutenção…"
                disabled={!podeEditar}
              />
            </div>

            {/* Só de leitura: é a origem da peça, não se reescreve */}
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">De onde veio</p>
              <p>
                {unidade?.nfe_importacao?.numero_nfe
                  ? `NF-e ${unidade.nfe_importacao.numero_nfe}`
                  : 'Saldo anterior (sem nota vinculada)'}
                {unidade?.data_aquisicao &&
                  ` · ${new Date(unidade.data_aquisicao).toLocaleDateString('pt-BR')}`}
                {unidade?.valor_aquisicao
                  ? ` · ${formatCurrency(unidade.valor_aquisicao)}`
                  : ''}
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            {podeExcluir ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmandoExclusao(true)}
                disabled={salvando}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir esta peça
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
                Fechar
              </Button>
              {podeEditar && (
                <Button onClick={salvar} disabled={salvando}>
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent className="z-[10003]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a peça {unidade?.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              A peça sai do cadastro e o número dela não volta a ser usado. Se a peça existe mas
              não está mais em uso, prefira marcar como <strong>Baixado</strong> ou{' '}
              <strong>Extraviado</strong> — assim o histórico dela continua de pé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default UnidadeDialog
