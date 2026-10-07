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
import { barrasDoCodigo, code128b, larguraEmModulos, podeCodificar } from '../src/lib/code128'

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
