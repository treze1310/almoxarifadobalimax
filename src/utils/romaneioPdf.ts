import { adicionarFolhaPDF } from '@/lib/pdfPage'
import jsPDF from 'jspdf'
import { capturarPaginasRomaneioPDF } from '@/lib/pdfDocument'
import { generateRomaneoPDFContent } from '@/components/romaneios/RomaneioPDF'
import { companyService } from '@/services/companyService'
import { supabase } from '@/lib/supabase'

/**
 * Substitui o valor unitário dos itens pelo MAIOR valor do histórico de preços
 * (nfe_itens) de cada material, recalculando o valor total.
 */
export async function enriquecerComMaiorPreco(romaneio: any): Promise<any> {
  const itens = romaneio?.romaneios_itens || []
  if (!itens.length) return romaneio

  const ids = Array.from(
    new Set(
      itens
        .map((i: any) => i.materiais_equipamentos?.id || i.material_equipamento_id)
        .filter(Boolean),
    ),
  )
  if (!ids.length) return romaneio

  const { data } = await supabase
    .from('nfe_itens')
    .select('material_equipamento_id, valor_unitario')
    .in('material_equipamento_id', ids as string[])

  const maxPorMaterial = new Map<string, number>()
  ;(data || []).forEach((r: any) => {
    if (!r.material_equipamento_id) return
    const atual = maxPorMaterial.get(r.material_equipamento_id) || 0
    if ((r.valor_unitario || 0) > atual) maxPorMaterial.set(r.material_equipamento_id, r.valor_unitario || 0)
  })

  const itensEnriquecidos = itens.map((i: any) => {
    const mid = i.materiais_equipamentos?.id || i.material_equipamento_id
    const maior = mid ? maxPorMaterial.get(mid) : undefined
    if (maior && maior > 0) {
      return { ...i, valor_unitario: maior, valor_total: (i.quantidade || 0) * maior }
    }
    return i
  })

  const valorTotal = itensEnriquecidos.reduce((s: number, i: any) => s + (i.valor_total || 0), 0)

  return { ...romaneio, romaneios_itens: itensEnriquecidos, valor_total: valorTotal }
}

/**
 * Gera e baixa o comprovante de romaneio em PDF.
 * Reutilizável tanto na listagem quanto na criação (Salvar e Aprovar).
 */
async function criarRomaneioPDF(romaneioInput: any): Promise<jsPDF> {

  const romaneio = await enriquecerComMaiorPreco(romaneioInput)
  if (!romaneio.expedicao_nome && romaneio.id) {
    const { data, error } = await supabase.rpc('romaneio_dados_expedicao', { p_romaneio_id: romaneio.id })
    if (error) throw error
    romaneio.expedicao_nome = (data as { nome?: string } | null)?.nome ?? null
  }
  const company = await companyService.getActiveCompany()

  const paginas = await capturarPaginasRomaneioPDF(generateRomaneoPDFContent(romaneio, company))
  const pdf = new jsPDF('p', 'mm', 'a4')
  paginas.forEach((canvas, indice) => {
    if (indice > 0) pdf.addPage()
    adicionarFolhaPDF(pdf, canvas, indice + 1, paginas.length)
  })

  return pdf
}

export async function gerarRomaneioPDF(romaneioInput: any): Promise<void> {
  if (!romaneioInput) return
  const pdf = await criarRomaneioPDF(romaneioInput)
  pdf.save(`romaneio-${romaneioInput.numero || 'comprovante'}.pdf`)
}

/** A impressão usa as mesmas folhas do download, evitando outra quebra pelo navegador. */
export async function imprimirRomaneioPDF(romaneioInput: any): Promise<void> {
  const janela = window.open('', '_blank')
  if (!janela) throw new Error('Permita abrir a janela de impressão para este site.')
  try {
    const pdf = await criarRomaneioPDF(romaneioInput)
    pdf.autoPrint()
    const url = URL.createObjectURL(pdf.output('blob'))
    janela.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (error) {
    janela.close()
    throw error
  }
}
