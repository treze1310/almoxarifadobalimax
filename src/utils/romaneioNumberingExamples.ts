/**
 * Exemplos práticos da nova nomenclatura de romaneios
 * 
 * ESTRUTURA: AAA-AL-[CODIGO_CC]-SSSS
 * 
 * AAA = Tipo de documento (ROM para entrada/retirada, RDV para devolução)
 * AL = Almoxarifado/Suprimentos  
 * [CODIGO_CC] = Código EXISTENTE do centro de custo:
 *   - Para RETIRADAS/ENTRADAS: usa centro de custo DE DESTINO
 *   - Para DEVOLUÇÕES: usa centro de custo DE ORIGEM
 * SSSS = Número sequencial do documento (4 dígitos)
 * 
 * IMPORTANTE: Usa o código JÁ CADASTRADO do centro de custo, não gera um novo.
 */

export const EXEMPLOS_NUMERACAO = {
  /**
   * CENÁRIO 1: Almoxarifado Central
   */
  ALMOXARIFADO_CENTRAL: {
    nome: 'Almoxarifado Central',
    codigoCentroCusto: 'ALM001', // Código cadastrado no sistema
    
    // Romaneios de entrada (fornecedor → almoxarifado)
    primeiraEntrada: 'ROM-AL-ALM001-0001',
    segundaEntrada: 'ROM-AL-ALM001-0002',
    
    // Romaneios de devolução (setores → almoxarifado)
    primeiraDevolucao: 'RDV-AL-ALM001-0001',
    segundaDevolucao: 'RDV-AL-ALM001-0002'
  },

  /**
   * CENÁRIO 2: Setor de Produção
   */
  SETOR_PRODUCAO: {
    nome: 'Setor de Produção',
    codigoCentroCusto: 'PROD100', // Código cadastrado no sistema
    
    // Romaneios de retirada (almoxarifado → produção)
    primeiraRetirada: 'ROM-AL-PROD100-0001',
    segundaRetirada: 'ROM-AL-PROD100-0002',
    terceiraRetirada: 'ROM-AL-PROD100-0003'
  },

  /**
   * CENÁRIO 3: Exemplos por tipo de romaneio (regras específicas)
   */
  TIPOS_ROMANEIO_REGRAS: {
    // Romaneio de ENTRADA: Material chegando no almoxarifado
    // CC Destino = Almoxarifado (onde o material vai ficar)
    entrada: {
      tipo: 'entrada',
      ccOrigem: 'Fornecedor (externo)',
      ccDestino: 'Almoxarifado Central (ALM001)',
      numero: 'ROM-AL-ALM001-0001', // Baseado no CC de DESTINO
      explicacao: 'Material entrando no almoxarifado central'
    },
    
    // Romaneio de RETIRADA: Material saindo do almoxarifado
    // CC Destino = Centro que vai receber o material
    retirada: {
      tipo: 'retirada',
      ccOrigem: 'Almoxarifado Central',
      ccDestino: 'Setor Produção (PROD100)',
      numero: 'ROM-AL-PROD100-0001', // Baseado no CC de DESTINO (Produção)
      explicacao: 'Material indo para o setor de produção'
    },
    
    // Romaneio de DEVOLUÇÃO: Material retornando para almoxarifado
    // CC Origem = De onde vem a devolução (usa este na nomenclatura)
    devolucao: {
      tipo: 'devolucao',
      ccOrigem: 'Setor Produção (PROD100)',
      ccDestino: 'Almoxarifado Central',
      numero: 'RDV-AL-PROD100-0001', // Baseado no CC de ORIGEM (Produção)
      explicacao: 'Material devolvido do setor de produção'
    }
  },

  /**
   * CENÁRIO 4: Múltiplos centros de custo
   */
  MULTIPLOS_CENTROS_CUSTO: {
    // Setor de Manutenção
    manutencao: {
      nome: 'Setor de Manutenção',
      codigo: 'MNT200',
      romaneios: [
        'ROM-AL-MNT200-0001', // Primeira retirada
        'ROM-AL-MNT200-0002', // Segunda retirada
        'RDV-AL-ALM001-0004'  // Devolução ao almoxarifado
      ]
    },
    
    // Setor de Qualidade
    qualidade: {
      nome: 'Setor de Qualidade',
      codigo: 'QLT300',
      romaneios: [
        'ROM-AL-QLT300-0001', // Primeira retirada
        'RDV-AL-ALM001-0005'  // Devolução ao almoxarifado
      ]
    }
  }
}

/**
 * Função para validar se um número segue o padrão correto
 */
export function validarNumeroRomaneio(numero: string): {
  valido: boolean
  detalhes?: {
    tipo: 'ROM' | 'RDV'
    codigoCentroCusto: string
    sequenciaDocumento: number
  }
  erro?: string
} {
  const pattern = /^(ROM|RDV)-AL-(.+)-(\d{4})$/
  const match = numero.match(pattern)
  
  if (!match) {
    return {
      valido: false,
      erro: 'Formato inválido. Esperado: AAA-AL-[CODIGO_CC]-SSSS'
    }
  }

  const [, tipo, codigoCentroCusto, sequenciaDoc] = match

  // Validações adicionais
  const sequenciaDocNum = parseInt(sequenciaDoc, 10)

  if (!codigoCentroCusto || codigoCentroCusto.trim() === '') {
    return {
      valido: false,
      erro: 'Código do centro de custo não pode estar vazio'
    }
  }

  if (sequenciaDocNum < 1) {
    return {
      valido: false,
      erro: 'Sequência do documento deve ser maior que 0'
    }
  }

  return {
    valido: true,
    detalhes: {
      tipo: tipo as 'ROM' | 'RDV',
      codigoCentroCusto: codigoCentroCusto,
      sequenciaDocumento: sequenciaDocNum
    }
  }
}

/**
 * Exemplos de uso e testes
 */
export const TESTES_VALIDACAO = [
  // Casos válidos
  { numero: 'ROM-AL-ALM001-0001', esperado: true },
  { numero: 'RDV-AL-PROD100-0025', esperado: true },
  { numero: 'ROM-AL-MNT200-9999', esperado: true },
  { numero: 'ROM-AL-123ABC-0001', esperado: true },
  { numero: 'RDV-AL-XYZ999-0001', esperado: true },
  
  // Casos inválidos
  { numero: 'XXX-AL-ALM001-0001', esperado: false }, // Tipo inválido
  { numero: 'ROM-XX-ALM001-0001', esperado: false }, // Departamento inválido
  { numero: 'ROM-AL-ALM0010001', esperado: false },  // Formato incorreto (sem hífen)
  { numero: 'ROM-AL--0001', esperado: false },       // CC vazio
  { numero: 'ROM-AL-ALM001-0000', esperado: false }, // Sequência doc 0
  { numero: 'ROM-AL-ALM001-ABC1', esperado: false }, // Sequência não numérica
]

console.log('🧪 Executando testes de validação...')
TESTES_VALIDACAO.forEach(teste => {
  const resultado = validarNumeroRomaneio(teste.numero)
  const passou = resultado.valido === teste.esperado
  
  console.log(`${passou ? '✅' : '❌'} ${teste.numero}: ${resultado.valido ? 'VÁLIDO' : 'INVÁLIDO'}`)
  if (!resultado.valido && resultado.erro) {
    console.log(`   Erro: ${resultado.erro}`)
  }
})













