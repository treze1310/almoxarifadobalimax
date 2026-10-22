/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { limparMarcaDeRecarga } from './lib/erroDeChunk'

// Em producao, silencia os logs de depuracao (console.log/debug/info) para nao
// expor estrutura interna no console do usuario. console.warn e console.error
// continuam ativos, pois sao usados pelo ErrorBoundary e pela auditoria.
if (!import.meta.env.DEV) {
  const silenciar = () => {}
  console.log = silenciar
  console.debug = silenciar
  console.info = silenciar
}

// A aplicação montou: se houve recarga por deploy, ela cumpriu o papel e a
// marca sai do caminho da próxima.
limparMarcaDeRecarga()

createRoot(document.getElementById('root')!).render(<App />)
