#!/usr/bin/env node
/**
 * Backup dos dados do banco, pela API, com a chave de serviço.
 *
 * Serve para ter cópia hoje, sem depender da senha do Postgres: cada tabela
 * sai como JSON, página por página. O `pg_dump` (ver docs/servidor-local.md)
 * continua sendo o backup de referência, porque também leva estrutura,
 * funções, políticas e gatilhos — este aqui leva só as linhas.
 *
 * A API corta toda resposta em 1.000 linhas sem avisar, então a paginação é
 * obrigatória: `movimentacao_estoque` tem 35 mil.
 *
 *   node scripts/backup/exportar-dados.mjs
 *
 * Lê VITE_SUPABASE_URL de .env e SUPABASE_SERVICE_ROLE_KEY de .env.carga.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const RAIZ = process.cwd()
const PAGINA = 1000

/** Tabelas na ordem de restauração: pai antes de filho */
const TABELAS = [
  'empresas',
  'centros_custo',
  'categorias',
  'marcas',
  'localizacao',
  'fornecedores',
  'colaboradores',
  'perfis_acesso',
  'usuarios',
  'usuarios_perfis',
  'materiais_equipamentos',
  'material_unidades',
  'nfe_importacao',
  'nfe_itens',
  'romaneios',
  'romaneios_itens',
  'solicitacoes',
  'solicitacoes_itens',
  'movimentacao_estoque',
  'epi_atribuicoes',
  'alertas_lidos',
  'log_sistema',
  'site_config',
  'site_imagens',
  'site_parceiros',
  'site_portfolio',
]

const lerEnv = async (arquivo) => {
  if (!existsSync(arquivo)) return {}
  const texto = await readFile(arquivo, 'utf8')
  const valores = {}
  for (const linha of texto.split('\n')) {
    const corte = linha.indexOf('=')
    if (corte < 1 || linha.trimStart().startsWith('#')) continue
    valores[linha.slice(0, corte).trim()] = linha.slice(corte + 1).trim()
  }
  return valores
}

const env = { ...(await lerEnv(path.join(RAIZ, '.env'))), ...(await lerEnv(path.join(RAIZ, '.env.carga'))) }
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !chave) {
  console.error(
    'Faltam VITE_SUPABASE_URL (.env) ou SUPABASE_SERVICE_ROLE_KEY (.env.carga).\n' +
      'A chave de serviço está no painel do Supabase, em Settings > API.',
  )
  process.exit(1)
}

const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` }

/** Uma tabela inteira, página por página */
const baixarTabela = async (tabela) => {
  const linhas = []

  for (let de = 0; ; de += PAGINA) {
    const resposta = await fetch(`${url}/rest/v1/${tabela}?select=*`, {
      headers: { ...cabecalhos, Range: `${de}-${de + PAGINA - 1}` },
    })

    if (!resposta.ok) {
      const detalhe = await resposta.text()
      throw new Error(`${tabela}: HTTP ${resposta.status} ${detalhe.slice(0, 200)}`)
    }

    const pagina = await resposta.json()
    linhas.push(...pagina)

    // Página incompleta significa que acabou
    if (pagina.length < PAGINA) break
  }

  return linhas
}

const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const destino = path.join(RAIZ, 'backup', `dados-${carimbo}`)
await mkdir(destino, { recursive: true })

const resumo = {}
let total = 0
const falhas = []

for (const tabela of TABELAS) {
  try {
    const linhas = await baixarTabela(tabela)
    await writeFile(
      path.join(destino, `${tabela}.json`),
      JSON.stringify(linhas, null, 0),
      'utf8',
    )
    resumo[tabela] = linhas.length
    total += linhas.length
    console.log(`${tabela.padEnd(26)} ${String(linhas.length).padStart(6)} linha(s)`)
  } catch (erro) {
    // Uma tabela que falhou não pode derrubar o backup das outras
    falhas.push(`${tabela}: ${erro.message}`)
    console.error(`${tabela.padEnd(26)} FALHOU — ${erro.message}`)
  }
}

await writeFile(
  path.join(destino, '_resumo.json'),
  JSON.stringify({ gerado_em: new Date().toISOString(), origem: url, tabelas: resumo, falhas }, null, 2),
  'utf8',
)

console.log(`\n${total} linha(s) em ${Object.keys(resumo).length} tabela(s)`)
console.log(`Pasta: ${destino}`)

if (falhas.length > 0) {
  console.error(`\n${falhas.length} tabela(s) falharam. O backup está incompleto:`)
  falhas.forEach((f) => console.error(` - ${f}`))
  process.exit(1)
}
