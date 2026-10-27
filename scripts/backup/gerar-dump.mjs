#!/usr/bin/env node
/**
 * Dump completo do banco — estrutura, dados e contas de acesso.
 *
 * Feito para migrar o sistema para outro servidor (Supabase self-hosted ou
 * Postgres puro). Não usa a senha do Postgres: fala com o banco pela API de
 * gerenciamento do Supabase, com o token pessoal, como o papel `postgres`.
 *
 * O que sai:
 *
 *   01-estrutura.sql   extensões, tabelas, colunas geradas, chaves, índices,
 *                      funções, gatilhos, views, RLS e políticas, permissões
 *   02-dados.sql       todas as linhas do schema public, na ordem das chaves
 *                      estrangeiras, mais o acerto das sequências
 *   03-usuarios.sql    auth.users e auth.identities — as contas, **com a
 *                      senha criptografada**, para ninguém precisar de senha
 *                      nova no servidor novo
 *   LEIA-ME.md         ordem de restauração e o que conferir
 *
 * A definição de cada objeto vem do próprio Postgres (`pg_get_constraintdef`,
 * `pg_get_indexdef`, `pg_get_functiondef`, `pg_get_triggerdef`,
 * `pg_get_viewdef`, `pg_get_expr`): é o mesmo texto que o `pg_dump` usaria, e
 * não uma reconstrução de cabeça. Os valores das linhas são montados pelo
 * servidor com `quote_nullable`, que resolve aspas, acento, JSON, array e nulo
 * sem depender de escape feito aqui.
 *
 *   node scripts/backup/gerar-dump.mjs
 *
 * Precisa de SUPABASE_ACCESS_TOKEN (.env.carga) e VITE_SUPABASE_URL (.env).
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const RAIZ = process.cwd()
const LOTE = 500

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

const env = {
  ...(await lerEnv(path.join(RAIZ, '.env'))),
  ...(await lerEnv(path.join(RAIZ, '.env.carga'))),
}
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const ref = (url || '').match(/https:\/\/([^.]+)\./)?.[1]

if (!token || !ref) {
  console.error('Faltam SUPABASE_ACCESS_TOKEN (.env.carga) ou VITE_SUPABASE_URL (.env).')
  process.exit(1)
}

/** Roda SQL no banco e devolve as linhas */
const sql = async (query) => {
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    const resposta = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (resposta.ok) return resposta.json()

    const detalhe = await resposta.text()
    // 5xx e limite de requisição valem nova tentativa; erro de SQL, não
    if (resposta.status < 500 && resposta.status !== 429) {
      throw new Error(`SQL falhou (${resposta.status}): ${detalhe.slice(0, 300)}\n--- ${query.slice(0, 200)}`)
    }
    if (tentativa === 3) throw new Error(`SQL falhou após 3 tentativas: ${detalhe.slice(0, 200)}`)
    await new Promise((r) => setTimeout(r, 1500 * tentativa))
  }
}

/**
 * `--so-estrutura` regera apenas o 01, em segundos.
 *
 * A estrutura sai de umas poucas consultas ao catálogo; os dados são 41 mil
 * linhas em dezenas de requisições. Separar evita baixar tudo de novo quando o
 * que mudou foi só o esqueleto.
 */
const soEstrutura = process.argv.includes('--so-estrutura')
const pastaExistente = process.argv.find((a) => a.startsWith('--pasta='))?.slice(8)

const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const destino = pastaExistente
  ? path.resolve(RAIZ, pastaExistente)
  : path.join(RAIZ, 'backup', `migracao-${carimbo}`)
await mkdir(destino, { recursive: true })

const partes = []
const p = (texto) => partes.push(texto)

// ---------------------------------------------------------------- estrutura

p(`-- Estrutura do banco do Almoxarifado Balimax
-- Gerado em ${new Date().toISOString()} a partir do projeto ${ref}
-- Restaurar com: psql "<conexao>" -v ON_ERROR_STOP=1 -f 01-estrutura.sql

set statement_timeout = 0;
set client_encoding = 'UTF8';
set standard_conforming_strings = on;
set check_function_bodies = false;
set xmloption = content;
set client_min_messages = warning;
set row_security = off;

-- O "extensions" no caminho de busca e obrigatorio.
-- Os valores padrao das colunas chamam uuid_generate_v4() e gen_random_uuid()
-- sem o schema na frente. No Supabase isso funciona porque "extensions" ja
-- esta no caminho de busca do banco; num Postgres limpo, nao esta - e o
-- CREATE TABLE falha na primeira tabela. Com o SET abaixo, o Postgres resolve
-- a funcao na criacao e grava a referencia ja qualificada.
set search_path = public, extensions;
`)

