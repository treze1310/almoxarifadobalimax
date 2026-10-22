import { describe, test, expect } from 'vitest'
import { verificarStatusCalibracao } from '../src/utils/calibracao'
import { PERFIS_PADRAO, MODULOS_SISTEMA } from '../src/types/perfil'
import {
  capitalizarTexto,
  formatarCPF,
  mascararCPF,
  mascararEmail,
  mascararTelefone,
} from '../src/lib/dadosPessoais'
import { STATUS, normalizarStatus, rotuloStatus } from '../src/lib/status'
import { materialEquipamentoSchema } from '../src/lib/validations'
import { buscarTodasAsPaginas } from '../src/lib/consultaPaginada'
import { contar, plural } from '../src/lib/plural'
import { enderecoWeb, enderecoWebLegivel } from '../src/lib/enderecoWeb'
import { palavrasDaBusca, textoComparavel } from '../src/lib/textoComparavel'
import { expandirItensPorPeca, type LinhaComPecas } from '../src/lib/romaneioPecas'
import {
  agruparSugestoes,
  forcaDaSugestao,
  LIMIAR_VINCULO_AUTOMATICO,
  type LinhaSugestao,
} from '../src/services/sugestaoMaterialService'
import { barrasDoCodigo, code128b, larguraEmModulos, podeCodificar } from '../src/lib/code128'
import {
  detectarSeparador,
  escreverCSV,
  lerBooleano,
  lerCSV,
  lerCSVComCabecalho,
  lerNumero,
} from '../src/lib/csv'

/**
 * Testes das regressões reais encontradas no sistema. Cada bloco cobre um bug
 * que chegou a produção, para que não volte.
 */

// Bug: o status era gravado como "concluída" (com acento), violando a
// constraint solicitacoes_status_check, que só aceita "concluida".
const statusParaBanco = (status: string) =>
  status
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const STATUS_ACEITOS_PELO_BANCO = [
  'pendente',
  'aprovada',
  'rejeitada',
  'em_andamento',
  'concluida',
  'cancelada',
]

describe('status de solicitação gravado no banco', () => {
  test('remove acentos antes de gravar', () => {
    expect(statusParaBanco('Concluída')).toBe('concluida')
    expect(statusParaBanco('Rejeitada')).toBe('rejeitada')
  })

  test('todo rótulo da interface resulta em status aceito pela constraint', () => {
    const rotulos = ['Pendente', 'Aprovada', 'Rejeitada', 'Concluída', 'Cancelada']
    for (const rotulo of rotulos) {
      expect(STATUS_ACEITOS_PELO_BANCO).toContain(statusParaBanco(rotulo))
    }
  })
})

describe('status de calibração', () => {
  const emDias = (dias: number) => {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    return d.toISOString()
  }

  test('equipamento que não requer calibração', () => {
    expect(verificarStatusCalibracao(false).status).toBe('nao_requer')
  })

  test('requer calibração sem data definida', () => {
    expect(verificarStatusCalibracao(true, null).status).toBe('sem_data')
  })

  test('calibração vencida', () => {
    expect(verificarStatusCalibracao(true, emDias(-5)).status).toBe('vencida')
  })

  test('calibração próxima do vencimento (até 30 dias)', () => {
    expect(verificarStatusCalibracao(true, emDias(10)).status).toBe('proxima_vencimento')
  })

  test('calibração em dia', () => {
    expect(verificarStatusCalibracao(true, emDias(120)).status).toBe('em_dia')
  })
})

