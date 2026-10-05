import React from 'react'
import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

/**
 * O App usa BrowserRouter com basename "/sistema" e rotas em React.lazy.
 * Por isso o teste precisa (1) posicionar a URL dentro do basename, senão
 * nenhuma rota casa e nada é renderizado, e (2) esperar o conteúdo assíncrono.
 */
test(
  'a aplicação monta e renderiza a tela de login',
  async () => {
    window.history.pushState({}, '', '/sistema/login')

    render(<App />)

    const conteudo = await screen.findAllByText(
      /entrar|login|senha|e-?mail/i,
      {},
      { timeout: 10000 },
    )
    expect(conteudo.length).toBeGreaterThan(0)
  },
  20000,
)
