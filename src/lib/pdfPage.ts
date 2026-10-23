import type jsPDF from 'jspdf'

/** Mantém a folha completa dentro da área útil A4, sem recortar o rodapé. */
export function adicionarFolhaPDF(pdf: jsPDF, canvas: HTMLCanvasElement) {
  const margem = 10
  const larguraPagina = pdf.internal.pageSize.getWidth()
  const alturaPagina = pdf.internal.pageSize.getHeight()
  const escala = Math.min((larguraPagina - margem * 2) / canvas.width, (alturaPagina - margem * 2) / canvas.height)
  const largura = canvas.width * escala
  const altura = canvas.height * escala
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (larguraPagina - largura) / 2, margem, largura, altura)
}
