export const CategoriaMaterialOptions = [
  'ALUGADO',
  'EPI / EPC',
  'MATERIAL DE CONSUMO',
  'MATERIAL PERMANENTE',
] as const

export type CategoriaMaterial = (typeof CategoriaMaterialOptions)[number]

export const ResourceTypeAssociationOptions = [
  'Only EPI',
  'Only Materials',
  'Both EPI and Materials',
] as const

export type ResourceTypeAssociation =
  (typeof ResourceTypeAssociationOptions)[number]

export interface Colaborador {
  id: string
  matricula: string
  nomeCompleto: string
  cpf: string
  cargo: string
  supervisor?: string
  centroCusto?: string
  dataAdmissao: Date
  dataDemissao?: Date | null
  status: 'Ativo' | 'Inativo'
}

export interface RetiradaHistorico {
  id: string
  item: string
  data: Date
  quantidade: number
  valor: number
  resourceType: ResourceTypeAssociation
  associationDate: Date
}

export interface MaterialEquipamento {
  id: string
  categoria: CategoriaMaterial
  descricao: string
  unidade: string
  itemDeDevolucao: boolean
  estoqueAtual: number
  localizacao: string
  ncm: string
}

export interface RomaneioItem {
  itemId: string
  descricao: string
  unidade: string
  quantidade: number
  quantidadeOriginal?: number // Used in return forms
}

export interface RomaneioRetirada {
  id: string
  data: Date
  origem: string
  destino: string
  responsavel: string
  solicitante: string
  empresa: string
  status: 'Aguardando Aprovação' | 'Aprovado' | 'Retirado' | 'Cancelado'
  itens: RomaneioItem[]
}

export interface RomaneioDevolucao {
  id: string
  romaneioOriginalId: string
  data: Date
  responsavel: string
  solicitante: string
  itens: RomaneioItem[]
}

export interface SolicitacaoCompraItem {
  material_equipamento_id?: string // ID do material/equipamento (opcional para itens avulsos)
  // Campos para itens avulsos (não cadastrados no estoque)
  item_avulso?: {
    descricao: string // Descrição do item avulso
    unidade_medida?: string // Unidade de medida (opcional)
    codigo?: string // Código do item (opcional)
  }
  quantidade: number
  observacoes?: string // Observações específicas do item
}

export const DocumentTypeOptions = ['ODC', 'OSA', 'SCO', 'GRD'] as const
export type DocumentType = (typeof DocumentTypeOptions)[number]

export const IssuingUnitOptions = ['matriz', 'parauapebas', 'contract'] as const
export type IssuingUnit = (typeof IssuingUnitOptions)[number]

// Opções para prazo de entrega
export const PrazoEntregaOptions = [
  'Urgente (24h)',
  'Normal (3-5 dias úteis)', 
  'Programada (7-15 dias úteis)',
  'Customizada (especificar data)'
] as const

export type PrazoEntrega = (typeof PrazoEntregaOptions)[number]

export interface SolicitacaoCompra {
  id: string // This will be the generated documentCode
  data: Date
  centroCustoOrigemId: string // Centro de custo de origem
  centroCustoDestinoId: string // Centro de custo de destino
  prazoEntrega: PrazoEntrega
  dataCustomizada?: Date // Para quando prazo for "Customizada"
  // Solicitante como colaborador (mesmo sistema dos romaneios)
  colaborador_id?: string // ID do colaborador quando é um colaborador cadastrado
  solicitante_nome?: string // Nome quando é um solicitante avulso
  status: 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Cancelada' | 'Concluída'
  itens: SolicitacaoCompraItem[]
  approverId?: string
  approvalTimestamp?: Date
  rejectionReason?: string
  cancellerId?: string
  cancellationTimestamp?: Date
}

// NF-e Import Types
export interface NFeItem {
  // Identificação do produto
  code: string                    // cProd
  description: string             // xProd
  ncm: string                     // NCM
  cfop: string                    // CFOP
  
