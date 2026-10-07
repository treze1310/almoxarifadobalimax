import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { registrarAuditoria } from '@/services/auditoriaService'
import { baixarCSV, escreverCSV, lerBooleano, lerCSVComCabecalho, lerNumero } from '@/lib/csv'

/**
 * Importação em lote por CSV (RF-11).
 *
 * Só **atualiza** itens existentes, casando pelo `codigo` — não cria nem
 * apaga nada. É o que resolve o problema real: configurar estoque mínimo,
 * ponto de pedido e código de barras dos 78 itens sem abrir um por um.
 *
 * Nada é gravado antes da pré-visualização: a tela mostra, campo a campo, o
 * que vai mudar em cada item, e quais linhas serão ignoradas e por quê.
 */

/** Colunas aceitas no arquivo, e como cada uma vira valor de banco */
const COLUNAS = {
  nome: { rotulo: 'nome', ler: (v: string) => (v === '' ? null : v) },
  unidade_medida: { rotulo: 'unidade_medida', ler: (v: string) => (v === '' ? null : v) },
  codigo_barras: { rotulo: 'codigo_barras', ler: (v: string) => (v === '' ? null : v) },
  valor_unitario: { rotulo: 'valor_unitario', ler: lerNumero },
  estoque_minimo: { rotulo: 'estoque_minimo', ler: lerNumero },
  ponto_pedido: { rotulo: 'ponto_pedido', ler: lerNumero },
  estoque_maximo: { rotulo: 'estoque_maximo', ler: lerNumero },
  reposicao_automatica: { rotulo: 'reposicao_automatica', ler: lerBooleano },
} as const

type CampoImportavel = keyof typeof COLUNAS

const INTEIROS: CampoImportavel[] = ['estoque_minimo', 'ponto_pedido', 'estoque_maximo']

interface MaterialAtual {
  id: string
  codigo: string
  nome: string
  [campo: string]: unknown
}

interface Mudanca {
  campo: CampoImportavel
  de: unknown
  para: unknown
}

interface LinhaAnalisada {
  linha: number
  codigo: string
  nome: string
  id?: string
  mudancas: Mudanca[]
  problema?: string
}

interface ImportarCSVDialogProps {
  aberto: boolean
  materiais: MaterialAtual[]
  onFechar: () => void
  onImportado: () => void
}

const mostrar = (valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não'
  return String(valor)
}

