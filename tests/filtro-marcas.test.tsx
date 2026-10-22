import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DataTable } from '../src/components/ds/DataTable'

afterEach(cleanup)

test('atualiza marcas recebidas após a montagem e envia o ID da marca selecionada', async () => {
  const onConsulta = vi.fn()
  const tabela = (opcoes: Array<{ rotulo: string; valor: string }>) => <MemoryRouter>
    <DataTable dados={[{ id: '1', marca: 'SAFETY' }]} idLinha={m => m.id}
      colunas={[{ id: 'marca', cabecalho: 'Marca/Modelo', valor: m => m.marca,
        campoServidor: 'marca_id', opcoesFiltro: opcoes }]}
      servidor={{ total: 1, onConsulta }} />
  </MemoryRouter>
  const { rerender } = render(tabela([]))
  rerender(tabela([{ rotulo: 'SAFETY', valor: 'marca-safety' }, { rotulo: 'OUTRA', valor: 'marca-outra' }]))
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar Marca/Modelo' }))
  const busca = screen.getAllByRole('textbox').at(-1)!
  fireEvent.change(busca, { target: { value: 'SAFET' } })
  expect(screen.queryByText('Nenhum valor encontrado')).toBeNull()
  expect(screen.queryByText('OUTRA')).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', { name: 'SAFETY' }))
  await waitFor(() => expect(onConsulta).toHaveBeenLastCalledWith(expect.objectContaining({ filtros: { marca_id: ['marca-safety'] } })))
})
