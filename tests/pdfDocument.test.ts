import { adicionarFolhaPDF } from '../src/lib/pdfPage'
import { afterEach, expect, test, vi } from 'vitest'
import { capturarDocumentoPDF, capturarPaginasRomaneioPDF } from '../src/lib/pdfDocument'

const capture = vi.hoisted(() => vi.fn())
vi.mock('html2canvas', () => ({ default: capture }))
afterEach(() => { vi.restoreAllMocks(); capture.mockReset(); document.documentElement.classList.remove('dark') })

function carregarFrame(conteudo = '<p>ROM-123 — Material teste</p>', medir = false) {
  const append = document.body.appendChild.bind(document.body)
  vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
    const result = append(node)
    if (node.tagName === 'IFRAME') {
      Object.defineProperty(node.contentDocument, 'images', { value: [], configurable: true })
      node.contentDocument.body.innerHTML = conteudo
      if (medir) vi.spyOn(node.contentWindow.HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return 500 + Array.from(this.querySelectorAll('tr')).reduce((total, linha) => total + (linha.classList.contains('empty-row') ? 25 : Number(linha.getAttribute('data-altura'))), 0)
      })
      queueMicrotask(() => node.dispatchEvent(new Event('load')))
    }
    return result
  })
}

test('PDF captura documento isolado com texto escuro mesmo no tema escuro', async () => {
  carregarFrame()
  document.documentElement.classList.add('dark')
  const canvas = document.createElement('canvas')
  capture.mockImplementation(async (body, options) => {
    expect(body.ownerDocument).not.toBe(document)
    expect(body.textContent).toContain('ROM-123')
    expect(['#111111', 'rgb(17, 17, 17)']).toContain(body.style.color)
    expect(options.foreignObjectRendering).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    return canvas
  })
  expect(await capturarDocumentoPDF('<html><body>ROM-123</body></html>')).toBe(canvas)
  expect(document.querySelector('iframe')).toBeNull()
})

test('remove documento temporário quando a captura falha', async () => {
  carregarFrame()
  capture.mockRejectedValue(new Error('Falha de captura'))
  await expect(capturarDocumentoPDF('<body>Teste</body>')).rejects.toThrow('Falha de captura')
  expect(document.querySelector('iframe')).toBeNull()
})

test('cancelamento anterior não deixa documento na tela', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(capturarDocumentoPDF('<body>Teste</body>', controller.signal)).rejects.toThrow('cancelada')
  expect(document.querySelector('iframe')).toBeNull()
})




function ficha(alturas: number[]) {
  return `<div class="container"><header>ROM-TESTE / Empresa / Responsável</header><table class="material-table"><tbody>${alturas.map((altura, i) => `<tr data-altura="${altura}"><td>Item ${i + 1}</td></tr>`).join('')}<tr class="empty-row"><td></td></tr></tbody></table><footer>Total R$ 349 / Assinaturas / Observações</footer></div>`
}

test('romaneio curto permanece em uma página com observações e assinaturas', async () => {
  carregarFrame(ficha([40, 40]), true)
  capture.mockImplementation(async elemento => {
    expect(elemento.textContent).toContain('Assinaturas / Observações')
    expect(elemento.textContent).toContain('Página 1 de 1')
    expect(elemento.scrollHeight).toBeLessThanOrEqual(1123)
    return document.createElement('canvas')
  })
  expect(await capturarPaginasRomaneioPDF('teste')).toHaveLength(1)
})

test('linhas altas continuam em novas folhas sem perder itens ou repetir linhas', async () => {
  carregarFrame(ficha(Array(17).fill(200)), true)
  const itens: string[] = []
  capture.mockImplementation(async elemento => {
    expect(elemento.textContent).toContain('ROM-TESTE / Empresa / Responsável')
    expect(elemento.textContent).toContain('Total R$ 349 / Assinaturas / Observações')
    expect(elemento.scrollHeight).toBeLessThanOrEqual(1123)
    itens.push(...Array.from(elemento.querySelectorAll('tr:not(.empty-row)')).map((linha: any) => linha.textContent))
    return document.createElement('canvas')
  })
  expect(await capturarPaginasRomaneioPDF('teste')).toHaveLength(6)
  expect(itens).toEqual(Array.from({ length: 17 }, (_, i) => `Item ${i + 1}`))
  expect(document.querySelector('iframe')).toBeNull()
})


test.each([[794, 1400], [1200, 700]])('folha %s por %s mantém todo o conteúdo dentro das margens A4', (width, height) => {
  const addImage = vi.fn()
  const pdf = { internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } }, addImage }
  const canvas = { width, height, toDataURL: () => 'data:image/png;base64,teste' }
  adicionarFolhaPDF(pdf as any, canvas as HTMLCanvasElement)
  const [, , x, y, largura, altura] = addImage.mock.calls[0]
  expect(x).toBeGreaterThanOrEqual(10)
  expect(y).toBe(10)
  expect(x + largura).toBeLessThanOrEqual(200)
  expect(y + altura).toBeLessThanOrEqual(287)
  expect(largura / altura).toBeCloseTo(width / height)
})
