import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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
export async function gerarRomaneioPDF(romaneioInput: any): Promise<void> {
  if (!romaneioInput) return

  const romaneio = await enriquecerComMaiorPreco(romaneioInput)
  const company = await companyService.getActiveCompany()

  const printElement = document.createElement('div')
  printElement.innerHTML = generateRomaneoPDFContent(romaneio, company)
  printElement.style.position = 'absolute'
  printElement.style.left = '-9999px'
  printElement.style.top = '0'
  printElement.style.width = '210mm'
  printElement.style.minHeight = '297mm'
  printElement.style.backgroundColor = 'white'
  document.body.appendChild(printElement)

  try {
    // Aguarda carregamento de imagens (logo, etc)
    await new Promise((resolve) => setTimeout(resolve, 800))

    let canvas: HTMLCanvasElement | undefined
    let retry = 0
    const maxRetries = 3
    while (retry < maxRetries) {
      try {
        canvas = await html2canvas(printElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: 'white',
          width: printElement.scrollWidth,
          height: printElement.scrollHeight,
        })
        break
      } catch (err) {
        retry++
        if (retry >= maxRetries) throw err
        await new Promise((resolve) => setTimeout(resolve, 800 * retry))
      }
    }

    if (!canvas) throw new Error('Falha na conversão para canvas')

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 190
    const pageHeight = 280
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 10

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`romaneio-${romaneio.numero || 'comprovante'}.pdf`)
  } finally {
    if (printElement.parentNode) document.body.removeChild(printElement)
  }
}
