import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export function useSupabaseTable<T extends keyof Tables>(tableName: T) {
  const [data, setData] = useState<Tables[T][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  // Usar supabase diretamente

  const fetchData = async (queryParams?: {
    select?: string
    filter?: { column: string; value: any; operator?: string }[]
    order?: { column: string; ascending?: boolean }
  }) => {
    try {
      setLoading(true)
      
      const result = await query(() => {
        let supabaseQuery = supabase.from(tableName).select(queryParams?.select || '*')

        if (queryParams?.filter) {
          queryParams.filter.forEach(filter => {
            switch (filter.operator) {
              case 'eq':
                supabaseQuery = supabaseQuery.eq(filter.column, filter.value)
                break
              case 'neq':
                supabaseQuery = supabaseQuery.neq(filter.column, filter.value)
                break
              case 'like':
                supabaseQuery = supabaseQuery.like(filter.column, filter.value)
                break
              case 'ilike':
                supabaseQuery = supabaseQuery.ilike(filter.column, filter.value)
                break
              default:
                supabaseQuery = supabaseQuery.eq(filter.column, filter.value)
            }
          })
        }

        if (queryParams?.order) {
          supabaseQuery = supabaseQuery.order(queryParams.order.column, { 
            ascending: queryParams.order.ascending ?? true 
          })
        }

        return supabaseQuery
      })

      setData(result || [])
      setError(null)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const create = async (newData: TablesInsert[T]) => {
    try {
      setLoading(true)
      
      const result = await mutate(() => 
        supabase
          .from(tableName)
          .insert(newData)
          .select()
          .single()
      )

      setData(prev => [...prev, result])
      toast({
        title: 'Sucesso',
        description: 'Registro criado com sucesso!',
      })
      return { data: result, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar registro'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const update = async (id: string, updateData: TablesUpdate[T]) => {
    try {
      setLoading(true)
      
      const result = await mutate(() =>
        supabase
          .from(tableName)
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
      )

      setData(prev => prev.map(item => 
        (item as any).id === id ? result : item
      ))
      toast({
        title: 'Sucesso',
        description: 'Registro atualizado com sucesso!',
      })
      return { data: result, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar registro'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    try {
      setLoading(true)
      
      await mutate(() =>
        supabase
          .from(tableName)
          .delete()
          .eq('id', id)
      )

      setData(prev => prev.filter(item => (item as any).id !== id))
      toast({
        title: 'Sucesso',
        description: 'Registro removido com sucesso!',
      })
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover registro'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    data,
    loading,
    error,
    fetchData,
    create,
    update,
    remove,
    refresh: fetchData
  }
}