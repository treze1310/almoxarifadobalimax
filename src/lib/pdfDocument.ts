import html2canvas from 'html2canvas'

/** Documento independente: tema e estilos da aplicação não alteram o comprovante. */
async function comDocumentoPDF<T>(html: string, signal: AbortSignal | undefined, renderizar: (doc: Document) => Promise<T>): Promise<T> {
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
    return await renderizar(doc)
  } finally {
    frame.remove()
  }
}


function capturarElemento(elemento: HTMLElement) {
  return html2canvas(elemento, {
    scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
    foreignObjectRendering: false, removeContainer: true, logging: false,
    scrollX: 0, scrollY: 0,
    windowWidth: 794, windowHeight: Math.max(elemento.scrollHeight, 1123),
    width: Math.max(elemento.scrollWidth, 794), height: Math.max(elemento.scrollHeight, 1123),
  })
}

export function capturarDocumentoPDF(html: string, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  return comDocumentoPDF(html, signal, doc => capturarElemento(doc.body))
}

/** Distribui linhas inteiras segundo a altura real, repetindo a ficha em cada folha. */
export function capturarPaginasRomaneioPDF(html: string, signal?: AbortSignal): Promise<HTMLCanvasElement[]> {
  return comDocumentoPDF(html, signal, async doc => {
    const modelo = doc.querySelector<HTMLElement>('.container')
    if (!modelo) throw new Error('Layout do romaneio não encontrado')
    const itens = Array.from(modelo.querySelectorAll<HTMLTableRowElement>('.material-table tbody tr:not(.empty-row)'))
    const linhaVazia = modelo.querySelector<HTMLTableRowElement>('.empty-row')
    const paginas: HTMLElement[] = []
    const criarPagina = () => {
      const pagina = modelo.cloneNode(true) as HTMLElement
      pagina.style.cssText = 'width:794px;max-width:none;min-height:1123px;position:relative;box-sizing:border-box;padding-bottom:40px'
      pagina.querySelector('.material-table tbody')!.replaceChildren()
      doc.body.replaceChildren(pagina)
      paginas.push(pagina)
      return pagina
    }
    let pagina = criarPagina()
    let corpo = pagina.querySelector('.material-table tbody')!
    for (const item of itens) {
      const linha = item.cloneNode(true) as HTMLElement
      corpo.appendChild(linha)
      if (pagina.scrollHeight > 1123 && corpo.children.length > 1) {
        linha.remove()
        pagina = criarPagina()
        corpo = pagina.querySelector('.material-table tbody')!
        corpo.appendChild(linha)
      }
    }
    const imagens: HTMLCanvasElement[] = []
    for (const [indice, folha] of paginas.entries()) {
      if (signal?.aborted) throw new Error('Geração de PDF cancelada')
      doc.body.replaceChildren(folha)
      const tabela = folha.querySelector('.material-table tbody')!
      // Completa o formulário sem deixar linhas vazias empurrarem o rodapé.
      if (linhaVazia) while (tabela.children.length < 15) {
        const vazia = linhaVazia.cloneNode(true) as HTMLElement
        tabela.appendChild(vazia)
        if (folha.scrollHeight > 1123) { vazia.remove(); break }
      }
      const rodape = doc.createElement('div')
      rodape.textContent = `Página ${indice + 1} de ${paginas.length}`
      rodape.style.cssText = 'position:absolute;bottom:12px;right:0;font-size:10px;line-height:14px;color:#333'
      folha.appendChild(rodape)
      imagens.push(await capturarElemento(folha))
    }
    return imagens
  })
}
