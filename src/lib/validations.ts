import { z } from 'zod'

// Empresa validation schema
export const empresaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  cnpj: z.string().optional().refine((val) => {
    if (!val) return true
    // Remove formatação e verifica se tem 14 dígitos
    const numbers = val.replace(/\D/g, '')
    return numbers.length === 14
  }, 'CNPJ deve ter 14 dígitos'),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

// Centro de Custo validation schema
export const centroCustoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(50, 'Código muito longo'),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição muito longa'),
  empresa_id: z.string().uuid('ID da empresa inválido').optional(),
  ativo: z.boolean().default(true),
})

// Colaborador validation schema
export const colaboradorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  cpf: z.string().optional().refine((val) => {
    if (!val) return true
    const numbers = val.replace(/\D/g, '')
    return numbers.length === 11
  }, 'CPF deve ter 11 dígitos'),
  rg: z.string().max(20, 'RG muito longo').optional(),
  matricula: z.string().max(50, 'Matrícula muito longa').optional(),
  cargo: z.string().max(100, 'Cargo muito longo').optional(),
  setor: z.string().max(100, 'Setor muito longo').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  centro_custo_id: z.string().uuid('ID do centro de custo inválido').optional(),
  empresa_id: z.string().uuid('ID da empresa inválido').optional(),
  foto_url: z.string().url('URL inválida').optional().or(z.literal('')),
  data_admissao: z.string().optional().or(z.literal('')).transform(val => val || undefined), // Date string
  data_demissao: z.string().optional().or(z.literal('')).transform(val => val || undefined), // Date string
  ativo: z.boolean().default(true),
})

// Fornecedor validation schema
export const fornecedorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  cnpj: z.string().optional().refine((val) => {
    if (!val) return true
    const numbers = val.replace(/\D/g, '')
    return numbers.length === 14
  }, 'CNPJ deve ter 14 dígitos'),
  cpf: z.string().optional().refine((val) => {
    if (!val) return true
    const numbers = val.replace(/\D/g, '')
    return numbers.length === 11
  }, 'CPF deve ter 11 dígitos'),
  endereco: z.string().optional(),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contato: z.string().max(255, 'Contato muito longo').optional(),
  ativo: z.boolean().default(true),
})

// Marca validation schema
export const marcaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
})

// Localização validation schema
export const localizacaoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(50, 'Código muito longo'),
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
  predio: z.string().max(100, 'Prédio muito longo').optional(),
  andar: z.string().max(50, 'Andar muito longo').optional(),
  sala: z.string().max(50, 'Sala muito longa').optional(),
  posicao_x: z.number().int().optional(),
  posicao_y: z.number().int().optional(),
  ativo: z.boolean().default(true),
})

// Material/Equipamento validation schema
export const materialEquipamentoSchema = z.object({
  // Código será auto-gerado (5 dígitos)
  codigo: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  marca_id: z.string().uuid('ID da marca inválido').optional().or(z.literal('')).transform(val => val || undefined),
  modelo: z.string().max(100, 'Modelo muito longo').optional().or(z.literal('')).transform(val => val || undefined),
  numero_serie: z.string().max(100, 'Número de série muito longo').optional().or(z.literal('')).transform(val => val || undefined),
  valor_unitario: z.number().min(0, 'Valor deve ser positivo').optional(),
  estoque_atual: z.number().int().min(0, 'Estoque atual deve ser positivo').default(0),
  localizacao_id: z.string().uuid('ID da localização inválido').optional().or(z.literal('')).transform(val => val || undefined),
  fornecedor_id: z.string().uuid('ID do fornecedor inválido').optional().or(z.literal('')).transform(val => val || undefined),
  centro_custo_id: z.string().uuid('ID do centro de custo inválido').optional().or(z.literal('')).transform(val => val || undefined),
  foto_url: z.string().url('URL inválida').optional().or(z.literal('')).transform(val => val || undefined),
  codigo_ncm: z.string().max(20, 'Código NCM muito longo').optional().or(z.literal('')).transform(val => val || undefined),
  codigo_barras: z.string().max(100, 'Código de barras muito longo').optional().or(z.literal('')).transform(val => val || undefined),
  data_aquisicao: z.string().optional().or(z.literal('')).transform(val => val || undefined), // Date string
  status: z.enum(['ativo', 'inativo', 'manutencao', 'descartado']).default('ativo'),
  ativo: z.boolean().default(true),
  // Campo destacado para aluguel
  alugado: z.boolean().default(false),
  // EPI-specific fields
  is_epi: z.boolean().default(false),
  numero_ca: z.string().max(50, 'Número do CA muito longo').optional().or(z.literal('')).transform(val => val || undefined),
  validade_ca: z.string().optional().or(z.literal('')).transform(val => val || undefined), // Date string
  periodo_troca_meses: z.number().int().min(1, 'Período de troca deve ser positivo').optional(),
  
  // Calibration-specific fields
  requer_calibracao: z.boolean().default(false),
  frequencia_calibracao_meses: z.number().int().min(1, 'Frequência deve ser positiva').optional(),
  ultima_calibracao: z.string().optional().or(z.literal('')).transform(val => val || undefined), // Date string
  proxima_calibracao: z.string().optional().or(z.literal('')).transform(val => val || undefined), // Date string
  observacoes_calibracao: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  // Novo campo para certificado de calibração
  certificado_calibracao_url: z.string().url('URL do certificado inválida').optional().or(z.literal('')).transform(val => val || undefined),
  
  // Campos que foram removidos mas mantidos para compatibilidade com campos opcionais
  descricao: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  tipo: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  categoria: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  subcategoria: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  unidade_medida: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  codigo_patrimonial: z.string().optional().or(z.literal('')).transform(val => val || undefined),
  estoque_minimo: z.number().int().min(0).optional(),
  garantia_meses: z.number().int().min(0).optional(),
  observacoes: z.string().optional().or(z.literal('')).transform(val => val || undefined),
})