export const ImportarCSVDialog = ({
  aberto,
  materiais,
  onFechar,
  onImportado,
}: ImportarCSVDialogProps) => {
  const { toast } = useToast()
  const entradaArquivo = useRef<HTMLInputElement>(null)

  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)
  const [analisadas, setAnalisadas] = useState<LinhaAnalisada[]>([])
  const [colunasIgnoradas, setColunasIgnoradas] = useState<string[]>([])
  const [gravando, setGravando] = useState(false)

  const comMudanca = useMemo(
    () => analisadas.filter((l) => !l.problema && l.mudancas.length > 0),
    [analisadas],
  )
  const comProblema = useMemo(() => analisadas.filter((l) => l.problema), [analisadas])
  const semMudanca = useMemo(
    () => analisadas.filter((l) => !l.problema && l.mudancas.length === 0),
    [analisadas],
  )

  const baixarModelo = () => {
    const colunas = ['codigo', ...Object.keys(COLUNAS)]
    const linhas = materiais.map((material) =>
      colunas.map((coluna) => {
        const valor = material[coluna]
        if (typeof valor === 'boolean') return valor ? 'sim' : 'não'
        return valor === null || valor === undefined ? '' : String(valor)
      }),
    )

    baixarCSV(
      escreverCSV(colunas, linhas),
      `materiais-para-editar-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  const analisar = async (arquivo: File) => {
    setNomeArquivo(arquivo.name)
    const texto = await arquivo.text()
    const { colunas, linhas } = lerCSVComCabecalho(texto)

    if (!colunas.includes('codigo')) {
      setAnalisadas([])
      setColunasIgnoradas([])
      toast({
        title: 'Falta a coluna "codigo"',
        description: 'É ela que diz qual item atualizar. Baixe o modelo para ver o formato.',
        variant: 'destructive',
      })
      return
    }

    const conhecidas = new Set<string>(['codigo', ...Object.keys(COLUNAS)])
    setColunasIgnoradas(colunas.filter((c) => c !== '' && !conhecidas.has(c)))

    const porCodigo = new Map(materiais.map((m) => [String(m.codigo).trim(), m]))

    const resultado: LinhaAnalisada[] = linhas.map((registro, indice) => {
      const linha = indice + 2 // +1 do cabeçalho, +1 porque a planilha começa em 1
      const codigo = (registro.codigo ?? '').trim()
      const material = porCodigo.get(codigo)

      if (!codigo) return { linha, codigo, nome: '', mudancas: [], problema: 'Sem código' }
      if (!material) {
        return {
          linha,
          codigo,
          nome: '',
          mudancas: [],
          problema: 'Código não existe no cadastro',
        }
      }

      const mudancas: Mudanca[] = []
      for (const campo of Object.keys(COLUNAS) as CampoImportavel[]) {
        // Coluna ausente no arquivo = campo não mexido. Só o que veio é alterado.
        if (!colunas.includes(campo)) continue

        const bruto = registro[campo] ?? ''
        const novo = COLUNAS[campo].ler(bruto)

        if (bruto !== '' && typeof novo === 'number' && Number.isNaN(novo)) {
          return { linha, codigo, nome: material.nome, mudancas: [], problema: `"${bruto}" não é número (${campo})` }
        }
        if (bruto !== '' && novo === null && campo === 'reposicao_automatica') {
          return { linha, codigo, nome: material.nome, mudancas: [], problema: `"${bruto}" não é sim/não` }
        }
        if (typeof novo === 'number' && novo < 0) {
          return { linha, codigo, nome: material.nome, mudancas: [], problema: `${campo} não pode ser negativo` }
        }
        if (INTEIROS.includes(campo) && typeof novo === 'number' && !Number.isInteger(novo)) {
          return { linha, codigo, nome: material.nome, mudancas: [], problema: `${campo} precisa ser inteiro` }
        }

        const atual = material[campo] ?? null
        const normalizado = novo === null ? null : novo
        if (String(atual ?? '') !== String(normalizado ?? '')) {
          mudancas.push({ campo, de: atual, para: normalizado })
        }
      }

      // Checagem cruzada, a mesma do cadastro e do banco
      const valorFinal = (campo: CampoImportavel) => {
        const mudanca = mudancas.find((m) => m.campo === campo)
        return (mudanca ? mudanca.para : material[campo]) as number | null
      }
      const minimo = valorFinal('estoque_minimo') ?? 0
      const maximo = valorFinal('estoque_maximo')
      const ponto = valorFinal('ponto_pedido')

      if (maximo !== null && maximo < minimo) {
        return { linha, codigo, nome: material.nome, mudancas: [], problema: 'Estoque máximo menor que o mínimo' }
      }
      if (maximo !== null && ponto !== null && ponto > maximo) {
        return { linha, codigo, nome: material.nome, mudancas: [], problema: 'Ponto de pedido acima do máximo' }
      }

      return { linha, codigo, nome: material.nome, id: material.id, mudancas }
    })

    setAnalisadas(resultado)
  }

  const aplicar = async () => {
    setGravando(true)
    let gravados = 0
    const falhas: string[] = []

    try {
      for (const item of comMudanca) {
        const alteracoes: Record<string, unknown> = {}
        item.mudancas.forEach((mudanca) => {
          alteracoes[mudanca.campo] = mudanca.para
        })

        const { error } = await supabase
          .from('materiais_equipamentos')
          .update(alteracoes)
          .eq('id', item.id!)

        if (error) {
          falhas.push(`${item.codigo}: ${error.message}`)
          continue
        }
        gravados++
      }

      await registrarAuditoria({
        acao: 'material.importar_csv',
        tabela: 'materiais_equipamentos',
        dadosNovos: {
          arquivo: nomeArquivo,
          itens_atualizados: gravados,
          falhas: falhas.length,
          campos: [...new Set(comMudanca.flatMap((l) => l.mudancas.map((m) => m.campo)))],
        },
      })

      toast({
        title: falhas.length > 0 ? 'Importação concluída com falhas' : 'Importação concluída',
        description:
          `${gravados} item(ns) atualizado(s).` +
          (falhas.length > 0 ? ` ${falhas.length} falharam: ${falhas.slice(0, 3).join('; ')}` : ''),
        variant: falhas.length > 0 ? 'destructive' : undefined,
      })

      onImportado()
      if (falhas.length === 0) fechar()
    } finally {
      setGravando(false)
    }
  }

  const fechar = () => {
    setAnalisadas([])
    setColunasIgnoradas([])
    setNomeArquivo(null)
    if (entradaArquivo.current) entradaArquivo.current.value = ''
    onFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && fechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edição em lote por planilha</DialogTitle>
          <DialogDescription>
            Baixe a planilha com os itens atuais, edite no Excel e devolva aqui. Os itens são
            encontrados pelo <strong>código</strong>; nada é criado nem excluído.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={baixarModelo}>
            <Download className="mr-2 h-4 w-4" />
            Baixar planilha dos itens
          </Button>

          <Button variant="outline" onClick={() => entradaArquivo.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Escolher arquivo
          </Button>
          <input
            ref={entradaArquivo}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) analisar(arquivo)
            }}
          />

          {nomeArquivo && (
            <span className="flex items-center gap-2 text-ds-body text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {nomeArquivo}
            </span>
          )}
        </div>

        {analisadas.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{comMudanca.length} item(ns) a atualizar</Badge>
              {semMudanca.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {semMudanca.length} sem mudança
                </Badge>
              )}
              {comProblema.length > 0 && (
                <Badge variant="outline" className="text-destructive">
                  {comProblema.length} com problema
                </Badge>
              )}
            </div>

            {colunasIgnoradas.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Colunas ignoradas</AlertTitle>
                <AlertDescription>
                  {colunasIgnoradas.join(', ')} — não são campos importáveis e foram deixadas de
                  lado.
                </AlertDescription>
              </Alert>
            )}

            {comProblema.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{comProblema.length} linha(s) não serão importadas</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 space-y-0.5">
                    {comProblema.slice(0, 6).map((item) => (
                      <li key={item.linha}>
                        Linha {item.linha}
                        {item.codigo && ` (${item.codigo})`}: {item.problema}
                      </li>
                    ))}
                    {comProblema.length > 6 && <li>… e mais {comProblema.length - 6}.</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {comMudanca.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>O que muda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comMudanca.map((item) => (
                      <TableRow key={item.linha}>
                        <TableCell className="py-2 align-top">
                          <div className="font-medium">{item.codigo}</div>
                          <div className="text-xs text-muted-foreground">{item.nome}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <ul className="space-y-0.5 text-ds-table">
                            {item.mudancas.map((mudanca) => (
                              <li key={mudanca.campo}>
                                <span className="text-muted-foreground">
                                  {COLUNAS[mudanca.campo].rotulo}:
                                </span>{' '}
                                <span className="line-through opacity-60">
                                  {mostrar(mudanca.de)}
                                </span>{' '}
                                → <strong>{mostrar(mudanca.para)}</strong>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={fechar} disabled={gravando}>
            Cancelar
          </Button>
          <Button onClick={aplicar} disabled={comMudanca.length === 0 || gravando}>
            {gravando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Aplicar {comMudanca.length > 0 ? `em ${comMudanca.length} item(ns)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportarCSVDialog
