/**
 * Versão do sistema exibida na interface. Fonte única: o campo `version` do
 * package.json, injetado pelo Vite em tempo de build (`__APP_VERSION__`).
 * Antes havia "v1.0.0" no menu e "Versão 0.0.1" no rodapé, ambos fixos.
 */
declare const __APP_VERSION__: string

export const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
