/**
 * Mapa central de status do sistema (design system).
 *
 * Regra do PRD: cada status tem **cor fixa no sistema inteiro** e nenhum módulo
 * define cor de status localmente. Antes, "aprovado" aparecia em minúsculas num
 * módulo e "Aprovada" em outro, e "Concluída" e "Aprovada" usavam a mesma cor.
 *
 * As cores vêm dos tokens `--status-*` em main.css.
 */

export type StatusCanonico =
  | 'rascunho'
  | 'pendente'
  | 'aprovado'
  | 'concluido'
  | 'rejeitado'
  | 'cancelado'
  | 'em_andamento'
  | 'ativo'
  | 'inativo'

export interface DefinicaoStatus {
  /** Rótulo exibido, sempre com inicial maiúscula */
  rotulo: string
  /** Classe utilitária do badge (fundo suave + texto na cor do status) */
  classe: string
}

/**
 * Rótulos variam conforme o gênero do documento: "romaneio aprovado",
 * "solicitação aprovada". O segundo rótulo cobre os documentos femininos.
 */
export const STATUS: Record<StatusCanonico, DefinicaoStatus & { rotuloFeminino?: string }> = {
  rascunho: {
    rotulo: 'Rascunho',
    classe: 'bg-status-rascunho/12 text-status-rascunho border-status-rascunho/25',
  },
  pendente: {
    rotulo: 'Pendente',
    classe: 'bg-status-pendente/15 text-status-pendente border-status-pendente/30',
  },
  aprovado: {
    rotulo: 'Aprovado',
    rotuloFeminino: 'Aprovada',
    classe: 'bg-status-aprovado/12 text-status-aprovado border-status-aprovado/25',
  },
  concluido: {
    rotulo: 'Concluído',
    rotuloFeminino: 'Concluída',
    classe: 'bg-status-concluido/12 text-status-concluido border-status-concluido/25',
  },
  rejeitado: {
    rotulo: 'Rejeitado',
    rotuloFeminino: 'Rejeitada',
    classe: 'bg-status-rejeitado/12 text-status-rejeitado border-status-rejeitado/25',
  },
  cancelado: {
    rotulo: 'Cancelado',
    rotuloFeminino: 'Cancelada',
    // Cinza riscado, conforme o PRD
    classe:
      'bg-status-cancelado/10 text-status-cancelado border-status-cancelado/25 line-through decoration-1',
  },
  em_andamento: {
    rotulo: 'Em andamento',
    classe: 'bg-status-pendente/15 text-status-pendente border-status-pendente/30',
  },
  /**
   * Cadastro ligado/desligado é outra coisa que documento concluído.
   *
   * `ativo` caía em "concluido" e `inativo` em "cancelado": um fornecedor
   * ativo aparecia como "Concluído" e um inativo como "Cancelado" riscado.
   * O rótulo certo é Ativo/Inativo, e inativo não se risca — o registro não
   * foi cancelado, só está desligado.
   */
  ativo: {
    rotulo: 'Ativo',
    rotuloFeminino: 'Ativa',
    classe: 'bg-status-concluido/12 text-status-concluido border-status-concluido/25',
  },
  inativo: {
    rotulo: 'Inativo',
    rotuloFeminino: 'Inativa',
    classe: 'bg-muted text-muted-foreground border-border',
  },
}

/**
 * Normaliza os muitos jeitos como o status chega do banco e da interface
 * ("aprovado", "Aprovada", "concluida", "Concluída", "lançada"…) para a chave
 * canônica do mapa.
 */
export const normalizarStatus = (status: string | null | undefined): StatusCanonico | null => {
  if (!status) return null

  const limpo = status
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')

  const equivalencias: Record<string, StatusCanonico> = {
    rascunho: 'rascunho',
    draft: 'rascunho',
    pendente: 'pendente',
    pendentes: 'pendente',
    aguardando_aprovacao: 'pendente',
    em_analise: 'pendente',
    importado: 'pendente',
    importada: 'pendente',
    aprovado: 'aprovado',
    aprovada: 'aprovado',
    aprovadas: 'aprovado',
    conferida: 'aprovado',
    retirado: 'aprovado',
    concluido: 'concluido',
    concluida: 'concluido',
    devolvido: 'concluido',
    lancada: 'concluido',
    lancado: 'concluido',
    atendida: 'concluido',
    ativo: 'ativo',
    ativa: 'ativo',
    rejeitado: 'rejeitado',
    rejeitada: 'rejeitado',
    negado: 'rejeitado',
    negada: 'rejeitado',
    cancelado: 'cancelado',
    cancelada: 'cancelado',
    inativo: 'inativo',
    inativa: 'inativo',
    em_andamento: 'em_andamento',
    em_separacao: 'em_andamento',
    em_compra: 'em_andamento',
  }

  return equivalencias[limpo] ?? null
}

/** Rótulo pronto para exibição, no gênero do documento */
export const rotuloStatus = (
  status: string | null | undefined,
  genero: 'masculino' | 'feminino' = 'masculino',
) => {
  const chave = normalizarStatus(status)
  if (!chave) return status || '—'
  const definicao = STATUS[chave]
  return genero === 'feminino' ? (definicao.rotuloFeminino ?? definicao.rotulo) : definicao.rotulo
}
