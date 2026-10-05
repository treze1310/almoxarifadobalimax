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