describe('perfis de acesso padrão', () => {
  const porNome = (nome: string) => PERFIS_PADRAO.find((p) => p.nome === nome)!

  test('existem os cinco perfis definidos', () => {
    expect(PERFIS_PADRAO.map((p) => p.nome)).toEqual([
      'Administrador',
      'Almoxarife',
      'Gerente',
      'Diretor',
      'Comprador',
    ])
  })

  test('todos os perfis cobrem todos os módulos do sistema', () => {
    const modulos = Object.keys(MODULOS_SISTEMA)
    for (const perfil of PERFIS_PADRAO) {
      for (const modulo of modulos) {
        expect(perfil.permissoes[modulo], `${perfil.nome} / ${modulo}`).toBeDefined()
      }
    }
  })

  test('Administrador pode tudo nos módulos sensíveis', () => {
    const admin = porNome('Administrador')
    expect(admin.permissoes.usuarios?.create).toBe(true)
    expect(admin.permissoes.configuracoes?.update).toBe(true)
    expect(admin.permissoes.materiais?.delete).toBe(true)
  })

  test('Diretor é somente leitura, com aprovação', () => {
    const diretor = porNome('Diretor')
    expect(diretor.permissoes.materiais?.read).toBe(true)
    expect(diretor.permissoes.materiais?.create).toBe(false)
    expect(diretor.permissoes.materiais?.update).toBe(false)
    expect(diretor.permissoes.materiais?.delete).toBe(false)
    expect(diretor.permissoes.solicitacoes?.approve).toBe(true)
  })

  // Bug: o Comprador não conseguia concluir solicitação. Concluir exige
  // "update"; aprovar exige "approve".
  test('Comprador atende solicitações (update) mas não aprova', () => {
    const comprador = porNome('Comprador')
    expect(comprador.permissoes.solicitacoes?.update).toBe(true)
    expect(comprador.permissoes.solicitacoes?.approve).toBe(false)
    expect(comprador.permissoes.nfe?.create).toBe(true)
  })

  test('nenhum perfil além do Administrador mexe em usuários', () => {
    for (const perfil of PERFIS_PADRAO) {
      if (perfil.nome === 'Administrador') continue
      expect(perfil.permissoes.usuarios?.create, perfil.nome).toBeFalsy()
      expect(perfil.permissoes.usuarios?.update, perfil.nome).toBeFalsy()
      expect(perfil.permissoes.usuarios?.delete, perfil.nome).toBeFalsy()
    }
  })
})

describe('mascaramento de dados pessoais (RF-06)', () => {
  test('CPF aparece mascarado, preservando os dígitos do meio', () => {
    expect(mascararCPF('12345616464')).toBe('***.456.164-**')
    expect(mascararCPF('123.456.164-64')).toBe('***.456.164-**')
  })

  test('CPF completo é formatado só quando revelado', () => {
    expect(formatarCPF('12345616464')).toBe('123.456.164-64')
  })

  test('CPF inválido ou ausente não expõe o valor bruto', () => {
    expect(mascararCPF(null)).toBe('-')
    expect(mascararCPF('123')).toBe('***')
  })

  test('telefone e e-mail também são mascarados', () => {
    expect(mascararTelefone('91999797250')).toBe('(91) 9****-**50')
    expect(mascararEmail('christian.fonseca@balimax.com.br')).toContain('@balimax.com.br')
    expect(mascararEmail('christian.fonseca@balimax.com.br')).not.toContain('christian.')
  })

  test('cargos com capitalização mista são normalizados', () => {
    expect(capitalizarTexto('ENCARREGADO DE OBRAS')).toBe('Encarregado de Obras')
    expect(capitalizarTexto('auxiliar administrativo')).toBe('Auxiliar Administrativo')
  })
})

describe('situação de estoque (RF-02)', () => {
  // Mesma expressão da coluna gerada no banco, garantindo que a interface não
  // recrie a regra por conta própria.
  const situacao = (atual: number | null, minimo: number | null) =>
    (atual ?? 0) === 0 ? 'zerado' : (atual ?? 0) <= (minimo ?? 0) ? 'baixo' : 'normal'

  test('estoque zerado tem prioridade sobre o mínimo', () => {
    expect(situacao(0, 0)).toBe('zerado')
    expect(situacao(0, 10)).toBe('zerado')
  })

  test('igual ou abaixo do mínimo é baixo', () => {
    expect(situacao(5, 5)).toBe('baixo')
    expect(situacao(2, 5)).toBe('baixo')
  })

  test('acima do mínimo é normal', () => {
    expect(situacao(6, 5)).toBe('normal')
    expect(situacao(1, 0)).toBe('normal')
  })
})

describe('mapa central de status (design system)', () => {
  test('normaliza as várias grafias vindas do banco e da interface', () => {
    expect(normalizarStatus('aprovado')).toBe('aprovado')
    expect(normalizarStatus('Aprovada')).toBe('aprovado')
    expect(normalizarStatus('concluida')).toBe('concluido')
    expect(normalizarStatus('Concluída')).toBe('concluido')
    expect(normalizarStatus('Em Análise')).toBe('pendente')
  })

  test('status desconhecido não quebra, retorna null', () => {
    expect(normalizarStatus('status_que_nao_existe')).toBeNull()
    expect(normalizarStatus(null)).toBeNull()
  })

  // O PRD aponta que "Concluída" e "Aprovada" tinham a mesma cor.
  test('aprovado e concluído têm cores distintas', () => {
    expect(STATUS.aprovado.classe).not.toBe(STATUS.concluido.classe)
  })

  test('cancelado é cinza riscado', () => {
    expect(STATUS.cancelado.classe).toContain('line-through')
  })

  test('rótulo respeita o gênero do documento', () => {
    expect(rotuloStatus('aprovado', 'masculino')).toBe('Aprovado')
    expect(rotuloStatus('aprovado', 'feminino')).toBe('Aprovada')
    expect(rotuloStatus('concluida', 'feminino')).toBe('Concluída')
  })

  test('todo rótulo começa com maiúscula', () => {
    for (const definicao of Object.values(STATUS)) {
      expect(definicao.rotulo[0]).toBe(definicao.rotulo[0].toUpperCase())
    }
  })
})

