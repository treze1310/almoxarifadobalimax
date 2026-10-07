/**
 * Leitura e escrita de CSV para a importação em lote (RF-11).
 *
 * Escrito para o CSV que sai do Excel em português, que é o que o
 * almoxarifado vai usar: separador `;`, BOM no começo, quebra de linha CRLF e
 * número com vírgula decimal. Também aceita `,` e TAB, porque quem exporta do
 * Google Planilhas recebe vírgula.
 */

/** Descobre o separador olhando a primeira linha fora das aspas */
export const detectarSeparador = (texto: string): string => {
  const primeiraLinha = texto.split(/\r?\n/)[0] ?? ''
  const candidatos = [';', ',', '\t']

  let melhor = ';'
  let maiorContagem = 0

  for (const separador of candidatos) {
    let contagem = 0
    let dentroDeAspas = false

    for (let i = 0; i < primeiraLinha.length; i++) {
      const caractere = primeiraLinha[i]
      if (caractere === '"') dentroDeAspas = !dentroDeAspas
      else if (caractere === separador && !dentroDeAspas) contagem++
    }

    if (contagem > maiorContagem) {
      maiorContagem = contagem
      melhor = separador
    }
  }

  return melhor
}

/**
 * Converte o CSV em linhas de células. Trata aspas, aspas duplicadas (`""`
 * vira `"`), separador e quebra de linha dentro do campo entre aspas.
 */
export const lerCSV = (texto: string, separador?: string): string[][] => {
  // O BOM do Excel vira parte do primeiro cabeçalho se não for removido
  const limpo = texto.replace(/^\uFEFF/, '')
  const sep = separador ?? detectarSeparador(limpo)

  const linhas: string[][] = []
  let celulas: string[] = []
  let celula = ''
  let dentroDeAspas = false

  for (let i = 0; i < limpo.length; i++) {
    const caractere = limpo[i]

    if (dentroDeAspas) {
      if (caractere === '"') {
        if (limpo[i + 1] === '"') {
          celula += '"'
          i++
        } else {
          dentroDeAspas = false
        }
      } else {
        celula += caractere
      }
      continue
    }

    if (caractere === '"') {
      dentroDeAspas = true
    } else if (caractere === sep) {
      celulas.push(celula)
      celula = ''
    } else if (caractere === '\n') {
      celulas.push(celula)
      linhas.push(celulas)
      celulas = []
      celula = ''
    } else if (caractere !== '\r') {
      celula += caractere
    }
  }

  // Última célula, quando o arquivo não termina com quebra de linha
  if (celula !== '' || celulas.length > 0) {
    celulas.push(celula)
    linhas.push(celulas)
  }

  // Linhas totalmente vazias (o Excel costuma deixar uma no fim)
  return linhas.filter((linha) => linha.some((valor) => valor.trim() !== ''))
}

/**
 * Lê o CSV como objetos, usando a primeira linha como cabeçalho. Os nomes de
 * coluna são normalizados (sem acento, minúsculos, espaço vira `_`) para que
 * "Estoque Mínimo", "estoque minimo" e "estoque_minimo" cheguem na mesma
 * chave.
 */
export const normalizarCabecalho = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

export const lerCSVComCabecalho = (
  texto: string,
): { colunas: string[]; linhas: Record<string, string>[] } => {
  const bruto = lerCSV(texto)
  if (bruto.length === 0) return { colunas: [], linhas: [] }

  const colunas = bruto[0].map(normalizarCabecalho)
  const linhas = bruto.slice(1).map((celulas) => {
    const registro: Record<string, string> = {}
    colunas.forEach((coluna, indice) => {
      registro[coluna] = (celulas[indice] ?? '').trim()
    })
    return registro
  })

  return { colunas, linhas }
}

/**
 * Número vindo do Excel em português: "1.234,56" é mil duzentos e trinta e
 * quatro. Devolve `null` quando a célula está vazia e `NaN` quando não é
 * número — quem chama decide o que fazer com cada caso.
 */
export const lerNumero = (valor: string | undefined): number | null => {
  const texto = (valor ?? '').trim()
  if (texto === '') return null

  // Só trata como separador de milhar quando a vírgula também aparece
  const semMilhar = texto.includes(',') ? texto.replace(/\./g, '') : texto
  return Number(semMilhar.replace(',', '.'))
}

/** "sim", "não", "1", "true", "x" — o que o pessoal digita numa planilha */
export const lerBooleano = (valor: string | undefined): boolean | null => {
  const texto = normalizarCabecalho(valor ?? '')
  if (texto === '') return null
  if (['sim', 's', '1', 'true', 'verdadeiro', 'x', 'ativo'].includes(texto)) return true
  if (['nao', 'n', '0', 'false', 'falso', 'inativo'].includes(texto)) return false
  return null
}

/** Monta um CSV que o Excel em português abre com as colunas separadas */
export const escreverCSV = (colunas: string[], linhas: Array<Array<string | number | null>>) => {
  const escapar = (valor: string | number | null) => {
    const texto = valor === null || valor === undefined ? '' : String(valor)
    return `"${texto.replace(/"/g, '""')}"`
  }

  return (
    '\uFEFF' +
    [colunas.map(escapar).join(';'), ...linhas.map((linha) => linha.map(escapar).join(';'))].join(
      '\r\n',
    )
  )
}

/** Baixa o conteúdo como arquivo .csv */
export const baixarCSV = (conteudo: string, nomeArquivo: string) => {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
