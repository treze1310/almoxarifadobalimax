import { afterEach, expect, test, vi } from 'vitest'
import { capturarDocumentoPDF } from '../src/lib/pdfDocument'

const capture = vi.hoisted(() => vi.fn())
vi.mock('html2canvas', () => ({ default: capture }))
afterEach(() => { vi.restoreAllMocks(); capture.mockReset(); document.documentElement.classList.remove('dark') })

function carregarFrame() {
  const append = document.body.appendChild.bind(document.body)
  vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
    const result = append(node)
    if (node.tagName === 'IFRAME') {
      Object.defineProperty(node.contentDocument, 'images', { value: [], configurable: true })
      node.contentDocument.body.innerHTML = '<p>ROM-123 — Material teste</p>'
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