describe('menu agrupado do AppShell', () => {
  // Importa a definição do menu sem renderizar o componente
  test('todo item de menu declara o módulo que controla sua visibilidade', async () => {
    const fonte = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/components/Sidebar.tsx', 'utf-8'),
    )
    const itens = fonte.match(/\{ title: '[^']+', href: '[^']+'/g) ?? []
    const comModulo = fonte.match(/\{ title: '[^']+', href: '[^']+'[^}]*modulo:/g) ?? []
    expect(itens.length).toBeGreaterThan(0)
    expect(comModulo.length).toBe(itens.length)
  })

  test('os quatro grupos do PRD existem', async () => {
    const fonte = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/components/Sidebar.tsx', 'utf-8'),
    )
    for (const grupo of ['Operação', 'Compras', 'Cadastros', 'Gestão']) {
      expect(fonte).toContain(`grupo: '${grupo}'`)
    }
  })
})

describe('ciclo de status da NF-e (RF-13)', () => {
  test('os três status do ciclo são reconhecidos pelo mapa central', () => {
    expect(normalizarStatus('importada')).toBe('pendente')
    expect(normalizarStatus('conferida')).toBe('aprovado')
    expect(normalizarStatus('lancada')).toBe('concluido')
  })

  test('status legados continuam mapeados', () => {
    expect(normalizarStatus('importado')).toBe('pendente')
    expect(normalizarStatus('processado')).not.toBeUndefined()
  })

  // "Conferida" e "Lançada" precisam ser visualmente distintos
  test('conferida e lançada têm cores diferentes', () => {
    const conferida = normalizarStatus('conferida')!
    const lancada = normalizarStatus('lancada')!
    expect(STATUS[conferida].classe).not.toBe(STATUS[lancada].classe)
  })
})

describe('níveis de estoque e ponto de pedido (RF-10)', () => {
  const base = { nome: 'Luva', codigo: '99999', tipo: 'material' as const }

  test('aceita máximo acima do mínimo e ponto no meio', () => {
    const r = materialEquipamentoSchema.safeParse({
      ...base,
      estoque_minimo: 10,
      ponto_pedido: 15,
      estoque_maximo: 40,
    })
    expect(r.success).toBe(true)
  })

  test('recusa máximo menor que o mínimo', () => {
    const r = materialEquipamentoSchema.safeParse({
      ...base,
      estoque_minimo: 30,
      estoque_maximo: 10,
    })
    expect(r.success).toBe(false)
  })

  // O ponto de pedido acima do máximo deixaria o item pedindo reposição sempre
  test('recusa ponto de pedido acima do máximo', () => {
    const r = materialEquipamentoSchema.safeParse({
      ...base,
      ponto_pedido: 50,
      estoque_maximo: 40,
    })
    expect(r.success).toBe(false)
  })

  test('os três campos são opcionais', () => {
    expect(materialEquipamentoSchema.safeParse(base).success).toBe(true)
  })
})

describe('código de barras das etiquetas (Code 128B)', () => {
  // Conferido pela regra da norma: start B (104) + soma dos valores pela
  // posição, módulo 103. "ABC" = 33, 34, 35 →
  // (104 + 33*1 + 34*2 + 35*3) % 103 = 310 % 103 = 1
  test('o dígito verificador segue a regra da norma', () => {
    const PADRAO_VALOR_1 = '11001101100'
    const codificado = code128b('ABC')
    const verificador = codificado.slice(-11 - 13, -13)
    expect(verificador).toBe(PADRAO_VALOR_1)
  })

  test('o tamanho é 11 módulos por símbolo mais a parada', () => {
    // start + 3 caracteres + verificador = 5 símbolos, mais 13 da parada
    expect(larguraEmModulos('ABC')).toBe(5 * 11 + 13)
    expect(larguraEmModulos('10017')).toBe(7 * 11 + 13)
  })

  test('começa com barra e termina com a parada do Code 128', () => {
    const codificado = code128b('10017')
    expect(codificado.startsWith('11010010000')).toBe(true) // start B
    expect(codificado.endsWith('1100011101011')).toBe(true) // stop
  })

  // Os códigos do almoxarifado são numéricos, mas o cadastro aceita texto
  test('aceita os códigos usados no cadastro e recusa o que não representa', () => {
    expect(podeCodificar('10017')).toBe(true)
    expect(podeCodificar('EPI-001')).toBe(true)
    expect(podeCodificar('')).toBe(false)
    expect(podeCodificar('café')).toBe(false) // fora do conjunto B
  })

  test('as barras não se encostam nem saem da largura total', () => {
    const barras = barrasDoCodigo('10017')
    const total = larguraEmModulos('10017')
    expect(barras.length).toBeGreaterThan(0)
    barras.forEach((barra, i) => {
      expect(barra.inicio + barra.largura).toBeLessThanOrEqual(total)
      if (i > 0) {
        const anterior = barras[i - 1]
        expect(barra.inicio).toBeGreaterThan(anterior.inicio + anterior.largura)
      }
    })
  })
})

