import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Retorna a lista de categorias cadastradas (cadastro auxiliar),
 * para sugestão/seleção em campos de categoria (datalist / select).
 */
export function useCategorias() {
  const [categorias, setCategorias] = useState<string[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('nome')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error || !data || !active) return

      const unicas = Array.from(
        new Set(
          data
            .map((r) => (r.nome || '').trim())
            .filter((c) => c.length > 0),
        ),
      )

      setCategorias(unicas)
    })()
    return () => {
      active = false
    }
  }, [])

  return categorias
}
