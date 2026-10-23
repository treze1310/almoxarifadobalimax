import type jsPDF from 'jspdf'

/** Mantém a folha completa dentro da área útil A4, sem recortar o rodapé. */
export function adicionarFolhaPDF(pdf: jsPDF, canvas: HTMLCanvasElement, pagina = 1, totalPaginas = 1) {
  const margem = 10
  const larguraPagina = pdf.internal.pageSize.getWidth()
  const alturaPagina = pdf.internal.pageSize.getHeight()
  const escala = Math.min((larguraPagina - margem * 2) / canvas.width, (alturaPagina - margem - 18) / canvas.height)
  const largura = canvas.width * escala
  const altura = canvas.height * escala
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (larguraPagina - largura) / 2, margem, largura, altura)
  // Texto nativo do PDF em área própria: não passa pela captura de HTML.
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(70, 70, 70)
  pdf.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - margem, alturaPagina - margem, { align: 'right' })
}