console.log('Lendo extensões...')
const extensoes = await sql(`
  select extname, nspname
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where extname not in ('plpgsql')
  order by extname`)

/**
 * As extensões que o sistema usa de verdade vão no arquivo; as que são do
 * Supabase (GraphQL, Vault, estatísticas) ficam comentadas.
 *
 * No servidor novo com Supabase elas já existem; num Postgres puro elas não
 * existem e parariam a restauração logo na primeira linha, por causa de algo
 * que o almoxarifado não usa.
 */
const EXTENSOES_DO_SISTEMA = new Set(['pg_trgm', 'unaccent', 'pgcrypto', 'uuid-ossp'])
p('\n-- Extensões\n')
p("create schema if not exists extensions;")
for (const e of extensoes) {
  const linha = `create extension if not exists "${e.extname}" with schema ${
    EXTENSOES_DO_SISTEMA.has(e.extname) ? 'extensions' : e.nspname
  };`
  p(EXTENSOES_DO_SISTEMA.has(e.extname) ? linha : `-- (do Supabase) ${linha}`)
}

console.log('Lendo tipos...')
const tipos = await sql(`
  select n.nspname, t.typname,
         string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) as valores
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'public'
  group by n.nspname, t.typname`)
if (tipos.length > 0) {
  p('\n-- Tipos\n')
  for (const t of tipos) p(`create type ${t.nspname}.${t.typname} as enum (${t.valores});`)
}

console.log('Lendo sequências...')
/**
 * As sequências vêm antes das tabelas: coluna com
 * `default nextval('minha_seq')` não é criada se a sequência ainda não existe.
 */
const sequenciasDef = await sql(`
  select s.relname as nome,
         pg_get_serial_sequence(quote_ident(dep_c.relname), dep_a.attname) as dona
    from pg_class s
    join pg_namespace n on n.oid = s.relnamespace
    left join pg_depend d on d.objid = s.oid and d.deptype = 'a'
    left join pg_class dep_c on dep_c.oid = d.refobjid
    left join pg_attribute dep_a on dep_a.attrelid = d.refobjid and dep_a.attnum = d.refobjsubid
   where n.nspname = 'public' and s.relkind = 'S'
   order by s.relname`)
if (sequenciasDef.length > 0) {
  p('\n-- Sequências\n')
  for (const s_ of sequenciasDef) {
    /**
     * Todas, inclusive as de coluna `serial`.
     *
     * O CREATE TABLE abaixo sai com `default nextval('x_id_seq')` em vez de
     * `serial`, então quem cria a sequência é este trecho — sem ele, a
     * tabela não é criada e a restauração para na primeira. O vínculo com a
     * coluna (`owned by`) vem depois das tabelas.
     */
    p(`create sequence if not exists public."${s_.nome}";`)
  }
}

/**
 * As funções vêm antes das tabelas de propósito.
 *
 * `materiais_equipamentos` tem colunas geradas que chamam
 * `texto_comparavel(nome)`: sem a função criada antes, o CREATE TABLE falha.
 * O contrário não é problema — `check_function_bodies = false`, lá no
 * cabeçalho, deixa criar função que consulta tabela ainda inexistente.
 */
console.log('Lendo funções...')
const funcoes = await sql(`
  select pg_get_functiondef(p.oid) as definicao
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind in ('f','p')
   order by p.proname`)
if (funcoes.length > 0) {
  p('\n-- Funções\n')
  for (const f of funcoes) p(`${f.definicao};\n`)
}

