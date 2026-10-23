/**
 * Espera uma resposta por um tempo e desiste com mensagem.
 *
 * Uma chamada ao banco que nunca responde deixa o botão girando para sempre:
 * a pessoa não sabe se gravou, se falhou ou se está lento, e clica de novo.
 * Acontece quando a sessão precisa ser renovada e a renovação trava (duas abas
 * do sistema abertas disputando o mesmo cadeado de autenticação), ou quando a
 * rede cai no meio da requisição — casos em que a promessa simplesmente não
 * termina.
 *
 * Desistir aqui não cancela o que o banco já estiver fazendo; serve para a tela
 * voltar a responder e dizer o que houve.
 */

export const SEGUNDOS_ATE_DESISTIR = 20

export class TempoEsgotado extends Error {
  constructor(segundos: number) {
    super(
      `O servidor não respondeu em ${segundos} segundos. Verifique a conexão e tente de novo; ` +
        'se o sistema estiver aberto em outra aba, feche-a e recarregue esta.',
    )
    this.name = 'TempoEsgotado'
  }
}

export const comLimiteDeTempo = <T>(
  promessa: PromiseLike<T>,
  segundos = SEGUNDOS_ATE_DESISTIR,
): Promise<T> =>
  new Promise<T>((resolver, rejeitar) => {
    const relogio = setTimeout(() => rejeitar(new TempoEsgotado(segundos)), segundos * 1000)

    Promise.resolve(promessa).then(
      (valor) => {
        clearTimeout(relogio)
        resolver(valor)
      },
      (erro) => {
        clearTimeout(relogio)
        rejeitar(erro)
      },
    )
  })
