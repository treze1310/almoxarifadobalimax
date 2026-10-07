/**
 * Confere o resultado da carga: contagens, saldos, acentos e datas.
 *
 *   node scripts/carga-legado/conferir.mjs
 *
 * Só lê. Serve para olhar o banco depois da carga sem abrir a aplicação.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const lerEnv = (a) =>
  existsSync(a)
    ? Object.fromEntries(
        readFileSync(a, 'utf-8')
          .split(/\r?\n/)
          .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
          .map((l) => {
            const i = l.indexOf('=')
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
          }),
      )
    : {}

const env = { ...lerEnv(join(RAIZ, '.env')), ...lerEnv(join(RAIZ, '.env.carga')) }
const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const conta = async (tabela, filtro = (q) => q) => {
  const { count, error } = await filtro(db.from(tabela).select('id', { count: 'exact', head: true }))
  if (error) throw new Error(`${tabela}: ${error.message}`)
  return count
}

const pagina = async (tabela, colunas, filtro = (q) => q) => {
  const todas = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtro(db.from(tabela).select(colunas)).range(de, de + 999)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    todas.push(...data)
    if (data.length < 1000) return todas
  }
}

console.log('\n=== Cadastro ===')
for (const t of ['categorias', 'marcas', 'localizacao', 'materiais_equipamentos',
  'colaboradores', 'fornecedores', 'centros_custo', 'empresas', 'usuarios']) {
  console.log(`  ${t.padEnd(24)} ${await conta(t)}`)
}

console.log('\n=== Materiais ===')
const itens = await pagina('materiais_equipamentos',
  'codigo,nome,tipo,estoque_atual,estoque_minimo,is_epi,marca_id,localizacao_id,codigo_barras,precisa_repor,validade_ca')

const soma = (f) => itens.reduce((t, i) => t + (f(i) || 0), 0)
console.log(`  equipamentos             ${itens.filter((i) => i.tipo === 'equipamento').length}`)
console.log(`  materiais                ${itens.filter((i) => i.tipo === 'material').length}`)
console.log(`  EPI                      ${itens.filter((i) => i.is_epi).length}`)
console.log(`  com saldo                ${itens.filter((i) => i.estoque_atual > 0).length}`)
console.log(`  unidades em estoque      ${soma((i) => i.estoque_atual)}`)
console.log(`  sem marca                ${itens.filter((i) => !i.marca_id).length}`)
console.log(`  sem localização          ${itens.filter((i) => !i.localizacao_id).length}`)
console.log(`  com código de barras     ${itens.filter((i) => i.codigo_barras).length}`)
console.log(`  no ponto de pedido       ${itens.filter((i) => i.precisa_repor).length}`)
console.log(`  EPI com CA vencido       ${itens.filter((i) => i.is_epi && i.validade_ca && i.validade_ca < new Date().toISOString().slice(0, 10)).length}`)

// Acento duplamente codificado sobrevivente: 'Ã' seguido de caractere de
// controle ou de pontuação tipográfica é sinal de texto estragado.
const estragados = itens.filter((i) => /[ÃÂ][\u0080-\u009F–-„Œ-ƒ]/.test(i.nome))
console.log(`  nomes com acento estragado ${estragados.length}`)
estragados.slice(0, 5).forEach((i) => console.log(`     ${i.codigo} ${i.nome}`))

console.log('\n=== Colaboradores ===')
const colabs = await pagina('colaboradores', 'nome,cpf,matricula,ativo,data_admissao')
console.log(`  ativos                   ${colabs.filter((c) => c.ativo).length}`)
console.log(`  inativos (demitidos)     ${colabs.filter((c) => !c.ativo).length}`)
console.log(`  sem CPF                  ${colabs.filter((c) => !c.cpf).length}`)

console.log('\n=== Movimentações históricas ===')
const movs = await pagina('movimentacao_estoque', 'tipo_movimentacao,quantidade,data_movimentacao')
const saidas = movs.filter((m) => m.tipo_movimentacao === 'saida')
const entradas = movs.filter((m) => m.tipo_movimentacao === 'entrada')
console.log(`  total                    ${movs.length}`)
console.log(`  saídas                   ${saidas.length} (${soma.call(null, () => 0) || saidas.reduce((t, m) => t + m.quantidade, 0)} unidades)`)
console.log(`  devoluções               ${entradas.length} (+${entradas.reduce((t, m) => t + m.quantidade, 0)} unidades)`)
const datas = movs.map((m) => m.data_movimentacao).filter(Boolean).sort()
console.log(`  período                  ${datas[0]?.slice(0, 10)} a ${datas[datas.length - 1]?.slice(0, 10)}`)

const porAno = {}
for (const m of movs) {
  const ano = m.data_movimentacao?.slice(0, 4)
  if (ano) porAno[ano] = (porAno[ano] || 0) + 1
}
console.log('  por ano:', Object.entries(porAno).sort().map(([a, n]) => `${a}:${n}`).join('  '))