console.log('Lendo tabelas e colunas...')
const colunas = await sql(`
  select c.relname as tabela,
         a.attname as coluna,
         format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as nao_nulo,
         pg_get_expr(d.adbin, d.adrelid) as padrao,
         a.attgenerated as gerada,
         a.attidentity as identidade,
         coll.collname as colacao
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    left join pg_collation coll on coll.oid = a.attcollation
     and coll.collname <> 'default'
   where n.nspname = 'public' and c.relkind = 'r'
     and a.attnum > 0 and not a.attisdropped
   order by c.relname, a.attnum`)

const porTabela = new Map()
for (const c of colunas) {
  if (!porTabela.has(c.tabela)) porTabela.set(c.tabela, [])
  porTabela.get(c.tabela).push(c)
}

p('\n-- Tabelas\n')
for (const [tabela, cols] of porTabela) {
  const linhas = cols.map((c) => {
    let def = `  "${c.coluna}" ${c.tipo}`
    if (c.colacao) def += ` collate "${c.colacao}"`
    // Coluna gerada: a expressão é o valor, não há default separado
    if (c.gerada === 's') def += ` generated always as (${c.padrao}) stored`
    else if (c.identidade === 'a') def += ' generated always as identity'
    else if (c.identidade === 'd') def += ' generated by default as identity'
    else if (c.padrao) def += ` default ${c.padrao}`
    if (c.nao_nulo) def += ' not null'
    return def
  })
  p(`create table public."${tabela}" (\n${linhas.join(',\n')}\n);\n`)
}

// `owned by`: a sequência morre junto com a coluna, como no banco de origem
const sequenciasComDono = await sql(`
  select s.relname as sequencia, dep_c.relname as tabela, dep_a.attname as coluna
    from pg_class s
    join pg_namespace n on n.oid = s.relnamespace
    join pg_depend d on d.objid = s.oid and d.deptype = 'a'
    join pg_class dep_c on dep_c.oid = d.refobjid
    join pg_attribute dep_a on dep_a.attrelid = d.refobjid and dep_a.attnum = d.refobjsubid
   where n.nspname = 'public' and s.relkind = 'S'`)
if (sequenciasComDono.length > 0) {
  p('\n-- Sequências ligadas às suas colunas\n')
  for (const s_ of sequenciasComDono) {
    p(`alter sequence public."${s_.sequencia}" owned by public."${s_.tabela}"."${s_.coluna}";`)
  }
}

console.log('Lendo chaves e restrições...')
// Primária e única antes das estrangeiras: a FK precisa do destino pronto
for (const [rotulo, tipos_] of [
  ['Chaves primárias e únicas', "('p','u')"],
  ['Verificações', "('c')"],
  ['Chaves estrangeiras', "('f')"],
]) {
  const restricoes = await sql(`
    select c.relname as tabela, con.conname as nome, pg_get_constraintdef(con.oid) as definicao
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and con.contype in ${tipos_}
     order by c.relname, con.conname`)
  if (restricoes.length === 0) continue
  p(`\n-- ${rotulo}\n`)
  for (const r of restricoes) {
    p(`alter table public."${r.tabela}" add constraint "${r.nome}" ${r.definicao};`)
  }
}

console.log('Lendo índices...')
const indices = await sql(`
  select indexdef
    from pg_indexes i
   where schemaname = 'public'
     and not exists (
       select 1 from pg_constraint c
        where c.conname = i.indexname and c.connamespace = 'public'::regnamespace
     )
   order by indexname`)
if (indices.length > 0) {
  p('\n-- Índices\n')
  for (const i of indices) p(`${i.indexdef};`)
}

console.log('Lendo views...')
const views = await sql(`
  select c.relname as nome, pg_get_viewdef(c.oid, true) as definicao,
         c.reloptions::text as opcoes
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
   order by c.relname`)
if (views.length > 0) {
  p('\n-- Views\n')
  for (const v of views) {
    const comOpcoes = v.opcoes && v.opcoes !== 'null' ? ` with (${v.opcoes.replace(/[{}"]/g, '')})` : ''
    p(`create view public."${v.nome}"${comOpcoes} as\n${v.definicao}\n`)
  }
}

console.log('Lendo gatilhos...')
const gatilhos = await sql(`
  select pg_get_triggerdef(t.oid) as definicao
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal
   order by t.tgname`)
if (gatilhos.length > 0) {
  p('\n-- Gatilhos\n')
  for (const g of gatilhos) p(`${g.definicao};`)
}

