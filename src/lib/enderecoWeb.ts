/**
 * Endereço de site digitado pelo usuário, pronto para virar link.
 *
 * Ninguém digita "https://" num cadastro, e um href sem protocolo é tratado
 * pelo navegador como caminho relativo — o link levaria para dentro do próprio
 * sistema em vez do site do fornecedor. Aqui o protocolo é completado.
 *
 * Devolve `null` quando não há nada aproveitável, para a tela simplesmente não
 * mostrar o link em vez de mostrar um quebrado.
 */
export const enderecoWeb = (valor: string | null | undefined): string | null => {
  const texto = (valor ?? '').trim()
  if (!texto) return null

  // Precisa ter ao menos um ponto e um domínio plausível
  if (!/^(https?:\/\/)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/.*)?$/i.test(texto)) return null

  return /^https?:\/\//i.test(texto) ? texto : `https://${texto}`
}

/** Versão curta para exibir, sem o protocolo e sem a barra final */
export const enderecoWebLegivel = (valor: string | null | undefined): string =>
  (valor ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
