import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Download } from 'lucide-react'

interface PrintComponentManagerProps {
  title: string
  children: ReactNode
  onBack: () => void
  onPrint?: () => void
  onDownloadPDF?: () => void
  isGeneratingPDF?: boolean
  printStyles?: string
}

const PrintComponentManager = ({
  title,
  children,
  onBack,
  onPrint,
  onDownloadPDF,
  isGeneratingPDF = false,
  printStyles
}: PrintComponentManagerProps) => {
  const defaultPrintStyles = `
    @media screen {
      .print-content {
        display: block;
        margin: 20px auto;
        max-width: 210mm;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        padding: 10mm;
      }
    }
    
    @media print {
      .no-print { 
        display: none !important; 
        visibility: hidden !important;
      }
      body { 
        margin: 0; 
        padding: 0; 
        background: white;
      }
      * { 
        print-color-adjust: exact; 
        -webkit-print-color-adjust: exact; 
      }
      .print-content {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        max-width: none !important;
        width: 100% !important;
      }
      
      /* Hide everything except print content */
      body > *:not(.print-content) {
        display: none !important;
      }
      
      /* Ensure only our content shows */
      #root > *:not(.print-content) {
        display: none !important;
      }
    }
  `

  return (
    <>
      {/* Botões de ação (apenas na tela) */}
      <div className="no-print fixed top-4 right-4 z-10 flex gap-2">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {onPrint && (
          <Button onClick={onPrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        )}
        {onDownloadPDF && (
          <Button 
            onClick={onDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        )}
      </div>

      {/* Conteúdo para impressão */}
      <div 
        className="print-content"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {children}
      </div>

      {/* Estilos para impressão */}
      <style jsx>{printStyles || defaultPrintStyles}</style>
    </>
  )
}

export default PrintComponentManager
