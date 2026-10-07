import jsPDF from 'jspdf'
import { barrasDoCodigo, larguraEmModulos, podeCodificar } from '@/lib/code128'

/**
 * Folha A4 de etiquetas de item, para tagear materiais e equipamentos pelo
 * número do item (o `codigo` do cadastro).
 *
 * O desenho segue o formato de etiqueta adesiva mais comum no Brasil
 * (3 colunas × 8 linhas, 70 × 37 mm — Pimaco 6287 e equivalentes), para poder
 * imprimir em papel adesivo já cortado ou em papel comum e recortar.
 */

export interface ItemEtiqueta {
  codigo: string
  nome: string
  localizacao?: string | null
  unidade?: string | null
}

const COLUNAS = 3
const LINHAS = 8
const LARGURA_ETIQUETA = 70
const ALTURA_ETIQUETA = 37
const MARGEM_X = 0 // 3 × 70 = 210 mm, a largura inteira da A4
const MARGEM_Y = 4.5 // 8 × 37 = 296, sobra ~1 mm; a margem centra na folha

/** Altura das barras, deixando espaço para o nome e para o código legível */
const ALTURA_BARRAS = 12

const desenharEtiqueta = (
  pdf: jsPDF,
  item: ItemEtiqueta,
  x: number,
  y: number,
  comContorno: boolean,
) => {
  const padding = 4
  const largura = LARGURA_ETIQUETA - padding * 2

  if (comContorno) {
    pdf.setDrawColor(210, 210, 210)
    pdf.setLineWidth(0.1)
    pdf.rect(x, y, LARGURA_ETIQUETA, ALTURA_ETIQUETA)
  }

  // Nome do item, cortado na largura da etiqueta
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  const nome = pdf.splitTextToSize(item.nome, largura) as string[]
  pdf.text(nome.slice(0, 2), x + padding, y + padding + 3)

  // Localização, quando houver
  if (item.localizacao) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(110, 110, 110)
    pdf.text(
      (pdf.splitTextToSize(item.localizacao, largura) as string[])[0],
      x + padding,
      y + padding + (nome.length > 1 ? 10 : 6.5),
    )
    pdf.setTextColor(0, 0, 0)
  }

  // Código de barras: o módulo se ajusta para o código caber na etiqueta
  const modulos = larguraEmModulos(item.codigo)
  const moduloMm = Math.min(0.42, largura / modulos)
  const larguraCodigo = modulos * moduloMm
  const xCodigo = x + (LARGURA_ETIQUETA - larguraCodigo) / 2
  const yCodigo = y + ALTURA_ETIQUETA - padding - ALTURA_BARRAS - 4

  pdf.setFillColor(0, 0, 0)
  for (const barra of barrasDoCodigo(item.codigo)) {
    pdf.rect(
      xCodigo + barra.inicio * moduloMm,
      yCodigo,
      barra.largura * moduloMm,
      ALTURA_BARRAS,
      'F',
    )
  }

  // Código legível embaixo: se a etiqueta borrar ou o leitor falhar, dá para
  // digitar no assistente de retirada.
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text(item.codigo, x + LARGURA_ETIQUETA / 2, yCodigo + ALTURA_BARRAS + 3.6, {
    align: 'center',
  })
}

/**
 * Gera e baixa a folha de etiquetas. `comContorno` desenha a borda de cada
 * etiqueta, útil para recortar quando a impressão é em papel comum.
 *
 * Devolve quantos itens ficaram de fora por ter código que o Code 128B não
 * representa — nenhum, no cadastro atual, mas é melhor avisar do que imprimir
 * uma etiqueta ilegível.
 */
export const gerarEtiquetasPDF = (
  itens: ItemEtiqueta[],
  opcoes?: { comContorno?: boolean; nomeArquivo?: string },
): { gerados: number; ignorados: ItemEtiqueta[] } => {
  const validos = itens.filter((item) => podeCodificar(item.codigo))
  const ignorados = itens.filter((item) => !podeCodificar(item.codigo))

  if (validos.length === 0) return { gerados: 0, ignorados }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const porPagina = COLUNAS * LINHAS

  validos.forEach((item, indice) => {
    if (indice > 0 && indice % porPagina === 0) pdf.addPage()

    const posicao = indice % porPagina
    const coluna = posicao % COLUNAS
    const linha = Math.floor(posicao / COLUNAS)

    desenharEtiqueta(
      pdf,
      item,
      MARGEM_X + coluna * LARGURA_ETIQUETA,
      MARGEM_Y + linha * ALTURA_ETIQUETA,
      opcoes?.comContorno ?? true,
    )
  })

  pdf.save(opcoes?.nomeArquivo ?? `etiquetas-${new Date().toISOString().slice(0, 10)}.pdf`)

  return { gerados: validos.length, ignorados }
}
