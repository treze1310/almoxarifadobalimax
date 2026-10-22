import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Estado de tela que sobrevive a trocar de tela e voltar.
 *
 * O estado das telas vive em `useState`, que morre quando o componente
 * desmonta: sair da retirada assistida pelo menu e voltar perdia o
 * responsável, a etapa do wizard e os itens já bipados. Aqui o valor fica
 * guardado por usuário e por tela, e volta como estava.
 *
 * Fica em `sessionStorage` por padrão: rascunho é da sessão naquele
 * computador. O almoxarifado tem máquina compartilhada, e rascunho de retirada
 * não deve esperar por semanas nem aparecer para quem entrar depois — por isso
 * `limparRascunhos()` é chamado no logout.
 *
 * Toda leitura e escrita é protegida: em janela anônima, com dados do site
 * bloqueados ou com a cota cheia, o acesso lança — e perder o rascunho é
 * ruim, mas quebrar a tela é pior.
 */

const PREFIXO = 'balimax'
/** Sobe quando o formato guardado muda, para rascunho antigo não ser lido errado */
const VERSAO = 'v1'

interface OpcoesPersistencia {
  /** `session` (padrão) morre ao fechar a aba; `local` atravessa reinício */
  storage?: 'session' | 'local'
  /** Espera antes de gravar; útil para campo de texto (padrão 300 ms) */
  debounceMs?: number
  /** Quem é o dono do rascunho; sem ele a chave é compartilhada pela máquina */
  userId?: string | null
}

interface Guardado<T> {
  versao: string
  valor: T
}

const area = (storage: 'session' | 'local'): Storage | null => {
  try {
    return storage === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const chaveDeRascunho = (chave: string, userId?: string | null) =>
  `${PREFIXO}:${userId ?? 'anonimo'}:${chave}`

const ler = <T,>(chave: string, storage: 'session' | 'local'): T | undefined => {
  try {
    const bruto = area(storage)?.getItem(chave)
    if (!bruto) return undefined

    const guardado = JSON.parse(bruto) as Guardado<T>
    // Formato antigo: melhor começar limpo do que restaurar algo torto
    if (guardado?.versao !== VERSAO) return undefined
    return guardado.valor
  } catch {
    return undefined
  }
}

const gravar = <T,>(chave: string, valor: T, storage: 'session' | 'local') => {
  try {
    const guardado: Guardado<T> = { versao: VERSAO, valor }
    area(storage)?.setItem(chave, JSON.stringify(guardado))
  } catch {
    // Cota cheia ou armazenamento bloqueado: segue sem persistir
  }
}

export const apagarRascunho = (chave: string, opcoes?: OpcoesPersistencia) => {
  const completa = chaveDeRascunho(chave, opcoes?.userId)
  try {
    area(opcoes?.storage ?? 'session')?.removeItem(completa)
  } catch {
    // ignorado de propósito
  }
}

/** Apaga todo rascunho do sistema; usado no logout */
export const limparRascunhos = () => {
  for (const storage of ['session', 'local'] as const) {
    try {
      const alvo = area(storage)
      if (!alvo) continue

      const chaves: string[] = []
      for (let i = 0; i < alvo.length; i += 1) {
        const chave = alvo.key(i)
        if (chave?.startsWith(`${PREFIXO}:`)) chaves.push(chave)
      }
      chaves.forEach((chave) => alvo.removeItem(chave))
    } catch {
      // ignorado de propósito
    }
  }
}

export function usePersistentState<T>(
  chave: string,
  inicial: T,
  opcoes?: OpcoesPersistencia,
): [T, React.Dispatch<React.SetStateAction<T>>, { apagar: () => void; restaurado: boolean }] {
  const storage = opcoes?.storage ?? 'session'
  const debounceMs = opcoes?.debounceMs ?? 300
  const chaveCompleta = chaveDeRascunho(chave, opcoes?.userId)

  // Lido uma vez, na montagem: depois quem manda é o estado
  const guardadoInicial = useRef(ler<T>(chaveCompleta, storage))
  const [valor, setValor] = useState<T>(
    guardadoInicial.current !== undefined ? guardadoInicial.current : inicial,
  )
  const restaurado = guardadoInicial.current !== undefined

  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => gravar(chaveCompleta, valor, storage), debounceMs)

    return () => window.clearTimeout(timer.current)
  }, [chaveCompleta, valor, storage, debounceMs])

  const apagar = useCallback(() => {
    window.clearTimeout(timer.current)
    try {
      area(storage)?.removeItem(chaveCompleta)
    } catch {
      // ignorado de propósito
    }
  }, [chaveCompleta, storage])

  return [valor, setValor, { apagar, restaurado }]
}
