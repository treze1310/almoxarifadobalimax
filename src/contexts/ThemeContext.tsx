import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface ThemeContextType {
  tema: Tema
  /** Tema efetivamente aplicado, já resolvendo "sistema" */
  temaEfetivo: 'claro' | 'escuro'
  definirTema: (tema: Tema) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const CHAVE = 'balimax:tema'

const lerPreferencia = (): Tema => {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo
  } catch {
    // localStorage pode estar bloqueado (janela privada); cai no padrão
  }
  return 'sistema'
}

const preferenciaDoSistema = (): 'claro' | 'escuro' =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'escuro'
    : 'claro'

/**
 * Tema claro/escuro via variáveis CSS, com a preferência salva por usuário
 * (design system do PRD). A classe `dark` no <html> é o que ativa os tokens do
 * tema escuro já definidos em main.css.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerPreferencia)
  const [temaEfetivo, setTemaEfetivo] = useState<'claro' | 'escuro'>(() =>
    lerPreferencia() === 'sistema' ? preferenciaDoSistema() : (lerPreferencia() as 'claro' | 'escuro'),
  )

  // Aplica a classe no documento e acompanha a preferência do sistema
  useEffect(() => {
    const aplicar = () => {
      const efetivo = tema === 'sistema' ? preferenciaDoSistema() : tema
      setTemaEfetivo(efetivo)
      document.documentElement.classList.toggle('dark', efetivo === 'escuro')
      document.documentElement.style.colorScheme = efetivo === 'escuro' ? 'dark' : 'light'
    }

    aplicar()

    if (tema !== 'sistema') return
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    consulta.addEventListener('change', aplicar)
    return () => consulta.removeEventListener('change', aplicar)
  }, [tema])

  const definirTema = useCallback((novo: Tema) => {
    setTema(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // Sem localStorage a escolha vale só para esta sessão
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ tema, temaEfetivo, definirTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTema() {
  const contexto = useContext(ThemeContext)
  if (!contexto) throw new Error('useTema deve ser usado dentro de um ThemeProvider')
  return contexto
}
