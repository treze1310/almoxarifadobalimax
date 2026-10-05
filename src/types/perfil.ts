export interface PerfilAcesso {
  id: string
  nome: string
  descricao?: string
  permissoes: PermissoesPerfil
  ativo: boolean
  sistema: boolean
  created_at: string
  updated_at: string
}

export interface PermissoesPerfil {
  // Dashboard
  dashboard?: PermissaoModulo
  
  // Materiais e Equipamentos
  materiais?: PermissaoModulo
  
  // Romaneios
  romaneios?: PermissaoModulo
  
  // Solicitações
  solicitacoes?: PermissaoModulo
  
  // Relatórios
  relatorios?: PermissaoModulo
  
  // Cadastros (Empresas, Fornecedores, Colaboradores, etc)
  empresas?: PermissaoModulo
  fornecedores?: PermissaoModulo
  colaboradores?: PermissaoModulo
  centros_custo?: PermissaoModulo
  marcas?: PermissaoModulo
  localizacao?: PermissaoModulo
  
  // NFe
  nfe?: PermissaoModulo
  
  // Usuários e Configurações
  usuarios?: PermissaoModulo
  configuracoes?: PermissaoModulo
  
  // Outros módulos
  [key: string]: PermissaoModulo | undefined
}

export interface PermissaoModulo {
  read?: boolean      // Visualizar/Listar
  create?: boolean    // Criar
  update?: boolean    // Editar
  delete?: boolean    // Excluir
  export?: boolean    // Exportar
  approve?: boolean   // Aprovar
  manage?: boolean    // Gerenciar (operações administrativas)
  [key: string]: boolean | undefined
}

export interface PerfilFormData {
  nome: string
  descricao?: string
  permissoes: PermissoesPerfil
  ativo: boolean
}

// Definição dos módulos disponíveis no sistema
export const MODULOS_SISTEMA = {
  dashboard: {
    label: 'Dashboard',
    description: 'Painel principal do sistema',
    permissions: ['read']
  },
  materiais: {
    label: 'Materiais e Equipamentos', 
    description: 'Gestão de materiais e equipamentos',
    permissions: ['read', 'create', 'update', 'delete', 'export']
  },
  romaneios: {
    label: 'Romaneios',
    description: 'Gestão de romaneios de materiais',
    permissions: ['read', 'create', 'update', 'delete', 'approve']
  },
  solicitacoes: {
    label: 'Solicitações',
    description: 'Solicitações de materiais',
    permissions: ['read', 'create', 'update', 'delete', 'approve']
  },
  estoque: {
    label: 'Estoque / Movimentações',
    description: 'Entradas, saídas e ajustes de estoque',
    permissions: ['read', 'create', 'update', 'manage']
  },
  epi: {
    label: 'EPIs',
    description: 'Controle de EPIs e entregas',
    permissions: ['read', 'create', 'update', 'delete']
  },
  relatorios: {
    label: 'Relatórios',
    description: 'Relatórios e análises',
    permissions: ['read', 'export']
  },
  empresas: {
    label: 'Empresas',
    description: 'Cadastro de empresas',
    permissions: ['read', 'create', 'update', 'delete']
  },
  fornecedores: {
    label: 'Fornecedores',
    description: 'Cadastro de fornecedores',
    permissions: ['read', 'create', 'update', 'delete']
  },
  colaboradores: {
    label: 'Colaboradores',
    description: 'Cadastro de colaboradores',
    permissions: ['read', 'create', 'update', 'delete']
  },
  centros_custo: {
    label: 'Centros de Custo',
    description: 'Cadastro de centros de custo',
    permissions: ['read', 'create', 'update', 'delete']
  },
  marcas: {
    label: 'Marcas',
    description: 'Cadastro de marcas de materiais',
    permissions: ['read', 'create', 'update', 'delete']
  },
  localizacao: {
    label: 'Localização',
    description: 'Gestão de localizações físicas',
    permissions: ['read', 'create', 'update', 'delete']
  },
  nfe: {
    label: 'Nota Fiscal Eletrônica',
    description: 'Gestão de NFe',
    permissions: ['read', 'create', 'update', 'delete']
  },
  usuarios: {
    label: 'Usuários',
    description: 'Gestão de usuários do sistema',
    permissions: ['read', 'create', 'update', 'delete']
  },
  configuracoes: {
    label: 'Configurações',
    description: 'Configurações do sistema',
    permissions: ['read', 'update']
  }
} as const

export const PERMISSION_LABELS = {
  read: 'Visualizar',
  create: 'Criar',
  update: 'Editar', 
  delete: 'Excluir',
  export: 'Exportar',
  approve: 'Aprovar',
  manage: 'Gerenciar'
} as const

export type ModuloSistema = keyof typeof MODULOS_SISTEMA
export type TipoPermissao = keyof typeof PERMISSION_LABELS

// ---------------------------------------------------------------------------
// Perfis de acesso padrão do sistema
// ---------------------------------------------------------------------------

const ALL = ['read', 'create', 'update', 'delete', 'export', 'approve', 'manage'] as const

