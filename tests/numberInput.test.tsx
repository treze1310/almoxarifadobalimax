import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Input } from '../src/components/ui/input'

afterEach(cleanup)

function Campo({ inicial = 0, decimal = false }: { inicial?: number; decimal?: boolean }) {
  const [value, setValue] = useState(inicial)
  return <><Input aria-label="Quantidade" type="number" value={value} step={decimal ? '0.01' : undefined} onChange={e => setValue(Number(e.target.value))} /><output data-testid="numero">{value}</output></>
}

test('todos os Input numéricos usam edição por texto com teclado numérico', () => {
  render(<Campo />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  expect(input.type).toBe('text')
  expect(input.inputMode).toBe('numeric')
  expect(input.value).toBe('0')
})

test('Backspace pode esvaziar o campo sem o zero reaparecer; zero continua sendo um valor', () => {
  render(<Campo inicial={25} />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '' } })
  expect(input.value).toBe('')
  fireEvent.blur(input)
  expect(input.value).toBe('')
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '0' } })
  expect(input.value).toBe('0')
  expect(screen.getByTestId('numero').textContent).toBe('0')
})

test('seleciona o valor ao receber foco e elimina zeros à esquerda durante a edição', () => {
  render(<Campo inicial={0} />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  fireEvent.focus(input)
  expect(input.selectionStart).toBe(0)
  expect(input.selectionEnd).toBe(1)
  fireEvent.change(input, { target: { value: '005' } })
  expect(input.value).toBe('5')
  expect(screen.getByTestId('numero').textContent).toBe('5')
})

test('permite digitar centavos com vírgula, sem apagar o separador intermediário', () => {
  render(<Campo decimal />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '0,' } })
  expect(input.value).toBe('0,')
  fireEvent.change(input, { target: { value: '0,50' } })
  expect(input.value).toBe('0,50')
  expect(screen.getByTestId('numero').textContent).toBe('0.5')
  fireEvent.blur(input)
  expect(input.value).toBe('0.5')
})

test('campos opcionais podem ser limpos sem enviar NaN e acompanham resets externos', () => {
  const onChange = vi.fn()
  const { rerender } = render(<Input type="number" value={5} onChange={onChange} />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '' } })
  expect(onChange.mock.calls[0][0].target.value).toBe('')
  fireEvent.blur(input)
  rerender(<Input type="number" value={undefined} onChange={onChange} />)
  expect(input.value).toBe('')
  rerender(<Input type="number" value={9} onChange={onChange} />)
  expect(input.value).toBe('9')
})

test('digitar zero não corrige silenciosamente para um, e limites continuam validados', () => {
  render(<Input type="number" min={1} max={10} defaultValue={1} />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '0' } })
  expect(input.value).toBe('0')
  expect(input.checkValidity()).toBe(false)
  fireEvent.change(input, { target: { value: '5' } })
  expect(input.checkValidity()).toBe(true)
  fireEvent.change(input, { target: { value: '11' } })
  expect(input.checkValidity()).toBe(false)
})

test('campos de texto comuns não mudam de comportamento', () => {
  render(<Input aria-label="Código" value="00015" readOnly />)
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('00015')
})