// Utility functions
export const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return value
}

export const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return value
}

export const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }
  return value
}

// Romaneio Item validation schema
export const romaneioItemSchema = z.object({
  material_equipamento_id: z.string().uuid('ID do material/equipamento inválido'),
  quantidade: z.number().int().min(1, 'Quantidade deve ser maior que 0'),
  valor_unitario: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_total: z.number().min(0, 'Valor deve ser positivo').optional(),
  numero_serie: z.string().max(100, 'Número de série muito longo').optional(),
  codigo_patrimonial: z.string().max(100, 'Código patrimonial muito longo').optional(),
  observacoes: z.string().optional(),
})

// Romaneio validation schema
export const romaneioSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório').max(50, 'Número muito longo'),
  tipo: z.enum(['retirada', 'devolucao', 'transferencia'], {
    required_error: 'Tipo é obrigatório',
  }),
  data_romaneio: z.string().min(1, 'Data é obrigatória'), // ISO date string
  colaborador_id: z.string().uuid('ID do colaborador inválido').optional().or(z.literal('')).transform(val => val || undefined),
  centro_custo_origem_id: z.string().uuid('ID do centro de custo origem inválido').optional().or(z.literal('')).transform(val => val || undefined),
  centro_custo_destino_id: z.string().uuid('ID do centro de custo destino inválido').optional().or(z.literal('')).transform(val => val || undefined),
  fornecedor_id: z.string().uuid('ID do fornecedor inválido').optional().or(z.literal('')).transform(val => val || undefined),
  romaneio_origem_id: z.string().uuid('ID do romaneio origem inválido').optional().or(z.literal('')).transform(val => val || undefined),
  responsavel_nome: z.string().max(255, 'Nome do responsável muito longo').optional(),
  responsavel_retirada: z.string().max(255, 'Responsável pela retirada muito longo').optional(),
  responsavel_entrega: z.string().max(255, 'Responsável pela entrega muito longo').optional(),
  observacoes: z.string().optional(),
  status: z.enum(['pendente', 'aprovado', 'retirado', 'devolvido', 'cancelado']).default('pendente'),
  valor_total: z.number().min(0, 'Valor deve ser positivo').optional(),
  nfe_numero: z.string().max(20, 'Número da NF-e muito longo').optional(),
  nfe_serie: z.string().max(10, 'Série da NF-e muito longa').optional(),
  nfe_chave: z.string().max(50, 'Chave da NF-e muito longa').optional(),
  itens: z.array(romaneioItemSchema).min(1, 'Adicione pelo menos um item'),
})

export type EmpresaFormData = z.infer<typeof empresaSchema>
export type CentroCustoFormData = z.infer<typeof centroCustoSchema>
export type ColaboradorFormData = z.infer<typeof colaboradorSchema>
export type FornecedorFormData = z.infer<typeof fornecedorSchema>
export type MarcaFormData = z.infer<typeof marcaSchema>
export type LocalizacaoFormData = z.infer<typeof localizacaoSchema>
export type MaterialEquipamentoFormData = z.infer<typeof materialEquipamentoSchema>
export type RomaneioItemFormData = z.infer<typeof romaneioItemSchema>
export type RomaneioFormData = z.infer<typeof romaneioSchema>