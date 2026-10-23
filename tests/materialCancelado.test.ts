import { beforeEach, expect, test, vi } from 'vitest'
import { materialDependencyService } from '../src/services/materialDependencyService'
import { restaurarItensHistoricos } from '../src/lib/romaneioHistorico'

const mocks = vi.hoisted(() => ({ tabelas: {} as Record<string, unknown[]>, rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: {
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, order: () => query,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mocks.tabelas[table] ?? [], error: null }).then(resolve),
    }
    return query
  }, rpc: mocks.rpc,
} }))
beforeEach(() => { mocks.tabelas = {}; vi.clearAllMocks() })

test('romaneios somente cancelados permitem excluir com histórico', async () => {
  mocks.tabelas.romaneios_itens = [{ romaneios: { status: 'cancelado' } }]
  const { data } = await materialDependencyService.checkDependencies('material')
  expect(data?.canDelete).toBe(false)
  expect(data?.podeExcluirComHistorico).toBe(true)
  expect(data?.dependencies[0].blockingCount).toBe(0)
})

test('um único romaneio não cancelado impede excluir, mesmo com outros cancelados', async () => {
  mocks.tabelas.romaneios_itens = [{ romaneios: { status: 'cancelado' } }, { romaneios: { status: 'aprovado' } }]
  const { data } = await materialDependencyService.checkDependencies('material')
  expect(data?.podeExcluirComHistorico).toBe(false)
  expect(data?.dependencies[0].blockingCount).toBe(1)
})

test('vínculo cujo documento não foi carregado não é tratado como cancelado', async () => {
  mocks.tabelas.romaneios_itens = [{ romaneios: null }]
  expect((await materialDependencyService.checkDependencies('material')).data?.podeExcluirComHistorico).toBe(false)
})

test('solicitações não bloqueiam a exclusão com romaneios cancelados', async () => {
  mocks.tabelas.romaneios_itens = [{ romaneios: [{ status: 'cancelado' }] }]
  mocks.tabelas.solicitacoes_itens = [{ id: 'solicitacao' }]
  expect((await materialDependencyService.checkDependencies('material')).data?.podeExcluirComHistorico).toBe(true)
})

test('usa a exclusão transacional e informa que os documentos cancelados permaneceram', async () => {
  mocks.rpc.mockResolvedValue({ data: { romaneios_desvinculados: 2 }, error: null })
  const result = await materialDependencyService.forceDelete('material')
  expect(mocks.rpc).toHaveBeenCalledWith('excluir_material', { p_material_id: 'material' })
  expect(result.success).toBe(true)
  expect(result.warnings[0]).toContain('documentos e seus dados históricos foram preservados')
})

test('detalhes do cancelado recuperam código e nome do material excluído', () => {
  const snapshot = { id: 'apagado', codigo: '123', nome: 'Ferramenta', unidade_medida: 'UN' }
  const doc = restaurarItensHistoricos({ romaneios_itens: [{ quantidade: 2, materiais_equipamentos: null as unknown, material_excluido: snapshot }] })
  expect(doc.romaneios_itens[0].materiais_equipamentos).toMatchObject(snapshot)
  expect(doc.romaneios_itens[0].quantidade).toBe(2)
})

test('histórico nunca substitui um cadastro que ainda existe', () => {
  const atual = { nome: 'Nome atual' }
  const doc = restaurarItensHistoricos({ romaneios_itens: [{ materiais_equipamentos: atual, material_excluido: { nome: 'Antigo' } }] })
  expect(doc.romaneios_itens[0].materiais_equipamentos).toBe(atual)
})