/** Monta um PermissaoModulo a partir da lista de permissões concedidas */
const perm = (...granted: TipoPermissao[]): PermissaoModulo =>
  ALL.reduce((acc, key) => {
    acc[key] = granted.includes(key)
    return acc
  }, {} as PermissaoModulo)

const SOMENTE_LEITURA = perm('read')
const NENHUM = perm()

export interface PerfilPadrao {
  nome: string
  descricao: string
  permissoes: PermissoesPerfil
}

/**
 * Perfis pré-definidos. Servem de base para o seed do banco e para o botão
 * "Restaurar padrão" na tela de Configurações → Perfis de Acesso.
 */
export const PERFIS_PADRAO: PerfilPadrao[] = [
  {
    nome: 'Administrador',
    descricao: 'Acesso total ao sistema, incluindo usuários, perfis e configurações',
    permissoes: {
      dashboard: perm('read'),
      materiais: perm(...ALL),
      estoque: perm(...ALL),
      epi: perm(...ALL),
      romaneios: perm(...ALL),
      solicitacoes: perm(...ALL),
      relatorios: perm(...ALL),
      empresas: perm(...ALL),
      fornecedores: perm(...ALL),
      colaboradores: perm(...ALL),
      centros_custo: perm(...ALL),
      marcas: perm(...ALL),
      localizacao: perm(...ALL),
      nfe: perm(...ALL),
      usuarios: perm(...ALL),
      configuracoes: perm(...ALL),
    },
  },
  {
    nome: 'Almoxarife',
    descricao:
      'Operação do almoxarifado: materiais, estoque, romaneios, EPIs e cadastros de apoio',
    permissoes: {
      dashboard: perm('read'),
      materiais: perm('read', 'create', 'update', 'export'),
      estoque: perm('read', 'create', 'update', 'manage'),
      epi: perm('read', 'create', 'update'),
      romaneios: perm('read', 'create', 'update', 'approve'),
      solicitacoes: perm('read', 'create', 'update'),
      relatorios: perm('read', 'export'),
      empresas: SOMENTE_LEITURA,
      fornecedores: perm('read', 'create', 'update'),
      colaboradores: perm('read', 'create', 'update'),
      centros_custo: SOMENTE_LEITURA,
      marcas: perm('read', 'create', 'update'),
      localizacao: perm('read', 'create', 'update', 'delete'),
      nfe: perm('read', 'create', 'update'),
      usuarios: NENHUM,
      configuracoes: SOMENTE_LEITURA,
    },
  },
  {
    nome: 'Gerente',
    descricao:
      'Gestão operacional: acompanha o almoxarifado, aprova romaneios e solicitações e extrai relatórios',
    permissoes: {
      dashboard: perm('read'),
      materiais: perm('read', 'update', 'export'),
      estoque: perm('read'),
      epi: perm('read'),
      romaneios: perm('read', 'update', 'approve'),
      solicitacoes: perm('read', 'create', 'update', 'approve'),
      relatorios: perm('read', 'export', 'manage'),
      empresas: SOMENTE_LEITURA,
      fornecedores: perm('read', 'update'),
      colaboradores: perm('read', 'update'),
      centros_custo: SOMENTE_LEITURA,
      marcas: SOMENTE_LEITURA,
      localizacao: SOMENTE_LEITURA,
      nfe: SOMENTE_LEITURA,
      usuarios: SOMENTE_LEITURA,
      configuracoes: SOMENTE_LEITURA,
    },
  },
  {
    nome: 'Diretor',
    descricao:
      'Visão estratégica e aprovação final. Consulta e relatórios, sem operação do almoxarifado',
    permissoes: {
      dashboard: perm('read'),
      materiais: perm('read', 'export'),
      estoque: perm('read'),
      epi: perm('read'),
      romaneios: perm('read', 'approve'),
      solicitacoes: perm('read', 'approve'),
      relatorios: perm('read', 'export', 'manage'),
      empresas: SOMENTE_LEITURA,
      fornecedores: SOMENTE_LEITURA,
      colaboradores: SOMENTE_LEITURA,
      centros_custo: SOMENTE_LEITURA,
      marcas: SOMENTE_LEITURA,
      localizacao: SOMENTE_LEITURA,
      nfe: SOMENTE_LEITURA,
      usuarios: SOMENTE_LEITURA,
      configuracoes: SOMENTE_LEITURA,
    },
  },
  {
    nome: 'Comprador',
    descricao:
      'Compras: atende solicitações, gerencia fornecedores e lança notas fiscais de entrada',
    permissoes: {
      dashboard: perm('read'),
      materiais: perm('read', 'create', 'update', 'export'),
      estoque: perm('read'),
      epi: perm('read'),
      romaneios: perm('read'),
      solicitacoes: perm('read', 'create', 'update'),
      relatorios: perm('read', 'export'),
      empresas: SOMENTE_LEITURA,
      fornecedores: perm('read', 'create', 'update', 'delete'),
      colaboradores: SOMENTE_LEITURA,
      centros_custo: SOMENTE_LEITURA,
      marcas: perm('read', 'create', 'update'),
      localizacao: SOMENTE_LEITURA,
      nfe: perm('read', 'create', 'update', 'delete'),
      usuarios: NENHUM,
      configuracoes: NENHUM,
    },
  },
]