console.log('Lendo políticas de acesso...')
const comRls = await sql(`
  select c.relname as tabela
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
   order by c.relname`)
const politicas = await sql(`
  select tablename as tabela, policyname as nome, permissive, roles::text as papeis,
         cmd, qual, with_check
    from pg_policies where schemaname = 'public'
   order by tablename, policyname`)

p('\n-- Segurança por linha (RLS)\n')
for (const t of comRls) p(`alter table public."${t.tabela}" enable row level security;`)
p('')
for (const pol of politicas) {
  const papeis = pol.papeis.replace(/[{}]/g, '')
  let def = `create policy "${pol.nome}" on public."${pol.tabela}"`
  if (pol.permissive === 'RESTRICTIVE') def += ' as restrictive'
  def += ` for ${pol.cmd.toLowerCase()} to ${papeis}`
  if (pol.qual) def += ` using (${pol.qual})`
  if (pol.with_check) def += ` with check (${pol.with_check})`
  p(`${def};`)
}

console.log('Lendo permissões...')
const permissoes = await sql(`
  select 'grant ' || string_agg(distinct privilege_type, ', ') ||
         ' on table public."' || table_name || '" to ' || grantee || ';' as comando
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon','authenticated','service_role')
   group by table_name, grantee
   order by table_name, grantee`)
if (permissoes.length > 0) {
  p('\n-- Permissões dos papéis do Supabase\n')
  for (const g of permissoes) p(g.comando)
}

const comentarios = await sql(`
  -- "comment on table" numa view da erro: cada tipo tem a sua palavra
  select 'comment on ' || case c.relkind when 'v' then 'view' when 'm' then 'materialized view' else 'table' end
         || ' public."' || c.relname || '" is ' || quote_literal(d.description) || ';' as comando
    from pg_description d
    join pg_class c on c.oid = d.objoid and d.objsubid = 0
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','v','m')
  union all
  select 'comment on column public."' || c.relname || '"."' || a.attname || '" is ' || quote_literal(d.description) || ';'
    from pg_description d
    join pg_class c on c.oid = d.objoid
    join pg_attribute a on a.attrelid = c.oid and a.attnum = d.objsubid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and d.objsubid > 0 and c.relkind in ('r','v','m')`)
if (comentarios.length > 0) {
  p('\n-- Comentários\n')
  for (const c of comentarios) p(c.comando)
}

await writeFile(path.join(destino, '01-estrutura.sql'), partes.join('\n'), 'utf8')
console.log(`  → 01-estrutura.sql (${porTabela.size} tabelas, ${funcoes.length} funções, ${politicas.length} políticas)`)

/**
 * Esqueleto do `auth` so para testar a restauracao.
 *
 * No servidor novo quem cria o schema `auth` e o proprio Supabase (GoTrue), e
 * este arquivo **nao** deve ser usado la. Ele existe para o `validar-dump.sh`
 * restaurar o 03 num Postgres limpo e provar que os valores estao bem
 * escritos - senha com aspas, data, JSON e nulo.
 */
const ddlAuth = async (tabela) => {
  const cols = await sql(`
    select a.attname as coluna, format_type(a.atttypid, a.atttypmod) as tipo,
           pg_get_expr(d.adbin, d.adrelid) as padrao
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where n.nspname = 'auth' and c.relname = '${tabela}'
       and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
     order by a.attnum`)
  const corpo = cols
    .map((c) => `  "${c.coluna}" ${c.tipo}${c.padrao ? ` default ${c.padrao}` : ''}`)
    .join(',\n')
  return `create table if not exists auth."${tabela}" (\n${corpo}\n);`
}

await writeFile(
  path.join(destino, '00-auth-esqueleto-teste.sql'),
  [
    '-- Esqueleto do schema auth - SO PARA TESTAR A RESTAURACAO',
    '-- No servidor novo quem cria o schema auth e o Supabase. Nao rode isto la.',
    '',
    'create schema if not exists auth;',
    await ddlAuth('users'),
    await ddlAuth('identities'),
    'alter table auth.users add primary key (id);',
    'alter table auth.identities add primary key (id);',
    '',
  ].join('\n'),
  'utf8',
)

