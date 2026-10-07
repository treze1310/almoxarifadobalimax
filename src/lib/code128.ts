/**
 * Codificador Code 128 (subconjunto B) para as etiquetas de item.
 *
 * Escrito à mão, sem dependência nova: o projeto ainda tem três lockfiles e a
 * escolha do gerenciador de pacotes está em aberto, então acrescentar um
 * pacote agora deixaria o problema pior. Code 128 é o que os leitores comuns
 * (USB e os de celular) leem melhor, e é um dos formatos que a câmera do
 * assistente de retirada já procura.
 *
 * O conjunto B cobre os caracteres imprimíveis de espaço a `~`, que é mais do
 * que os códigos do almoxarifado usam.
 */

/** Padrões de barra/espaço dos 107 símbolos, na ordem dos valores do Code 128 */
const PADROES = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '11000111010',
]

const INICIO_B = 104
const PARADA = '1100011101011'

/** Valor Code 128B de um caractere: espaço (32) é 0, e daí por diante */
const valorDoCaractere = (caractere: string) => caractere.charCodeAt(0) - 32

export const podeCodificar = (texto: string) =>
  texto.length > 0 && [...texto].every((c) => {
    const valor = valorDoCaractere(c)
    return valor >= 0 && valor <= 94
  })

/**
 * Devolve o código como sequência de barras e espaços: '1' é barra, '0' é
 * espaço, cada um com a largura de um módulo. Quem desenha decide quanto vale
 * um módulo em milímetros.
 *
 * Lança quando o texto tem caractere fora do conjunto B — melhor falhar na
 * geração do que imprimir uma etiqueta que nenhum leitor lê.
 */
export const code128b = (texto: string): string => {
  if (!podeCodificar(texto)) {
    throw new Error(`"${texto}" tem caractere que o Code 128B não representa`)
  }

  const valores = [...texto].map(valorDoCaractere)

  // Dígito verificador: módulo 103 da soma ponderada pela posição
  let soma = INICIO_B
  valores.forEach((valor, indice) => {
    soma += valor * (indice + 1)
  })
  const verificador = soma % 103

  return [
    PADROES[INICIO_B],
    ...valores.map((valor) => PADROES[valor]),
    PADROES[verificador],
    PARADA,
  ].join('')
}

/**
 * Agrupa a sequência em barras para desenhar: cada item diz onde a barra
 * começa (em módulos) e quantos módulos ela ocupa. Os espaços ficam de fora.
 */
export const barrasDoCodigo = (texto: string): Array<{ inicio: number; largura: number }> => {
  const sequencia = code128b(texto)
  const barras: Array<{ inicio: number; largura: number }> = []

  let posicao = 0
  while (posicao < sequencia.length) {
    const atual = sequencia[posicao]
    let largura = 1
    while (sequencia[posicao + largura] === atual) largura++

    if (atual === '1') barras.push({ inicio: posicao, largura })
    posicao += largura
  }

  return barras
}

/** Largura total do código, em módulos */
export const larguraEmModulos = (texto: string) => code128b(texto).length
