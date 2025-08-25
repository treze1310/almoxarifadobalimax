export interface User {
  id: string
  email: string
  nome: string
  perfil: UserProfile
  centro_custo_id?: string
  ativo: boolean
  created_at: string
  updated_at: string
  ultimo_acesso?: string
}

export type UserProfile = 
  | 'administrador'
  | 'almoxarife'
  | 'supervisor'
  | 'solicitante'
  | 'visualizador'

export interface UserPermissions {
  // Dashboard
  dashboard_view: boolean
  
  // Materiais e Equipamentos
  materiais_view: boolean
  materiais_create: boolean
  materiais_edit: boolean
  materiais_delete: boolean
  materiais_export: boolean
  
  // Romaneios
  romaneios_view: boolean
  romaneios_create: boolean
  romaneios_edit: boolean
  romaneios_delete: boolean
  romaneios_approve: boolean
  romaneios_receive: boolean
  
  // Solicitações
  solicitacoes_view: boolean
  solicitacoes_create: boolean
  solicitacoes_edit: boolean
  solicitacoes_delete: boolean
  solicitacoes_approve: boolean
  
  // Relatórios
  relatorios_view: boolean
  relatorios_export: boolean
  relatorios_financeiros: boolean
  
  // Cadastros - Empresas
  empresas_view: boolean
  empresas_create: boolean
  empresas_edit: boolean
  empresas_delete: boolean
  
  // Cadastros - Fornecedores
  fornecedores_view: boolean
  fornecedores_create: boolean
  fornecedores_edit: boolean
  fornecedores_delete: boolean
  
  // Cadastros - Colaboradores
  colaboradores_view: boolean
  colaboradores_create: boolean
  colaboradores_edit: boolean
  colaboradores_delete: boolean
  
  // Cadastros - Centros de Custo
  centros_custo_view: boolean
  centros_custo_create: boolean
  centros_custo_edit: boolean
  centros_custo_delete: boolean
  
  // Cadastros - Marcas
  marcas_view: boolean
  marcas_create: boolean
  marcas_edit: boolean
  marcas_delete: boolean
  
  // Cadastros - Localização
  localizacao_view: boolean
  localizacao_create: boolean
  localizacao_edit: boolean
  localizacao_delete: boolean
  
  // Usuários e Configurações
  usuarios_view: boolean
  usuarios_create: boolean
  usuarios_edit: boolean
  usuarios_delete: boolean
  configuracoes_edit: boolean
  
  // Aprovações
  aprovacoes_compras: boolean
  aprovacoes_descarte: boolean
  
  // Auditorias
  auditoria_view: boolean
}