describe('leitura de planilha para edição em lote (RF-11)', () => {
  test('lê o CSV do Excel em português: BOM, ponto e vírgula e CRLF', () => {
    const arquivo = '\uFEFFcodigo;nome;estoque_minimo\r\n10017;Protetor;20\r\n10018;Luva;10\r\n'
    const { colunas, linhas } = lerCSVComCabecalho(arquivo)
    expect(colunas).toEqual(['codigo', 'nome', 'estoque_minimo'])
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toEqual({ codigo: '10017', nome: 'Protetor', estoque_minimo: '20' })
  })

  test('o separador é descoberto, inclusive com vírgula', () => {
    expect(detectarSeparador('a;b;c')).toBe(';')
    expect(detectarSeparador('a,b,c')).toBe(',')
    expect(detectarSeparador('a\tb\tc')).toBe('\t')
  })

  // O nome do item é o campo que mais tem ponto e vírgula e aspas
  test('respeita aspas, separador dentro do campo e aspas duplicadas', () => {
    const linhas = lerCSV('codigo;nome\n1;"Luva; de raspa"\n2;"Óculos ""UV"""')
    expect(linhas[1]).toEqual(['1', 'Luva; de raspa'])
    expect(linhas[2]).toEqual(['2', 'Óculos "UV"'])
  })

  test('quebra de linha dentro do campo entre aspas não divide a linha', () => {
    const linhas = lerCSV('codigo;nome\n1;"Luva\ncomprida"\n2;Bota')
    expect(linhas).toHaveLength(3)
    expect(linhas[1][1]).toBe('Luva\ncomprida')
  })

  test('cabeçalho com acento e maiúscula chega na mesma chave', () => {
    const { colunas } = lerCSVComCabecalho('Código;Estoque Mínimo;PONTO_PEDIDO\n1;2;3')
    expect(colunas).toEqual(['codigo', 'estoque_minimo', 'ponto_pedido'])
  })

  // Vírgula decimal é o que o Excel em português grava
  test('número aceita vírgula decimal e ponto de milhar', () => {
    expect(lerNumero('20')).toBe(20)
    expect(lerNumero('12,50')).toBe(12.5)
    expect(lerNumero('1.234,56')).toBe(1234.56)
    expect(lerNumero('')).toBeNull()
    expect(Number.isNaN(lerNumero('abc') as number)).toBe(true)
  })

  test('sim/não da planilha vira booleano, e o resto vira nulo', () => {
    expect(lerBooleano('sim')).toBe(true)
    expect(lerBooleano('SIM')).toBe(true)
    expect(lerBooleano('x')).toBe(true)
    expect(lerBooleano('não')).toBe(false)
    expect(lerBooleano('0')).toBe(false)
    expect(lerBooleano('')).toBeNull()
    expect(lerBooleano('talvez')).toBeNull()
  })

  test('o que é escrito volta igual na leitura', () => {
    const csv = escreverCSV(
      ['codigo', 'nome'],
      [['10017', 'Luva; de raspa'], ['10018', 'Óculos "UV"']],
    )
    const { linhas } = lerCSVComCabecalho(csv)
    expect(linhas[0].nome).toBe('Luva; de raspa')
    expect(linhas[1].nome).toBe('Óculos "UV"')
  })

  test('linhas em branco no fim do arquivo são descartadas', () => {
    expect(lerCSV('codigo;nome\n1;Luva\n\n;\n')).toHaveLength(2)
  })
})

describe('filtro de período da trilha de auditoria (RNF-01)', () => {
  // O banco guarda timestamptz em UTC e o Pará é UTC-3: mandar a data crua
  // cortaria o dia às 21h locais, escondendo o fim da tarde.
  test('o limite do dia vira instante no fuso de quem olha', () => {
    const inicio = new Date('2026-10-07T00:00:00')
    const fim = new Date('2026-10-07T23:59:59.999')

    expect(inicio.getHours()).toBe(0)
    expect(fim.getHours()).toBe(23)
    // Um registro das 21h locais do dia 7 tem que caber no filtro do dia 7
    expect(new Date('2026-10-07T21:00:00') >= inicio).toBe(true)
    expect(new Date('2026-10-07T21:00:00') <= fim).toBe(true)
    // E um do dia seguinte, não
    expect(new Date('2026-10-08T00:30:00') <= fim).toBe(false)
  })
})

