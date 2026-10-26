#!/usr/bin/env node
/**
 * Backup de referência do banco: estrutura + dados, com `pg_dump`.
 *
 * Este é o backup que serve para levantar o sistema em outro lugar. O export
 * por API (`exportar-dados.mjs`) leva só as linhas; aqui vem junto o que faz o
 * sistema funcionar: tabelas, colunas geradas, índices, funções, gatilhos e as
 * políticas de acesso (RLS). Sem isso, restaurar os dados num banco vazio
 * resulta num banco que aceita qualquer coisa de qualquer um.
 *
 * Não exige instalar o Postgres: o `pg_dump` roda dentro de um contêiner, na
 * mesma versão do servidor, o que evita o erro clássico de "server version
 * mismatch".
 *
 *   node scripts/backup/dump-completo.mjs
 *
 * Precisa de SUPABASE_DB_URL em .env.carga (arquivo que não vai para o git):
 *
 *   SUPABASE_DB_URL=postgresql://postgres.SEUPROJETO:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
 *
 * A string sai do painel do Supabase em Connect > Session pooler (porta 5432;
 * a 6543 é do transaction pooler e não serve para dump). Se a senha não for
 * conhecida, dá para trocá-la em Settings > Database > Reset database password
 * — isso não invalida as chaves de API que o sistema usa.
 */

import { mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const RAIZ = process.cwd()
/** Mesma família do servidor; `pg_dump` novo não lê servidor mais antigo */
const IMAGEM = 'postgres:17-alpine'

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

const env = await lerEnv(path.join(RAIZ, '.env.carga'))
const conexao = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL

if (!conexao) {
  console.error(
    'Falta SUPABASE_DB_URL em .env.carga.\n\n' +
      'Painel do Supabase > Connect > Session pooler (porta 5432). Exemplo:\n' +
      '  SUPABASE_DB_URL=postgresql://postgres.abcdefgh:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres\n',
  )
  process.exit(1)
}

const docker = spawnSync('docker', ['--version'], { encoding: 'utf8' })
if (docker.status !== 0) {
  console.error('Docker não encontrado. Instale o Docker Desktop ou rode o pg_dump da sua máquina.')
  process.exit(1)
}

const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const destino = path.join(RAIZ, 'backup')
await mkdir(destino, { recursive: true })

/**
 * Dois arquivos, de propósito:
 *
 * - `estrutura`: só o esqueleto. É o que se revisa e se versiona quando
 *   preciso, e o que se restaura primeiro.
 * - `completo`: esqueleto + dados, no formato custom, que o `pg_restore`
 *   consegue restaurar em paralelo e seletivamente (uma tabela só, por
 *   exemplo).
 */
const trabalhos = [
  {
    nome: `estrutura-${carimbo}.sql`,
    argumentos: ['--schema-only', '--schema=public', '--no-owner', '--no-privileges'],
    formato: 'texto',
  },
  {
    nome: `completo-${carimbo}.dump`,
    argumentos: ['--format=custom', '--schema=public', '--no-owner', '--no-privileges'],
    formato: 'custom',
  },
]

for (const trabalho of trabalhos) {
  const caminho = path.join(destino, trabalho.nome)
  console.log(`Gerando ${trabalho.nome}...`)

  const resultado = spawnSync(
    'docker',
    [
      'run', '--rm', '-i',
      '-v', `${destino}:/backup`,
      '-e', `PGCONNECT_TIMEOUT=30`,
      IMAGEM,
      'pg_dump', conexao,
      ...trabalho.argumentos,
      '--file', `/backup/${trabalho.nome}`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'inherit', 'pipe'] },
  )

  if (resultado.status !== 0) {
    console.error(`\nFalhou: ${resultado.stderr?.trim() || 'erro desconhecido'}`)
    console.error(
      '\nSe a mensagem fala em autenticação, confira a senha na SUPABASE_DB_URL.\n' +
        'Se fala em "Tenant or user not found", confira o usuário: no pooler ele é\n' +
        '`postgres.<ref-do-projeto>`, não só `postgres`.',
    )
    process.exit(1)
  }

  console.log(`  ok → ${caminho}`)
}

console.log(
  '\nRestaurar num Postgres local:\n' +
    `  psql "$LOCAL" -f backup/estrutura-${carimbo}.sql\n` +
    `  pg_restore -d "$LOCAL" --data-only --disable-triggers backup/completo-${carimbo}.dump\n\n` +
    'Passo a passo completo: docs/servidor-local.md',
)
