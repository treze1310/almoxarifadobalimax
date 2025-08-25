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