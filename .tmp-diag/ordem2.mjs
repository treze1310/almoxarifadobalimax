import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const e = f => Object.fromEntries(readFileSync('../'+f,'utf-8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const env = {...e('.env'), ...e('.env.carga')}
const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const { data } = await db.from('centros_custo').select('codigo, descricao, data')
  .eq('ativo', true)
  .order('data', { ascending:false, nullsFirst:false })
  .order('codigo', { ascending:false }).limit(12)
console.log('ordenando pela DATA da obra:')
for (const c of data) console.log('  ', c.codigo.padEnd(12), String(c.data).padEnd(12), (c.descricao||'').slice(0,40))
const { count: semData } = await db.from('centros_custo').select('id',{count:'exact',head:true}).is('data', null)
const { count: total } = await db.from('centros_custo').select('id',{count:'exact',head:true})
console.log(`\nsem data (vao para o fim): ${semData} de ${total}`)
