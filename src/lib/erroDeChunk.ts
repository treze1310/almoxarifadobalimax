/**
 * Erro de chunk que não carrega depois de um deploy.
 *
 * Quando uma versão nova sobe, os arquivos da versão antiga somem do servidor.
 * Uma aba aberta desde antes tenta buscar o pedaço antigo ao navegar para uma
 * tela ainda não carregada e quebra com "Failed to fetch dynamically imported
 * module" — um erro que não é da tela, e que uma recarga resolve.
 *
 * A recarga é feita uma vez só, com marca na sessão: sem a marca, uma falha
 * real de rede viraria recarregar em laço.
 */

const MARCA = 'balimax:recarga-por-chunk'

const MENSAGENS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'unable to preload css',
  // Safari e Firefox falam diferente do Chrome
  'module source uri is not allowed',
]

export const ehErroDeChunk = (erro: unknown): boolean => {
  const mensagem = (erro instanceof Error ? erro.message : String(erro ?? '')).toLowerCase()
  return MENSAGENS.some((trecho) => mensagem.includes(trecho))
}

/**
 * Recarrega uma vez quando o erro é de chunk. Devolve `true` quando assumiu o
 * caso — aí a tela de erro nem chega a aparecer.
 */
export const recarregarSeForErroDeChunk = (erro: unknown): boolean => {
  if (!ehErroDeChunk(erro)) return false

  try {
    if (sessionStorage.getItem(MARCA)) return false
    sessionStorage.setItem(MARCA, '1')
  } catch {
    // Sem sessionStorage não há como garantir uma vez só; melhor não recarregar
    return false
  }

  window.location.reload()
  return true
}

/** Chamado quando a aplicação monta inteira: o deploy já foi absorvido */
export const limparMarcaDeRecarga = () => {
  try {
    sessionStorage.removeItem(MARCA)
  } catch {
    // ignorado de propósito
  }
}
