import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NovoRomaneioPage from '../src/pages/romaneios/NovoRomaneio'

const mocks = vi.hoisted(() => ({
  listar: vi.fn(), calcular: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), buscar: vi.fn(), toast: vi.fn(),
  salvarRascunho: vi.fn(), apagarRascunho: vi.fn(),
}))

vi.mock('@/hooks/useRomaneios', () => ({ useRomaneios: () => ({
  getRomaneiosForReturn: mocks.listar, getRomaneioById: mocks.buscar,
  createRomaneio: mocks.criar, updateRomaneio: mocks.atualizar,
}) }))
// O material da retirada não pertence ao lote carregado do catálogo.
vi.mock('@/hooks/useSupabase', () => ({ useSupabaseTable: () => ({ data: [], loading: false }) }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userId: 'teste' }) }))
vi.mock('@/hooks/usePersistentState', () => ({ usePersistentState: () => [null, mocks.salvarRascunho, { apagar: mocks.apagarRascunho }] }))
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/services/devolucaoService', () => ({ devolucaoService: { calcularStatusDevolucao: mocks.calcular } }))
vi.mock('@/components/romaneios/CentroCustoSelector', () => ({ CentroCustoSelector: () => <div>Centro de custo</div> }))
vi.mock('@/components/forms/ResponsavelAutocomplete', () => ({ default: () => <div>Responsável</div> }))

const romaneio = {
  id: 'retirada-teste', numero: 'ROM-TESTE-0001', tipo: 'retirada', status: 'aprovado',
  data_romaneio: '2026-10-22T13:00:00Z', responsavel_retirada: 'Responsável de teste', observacoes: 'Retirada original',
  centro_custo_origem: { codigo: '001', descricao: 'Almoxarifado' },
  centro_custo_destino: { codigo: '002', descricao: 'Obra de teste' },
  romaneios_itens: [{
    id: 'linha-teste', material_equipamento_id: 'material-fora-do-catalogo', quantidade: 3, valor_unitario: 10,
    materiais_equipamentos: { id: 'material-fora-do-catalogo', codigo: '11934', nome: 'RÁDIO COMUNICADOR', unidade_medida: 'UN' },
  }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listar.mockResolvedValue({ data: [romaneio], error: null })
  mocks.calcular.mockResolvedValue({ itensDevolvidos: [{ material_id: 'material-fora-do-catalogo', quantidade_devolvida: 1 }] })
})
afterEach(cleanup)

function abrir() {
  render(<MemoryRouter initialEntries={['/romaneios/novo?tipo=devolucao']}><NovoRomaneioPage /></MemoryRouter>)
}

test('Ver Detalhes abre os itens da retirada sem selecionar ou movimentar o romaneio', async () => {
  abrir()
  fireEvent.click(await screen.findByRole('button', { name: 'Ver Detalhes' }))
  expect(await screen.findByRole('dialog', { name: 'Romaneio ROM-TESTE-0001' })).toBeTruthy()
  expect(screen.getByRole('cell', { name: /11934 RÁDIO COMUNICADOR/ })).toBeTruthy()
  expect(screen.getByRole('cell', { name: 'UN', exact: true })).toBeTruthy()
  expect(screen.getByText('002 · Obra de teste')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Fechar', exact: true }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByRole('button', { name: 'Selecionar', exact: true })).toBeTruthy()
  expect(mocks.criar).not.toHaveBeenCalled()
  expect(mocks.atualizar).not.toHaveBeenCalled()
  expect(mocks.calcular).not.toHaveBeenCalled()
})

test('devolução mostra nome e unidade do item fora do catálogo e mantém o saldo restante', async () => {
  abrir()
  fireEvent.click(await screen.findByRole('button', { name: 'Selecionar', exact: true }))
  await screen.findByText('11934 - RÁDIO COMUNICADOR')
  const item = screen.getByText('11934 - RÁDIO COMUNICADOR').closest('button')!
  expect(item.hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('cell', { name: 'UN', exact: true })).toBeTruthy()
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('2')
  expect(within(item.closest('tr')!).getAllByRole('cell')[2].textContent).toBe('2')
  expect(mocks.criar).not.toHaveBeenCalled()
  expect(mocks.atualizar).not.toHaveBeenCalled()
})


test('editar quantidade permite apagar e digitar zero, mas não salva devolução com quantidade zero', async () => {
  abrir()
  fireEvent.click(await screen.findByRole('button', { name: 'Selecionar', exact: true }))
  await screen.findByText('11934 - RÁDIO COMUNICADOR')
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '' } })
  expect(input.value).toBe('')
  fireEvent.change(input, { target: { value: '0' } })
  expect(input.value).toBe('0')
  fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho', exact: true }))
  expect(mocks.criar).not.toHaveBeenCalled()
  expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Quantidade inválida' }))
})
