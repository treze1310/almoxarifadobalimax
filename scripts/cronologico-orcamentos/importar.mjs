/**
 * Traz o Cronológico de Orçamentos para os centros de custo.
 *
 *   python scripts/cronologico-orcamentos/extrair.py   # gera propostas.json
 *   node scripts/cronologico-orcamentos/importar.mjs            # simula
 *   node scripts/cronologico-orcamentos/importar.mjs --gravar   # aplica
 *
 * Regras, decididas com o almoxarifado:
 *  - só entram propostas de 2024 em diante (antes disso são orçamentos
 *    antigos, muitos sem obra, e só poluiriam o seletor do dia a dia);
 *  - o que já existe não é duplicado nem sobrescrito: só preenche campo
 *    vazio, porque a descrição do banco pode ter sido ajustada à mão;
 *  - quem veio daqui fica marcado em `origem`, para dar para desfazer.
 *
 * É idempotente: rodar de novo só acrescenta o que a planilha ganhou desde a
 * última vez.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..')
const e = f => Object.fromEntries(readFileSync(join(RAIZ, f),'utf-8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const env = {...e('.env'), ...e('.env.carga')}
const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const SIMULAR = !process.argv.includes('--gravar')

const propostas = JSON.parse(readFileSync(join(AQUI, 'propostas.json'),'utf-8'))

const pagina = async (tabela, colunas) => {
  const todas = []
  for (let de=0;;de+=1000){ const { data, error } = await db.from(tabela).select(colunas).order('id').range(de,de+999)
    if (error) throw new Error(tabela+': '+error.message); todas.push(...data); if(data.length<1000) break }
  return todas
}
const centros = await pagina('centros_custo','id,codigo,descricao,data,empresa_id')
const empresas = await pagina('empresas','id,nome')
const normal = s => (s||'').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^A-Z0-9]/g,'')
const empresaPorNome = new Map(empresas.map(x=>[normal(x.nome), x.id]))
const porCodigo = new Map(centros.map(c=>[String(c.codigo).trim(), c]))

// A data tambem esta no proprio numero (AAMMDD + sequencia); serve para as
// linhas em que a coluna DATA ficou vazia.
const dataDoCodigo = (n) => {
  const m = n.match(/^(\d{2})(\d{2})(\d{2})\d{3,4}$/); if (!m) return null
  const [, aa, mm, dd] = m; const ano = 2000+Number(aa)
  if (+mm<1||+mm>12||+dd<1||+dd>31||ano>2030) return null
  return `${ano}-${mm}-${dd}`
}

const novas = [], enriquecer = [], semDescricao = []
for (const p of propostas) {
  const data = p.data ?? dataDoCodigo(p.numero)
  const existente = porCodigo.get(p.numero)
  const empresaId = p.empresa ? (empresaPorNome.get(normal(p.empresa)) ?? null) : null

  if (existente) {
    // Enriquecer: so o que esta vazio. A descricao do banco pode ter sido
    // ajustada a mao e nao e sobrescrita.
    const mudanca = {}
    if (!existente.descricao?.trim() && p.servico) mudanca.descricao = p.servico
    if (!existente.data && data) mudanca.data = data
    if (!existente.empresa_id && empresaId) mudanca.empresa_id = empresaId
    if (Object.keys(mudanca).length) enriquecer.push({ id: existente.id, codigo: p.numero, mudanca })
    continue
  }
  if (!data || data < '2024-01-01') continue   // decisao: so de 2024 para ca
  if (!p.servico) { semDescricao.push(p); continue }
  novas.push({ codigo: p.numero, descricao: p.servico.slice(0,255), data, empresa_id: empresaId,
               ativo: true, origem: 'cronologico_orcamentos' })
}

console.log(`novas a inserir: ${novas.length}`)
console.log(`  com empresa vinculada: ${novas.filter(n=>n.empresa_id).length}`)
console.log(`  por ano:`, Object.entries(novas.reduce((a,n)=>{const y=n.data.slice(0,4);a[y]=(a[y]||0)+1;return a},{})).sort().map(([a,n])=>`${a}: ${n}`).join(' | '))
console.log(`ignoradas por nao ter descricao: ${semDescricao.length}`, semDescricao.map(p=>p.numero).join(', '))
console.log(`\nexistentes a enriquecer: ${enriquecer.length}`)
const campos = {}
for (const x of enriquecer) for (const k of Object.keys(x.mudanca)) campos[k]=(campos[k]||0)+1
console.log('  campos preenchidos:', Object.entries(campos).map(([k,v])=>`${k}: ${v}`).join(' | '))

if (SIMULAR) { console.log('\n(simulacao — rode com --gravar para aplicar)'); process.exit(0) }

for (let i=0;i<novas.length;i+=200) {
  const { error } = await db.from('centros_custo').insert(novas.slice(i,i+200))
  if (error) { console.log('ERRO ao inserir:', error.message); process.exit(1) }
}
console.log(`\ninseridas: ${novas.length}`)
let n=0
for (const x of enriquecer) {
  const { error } = await db.from('centros_custo').update(x.mudanca).eq('id', x.id)
  if (error) { console.log('ERRO ao enriquecer', x.codigo, error.message); continue }
  n++
}
console.log(`enriquecidas: ${n}`)
const { count } = await db.from('centros_custo').select('id',{count:'exact',head:true})
console.log(`total de centros de custo agora: ${count}`)
