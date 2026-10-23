import html2canvas from 'html2canvas'

/** Documento independente: tema e estilos da aplicação não alteram o comprovante. */
export async function capturarDocumentoPDF(html: string, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', 'allow-same-origin')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none'
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
        frame.onload = null
        error ? reject(error) : resolve()
      }
      const abort = () => finish(new Error('Geração de PDF cancelada'))
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao carregar o documento PDF')), 15000)
      frame.onload = () => finish()
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) { abort(); return }
      frame.srcdoc = html
      document.body.appendChild(frame)
    })
    const doc = frame.contentDocument
    if (!doc?.body) throw new Error('Documento PDF indisponível')
    doc.documentElement.style.colorScheme = 'light'
    doc.body.style.color = '#111111'
    doc.body.style.backgroundColor = '#ffffff'
    await Promise.all([
      doc.fonts?.ready,
      ...Array.from(doc.images).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => {
        const timer = setTimeout(done, 10000)
        function done() { clearTimeout(timer); img.removeEventListener('load', done); img.removeEventListener('error', done); resolve() }
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      })),
    ])
    if (signal?.aborted) throw new Error('Geração de PDF cancelada')
    return await html2canvas(doc.body, {
      scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
      foreignObjectRendering: false, removeContainer: true, logging: false,
      windowWidth: 794, windowHeight: 1123,
      width: Math.max(doc.body.scrollWidth, 794), height: Math.max(doc.body.scrollHeight, 1123),
    })
  } finally {
    frame.remove()
  }
}