  // Códigos de barras
  ean?: string                    // cEAN
  eanTrib?: string               // cEANTrib
  
  // Unidades e quantidades
  unit: string                    // uCom (unidade comercial)
  unitTrib?: string              // uTrib (unidade tributável)
  quantity: number               // qCom (quantidade comercial)
  quantityTrib?: number          // qTrib (quantidade tributável)
  
  // Valores
  unitValue: number              // vUnCom (valor unitário comercial)
  unitValueTrib?: number         // vUnTrib (valor unitário tributável)
  totalValue: number             // vProd (valor total do produto)
  
  // Informações do pedido
  orderNumber?: string           // xPed (número do pedido)
  itemOrder?: number             // nItemPed (item do pedido)
  
  // Classificações fiscais
  cest?: string                  // CEST
  indEscala?: string             // indEscala
  
  // Totalizador
  indTot?: string                // indTot (indica se compõe o total da NFe)
  
  // Tributos totais informativo
  totalTrib?: number             // vTotTrib (informação de tributos)
}

export interface NFeEmitter {
  cnpj: string                   // CNPJ
  name: string                   // xNome
  fantasyName?: string           // xFant
  ie?: string                    // IE (inscrição estadual)
  crt?: string                   // CRT (código de regime tributário)
  
  // Endereço do emitente
  address: {
    street: string               // xLgr
    number: string               // nro
    neighborhood: string         // xBairro
    city: string                 // xMun
    cityCode: string             // cMun
    state: string                // UF
    zipCode: string              // CEP
    country: string              // xPais
    countryCode: string          // cPais
    phone?: string               // fone
  }
}

export interface NFeRecipient {
  cnpj?: string                  // CNPJ
  cpf?: string                   // CPF (pessoa física)
  name: string                   // xNome
  ie?: string                    // IE
  indIEDest?: string             // indIEDest
  email?: string                 // email
  
  // Endereço do destinatário
  address: {
    street: string               // xLgr
    number: string               // nro
    complement?: string          // xCpl
    neighborhood: string         // xBairro
    city: string                 // xMun
    cityCode: string             // cMun
    state: string                // UF
    zipCode: string              // CEP
    country: string              // xPais
    countryCode: string          // cPais
    phone?: string               // fone
  }
}

export interface NFeDelivery {
  cnpj?: string                  // CNPJ do local de entrega
  cpf?: string                   // CPF do local de entrega
  name?: string                  // xNome do local de entrega
  
  // Endereço de entrega
  address: {
    street: string               // xLgr
    number: string               // nro
    complement?: string          // xCpl
    neighborhood: string         // xBairro
    city: string                 // xMun
    cityCode: string             // cMun
    state: string                // UF
    zipCode: string              // CEP
    country?: string             // xPais
    countryCode?: string         // cPais
  }
}

export interface NFeIdentification {
  uf: string                     // cUF (código da UF)
  nf: string                     // cNF (código numérico)
  natOp: string                  // natOp (natureza da operação)
  model: string                  // mod (modelo do documento fiscal)
  series: string                 // serie
  number: string                 // nNF (número da NFe)
  dhEmi: string                  // dhEmi (data/hora de emissão)
  dhSaiEnt?: string              // dhSaiEnt (data/hora saída/entrada)
  tpNF: string                   // tpNF (tipo da NFe: 0-entrada, 1-saída)
  idDest: string                 // idDest (identificador do destinatário)
  cMunFG: string                 // cMunFG (código do município de fato gerador)
  tpImp: string                  // tpImp (tipo de impressão do DANFE)
  tpEmis: string                 // tpEmis (tipo de emissão da NFe)
  cdv: string                    // cDV (dígito verificador da chave)
  tpAmb: string                  // tpAmb (tipo do ambiente)
  finNFe: string                 // finNFe (finalidade de emissão da NFe)
  indFinal: string               // indFinal (indica operação com consumidor final)
  indPres: string                // indPres (indicador de presença do comprador)
  procEmi: string                // procEmi (processo de emissão)
  verProc: string                // verProc (versão do processo de emissão)
  
