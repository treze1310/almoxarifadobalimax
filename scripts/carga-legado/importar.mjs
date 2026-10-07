/**
 * Carga do banco do sistema antigo para o Supabase.
 *
 * Lê os JSON gerados por gerar-dados.py e insere em lotes. Usa a chave de
 * serviço porque a carga roda fora da aplicação, sem usuário logado — a chave
 * fica em .env.carga, que não vai para o git.
 *
 *   node scripts/carga-legado/importar.mjs            # carga completa
 *   node scripts/carga-legado/importar.mjs --sem-historico   # pula as movimentações
 *
 * É idempotente no que importa: cada etapa confere o que já existe antes de
 * inserir, então rodar de novo depois de uma falha no meio não duplica nada.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DADOS = join(AQUI, 'dados')
const RAIZ = join(AQUI, '..', '..')

// ------------------------------------------------------------------ credenciais
const lerEnv = (arquivo) => {
  if (!existsSync(arquivo)) return {}
  return Object.fromEntries(
    readFileSync(arquivo, 'utf-8')
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      }),
  )
}

const env = { ...lerEnv(join(RAIZ, '.env')), ...lerEnv(join(RAIZ, '.env.carga')) }
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const chave = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !chave) {
  console.error(
    '\nFalta a chave de serviço.\n\n' +
      '1. Abra o painel do Supabase > Settings > API\n' +
      '2. Copie a chave "service_role" (secret)\n' +
      '3. Cole em .env.carga, na linha SUPABASE_SERVICE_ROLE_KEY=\n',
  )
  process.exit(1)
}

const db = createClient(url, chave, { auth: { persistSession: false } })
const json = (nome) => JSON.parse(readFileSync(join(DADOS, `${nome}.json`), 'utf-8'))

/** Insere em lotes; o Supabase não aceita milhares de linhas numa tacada */
const inserir = async (tabela, linhas, tamanho = 500) => {
  let gravadas = 0
  for (let i = 0; i < linhas.length; i += tamanho) {
    const lote = linhas.slice(i, i + tamanho)
    const { error } = await db.from(tabela).insert(lote)
    if (error) throw new Error(`${tabela} (lote ${i / tamanho + 1}): ${error.message}`)
    gravadas += lote.length
    process.stdout.write(`\r  ${tabela}: ${gravadas}/${linhas.length}`)
  }
  process.stdout.write(`\r  ${tabela}: ${gravadas} gravados${' '.repeat(20)}\n`)
  return gravadas
}

/** Lê uma tabela inteira em páginas (o PostgREST limita a resposta) */
const lerTudo = async (tabela, colunas) => {
  const todas = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from(tabela).select(colunas).range(de, de + 999)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    todas.push(...data)
    if (data.length < 1000) return todas
  }
}

const faltantes = (novos, existentes, chaveDe) => {
  const tem = new Set(existentes.map(chaveDe))
  return novos.filter((n) => !tem.has(chaveDe(n)))
}

// ------------------------------------------------------------------ execução
const semHistorico = process.argv.includes('--sem-historico')
const inicio = Date.now()
console.log('\nCarga do sistema anterior\n')

// 1. Tabelas de apoio -------------------------------------------------------
for (const [tabela, arquivo, chaveDe] of [
  ['categorias', 'categorias', (x) => x.nome],
  ['marcas', 'marcas', (x) => x.nome],
  ['localizacao', 'localizacoes', (x) => x.codigo],
  ['fornecedores', 'fornecedores', (x) => (x.nome || '').toUpperCase()],
  ['centros_custo', 'centros_custo', (x) => x.codigo],
]) {
  const novos = json(arquivo)
  const existentes = await lerTudo(tabela, Object.keys(novos[0] ?? { id: 1 }).join(','))
  const pendentes = faltantes(novos, existentes, chaveDe)
  if (pendentes.length === 0) console.log(`  ${tabela}: nada a fazer`)
  else await inserir(tabela, pendentes)
}

// 2. Materiais --------------------------------------------------------------
const marcasPorNome = new Map(
  (await lerTudo('marcas', 'id,nome')).map((m) => [m.nome, m.id]),
)
const locaisPorCodigo = new Map(
  (await lerTudo('localizacao', 'id,codigo')).map((l) => [l.codigo, l.id]),
)
const jaExistem = new Set((await lerTudo('materiais_equipamentos', 'codigo')).map((m) => m.codigo))

const materiais = json('materiais')
  .filter((m) => !jaExistem.has(m.codigo))
  .map(({ marca, localizacao, ...resto }) => ({
    ...resto,
    marca_id: marca ? (marcasPorNome.get(marca) ?? null) : null,
    localizacao_id: localizacao ? (locaisPorCodigo.get(localizacao) ?? null) : null,
  }))

if (materiais.length === 0) console.log('  materiais_equipamentos: nada a fazer')
else await inserir('materiais_equipamentos', materiais, 300)

// 3. Colaboradores ----------------------------------------------------------
const colabsExistentes = await lerTudo('colaboradores', 'nome,matricula')
const colaboradores = faltantes(
  json('colaboradores'),
  colabsExistentes,
  (c) => `${(c.nome || '').toUpperCase()}|${c.matricula ?? ''}`,
)
if (colaboradores.length === 0) console.log('  colaboradores: nada a fazer')
else await inserir('colaboradores', colaboradores)

// 4. Movimentações históricas ----------------------------------------------
if (semHistorico) {
  console.log('  movimentacao_estoque: pulado (--sem-historico)')
} else {
  const idPorCodigo = new Map(
    (await lerTudo('materiais_equipamentos', 'id,codigo')).map((m) => [m.codigo, m.id]),
  )
  const { count: jaImportadas } = await db
    .from('movimentacao_estoque')
    .select('id', { count: 'exact', head: true })
    .eq('motivo', 'Importado do sistema anterior')

  if (jaImportadas > 0) {
    console.log(`  movimentacao_estoque: ${jaImportadas} já importadas, pulando`)
  } else {
    const movimentacoes = json('movimentacoes')
      .map(([codigo, tipo, qtd, data, custo, centro]) => {
        const id = idPorCodigo.get(codigo)
        if (!id) return null
        return {
          material_equipamento_id: id,
          tipo_movimentacao: tipo === 's' ? 'saida' : 'entrada',
          // A saída é negativa por convenção do sistema, e há check no banco
          quantidade: tipo === 's' ? -qtd : qtd,
          // O saldo da época não existe no sistema antigo; fica zerado e o
          // motivo deixa claro que a linha é histórica.
          quantidade_anterior: 0,
          quantidade_atual: 0,
          data_movimentacao: data,
          valor_unitario: custo,
          motivo: 'Importado do sistema anterior',
          observacoes: centro ? `Centro de custo ${centro}` : null,
        }
      })
      .filter(Boolean)

    await inserir('movimentacao_estoque', movimentacoes, 1000)
  }
}

// 5. Conferência ------------------------------------------------------------
console.log('\nComo ficou o banco:')
for (const t of ['categorias', 'marcas', 'localizacao', 'materiais_equipamentos',
  'colaboradores', 'fornecedores', 'centros_custo', 'movimentacao_estoque']) {
  const { count } = await db.from(t).select('id', { count: 'exact', head: true })
  console.log(`  ${t.padEnd(24)} ${count}`)
}

console.log(`\nConcluído em ${((Date.now() - inicio) / 1000).toFixed(0)}s.`)
