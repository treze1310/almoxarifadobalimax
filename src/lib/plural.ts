/**
 * Plural em português, sem emendar sufixo no singular.
 *
 * O jeito que estava — `importação{n !== 1 ? 'ões' : ''}` — produz
 * "2 importaçãoões", porque acrescenta em vez de trocar a terminação. O mesmo
 * padrão escrevia "items" no lugar de "itens". Aqui as duas formas são
 * declaradas, que é o único jeito confiável em português.
 */
export const plural = (quantidade: number, singular: string, plural: string) =>
  Math.abs(quantidade) === 1 ? singular : plural

/** Número e palavra juntos: `contar(2, 'item', 'itens')` → "2 itens" */
export const contar = (quantidade: number, singular: string, formaPlural: string) =>
  `${quantidade} ${plural(quantidade, singular, formaPlural)}`
