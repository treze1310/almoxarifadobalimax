import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Abre automaticamente o registro indicado por `?item=<id>` na URL.
 *
 * É o que faz a paleta de comandos (Ctrl+K) levar ao item pesquisado, e não
 * apenas à listagem. Depois de abrir, o parâmetro é removido da URL para que
 * fechar e reabrir a tela não volte a abrir o mesmo registro.
 *
 * Como a lista chega de forma assíncrona, o efeito espera os dados: enquanto o
 * id não for encontrado, nada acontece.
 */
export function useAbrirItemDaUrl<T>(
  dados: T[] | undefined | null,
  idDoRegistro: (registro: T) => string,
  abrir: (registro: T) => void,
  parametro = 'item',
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const jaAberto = useRef<string | null>(null)

  useEffect(() => {
    const alvo = searchParams.get(parametro)
    if (!alvo || jaAberto.current === alvo) return
    if (!dados || dados.length === 0) return

    const registro = dados.find((item) => idDoRegistro(item) === alvo)
    if (!registro) return

    jaAberto.current = alvo
    abrir(registro)

    const novos = new URLSearchParams(searchParams)
    novos.delete(parametro)
    setSearchParams(novos, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, searchParams])
}