if (soEstrutura) {
  console.log(`
Só a estrutura foi regerada: ${destino}`)
  process.exit(0)
}

// -------------------------------------------------------------------- dados

/**
 * Ordem de carga: pai antes de filho.
 *
 * Em vez de confiar numa lista escrita à mão, a ordem sai das próprias chaves
 * estrangeiras (ordenação topológica). Tabela que depende de outra entra
 * depois; ciclo (se houver) cai no fim e a carga desliga os gatilhos.
 */
const dependencias = await sql(`
  select distinct c.relname as tabela, f.relname as depende_de
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_class f on f.oid = con.confrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and con.contype = 'f' and c.relname <> f.relname`)

const tabelas = [...porTabela.keys()]
const ordem = []
const pendentes = new Set(tabelas)
while (pendentes.size > 0) {
  const prontas = [...pendentes].filter((t) =>
    dependencias
      .filter((d) => d.tabela === t)
      .every((d) => !pendentes.has(d.depende_de)),
  )
  if (prontas.length === 0) {
    // Ciclo: o resto vai na ordem alfabética e a carga desliga os gatilhos
    ordem.push(...[...pendentes].sort())
    break
  }
  prontas.sort().forEach((t) => {
    ordem.push(t)
    pendentes.delete(t)
  })
}

const dados = [
  `-- Dados do Almoxarifado Balimax`,
  `-- Gerado em ${new Date().toISOString()}`,
  `-- Restaurar DEPOIS de 01-estrutura.sql:`,
  `--   psql "<conexao>" -v ON_ERROR_STOP=1 -f 02-dados.sql`,
  ``,
  `set session_replication_role = replica;  -- não dispara gatilhos durante a carga`,
  `set client_encoding = 'UTF8';`,
  ``,
]

const contagens = {}
for (const tabela of ordem) {
  const cols = porTabela.get(tabela).filter((c) => c.gerada !== 's')
  const listaCols = cols.map((c) => `"${c.coluna}"`).join(', ')
  const expr = cols.map((c) => `quote_nullable("${c.coluna}"::text)`).join(` || ',' || `)

  const [{ total }] = await sql(`select count(*)::int as total from public."${tabela}"`)
  contagens[tabela] = total
  if (total === 0) {
    console.log(`  ${tabela.padEnd(26)} vazia`)
    continue
  }

  dados.push(`-- ${tabela} (${total} linha(s))`)
  for (let de = 0; de < total; de += LOTE) {
    // Ordem por todas as colunas: `order by 1` só é estável se a primeira
    // coluna for única, e paginar sem ordem estável duplica ou pula linha
    const ordemEstavel = cols.map((_, i) => i + 1).join(', ')
    const linhas = await sql(`
      select '(' || ${expr} || ')' as valores
        from (select ${listaCols} from public."${tabela}"
               order by ${ordemEstavel} limit ${LOTE} offset ${de}) t`)
    if (linhas.length === 0) break
    dados.push(
      `insert into public."${tabela}" (${listaCols}) values\n${linhas
        .map((l) => `  ${l.valores}`)
        .join(',\n')};`,
    )
  }
  dados.push('')
  console.log(`  ${tabela.padEnd(26)} ${String(total).padStart(6)} linha(s)`)
}

// Sequências: sem isto, o próximo insert no servidor novo repete id existente
const sequencias = await sql(`
  select schemaname, sequencename, last_value
    from pg_sequences where schemaname = 'public' and last_value is not null`)
if (sequencias.length > 0) {
  dados.push('-- Sequências')
  for (const s of sequencias) {
    dados.push(`select setval('${s.schemaname}.${s.sequencename}', ${s.last_value}, true);`)
  }
  dados.push('')
}

dados.push(`set session_replication_role = origin;`)
await writeFile(path.join(destino, '02-dados.sql'), dados.join('\n'), 'utf8')

const totalLinhas = Object.values(contagens).reduce((a, b) => a + b, 0)
console.log(`  → 02-dados.sql (${totalLinhas} linhas)`)

// ----------------------------------------------------------------- usuários

console.log('Lendo contas de acesso...')
const colunasAuth = await sql(`
  select a.attname as coluna
    from pg_attribute a join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'auth' and c.relname = 'users'
     and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
   order by a.attnum`)

