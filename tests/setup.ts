/**
 * Preparação do ambiente de testes.
 *
 * O cliente do Supabase é criado assim que a aplicação monta, e o pacote de
 * realtime procura um WebSocket nativo nesse momento. O Node 24 tem; o Node 22
 * não, e ali o cliente quebra ao ser criado — foi o que derrubou o CI em toda
 * execução enquanto os testes passavam na máquina de desenvolvimento.
 *
 * Nenhum teste abre conexão, então um substituto inerte basta e torna a suíte
 * independente da versão do Node do runner.
 */
if (typeof globalThis.WebSocket === 'undefined') {
  class WebSocketInerte {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3

    readyState = WebSocketInerte.CLOSED
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  }

  ;(globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocketInerte
}