  // NFe referenciada
  refNFe?: string                // refNFe (chave de NFe referenciada)
}

export interface NFeTransport {
  modFrete: string               // modFrete (modalidade do frete)
  
  // Volume transportado
  volumes?: {
    qVol?: number                // qVol (quantidade de volumes)
    nVol?: string                // nVol (numeração dos volumes)
    pesoL?: number               // pesoL (peso líquido)
    pesoB?: number               // pesoB (peso bruto)
  }
}

export interface NFePayment {
  payments: {
    indPag?: string              // indPag (indicador da forma de pagamento)
    tPag: string                 // tPag (forma de pagamento)
    vPag: number                 // vPag (valor do pagamento)
  }[]
}

export interface NFeAdditionalInfo {
  infAdFisco?: string            // infAdFisco (informações adicionais de interesse do fisco)
  infCpl?: string                // infCpl (informações complementares de interesse do contribuinte)
}

export interface NFeTotal {
  vBC?: number                   // vBC (BC do ICMS)
  vICMS?: number                 // vICMS (valor do ICMS)
  vICMSDeson?: number            // vICMSDeson (valor do ICMS desonerado)
  vFCP?: number                  // vFCP (valor do FCP)
  vBCST?: number                 // vBCST (BC do ICMS ST)
  vST?: number                   // vST (valor do ICMS ST)
  vFCPST?: number                // vFCPST (valor do FCP ST)
  vFCPSTRet?: number             // vFCPSTRet (valor do FCP ST retido)
  vProd: number                  // vProd (valor total dos produtos)
  vFrete?: number                // vFrete (valor total do frete)
  vSeg?: number                  // vSeg (valor total do seguro)
  vDesc?: number                 // vDesc (valor total dos descontos)
  vII?: number                   // vII (valor total do II)
  vIPI?: number                  // vIPI (valor total do IPI)
  vIPIDevol?: number             // vIPIDevol (valor total do IPI devolvido)
  vPIS?: number                  // vPIS (valor do PIS)
  vCOFINS?: number               // vCOFINS (valor da COFINS)
  vOutro?: number                // vOutro (outras despesas acessórias)
  vNF: number                    // vNF (valor total da NFe)
  vTotTrib?: number              // vTotTrib (valor total dos tributos)
}

export interface NFe {
  // Chave de acesso e identificação básica
  key: string                    // Chave de acesso da NFe (44 dígitos)
  number: string                 // nNF
  series: string                 // serie
  
  // Dados de identificação completos
  identification: NFeIdentification
  
  // Partes envolvidas
  emitter: NFeEmitter
  recipient: NFeRecipient
  delivery?: NFeDelivery         // Local de entrega (opcional)
  
  // Datas
  issueDate: Date                // dhEmi convertido
  exitDate?: Date                // dhSaiEnt convertido (opcional)
  
  // Valores
  totalValue: number             // vNF
  totals: NFeTotal               // Totalização completa
  
  // Itens/produtos
  items: NFeItem[]
  
  // Transporte
  transport?: NFeTransport
  
  // Pagamento
  payment?: NFePayment
  
  // Informações adicionais
  additionalInfo?: NFeAdditionalInfo
  
  // Status da autorização
  authorization?: {
    protocol: string             // nProt
    authDate: Date               // dhRecbto
    status: string               // cStat
    reason: string               // xMotivo
  }
}

export type NFeUploadStatus =
  | 'pending'
  | 'parsing'
  | 'success'
  | 'warning'
  | 'error'

export interface UploadedNFeFile {
  id: string
  file: File
  status: NFeUploadStatus
  progress: number
  data?: NFe
  message?: string
}

export interface NFeImportBatch {
  id: string
  importDate: Date
  user: string
  status: 'Completed' | 'Completed with errors' | 'Failed'
  totalFiles: number
  successCount: number
  errorCount: number
}

export interface NcmInfo {
  code: string
  description: string
}