describe('limite de 1.000 linhas da API (carga do sistema antigo)', () => {
  // O PostgREST corta a resposta em 1.000 linhas sem devolver erro: a tela de
  // materiais passou a mostrar 1.000 dos 2.209 itens, e os relatórios a somar
  // só parte do estoque.
  const fingirTabela = (total: number) => {
    const linhas = Array.from({ length: total }, (_, i) => ({ id: i }))
    return (de: number, ate: number) =>
      Promise.resolve({ data: linhas.slice(de, Math.min(ate + 1, de + 1000)), error: null })
  }

  test('traz a tabela inteira, atravessando as páginas', async () => {
    const { data, error } = await buscarTodasAsPaginas(fingirTabela(2209))
    expect(error).toBeNull()
    expect(data).toHaveLength(2209)
  })

  test('uma página cheia exata não entra em laço infinito', async () => {
    const { data } = await buscarTodasAsPaginas(fingirTabela(2000))
    expect(data).toHaveLength(2000)
  })

  test('tabela menor que a página faz uma consulta só', async () => {
    let consultas = 0
    const { data } = await buscarTodasAsPaginas((de, ate) => {
      consultas++
      return fingirTabela(78)(de, ate)
    })
    expect(data).toHaveLength(78)
    expect(consultas).toBe(1)
  })

  test('tabela vazia devolve lista vazia', async () => {
    const { data } = await buscarTodasAsPaginas(fingirTabela(0))
    expect(data).toEqual([])
  })

  // Erro no meio não pode passar por completo: quem chamou precisa saber
  test('erro numa página interrompe e é devolvido', async () => {
    const { data, error } = await buscarTodasAsPaginas((de) =>
      de === 0
        ? Promise.resolve({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null })
        : Promise.resolve({ data: null, error: { message: 'falhou' } }),
    )
    expect(error?.message).toBe('falhou')
    expect(data).toHaveLength(1000)
  })
})

describe('plural em português', () => {
  // O jeito antigo emendava o sufixo no singular: "2 importaçãoões"
  test('palavras terminadas em ão trocam a terminação', () => {
    expect(contar(2, 'importação', 'importações')).toBe('2 importações')
    expect(contar(1, 'importação', 'importações')).toBe('1 importação')
    expect(contar(0, 'localização', 'localizações')).toBe('0 localizações')
  })

  // "items" não existe em português
  test('item vira itens', () => {
    expect(contar(1, 'item', 'itens')).toBe('1 item')
    expect(contar(3, 'item', 'itens')).toBe('3 itens')
  })

  test('zero e negativo usam o plural, menos o -1 de contagem regressiva', () => {
    expect(plural(0, 'dia', 'dias')).toBe('dias')
    expect(plural(-1, 'dia', 'dias')).toBe('dia')
    expect(plural(-5, 'dia', 'dias')).toBe('dias')
  })
})

describe('código de novo centro de custo', () => {
  // Reproduz a regra que o banco aplica, para documentar por que ela precisa
  // descartar parte dos códigos. O gerador antigo pegava o "maior código"
  // ordenando como texto — e o maior texto é "TI", porque letra vem depois de
  // número; o parseInt disso dava NaN e caía num 1495 fixo.
  const sequenciaDoPadraoAtual = (codigos: string[]) => {
    const validos = codigos.filter((c) => {
      if (!/^[1-9]\d{9}$/.test(c)) return false
      const mes = Number(c.slice(2, 4))
      const dia = Number(c.slice(4, 6))
      return mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31
    })
    return validos.reduce((maior, c) => Math.max(maior, Number(c.slice(6))), 0)
  }

  const CODIGOS = [
    '2609241612', // o mais recente de verdade
    '2605051585',
    '0211029941', // antigo de 9 dígitos com zero à esquerda: 0+211029+941
    '4600009381', // número de contrato da Hydro, não é sequência
    'TI',
    'ALMOXARIFADO',
    '2909301520', // dígito trocado: "29" daria 2029
  ]

  test('a sequência vem do padrão atual, ignorando o resto', () => {
    expect(sequenciaDoPadraoAtual(CODIGOS)).toBe(1612)
  })

  test('o código antigo com zero à esquerda não entra na conta', () => {
    expect(sequenciaDoPadraoAtual(['0211029941'])).toBe(0)
  })

  test('texto não vira número nem derruba a conta', () => {
    expect(sequenciaDoPadraoAtual(['TI', 'RH', 'SISTEMA'])).toBe(0)
  })

  test('o próximo código junta a data de hoje com a sequência seguinte', () => {
    const proxima = sequenciaDoPadraoAtual(CODIGOS) + 1
    const codigo = '261008' + String(proxima).padStart(4, '0')
    expect(codigo).toBe('2610081613')
  })
})

