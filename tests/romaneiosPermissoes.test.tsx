import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RomaneiosPage from '../src/pages/romaneios/Romaneios'

const estado = vi.hoisted(() => ({
  admin: false, alterar: true,
  documentos: [{ id: 'doc', numero: 'ROM-TESTE', tipo: 'retirada', status: 'aprovado', data_romaneio: '2026-10-23T12:00:00Z', created_at: '2026-10-23T12:00:00Z', romaneios_itens: [] }],
  buscar: vi.fn(), aprovar: vi.fn(), cancelar: vi.fn(), excluir: vi.fn(),
}))
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissoes: () => ({
  isAdmin: estado.admin,
  // Mesmo com delete concedido no perfil, um não administrador não pode excluir.
  can: (_modulo: string, acao: string) => acao === 'update' ? estado.alterar : true,
}) }))
vi.mock('@/hooks/useRomaneios', () => ({ useRomaneios: () => ({
  romaneios: estado.documentos, loading: false, fetchRomaneios: estado.buscar,
  approveRomaneio: estado.aprovar, cancelRomaneio: estado.cancelar, deleteRomaneio: estado.excluir,
}) }))
vi.mock('@/services/devolucaoService', () => ({ devolucaoService: { calcularStatusDevolucao: vi.fn(async () => ({ status: 'nao_devolvido', percentualDevolvido: 0 })) } }))
vi.mock('@/components/romaneios/StatusDevolucaoLabel', () => ({ default: () => null }))

afterEach(cleanup)
beforeEach(() => { estado.admin = false; estado.alterar = true })

async function abrir() {
  render(<MemoryRouter initialEntries={['/romaneios?item=doc']}><RomaneiosPage /></MemoryRouter>)
  return within(await screen.findByRole('dialog'))
}
test('não administrador pode cancelar conforme update, mas não excluir aprovado', async () => {
  const tela = await abrir()
  expect(tela.queryByRole('button', { name: 'Excluir', exact: true })).toBeNull()
  expect(tela.getByRole('button', { name: 'Cancelar', exact: true })).toBeTruthy()
})
test('perfil somente leitura também não pode cancelar', async () => {
  estado.alterar = false
  const tela = await abrir()
  expect(tela.queryByRole('button', { name: 'Cancelar', exact: true })).toBeNull()
  expect(tela.queryByRole('button', { name: 'Excluir', exact: true })).toBeNull()
})
test('administrador pode excluir romaneio aprovado', async () => {
  estado.admin = true
  const tela = await abrir()
  expect(tela.getByRole('button', { name: 'Excluir', exact: true })).toBeTruthy()
})
