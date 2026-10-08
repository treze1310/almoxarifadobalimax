import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const e = f => Object.fromEntries(readFileSync('../'+f,'utf-8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const env = {...e('.env'), ...e('.env.carga')}
const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const { data } = await db.from('centros_custo').select('codigo, descricao, data, created_at')
  .eq('ativo', true).order('created_at', { ascending:false }).order('codigo', { ascending:false }).limit(12)
console.log('ordem que a consulta devolve hoje:')
for (const c of data) console.log('  ', c.codigo.padEnd(12), String(c.data).padEnd(12), c.created_at.slice(0,19), (c.descricao||'').slice(0,34))
