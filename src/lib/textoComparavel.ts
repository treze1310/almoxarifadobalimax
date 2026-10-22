/**
 * Mesma normalização que o banco aplica em `texto_comparavel`.
 *
 * A barra de pesquisa compara com as colunas geradas (`busca_comparavel`,
 * `nome_comparavel`), que já estão sem acento e sem pontuação. Se o termo
 * digitado não passar pela mesma régua, "ação" nunca encontra "acao" e a
 * pesquisa erra justamente nas palavras com acento.
 *
 * Qualquer mudança aqui tem de acompanhar a função do banco, e vice-versa.
 */
export const textoComparavel = (valor: string | null | undefined): string =>
  (valor ?? '')
    .normalize('NFD')
    // Remove os sinais de acento que o NFD separou das letras
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * As palavras do termo digitado, para procurar cada uma separadamente.
 *
 * Procurar a frase inteira exige a mesma ordem do cadastro: "corte disco" não
 * encontrava "DISCO DE CORTE". Procurando palavra por palavra, a ordem deixa
 * de importar.
 */
export const palavrasDaBusca = (valor: string | null | undefined): string[] =>
  textoComparavel(valor)
    .split(' ')
    .filter((palavra) => palavra.length > 0)
