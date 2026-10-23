import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import UnidadePage from '../src/pages/materiais-equipamentos/Unidade'

vi.mock('@/contexts/PermissionsContext', () => ({ usePermissoes: () => ({ can: () => false }) }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({
  maybeSingle: async () => ({ data: { id: 'peca', material: { id: 'pai', nome: 'Material pai' } }, error: null }),
}) }) }) } }))
afterEach(cleanup)
function Destino() { const location = useLocation(); return <p>{location.pathname + location.search}</p> }
function abrir(entries: string[]) {
  render(<MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}><Routes>
    <Route path="/unidades/:codigo" element={<UnidadePage />} />
    <Route path="/materiais-equipamentos" element={<Destino />} />
  </Routes></MemoryRouter>)
}
test('volta para a tela anterior preservando seus filtros', async () => {
  window.history.replaceState({ idx: 1 }, '', '/')
  abrir(['/materiais-equipamentos?busca=teste', '/unidades/123-1'])
  fireEvent.click(screen.getByRole('button', { name: 'Voltar', exact: true }))
  expect(await screen.findByText('/materiais-equipamentos?busca=teste')).toBeTruthy()
})
test('acesso direto volta para o item pai quando não há tela anterior', async () => {
  window.history.replaceState({ idx: 0 }, '', '/')
  abrir(['/unidades/123-1'])
  await screen.findByRole('link', { name: 'Material pai' })
  fireEvent.click(screen.getByRole('button', { name: 'Voltar', exact: true }))
  expect(await screen.findByText('/materiais-equipamentos?item=pai')).toBeTruthy()
})
