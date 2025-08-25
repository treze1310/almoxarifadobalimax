import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://emcyvosymdelzxrokdvf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3l2b3N5bWRlbHp4cm9rZHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjgzMTcsImV4cCI6MjA2OTkwNDMxN30.XlwTH0STkr4A5UYJJkuqcHFol8e4H1o4gyVdlq046dQ'

console.log('🔧 Supabase initialized with URL:', supabaseUrl.substring(0, 30) + '...', 'and API key')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false,
    storageKey: 'sb-auth-token'
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web'
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(20000) // 20 segundos timeout
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
})