export const PROFILE_PERMISSIONS: Record<UserProfile, UserPermissions> = {
  administrador: {
    // Acesso total ao sistema
    dashboard_view: true,
    materiais_view: true,
    materiais_create: true,
    materiais_edit: true,
    materiais_delete: true,
    materiais_export: true,
    romaneios_view: true,
    romaneios_create: true,
    romaneios_edit: true,
    romaneios_delete: true,
    romaneios_approve: true,
    romaneios_receive: true,
    solicitacoes_view: true,
    solicitacoes_create: true,
    solicitacoes_edit: true,
    solicitacoes_delete: true,
    solicitacoes_approve: true,
    relatorios_view: true,
    relatorios_export: true,
    relatorios_financeiros: true,
    empresas_view: true,
    empresas_create: true,
    empresas_edit: true,
    empresas_delete: true,
    fornecedores_view: true,
    fornecedores_create: true,
    fornecedores_edit: true,
    fornecedores_delete: true,
    colaboradores_view: true,
    colaboradores_create: true,
    colaboradores_edit: true,
    colaboradores_delete: true,
    centros_custo_view: true,
    centros_custo_create: true,
    centros_custo_edit: true,
    centros_custo_delete: true,
    marcas_view: true,
    marcas_create: true,
    marcas_edit: true,
    marcas_delete: true,
    localizacao_view: true,
    localizacao_create: true,
    localizacao_edit: true,
    localizacao_delete: true,
    usuarios_view: true,
    usuarios_create: true,
    usuarios_edit: true,
    usuarios_delete: true,
    configuracoes_edit: true,
    aprovacoes_compras: true,
    aprovacoes_descarte: true,
    auditoria_view: true,
  },
  
  almoxarife: {
    // Gestão completa do almoxarifado
    dashboard_view: true,
    materiais_view: true,
    materiais_create: true,
    materiais_edit: true,
    materiais_delete: false, // Só administrador
    materiais_export: true,
    romaneios_view: true,
    romaneios_create: true,
    romaneios_edit: true,
    romaneios_delete: false,
    romaneios_approve: true,
    romaneios_receive: true,
    solicitacoes_view: true,
    solicitacoes_create: true,
    solicitacoes_edit: true,
    solicitacoes_delete: false,
    solicitacoes_approve: true,
    relatorios_view: true,
    relatorios_export: true,
    relatorios_financeiros: false,
    empresas_view: true,
    empresas_create: true,
    empresas_edit: true,
    empresas_delete: false,
    fornecedores_view: true,
    fornecedores_create: true,
    fornecedores_edit: true,
    fornecedores_delete: false,
    colaboradores_view: true,
    colaboradores_create: true,
    colaboradores_edit: true,
    colaboradores_delete: false,
    centros_custo_view: true,
    centros_custo_create: true,
    centros_custo_edit: true,
    centros_custo_delete: false,
    marcas_view: true,
    marcas_create: true,
    marcas_edit: true,
    marcas_delete: false,
    localizacao_view: true,
    localizacao_create: true,
    localizacao_edit: true,
    localizacao_delete: false,
    usuarios_view: false,
    usuarios_create: false,
    usuarios_edit: false,
    usuarios_delete: false,
    configuracoes_edit: false,
    aprovacoes_compras: false,
    aprovacoes_descarte: true,
    auditoria_view: true,
  },
  
  supervisor: {
    // Supervisão e aprovações
    dashboard_view: true,
    materiais_view: true,
    materiais_create: false,
    materiais_edit: false,
    materiais_delete: false,
    materiais_export: true,
    romaneios_view: true,
    romaneios_create: false,
    romaneios_edit: false,
    romaneios_delete: false,
    romaneios_approve: true,
    romaneios_receive: false,
    solicitacoes_view: true,
    solicitacoes_create: true,
    solicitacoes_edit: false,
    solicitacoes_delete: false,
    solicitacoes_approve: true,
    relatorios_view: true,
    relatorios_export: true,
    relatorios_financeiros: true,
    empresas_view: true,
    empresas_create: false,
    empresas_edit: false,
    empresas_delete: false,
    fornecedores_view: true,
    fornecedores_create: false,
    fornecedores_edit: false,
    fornecedores_delete: false,
    colaboradores_view: true,
    colaboradores_create: false,
    colaboradores_edit: false,
    colaboradores_delete: false,
    centros_custo_view: true,
    centros_custo_create: false,
    centros_custo_edit: false,
    centros_custo_delete: false,
    marcas_view: true,
    marcas_create: false,
    marcas_edit: false,
    marcas_delete: false,
    localizacao_view: true,
    localizacao_create: false,
    localizacao_edit: false,
    localizacao_delete: false,
    usuarios_view: false,
    usuarios_create: false,
    usuarios_edit: false,
    usuarios_delete: false,
    configuracoes_edit: false,
    aprovacoes_compras: true,
    aprovacoes_descarte: true,
    auditoria_view: true,
  },
  
  solicitante: {
    // Usuário que faz solicitações
    dashboard_view: true,
    materiais_view: true,
    materiais_create: false,
    materiais_edit: false,
    materiais_delete: false,
    materiais_export: false,
    romaneios_view: true, // Apenas os próprios
    romaneios_create: true,
    romaneios_edit: false, // Apenas os próprios pendentes
    romaneios_delete: false,
    romaneios_approve: false,
    romaneios_receive: false,
    solicitacoes_view: true, // Apenas as próprias
    solicitacoes_create: true,
    solicitacoes_edit: false, // Apenas as próprias pendentes
    solicitacoes_delete: false,
    solicitacoes_approve: false,
    relatorios_view: false,
    relatorios_export: false,
    relatorios_financeiros: false,
    empresas_view: true,
    empresas_create: false,
    empresas_edit: false,
    empresas_delete: false,
    fornecedores_view: true,
    fornecedores_create: false,
    fornecedores_edit: false,
    fornecedores_delete: false,
    colaboradores_view: true,
    colaboradores_create: false,
    colaboradores_edit: false,
    colaboradores_delete: false,
    centros_custo_view: true,
    centros_custo_create: false,
    centros_custo_edit: false,
    centros_custo_delete: false,
    marcas_view: true,
    marcas_create: false,
    marcas_edit: false,
    marcas_delete: false,
    localizacao_view: true,
    localizacao_create: false,
    localizacao_edit: false,
    localizacao_delete: false,
    usuarios_view: false,
    usuarios_create: false,
    usuarios_edit: false,
    usuarios_delete: false,
    configuracoes_edit: false,
    aprovacoes_compras: false,
    aprovacoes_descarte: false,
    auditoria_view: false,
  },
  
  visualizador: {
    // Apenas visualização
    dashboard_view: true,
    materiais_view: true,
    materiais_create: false,
    materiais_edit: false,
    materiais_delete: false,
    materiais_export: false,
    romaneios_view: true,
    romaneios_create: false,
    romaneios_edit: false,
    romaneios_delete: false,
    romaneios_approve: false,
    romaneios_receive: false,
    solicitacoes_view: true,
    solicitacoes_create: false,
    solicitacoes_edit: false,
    solicitacoes_delete: false,
    solicitacoes_approve: false,
    relatorios_view: true,
    relatorios_export: false,
    relatorios_financeiros: false,
    empresas_view: true,
    empresas_create: false,
    empresas_edit: false,
    empresas_delete: false,
    fornecedores_view: true,
    fornecedores_create: false,
    fornecedores_edit: false,
    fornecedores_delete: false,
    colaboradores_view: true,
    colaboradores_create: false,
    colaboradores_edit: false,
    colaboradores_delete: false,
    centros_custo_view: true,
    centros_custo_create: false,
    centros_custo_edit: false,
    centros_custo_delete: false,
    marcas_view: true,
    marcas_create: false,
    marcas_edit: false,
    marcas_delete: false,
    localizacao_view: true,
    localizacao_create: false,
    localizacao_edit: false,
    localizacao_delete: false,
    usuarios_view: false,
    usuarios_create: false,
    usuarios_edit: false,
    usuarios_delete: false,
    configuracoes_edit: false,
    aprovacoes_compras: false,
    aprovacoes_descarte: false,
    auditoria_view: false,
  },
}

export const PROFILE_LABELS: Record<UserProfile, string> = {
  administrador: 'Administrador',
  almoxarife: 'Almoxarife',
  supervisor: 'Supervisor',
  solicitante: 'Solicitante',
  visualizador: 'Visualizador',
}

export const PROFILE_DESCRIPTIONS: Record<UserProfile, string> = {
  administrador: 'Acesso total ao sistema, incluindo configurações e usuários',
  almoxarife: 'Gestão completa do almoxarifado, movimentações e cadastros',
  supervisor: 'Supervisão, aprovações e relatórios gerenciais',
  solicitante: 'Criação de solicitações e romaneios do seu centro de custo',
  visualizador: 'Visualização de dados sem permissões de alteração',
}