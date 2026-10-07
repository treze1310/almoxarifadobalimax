/**
 * Consulta que atravessa o limite de 1.000 linhas da API do Supabase.
 *
 * O PostgREST corta toda resposta em 1.000 linhas, **sem erro nenhum**: a
 * consulta volta "com sucesso" trazendo só parte dos dados. Com 78 materiais
 * isso nunca apareceu; com os 2.209 vindos do sistema antigo, a tela passou a
 * mostrar 1.000 e os relatórios a somar só parte do estoque.
 *
 * Quem precisa da tabela inteira usa esta função, que vai buscando página por
 * página até a última.
 */

const TAMANHO_PAGINA = 1000

interface RespostaPagina<T> {
  data: T[] | null
  error: { message: string } | null
}

/**
 * `construir` recebe o intervalo e devolve a consulta já com `.range(de, ate)`.
 * Exemplo:
 *
 * ```ts
 * const { data, error } = await buscarTodasAsPaginas((de, ate) =>
 *   supabase.from('materiais_equipamentos').select('*').order('codigo').range(de, ate),
 * )
 * ```
 *
 * A ordenação importa: sem `order`, o banco não garante a mesma sequência
 * entre uma página e outra, e linhas podem se repetir ou sumir.
 */
export async function buscarTodasAsPaginas<T>(
  construir: (de: number, ate: number) => PromiseLike<RespostaPagina<T>>,
  opcoes?: { tamanhoPagina?: number; maximoDePaginas?: number },
): Promise<{ data: T[]; error: { message: string } | null }> {
  const tamanho = opcoes?.tamanhoPagina ?? TAMANHO_PAGINA
  // Trava de segurança: uma consulta que não termina é pior que uma incompleta
  const maximo = opcoes?.maximoDePaginas ?? 100
  const todas: T[] = []

  for (let pagina = 0; pagina < maximo; pagina++) {
    const de = pagina * tamanho
    const { data, error } = await construir(de, de + tamanho - 1)

    if (error) return { data: todas, error }
    if (!data || data.length === 0) break

    todas.push(...data)
    if (data.length < tamanho) break
  }

  return { data: todas, error: null }
}

/**
 * Mesma ideia, para quem já tem a consulta montada: o construtor do Supabase
 * aceita `.range()` de novo a cada chamada, então dá para percorrer as
 * páginas reaproveitando a mesma consulta.
 *
 * ```ts
 * const { data, error } = await executarPaginado(query.order('codigo'))
 * ```
 *
 * Sem `order` o banco não garante a mesma sequência entre páginas, e linhas
 * podem repetir ou sumir — ordene antes de passar.
 */
export async function executarPaginado<T>(
  query: { range: (de: number, ate: number) => PromiseLike<RespostaPagina<T>> },
  opcoes?: { tamanhoPagina?: number; maximoDePaginas?: number },
) {
  return buscarTodasAsPaginas<T>((de, ate) => query.range(de, ate), opcoes)
}
