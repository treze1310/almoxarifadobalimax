import { NcmInfo } from '@/types'

// Base de dados expandida de códigos NCM e suas descrições
const mockNcmDatabase: Record<string, string> = {
  // Ferramentas manuais
  '82054000': 'Chaves de fenda',
  '82055100': 'Ferramentas de perfuração ou de sondagem',
  '82052000': 'Martelos e marretas',
  '82053000': 'Plainas, formões, goivas e ferramentas cortantes semelhantes para trabalhar madeira',
  
  // Equipamentos de segurança
  '65061000': 'Capacetes de segurança',
  '40151900': 'Luvas de borracha vulcanizada',
  '62101000': 'Vestuário confeccionado com feltro ou com tecidos não tecidos',
  
  // Equipamentos eletrônicos
  '90303100': 'Multímetros, sem dispositivo registador',
  '85287200': 'Monitores com tubo de raios catódicos',
  '84716052': 'Teclados',
  '84716053': 'Indicadores ou apontadores (mouse e track-ball)',
  '84717010': 'Unidades de memória de disco rígido',
  '85044021': 'Fontes de alimentação para computadores',
  '84713000': 'Máquinas automáticas para processamento de dados portáteis',
  
  // Materiais elétricos
  '39191010': 'Fitas autoadesivas, em rolos de largura não superior a 20 cm',
  '85444220': 'Cabos de fibras ópticas',
  '85444200': 'Outros cabos coaxiais',
  '85361000': 'Fusíveis para tensão não superior a 1.000V',
  
  // Ferramentas elétricas
  '84672100': 'Furadeiras (incluindo as perfuratrizes) de acionamento elétrico',
  '84672900': 'Outras ferramentas pneumáticas',
  '84679200': 'Serras elétricas',
  
  // Materiais de construção
  '73181500': 'Outros parafusos e porcas de ferro ou aço',
  '73181600': 'Ganchos e ilhóses, de ferro ou aço',
  '73170000': 'Tachas, pregos, percevejos, escápulas e artefatos semelhantes',
  
  // Materiais de escritório
  '48201000': 'Livros de registro e de contabilidade',
  '96081000': 'Canetas esferográficas',
  '96082000': 'Marcadores e canetas com ponta de feltro',
}

// Mapeamento expandido de palavras-chave para códigos NCM
const keywordMapping: { keywords: string[]; ncm: NcmInfo }[] = [
  // Ferramentas manuais
  {
    keywords: ['chave', 'fenda', 'phillips', 'chaves'],
    ncm: { code: '82054000', description: mockNcmDatabase['82054000'] },
  },
  {
    keywords: ['martelo', 'marreta', 'malho'],
    ncm: { code: '82052000', description: mockNcmDatabase['82052000'] },
  },
  {
    keywords: ['plaina', 'formão', 'goiva', 'cortante', 'madeira'],
    ncm: { code: '82053000', description: mockNcmDatabase['82053000'] },
  },
  
  // Equipamentos de segurança
  {
    keywords: ['capacete', 'proteção', 'cabeça', 'epi'],
    ncm: { code: '65061000', description: mockNcmDatabase['65061000'] },
  },
  {
    keywords: ['luva', 'luvas', 'proteção', 'mão', 'mãos', 'segurança', 'nitril'],
    ncm: { code: '40151900', description: mockNcmDatabase['40151900'] },
  },
  
  // Equipamentos eletrônicos
  {
    keywords: ['multimetro', 'multímetro', 'medição', 'voltímetro'],
    ncm: { code: '90303100', description: mockNcmDatabase['90303100'] },
  },
  {
    keywords: ['monitor', 'tela', 'display'],
    ncm: { code: '85287200', description: mockNcmDatabase['85287200'] },
  },
  {
    keywords: ['teclado', 'keyboard'],
    ncm: { code: '84716052', description: mockNcmDatabase['84716052'] },
  },
  {
    keywords: ['mouse', 'rato'],
    ncm: { code: '84716053', description: mockNcmDatabase['84716053'] },
  },
  {
    keywords: ['ssd', 'hd', 'disco rigido', 'disco rígido', 'armazenamento'],
    ncm: { code: '84717010', description: mockNcmDatabase['84717010'] },
  },
  {
    keywords: ['fonte', 'alimentacao', 'alimentação', 'power supply'],
    ncm: { code: '85044021', description: mockNcmDatabase['85044021'] },
  },
  {
    keywords: ['notebook', 'laptop', 'computador portátil'],
    ncm: { code: '84713000', description: mockNcmDatabase['84713000'] },
  },
  
  // Materiais elétricos
  {
    keywords: ['fita', 'isolante', 'adesiva', 'tape'],
    ncm: { code: '39191010', description: mockNcmDatabase['39191010'] },
  },
  {
    keywords: ['cabo', 'rede', 'ethernet', 'utp', 'cat6', 'cat5'],
    ncm: { code: '85444200', description: mockNcmDatabase['85444200'] },
  },
  {
    keywords: ['fibra', 'óptica', 'optic'],
    ncm: { code: '85444220', description: mockNcmDatabase['85444220'] },
  },
  {
    keywords: ['fusível', 'fusivel', 'proteção elétrica'],
    ncm: { code: '85361000', description: mockNcmDatabase['85361000'] },
  },
  
  // Ferramentas elétricas
  {
    keywords: ['furadeira', 'perfuratriz', 'broca', 'impacto'],
    ncm: { code: '84672100', description: mockNcmDatabase['84672100'] },
  },
  {
    keywords: ['serra', 'elétrica', 'cortar'],
    ncm: { code: '84679200', description: mockNcmDatabase['84679200'] },
  },
  
  // Materiais de construção
  {
    keywords: ['parafuso', 'parafusos', 'porca', 'porcas', 'phillips', 'fenda'],
    ncm: { code: '73181500', description: mockNcmDatabase['73181500'] },
  },
  {
    keywords: ['prego', 'pregos', 'tachinha', 'tachas'],
    ncm: { code: '73170000', description: mockNcmDatabase['73170000'] },
  },
  {
    keywords: ['gancho', 'ganchos', 'ilhós'],
    ncm: { code: '73181600', description: mockNcmDatabase['73181600'] },
  },
  
  // Materiais de escritório
  {
    keywords: ['caneta', 'esferográfica', 'bic'],
    ncm: { code: '96081000', description: mockNcmDatabase['96081000'] },
  },
  {
    keywords: ['marcador', 'pilot', 'hidrográfica', 'feltro'],
    ncm: { code: '96082000', description: mockNcmDatabase['96082000'] },
  },
]

/**
 * Simulates an AI call to suggest an NCM code based on a description.
 * @param description The material description.
 * @returns A promise that resolves to NcmInfo or null if no suggestion is found.
 */
export const suggestNcm = (description: string): Promise<NcmInfo | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerCaseDescription = description.toLowerCase()
      for (const mapping of keywordMapping) {
        if (
          mapping.keywords.some((keyword) =>
            lowerCaseDescription.includes(keyword),
          )
        ) {
          resolve(mapping.ncm)
          return
        }
      }
      resolve(null)
    }, 1200) // Simulate network delay
  })
}

/**
 * Fetches the description for a given NCM code.
 * @param ncmCode The 8-digit NCM code.
 * @returns A promise that resolves to the description string or null if not found.
 */
export const getNcmDescription = (ncmCode: string): Promise<string | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockNcmDatabase[ncmCode] || null)
    }, 300) // Simulate network delay
  })
}