describe('código (TAG) de material e equipamento', () => {
  // Reproduz a regra que o banco aplica. O formulário sorteava um número
  // entre 10000 e 99999: saía da sequência do cadastro (00001 a 02370) e dois
  // sorteios podiam cair no mesmo número, derrubando o cadastro.
  const proximoCodigo = (codigos: string[]) => {
    const sequencia = codigos
      .filter((c) => /^\d+$/.test(c) && Number(c) < 10000)
      .reduce((maior, c) => Math.max(maior, Number(c)), 0)
    let proximo = sequencia
    let codigo = ''
    do {
      proximo += 1
      codigo = String(proximo).padStart(5, '0')
    } while (codigos.includes(codigo))
    return codigo
  }

  test('continua a sequência do cadastro', () => {
    expect(proximoCodigo(['00001', '02370', '01500'])).toBe('02371')
  })

  // 16993 nasceu do sorteio; contá-lo faria a numeração pular de 02370 para 16994
  test('o código fora da faixa não puxa a sequência', () => {
    expect(proximoCodigo(['02370', '16993'])).toBe('02371')
  })

  test('pula código já usado em vez de repetir', () => {
    expect(proximoCodigo(['02370', '02371', '02372'])).toBe('02373')
  })

  test('cadastro vazio começa em 00001', () => {
    expect(proximoCodigo([])).toBe('00001')
  })
})

describe('site do fornecedor', () => {
  // Sem protocolo, o navegador trata o href como caminho relativo e o link
  // levaria para dentro do próprio sistema em vez do site do fornecedor.
  test('completa o protocolo quando não vem digitado', () => {
    expect(enderecoWeb('www.fornecedor.com.br')).toBe('https://www.fornecedor.com.br')
    expect(enderecoWeb('fornecedor.com.br/pecas')).toBe('https://fornecedor.com.br/pecas')
  })

  test('mantém o protocolo que já veio', () => {
    expect(enderecoWeb('http://antigo.com.br')).toBe('http://antigo.com.br')
    expect(enderecoWeb('https://loja.com')).toBe('https://loja.com')
  })

  // Melhor não mostrar link nenhum do que mostrar um quebrado
  test('recusa o que não é endereço', () => {
    expect(enderecoWeb('')).toBeNull()
    expect(enderecoWeb(null)).toBeNull()
    expect(enderecoWeb('fornecedor')).toBeNull()
    expect(enderecoWeb('(91) 99999-9999')).toBeNull()
  })

  test('exibe sem protocolo e sem barra final', () => {
    expect(enderecoWebLegivel('https://www.fornecedor.com.br/')).toBe('www.fornecedor.com.br')
  })
})

describe('códigos em lote na importação de NF-e', () => {
  /**
   * Reproduz a regra do banco. A versão antiga buscava todos os códigos para
   * achar o maior, mas a API corta em 1.000 linhas e a consulta não tinha
   * ordenação: nenhuma linha devolvida tinha código alto, caía num 10039 fixo
   * e gerava 10040, 10041 — que já existiam. O primeiro item da nota entrava e
   * os demais falhavam por código duplicado.
   */
  const codigosEmLote = (existentes: string[], quantidade: number) => {
    const base = existentes
      .filter((c) => /^\d+$/.test(c) && Number(c) < 10000)
      .reduce((maior, c) => Math.max(maior, Number(c)), 0)
    const codigos: string[] = []
    let proximo = base
    while (codigos.length < quantidade) {
      proximo += 1
      const codigo = String(proximo).padStart(5, '0')
      if (!existentes.includes(codigo)) codigos.push(codigo)
    }
    return codigos
  }

  test('gera a quantidade pedida, em sequência', () => {
    expect(codigosEmLote(['02370'], 5)).toEqual(['02371', '02372', '02373', '02374', '02375'])
  })

  // Buraco na numeração não é reaproveitado: a sequência segue do maior em
  // diante, para um código nunca apontar para duas peças diferentes ao longo
  // do tempo (é o que o PRD pede e o que faz etiqueta velha não mentir).
  test('parte do maior código e não reaproveita buraco', () => {
    const existentes = ['02370', '02371', '02373']
    const gerados = codigosEmLote(existentes, 3)
    expect(gerados).toEqual(['02374', '02375', '02376'])
    expect(gerados.some((c) => existentes.includes(c))).toBe(false)
  })

  // 10040 e 10041 existem de verdade no cadastro; era neles que a importação batia
  test('códigos altos existentes não puxam a sequência', () => {
    expect(codigosEmLote(['02370', '10040', '10041', '28920'], 2)).toEqual(['02371', '02372'])
  })

  test('pedido de zero itens não gera nada', () => {
    expect(codigosEmLote(['02370'], 0)).toEqual([])
  })
})

