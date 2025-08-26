import { useState } from 'react'

interface UsePrintManagerOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function usePrintManager(options?: UsePrintManagerOptions) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const generatePDF = async (htmlContent: string, filename: string): Promise<boolean> => {
    setIsGeneratingPDF(true)
    
    try {
      // Importação dinâmica com fallback para commonjs
      const jsPDFModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      
      const jsPDF = jsPDFModule.default || jsPDFModule
      const html2canvas = html2canvasModule.default || html2canvasModule

      // Create a completely isolated container for PDF generation
      const pdfContainer = document.createElement('div')
      pdfContainer.style.position = 'absolute'
      pdfContainer.style.left = '-9999px'
      pdfContainer.style.top = '0'
      pdfContainer.style.width = '210mm'
      pdfContainer.style.minHeight = '297mm'
      pdfContainer.style.backgroundColor = 'white'
      pdfContainer.style.fontFamily = 'Arial, sans-serif'
      pdfContainer.style.fontSize = '12px'
      pdfContainer.style.lineHeight = '1.3'
      pdfContainer.style.margin = '0'
      pdfContainer.style.padding = '0'
      pdfContainer.style.zIndex = '9999'
      
      pdfContainer.innerHTML = htmlContent
      
      // Append to body temporarily
      document.body.appendChild(pdfContainer)

      // Wait for content to fully render
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Capture only the isolated container
      const canvas = await html2canvas(pdfContainer, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        width: pdfContainer.scrollWidth,
        height: pdfContainer.scrollHeight,
        logging: false,
        removeContainer: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure the cloned document only contains our content
          const clonedContainer = clonedDoc.querySelector('div')
          if (clonedContainer) {
            clonedContainer.style.position = 'relative'
            clonedContainer.style.left = '0'
            clonedContainer.style.top = '0'
          }
        }
      })
      
      // Generate PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = 297 // A4 height in mm
      const imgWidth = 190 // Content width with margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let yPosition = 10
      let remainingHeight = imgHeight
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight)
      remainingHeight -= (pdfHeight - 20) // Account for margins
      
      // Add additional pages if needed
      while (remainingHeight > 0) {
        pdf.addPage()
        yPosition = -(imgHeight - remainingHeight) + 10
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight)
        remainingHeight -= (pdfHeight - 20)
      }
      
      // Save the PDF
      pdf.save(filename)
      
      // Clean up
      document.body.removeChild(pdfContainer)
      
      options?.onSuccess?.()
      return true
      
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error)
      options?.onError?.(error.message || 'Erro ao gerar PDF. Tente novamente.')
      return false
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const printWindow = (content: string, title: string = 'Impressão') => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
      printWindow.close()
    }
  }

  return {
    isGeneratingPDF,
    generatePDF,
    printWindow
  }
}

export default usePrintManager
