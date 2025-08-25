import { companyService } from './companyService'
import { supabase } from '@/lib/supabase'

interface PDFGenerationState {
  isGenerating: boolean
  controller: AbortController | null
  cleanup: (() => void) | null
}

// 🔥 Gerenciador global de estado para geração de PDF
class PDFStateManager {
  private state: PDFGenerationState = {
    isGenerating: false,
    controller: null,
    cleanup: null
  }

  private cleanupTimeoutId: NodeJS.Timeout | null = null

  // 🚀 Iniciar geração de PDF
  startGeneration(): { controller: AbortController; canProceed: boolean } {
    // Evitar múltiplas gerações simultâneas
    if (this.state.isGenerating) {
      console.warn('⚠️ PDF generation already in progress, aborting...')
      return { controller: new AbortController(), canProceed: false }
    }

    // Limpar estado anterior se existir
    this.cleanup()

    const controller = new AbortController()
    this.state = {
      isGenerating: true,
      controller,
      cleanup: null
    }

    console.log('🚀 PDF generation started')
    return { controller, canProceed: true }
  }

  // 🧹 Finalizar geração (sucesso ou erro)
  finishGeneration(): void {
    console.log('✅ PDF generation finished')
    this.cleanup()
  }

  // 🚫 Abortar geração
  abortGeneration(): void {
    if (this.state.controller) {
      console.log('🚫 Aborting PDF generation...')
      this.state.controller.abort()
    }
    this.cleanup()
  }

  // 🧹 Cleanup completo
  private cleanup(): void {
    if (this.state.cleanup) {
      this.state.cleanup()
    }

    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId)
    }

    this.state = {
      isGenerating: false,
      controller: null,
      cleanup: null
    }
  }

  // 📋 Registrar função de cleanup
  setCleanup(cleanupFn: () => void): void {
    this.state.cleanup = cleanupFn

    // Auto cleanup após 30 segundos (failsafe)
    this.cleanupTimeoutId = setTimeout(() => {
      console.warn('⚠️ Auto cleanup triggered for PDF generation')
      this.cleanup()
    }, 30000)
  }

  // 📊 Estado atual
  get isGenerating(): boolean {
    return this.state.isGenerating
  }
}

const pdfStateManager = new PDFStateManager()

// 🔧 Utilitários para geração de PDF
export const pdfService = {
  /**
   * 🔍 Verificar e recuperar sessão antes de operações longas
   */
  async ensureValidSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session check failed:', error.message)
        return false
      }

      if (!session) {
        console.warn('⚠️ No active session found')
        return false
      }

      // Verificar se a sessão está próxima do vencimento
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = expiresAt - now

      if (timeUntilExpiry < 300) { // Menos de 5 minutos
        console.log('🔄 Session expires soon, refreshing...')
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError.message)
          return false
        }

        if (data.session) {
          console.log('✅ Session refreshed successfully')
          return true
        }
      }

      console.log('✅ Session is valid')
      return true
    } catch (error) {
      console.error('❌ Session validation failed:', error)
      return false
    }
  },
  /**
   * 🚀 Gera PDF com controle de estado e cleanup automático
   */
  async generatePDF(options: {
    filename: string
    htmlContent: string
    onStart?: () => void
    onFinish?: () => void
    onError?: (error: any) => void
  }): Promise<boolean> {
    const { filename, htmlContent, onStart, onFinish, onError } = options

    // Verificar se já há geração em andamento
    const { controller, canProceed } = pdfStateManager.startGeneration()
    if (!canProceed) {
      onError?.(new Error('Geração de PDF já em andamento. Aguarde a conclusão.'))
      return false
    }

    let printElement: HTMLElement | null = null

    try {
      onStart?.()

      // 🔍 Verificar sessão antes de operações longas
      console.log('🔍 Validating session...')
      const sessionValid = await this.ensureValidSession()
      if (!sessionValid) {
        throw new Error('Sessão inválida ou expirada. Faça login novamente.')
      }

      // 🏢 Buscar dados da empresa com cache
      console.log('🏢 Loading company data...')
      const company = await companyService.getActiveCompany()
      if (!company) {
        throw new Error('Dados da empresa não encontrados')
      }

      // 📦 Importações dinâmicas
      console.log('📦 Loading PDF libraries...')
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      // Verificar se foi abortado
      if (controller.signal.aborted) {
        throw new Error('PDF generation was aborted')
      }

      const jsPDF = jsPDFModule.default || jsPDFModule
      const html2canvas = html2canvasModule.default || html2canvasModule

      // 🎨 Criar elemento temporário
      console.log('🎨 Creating temporary element...')
      printElement = document.createElement('div')
      printElement.id = `pdf-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      printElement.innerHTML = htmlContent
      
      // Estilos otimizados para PDF
      Object.assign(printElement.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: 'white',
        zIndex: '-1000',
        visibility: 'hidden'
      })

      document.body.appendChild(printElement)

      // Registrar cleanup
      pdfStateManager.setCleanup(() => {
        if (printElement && printElement.parentNode) {
          printElement.parentNode.removeChild(printElement)
          console.log('🧹 Temporary element cleaned up')
        }
      })

      // ⏳ Aguardar carregamento de recursos
      console.log('⏳ Waiting for resources to load...')
      await new Promise(resolve => setTimeout(resolve, 800))

      // Verificar se foi abortado
      if (controller.signal.aborted) {
        throw new Error('PDF generation was aborted')
      }

      // 🔍 Verificar sessão novamente antes de operação pesada
      const sessionStillValid = await this.ensureValidSession()
      if (!sessionStillValid) {
        throw new Error('Sessão perdida durante geração. Operação cancelada.')
      }

      // 🖼️ Gerar canvas
      console.log('🖼️ Converting to canvas...')
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false,
        removeContainer: false,
        foreignObjectRendering: true,
        width: printElement.scrollWidth,
        height: printElement.scrollHeight
      })

      // Verificar se foi abortado
      if (controller.signal.aborted) {
        throw new Error('PDF generation was aborted')
      }

      // 📄 Gerar PDF
      console.log('📄 Generating PDF...')
      const imgData = canvas.toDataURL('image/png', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgWidth = 190
      const pageHeight = 280
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10

      // Primeira página
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Páginas adicionais se necessário
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // 💾 Salvar arquivo
      console.log('💾 Saving PDF...')
      pdf.save(filename)

      console.log('✅ PDF generated successfully:', filename)
      return true

    } catch (error: any) {
      console.error('❌ PDF generation error:', error)
      onError?.(error)
      return false
    } finally {
      // 🧹 Cleanup e finalização
      pdfStateManager.finishGeneration()
      onFinish?.()
    }
  },

  /**
   * 🚫 Abortar geração em andamento
   */
  abort(): void {
    pdfStateManager.abortGeneration()
  },

  /**
   * 📊 Verificar se há geração em andamento
   */
  get isGenerating(): boolean {
    return pdfStateManager.isGenerating
  }
}

export default pdfService
