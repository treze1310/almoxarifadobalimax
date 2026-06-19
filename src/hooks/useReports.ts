import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { reportService } from '@/services/reportService'
import type { ReportRequest, ReportResponse } from '@/types/reports'

interface UseReportsOptions {
  onSuccess?: (response: ReportResponse) => void
  onError?: (error: string) => void
}

export function useReports(options?: UseReportsOptions) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; nome: string }>>([])
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string; codigo: string; descricao: string }>>([])
  const [materiais, setMateriais] = useState<Array<{ id: string; codigo: string | null; nome: string }>>([])
  const [responsaveis, setResponsaveis] = useState<Array<{ id: string; nome: string }>>([])
  const [fornecedores, setFornecedores] = useState<Array<{ id: string; nome: string }>>([])
  const [localizacoes, setLocalizacoes] = useState<Array<{ id: string; nome: string }>>([])

  useEffect(() => {
    loadFilterData()
  }, [])

  const loadFilterData = async () => {
    try {
      const { data: categoriasData } = await supabase
        .from('materiais_equipamentos')
        .select('categoria')
        .not('categoria', 'is', null)
        .eq('ativo', true)

      if (categoriasData) {
        const uniqueCategories = [...new Set(categoriasData.map(item => item.categoria))]
          .filter(Boolean)
          .map(categoria => ({ id: String(categoria), nome: String(categoria) }))
        setCategories(uniqueCategories)
      }

      const { data: centrosCustoData } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('ativo', true)
        .order('codigo')

      if (centrosCustoData) {
        setCentrosCusto(centrosCustoData.map(centro => ({
          id: centro.id,
          codigo: centro.codigo,
          descricao: centro.descricao || '',
        })))
      }

      const { data: materiaisData } = await supabase
        .from('materiais_equipamentos')
        .select('id, codigo, nome')
        .eq('ativo', true)
        .order('codigo')
        .limit(500)

      if (materiaisData) {
        setMateriais(materiaisData)
      }

      const { data: responsaveisData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .order('nome')
        .limit(200)

      if (responsaveisData) {
        setResponsaveis(responsaveisData)
      }

      const { data: fornecedoresData } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (fornecedoresData) {
        setFornecedores(fornecedoresData)
      }

      const { data: localizacoesData } = await supabase
        .from('localizacao')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (localizacoesData) {
        setLocalizacoes(localizacoesData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos filtros:', error)
    }
  }

  const generateReport = async (request: ReportRequest): Promise<boolean> => {
    setIsGenerating(true)

    try {
      const response = await reportService.generateReport(request)

      if (response.success) {
        options?.onSuccess?.(response)
        return true
      }

      options?.onError?.(response.error || 'Erro desconhecido')
      return false
    } catch (error: any) {
      options?.onError?.(error.message || 'Erro interno do servidor')
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  const validateDateRange = (filters: Record<string, any>) => {
    if (filters.dataInicio && filters.dataFim && new Date(filters.dataInicio) > new Date(filters.dataFim)) {
      return 'Data de inicio deve ser anterior a data fim'
    }

    return null
  }

  const validateFilters = (reportId: string, filters: Record<string, any>): string | null => {
    switch (reportId) {
      case 'inventario-geral':
        if (!filters.agruparPor) return 'Criterio de agrupamento e obrigatorio'
        break

      case 'movimentacao':
      case 'consumo-centro-custo':
        if (!filters.dataInicio || !filters.dataFim) {
          return 'Data de inicio e fim sao obrigatorias para este relatorio'
        }
        return validateDateRange(filters)

      case 'vencimento-validade':
        if (filters.diasAlerta && (filters.diasAlerta < 1 || filters.diasAlerta > 365)) {
          return 'Dias de alerta deve estar entre 1 e 365'
        }
        break

      case 'analise-abc-xyz':
        if (!filters.criterioABC) return 'Criterio ABC e obrigatorio'
        if (!filters.criterioXYZ) return 'Criterio XYZ e obrigatorio'
        return validateDateRange(filters)

      case 'inventario-rotativo':
        if (!filters.ciclo) return 'Ciclo de inventario e obrigatorio'
        return validateDateRange(filters)

      default:
        return validateDateRange(filters)
    }

    return null
  }

  const getFilterOptions = () => ({
    categories,
    centrosCusto,
    materiais,
    colaboradores: responsaveis,
    responsaveis,
    fornecedores,
    localizacoes,
    refreshFilterData: loadFilterData,
  })

  return {
    isGenerating,
    generateReport,
    validateFilters,
    filterOptions: getFilterOptions(),
  }
}
