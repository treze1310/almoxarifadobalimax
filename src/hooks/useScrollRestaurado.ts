import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Volta a listagem para onde a pessoa estava.
 *
 * Com a listagem rolada até o item que se estava conferindo, abrir outra tela
 * e voltar jogava tudo de novo para o topo — em 2.209 itens, rolar de novo até
 * achar o lugar é trabalho perdido. Guardado por rota, na sessão.
 *
 * Fica fora do `usePersistentState` porque não é rascunho do usuário: é a
 * posição da tela, não dado digitado, e se perder não custa nada.
 */

const CHAVE = 'balimax:scroll'

const lerMapa = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export const useScrollRestaurado = (pronto = true) => {
  const { pathname } = useLocation()
  const restaurado = useRef(false)

  // Guardar a posição enquanto a pessoa rola
  useEffect(() => {
    const guardar = () => {
      try {
        const mapa = lerMapa()
        mapa[pathname] = window.scrollY
        sessionStorage.setItem(CHAVE, JSON.stringify(mapa))
      } catch {
        // Armazenamento bloqueado: a tela segue funcionando sem isto
      }
    }

    window.addEventListener('scroll', guardar, { passive: true })
    return () => {
      guardar()
      window.removeEventListener('scroll', guardar)
    }
  }, [pathname])

  // Restaurar uma vez, quando a lista já tem altura para rolar
  useEffect(() => {
    if (!pronto || restaurado.current) return

    const alvo = lerMapa()[pathname]
    if (!alvo) {
      restaurado.current = true
      return
    }

    restaurado.current = true
    // Em dois quadros: o primeiro deixa a tabela ocupar a altura dela
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: alvo, behavior: 'auto' })),
    )
  }, [pronto, pathname])
}