const nomesAuth = colunasAuth.map((c) => `"${c.coluna}"`).join(', ')
const exprAuth = colunasAuth.map((c) => `quote_nullable("${c.coluna}"::text)`).join(` || ',' || `)
const usuariosAuth = await sql(`
  select '(' || ${exprAuth} || ')' as valores from auth.users order by created_at`)

const colunasIdent = await sql(`
  select a.attname as coluna
    from pg_attribute a join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'auth' and c.relname = 'identities'
     and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
   order by a.attnum`)
const nomesIdent = colunasIdent.map((c) => `"${c.coluna}"`).join(', ')
const exprIdent = colunasIdent.map((c) => `quote_nullable("${c.coluna}"::text)`).join(` || ',' || `)
const identidades = await sql(`
  select '(' || ${exprIdent} || ')' as valores from auth.identities order by created_at`)

const auth = [
  `-- Contas de acesso (schema auth)`,
  `-- Gerado em ${new Date().toISOString()}`,
  `--`,
  `-- Inclui a senha criptografada: quem já entrava com a senha dele continua`,
  `-- entrando, sem redefinição. Restaurar DEPOIS de subir o Supabase do`,
  `-- servidor novo (o schema auth é criado por ele), e DEPOIS de 02-dados.sql.`,
  `--`,
  `-- ATENÇÃO: este arquivo contém hash de senha. Trate como credencial:`,
  `-- transfira por canal privado e apague depois de restaurar.`,
  ``,
  `set client_encoding = 'UTF8';`,
  ``,
  `-- Usuários (${usuariosAuth.length})`,
]

for (let de = 0; de < usuariosAuth.length; de += LOTE) {
  auth.push(
    `insert into auth.users (${nomesAuth}) values\n${usuariosAuth
      .slice(de, de + LOTE)
      .map((l) => `  ${l.valores}`)
      .join(',\n')}\non conflict (id) do nothing;`,
  )
}

auth.push('', `-- Identidades (${identidades.length})`)
for (let de = 0; de < identidades.length; de += LOTE) {
  auth.push(
    `insert into auth.identities (${nomesIdent}) values\n${identidades
      .slice(de, de + LOTE)
      .map((l) => `  ${l.valores}`)
      .join(',\n')}\non conflict (id) do nothing;`,
  )
}

auth.push(
  '',
  '-- Conferência: cada usuário do sistema precisa apontar para uma conta',
  "select u.email, u.auth_user_id is not null as tem_conta",
  '  from public.usuarios u order by u.email;',
)

await writeFile(path.join(destino, '03-usuarios.sql'), auth.join('\n'), 'utf8')


console.log(`  → 03-usuarios.sql (${usuariosAuth.length} contas, ${identidades.length} identidades)`)

/**
 * Quem entra e quem não entra.
 *
 * Conta de acesso (`auth.users`) e usuário do sistema (`public.usuarios`) são
 * duas coisas, ligadas por `auth_user_id`. Quando uma fica sem a outra, a
 * pessoa ou não consegue entrar, ou entra e fica sem perfil — e no servidor
 * novo isso parece defeito da migração sem ser. Por isso o inventário vai
 * junto.
 */
const inventarioContas = await sql(`
  select coalesce(u.email, a.email) as email,
         a.id is not null as tem_conta,
         u.id is not null as no_sistema,
         a.encrypted_password is not null as tem_senha
    from public.usuarios u
    full outer join auth.users a on a.id = u.auth_user_id
   order by 2, 1`)

// ----------------------------------------------------------------- migrações

console.log('Exportando histórico de migrações...')
const migracoes = await sql(`
  select version, coalesce(name,'') as nome, array_to_string(statements, E';\n') as sql
    from supabase_migrations.schema_migrations order by version`)
const pastaMigracoes = path.join(destino, 'migrations')
await mkdir(pastaMigracoes, { recursive: true })
for (const m of migracoes) {
  const nome = `${m.version}${m.nome ? `_${m.nome.replace(/[^a-z0-9_]+/gi, '_')}` : ''}.sql`
  await writeFile(path.join(pastaMigracoes, nome), `${m.sql};\n`, 'utf8')
}
console.log(`  → migrations/ (${migracoes.length} arquivos)`)

