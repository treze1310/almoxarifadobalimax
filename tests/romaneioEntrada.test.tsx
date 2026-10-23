import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LeitorCodigo } from '../src/components/romaneios/LeitorCodigo'
import { Input } from '../src/components/ui/input'
import { generateRomaneoPDFContent } from '../src/components/romaneios/RomaneioPDF'

afterEach(() => { cleanup(); vi.useRealTimers() })

test('leitor permite editar a quantidade sem roubar o foco e continua lendo códigos', () => {
  vi.useFakeTimers()
  const ler = vi.fn()
  function Tela() {
    const [quantidade, setQuantidade] = useState(164)
    return <><LeitorCodigo onLer={ler} /><Input aria-label="Quantidade" type="number" min={1} max={1000} value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} /></>
  }
  render(<Tela />)
  const leitor = screen.getByPlaceholderText('Bipe o código de barras, ou digite o nome ou o código')
  const quantidade = screen.getByRole('spinbutton', { name: 'Quantidade' }) as HTMLInputElement
  act(() => quantidade.focus())
  act(() => vi.advanceTimersByTime(120))
  expect(document.activeElement).toBe(quantidade)
  fireEvent.change(quantidade, { target: { value: '' } })
  expect(quantidade.value).toBe('')
  fireEvent.change(quantidade, { target: { value: '250' } })
  expect(quantidade.value).toBe('250')
  expect(ler).not.toHaveBeenCalled()
  act(() => leitor.focus())
  fireEvent.change(leitor, { target: { value: '25952' } })
  fireEvent.keyDown(leitor, { key: 'Enter' })
  expect(ler).toHaveBeenCalledWith('25952')
})

test('PDF usa vírgula decimal e ponto de milhar nos valores e no total', () => {
  const html = generateRomaneoPDFContent({ numero: 'ROM-TESTE', tipo: 'retirada', valor_total: 14781.48,
    romaneios_itens: [
      { quantidade: 164, valor_unitario: 3.51, valor_total: 575.64 },
      { quantidade: 1, valor_unitario: 9285, valor_total: 9285 },
      { quantidade: 1, valor_unitario: 4920.84, valor_total: 4920.84 },
      { quantidade: 1, valor_unitario: 0, valor_total: 0 },
    ],
  } as any)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const linhas = doc.querySelectorAll('.material-table tbody tr:not(.empty-row)')
  const texto = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim()
  expect(texto(linhas[0].children[5])).toBe('R$ 3,51')
  expect(texto(linhas[0].children[7])).toBe('R$ 575,64')
  expect(texto(linhas[1].children[7])).toBe('R$ 9.285,00')
  expect(texto(linhas[2].children[7])).toBe('R$ 4.920,84')
  expect(texto(linhas[3].children[7])).toBe('R$ 0,00')
  expect(texto(doc.querySelector('.total-section'))).toBe('R$ 14.781,48')
})

test('PDF ordena por descrição sem mudar os itens originais e usa marca e série da peça', () => {
  const itens = [
    { quantidade: 1, valor_total: 1, materiais_equipamentos: { nome: 'Zebra', marcas: { nome: 'Marca Z' }, numero_serie: 'SERIE-PAI' } },
    { quantidade: 1, valor_total: 1, numero_serie: 'SERIE-LINHA', material_unidades: { codigo: '2-1', numero_serie: 'SERIE-PECA' }, materiais_equipamentos: { nome: 'Árvore', marcas: { nome: 'Marca A' }, numero_serie: 'SERIE-ERRADA' } },
    { quantidade: 1, valor_total: 1, numero_serie: 'SERIE-REGISTRADA', materiais_equipamentos: { nome: 'Alicate', marcas: { nome: 'Marca B' } } },
  ]
  const html = generateRomaneoPDFContent({ tipo: 'retirada', numero: 'ROM', romaneios_itens: itens } as any)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const linhas = doc.querySelectorAll('.material-table tbody tr:not(.empty-row)')
  expect(Array.from(linhas).map(l => l.children[1].textContent?.trim())).toEqual(['Alicate', 'Árvore', 'Zebra'])
  expect(linhas[1].children[2].textContent).toBe('Marca A')
  expect(linhas[1].children[3].textContent).toBe('SERIE-PECA')
  expect(linhas[0].children[3].textContent).toBe('SERIE-REGISTRADA')
  expect(linhas[2].children[3].textContent).toBe('SERIE-PAI')
  expect(itens[0].materiais_equipamentos.nome).toBe('Zebra')
})

test('PDF inclui data e hora de Brasília e identifica expedição, cautela, fiscalização e transporte', () => {
  const html = generateRomaneoPDFContent({ tipo: 'retirada', numero: 'ROM', data_romaneio: '2026-10-23T17:30:00Z',
    expedicao_nome: 'Expedidor original', colaboradores: { nome: 'Pessoa cautelada', matricula: '123' },
    fiscalizacao_nome: 'Fiscal & equipe', transporte_nome: 'Motorista <teste>', romaneios_itens: [],
  } as any)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  expect(doc.body.textContent).toContain('23/10/2026, 14:30')
  const nomes = Array.from(doc.querySelectorAll('.signature-name')).map(el => el.textContent)
  expect(nomes).toEqual(['Expedidor original', 'Pessoa cautelada', 'Fiscal & equipe', 'Motorista <teste>'])
  expect(doc.querySelectorAll('.signature-box')).toHaveLength(4)
  expect(doc.querySelector('teste')).toBeNull()
})
