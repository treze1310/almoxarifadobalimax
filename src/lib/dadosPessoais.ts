/**
 * Mascaramento de dados pessoais (RF-06 / RNF-06).
 *
 * Regra: em listagens, dado pessoal aparece sempre mascarado. O valor completo
 * só é exibido no detalhe, para perfis autorizados, e o acesso fica registrado
 * na trilha de auditoria.
 */

const digitos = (valor: string | null | undefined) => (valor ?? '').replace(/\D/g, '')

/** 123.456.789-00 */
export const formatarCPF = (cpf: string | null | undefined) => {
  const n = digitos(cpf)
  if (n.length !== 11) return cpf || '-'
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** ***.456.789-** — preserva os dígitos do meio, suficientes para conferência */
export const mascararCPF = (cpf: string | null | undefined) => {
  const n = digitos(cpf)
  if (n.length !== 11) return cpf ? '***' : '-'
  return `***.${n.slice(3, 6)}.${n.slice(6, 9)}-**`
}

/** 12.345.678/0001-99 */
export const formatarCNPJ = (cnpj: string | null | undefined) => {
  const n = digitos(cnpj)
  if (n.length !== 14) return cnpj || '-'
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/** (91) 99999-9999 */
export const formatarTelefone = (telefone: string | null | undefined) => {
  const n = digitos(telefone)
  if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return telefone || '-'
}

/** (91) 9****-**99 */
export const mascararTelefone = (telefone: string | null | undefined) => {
  const n = digitos(telefone)
  if (n.length < 10) return telefone ? '***' : '-'
  return `(${n.slice(0, 2)}) ${n.slice(2, 3)}****-**${n.slice(-2)}`
}

/** jo****@empresa.com.br */
export const mascararEmail = (email: string | null | undefined) => {
  if (!email || !email.includes('@')) return email || '-'
  const [usuario, dominio] = email.split('@')
  const visivel = usuario.slice(0, 2)
  return `${visivel}${'*'.repeat(Math.max(usuario.length - 2, 2))}@${dominio}`
}

/**
 * Capitaliza cargos e setores, que hoje vêm com capitalização mista do
 * cadastro ("ENCARREGADO", "auxiliar de obras").
 */
export const capitalizarTexto = (texto: string | null | undefined) => {
  if (!texto) return '-'
  const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o']
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, i) =>
      i > 0 && minusculas.includes(palavra)
        ? palavra
        : palavra.charAt(0).toUpperCase() + palavra.slice(1),
    )
    .join(' ')
}