// ------------------------------------------------------------------ leia-me

const leiaMe = `# Migração do banco — Almoxarifado Balimax

Gerado em ${new Date().toISOString()} a partir do projeto Supabase \`${ref}\`
(PostgreSQL 17).

## Arquivos

| Arquivo | O que é |
|---|---|
| \`01-estrutura.sql\` | ${porTabela.size} tabelas, ${funcoes.length} funções, ${gatilhos.length} gatilhos, ${politicas.length} políticas de acesso, ${indices.length} índices, ${views.length} view(s) |
| \`02-dados.sql\` | ${totalLinhas} linhas, na ordem das chaves estrangeiras, com o acerto das sequências |
| \`03-usuarios.sql\` | ${usuariosAuth.length} contas de acesso **com a senha criptografada** |
| \`migrations/\` | histórico das ${migracoes.length} migrações do projeto, para referência |

## Ordem de restauração

Com o Supabase já no ar no servidor novo (o schema \`auth\` é criado por ele):

\`\`\`bash
CONEXAO="postgresql://postgres:SENHA@localhost:5432/postgres"

psql "$CONEXAO" -v ON_ERROR_STOP=1 -f 01-estrutura.sql
psql "$CONEXAO" -v ON_ERROR_STOP=1 -f 02-dados.sql
psql "$CONEXAO" -v ON_ERROR_STOP=1 -f 03-usuarios.sql
\`\`\`

Num Postgres puro (sem Supabase), antes de tudo crie os papéis que as
políticas de acesso citam:

\`\`\`sql
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
\`\`\`

## Conferência (não pule)

\`\`\`sql
select 'materiais' as tabela, count(*) from materiais_equipamentos
union all select 'movimentacoes', count(*) from movimentacao_estoque
union all select 'pecas', count(*) from material_unidades
union all select 'colaboradores', count(*) from colaboradores
union all select 'contas', count(*) from auth.users;
\`\`\`

Esperado:

${Object.entries(contagens)
  .filter(([, n]) => n > 0)
  .sort((a, b) => b[1] - a[1])
  .map(([t, n]) => `- \`${t}\`: **${n}**`)
  .join('\n')}
- \`auth.users\`: **${usuariosAuth.length}**

## Contas de acesso × usuários do sistema

| E-mail | Entra no sistema | Tem perfil | Senha |
|---|---|---|---|
${inventarioContas
  .map(
    (c) =>
      `| ${c.email ?? '(sem e-mail)'} | ${c.tem_conta ? 'sim' : '**não**'} | ${
        c.no_sistema ? 'sim' : '**não**'
      } | ${c.tem_senha ? 'sim' : '—'} |`,
  )
  .join('\n')}

Linha com **não** em "Entra no sistema" é usuário cadastrado sem conta de
acesso: ele aparece na tela de usuários mas não consegue entrar. Linha com
**não** em "Tem perfil" é o contrário — a conta entra, mas cai sem permissão
nenhuma. Nos dois casos é assim **hoje, na nuvem**, não efeito da migração.

## Depois de restaurar

1. **Chaves novas.** O sistema lê \`VITE_SUPABASE_URL\` e
   \`VITE_SUPABASE_ANON_KEY\` **no momento do build**. Aponte para o servidor
   novo em \`.env.local\` e rode \`npm run build\`. Nunca reaproveite as chaves
   da nuvem.
2. **Edge Function.** A tela de Configurações → Usuários usa a função
   \`admin-usuarios\` (pasta \`supabase/functions\`), que precisa ser publicada
   no servidor novo.
3. **Apague o \`03-usuarios.sql\`** do servidor depois de restaurar: ele tem
   hash de senha.
4. **Backup automático** antes de considerar a migração concluída
   (\`docs/servidor-local.md\`, item 7).

## O que este dump **não** leva

- Arquivos do Storage (o sistema não usa bucket hoje).
- Configuração do projeto na nuvem (SMTP, provedores de login, limites):
  reconfigurar no servidor novo.
- Os schemas internos \`storage\`, \`realtime\` e \`vault\`: são recriados pelo
  próprio Supabase.
`

await writeFile(path.join(destino, 'LEIA-ME.md'), leiaMe, 'utf8')

console.log(`\nPronto: ${destino}`)