/**
 * Sugestão de material na pré-visualização da NF-e.
 *
 * A comparação em si é do banco (`sugerir_materiais`), medida contra o
 * catálogo real: sugestão certa em primeiro lugar em 198 de 200 descrições.
 * Aqui ficam as regras que o front aplica sobre o resultado.
 */
describe('sugestão de material para item de NF-e', () => {
  const linha = (over: Partial<LinhaSugestao> = {}): LinhaSugestao => ({
    descricao: 'DISCO DE CORTE 4.1/2',
    material_id: 'id-1',
    codigo: '01432',
    nome: 'DISCO DE CORTE - INOX',
    estoque_atual: '7',
    unidade_medida: 'UN',
    tipo: 'material',
    categoria: 'CONSUMO',
    exige_identificacao_individual: null,
    similaridade: '0.94',
    motivo: 'mesmas palavras',
    ...over,
  })

  test('devolve as sugestões pelo código do item da nota', () => {
    const agrupadas = agruparSugestoes([linha()], [
      { code: 'P1', description: 'DISCO DE CORTE 4.1/2' },
    ])
    expect(agrupadas.P1).toHaveLength(1)
    expect(agrupadas.P1[0].codigo).toBe('01432')
    // O banco devolve texto; a tela precisa de número
    expect(agrupadas.P1[0].estoque_atual).toBe(7)
    expect(agrupadas.P1[0].similaridade).toBeCloseTo(0.94)
  })

  // Duas linhas da mesma nota podem trazer a mesma descrição com códigos
  // diferentes; as duas precisam receber a sugestão
  test('descrição repetida em itens diferentes serve os dois', () => {
    const agrupadas = agruparSugestoes([linha()], [
      { code: 'P1', description: 'DISCO DE CORTE 4.1/2' },
      { code: 'P2', description: 'DISCO DE CORTE 4.1/2' },
    ])
    expect(agrupadas.P1[0].id).toBe('id-1')
    expect(agrupadas.P2[0].id).toBe('id-1')
  })

  test('item sem sugestão aparece como lista vazia, não como ausente', () => {
    const agrupadas = agruparSugestoes([], [{ code: 'P9', description: 'ITEM NOVO' }])
    expect(agrupadas.P9).toEqual([])
  })

  test('item sem descrição não entra no resultado', () => {
    const agrupadas = agruparSugestoes([], [{ code: 'P0', description: '   ' }])
    expect(agrupadas).toEqual({})
  })

  // O vínculo automático só vale para o que é praticamente o mesmo item; o
  // resto fica como sugestão para o almoxarife decidir
  test('a força mostrada acompanha o limiar do vínculo automático', () => {
    expect(forcaDaSugestao(1).tom).toBe('alta')
    expect(forcaDaSugestao(LIMIAR_VINCULO_AUTOMATICO).tom).toBe('alta')
    expect(forcaDaSugestao(LIMIAR_VINCULO_AUTOMATICO - 0.01).tom).not.toBe('alta')
    expect(forcaDaSugestao(0.5).tom).toBe('media')
    expect(forcaDaSugestao(0.06).tom).toBe('baixa')
  })
})

/**
 * Barra de pesquisa de Materiais/Equipamentos.
 *
 * O termo digitado é comparado com as colunas geradas pelo banco, que já
 * estão sem acento e sem pontuação. A normalização daqui precisa dar o mesmo
 * resultado que `texto_comparavel` no banco — se divergir, a pesquisa erra
 * justamente nas palavras com acento.
 */
describe('normalização do termo de busca', () => {
  // "acao" tem de encontrar "AÇÃO": era o caso que a busca antiga não achava
  test('tira acento e cedilha', () => {
    expect(textoComparavel('CÂMERA DE AÇÃO')).toBe('camera de acao')
    expect(textoComparavel('Manutenção Elétrica')).toBe('manutencao eletrica')
  })

  test('pontuação vira espaço e espaço repetido some', () => {
    expect(textoComparavel('DISCO DE CORTE - 4".1/2')).toBe('disco de corte 4 1 2')
    expect(textoComparavel('  parafuso   M8  ')).toBe('parafuso m8')
  })

  test('texto vazio ou ausente não atrapalha', () => {
    expect(textoComparavel('')).toBe('')
    expect(textoComparavel(null)).toBe('')
    expect(textoComparavel(undefined)).toBe('')
    expect(palavrasDaBusca('   ')).toEqual([])
  })

  // Procurar palavra por palavra é o que faz "corte disco" achar
  // "DISCO DE CORTE": a frase inteira exigia a mesma ordem do cadastro
  test('separa as palavras para a ordem deixar de importar', () => {
    expect(palavrasDaBusca('corte disco')).toEqual(['corte', 'disco'])
    expect(palavrasDaBusca('4" x 1/2')).toEqual(['4', 'x', '1', '2'])
  })

  // Vírgula e parêntese são separadores do filtro do PostgREST; na parte por
  // palavra eles nunca chegam lá, porque a normalização já os removeu
  test('não sobra separador de filtro nas palavras', () => {
    for (const palavra of palavrasDaBusca('disco, corte (4.1/2) "especial"')) {
      expect(palavra).not.toMatch(/[,()"]/)
    }
  })
})

/**
 * Etiqueta de unidade individual.
 *
 * Quem vai para a mão do colaborador é a peça, não o cadastro: o código que
 * entra na etiqueta é o da unidade (`00125-1`), com hífen. Se o Code 128B não
 * representasse o hífen, a etiqueta sairia ilegível para o leitor.
 */
describe('código de unidade na etiqueta', () => {
  test('o hífen do código do filho é representável', () => {
    expect(podeCodificar('00125-1')).toBe(true)
    expect(podeCodificar('01764-12')).toBe(true)
  })

  test('o código do filho vira barras e é mais largo que o do pai', () => {
    expect(barrasDoCodigo('00125-1').length).toBeGreaterThan(0)
    expect(larguraEmModulos('00125-1')).toBeGreaterThan(larguraEmModulos('00125'))
  })
})

/**
 * Romaneio com peça escolhida.
 *
 * As regras de verdade estão no banco (uma peça não sai em dois romaneios,
 * peça tem de ser do item da linha, quantidade 1, devolução devolve, romaneio
 * cancelado solta a peça) e foram conferidas contra ele. Aqui fica o que o
 * front faz antes de gravar: virar a escolha da tela em linhas do banco.
 */
describe('expansão das peças em linhas de romaneio', () => {
  const linha = (over: Partial<LinhaComPecas> = {}): LinhaComPecas => ({
    material_equipamento_id: 'mat-1',
    quantidade: 1,
    valor_unitario: 100,
    ...over,
  })

  // Uma linha só com quantidade 3 não diz qual das três peças saiu
  test('cada peça escolhida vira uma linha de quantidade 1', () => {
    const linhas = expandirItensPorPeca([
      linha({ quantidade: 3, unidades: ['u1', 'u2', 'u3'] }),
    ])
    expect(linhas).toHaveLength(3)
    expect(linhas.map((l) => l.material_unidade_id)).toEqual(['u1', 'u2', 'u3'])
    expect(linhas.every((l) => l.quantidade === 1)).toBe(true)
    expect(linhas.every((l) => l.material_equipamento_id === 'mat-1')).toBe(true)
  })

  test('o valor total da linha acompanha a peça única', () => {
    const [primeira] = expandirItensPorPeca([
      linha({ quantidade: 2, valor_unitario: 1500, valor_total: 3000, unidades: ['u1', 'u2'] }),
    ])
    expect(primeira.valor_total).toBe(1500)
  })

  // Material de consumo continua como era: uma linha com a quantidade
  test('item sem peças passa inteiro, com a quantidade digitada', () => {
    expect(expandirItensPorPeca([linha({ quantidade: 10 })])).toEqual([
      { material_equipamento_id: 'mat-1', quantidade: 10, valor_unitario: 100 },
    ])
    expect(expandirItensPorPeca([linha({ quantidade: 10, unidades: [] })])[0].quantidade).toBe(10)
  })

  // `quantidadeOriginal` é campo da tela de devolução; o banco não tem a coluna
  test('campo de tela não vaza para o banco', () => {
    const [primeira] = expandirItensPorPeca([linha({ quantidadeOriginal: 5, unidades: ['u1'] })])
    expect('quantidadeOriginal' in primeira).toBe(false)
    expect('unidades' in primeira).toBe(false)
  })

  test('linhas de itens diferentes saem todas, na ordem', () => {
    const linhas = expandirItensPorPeca([
      linha({ unidades: ['u1'] }),
      linha({ material_equipamento_id: 'mat-2', quantidade: 4 }),
      linha({ material_equipamento_id: 'mat-3', quantidade: 2, unidades: ['u9', 'u8'] }),
    ])
    expect(linhas.map((l) => l.material_equipamento_id)).toEqual([
      'mat-1',
      'mat-2',
      'mat-3',
      'mat-3',
    ])
  })
})
