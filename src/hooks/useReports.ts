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
  const [categories, setCategories] = useState<Array<{ id: string, nome: string }>>([])
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string, codigo: string, descricao: string }>>([])
  const [materiais, setMateriais] = useState<Array<{ id: string, codigo: string, nome: string }>>([])
  const [colaboradores, setColaboradores] = useState<Array<{ id: string, nome: string }>>([])

  // Carregar dados para filtros
  useEffect(() => {
    loadFilterData()
  }, [])

  const loadFilterData = async () => {
    try {
      // Carregar categorias (usar valores únicos do campo categoria)
      const { data: categoriasData } = await supabase
        .from('materiais_equipamentos')
        .select('categoria')
        .not('categoria', 'is', null)
        .eq('ativo', true)

      if (categoriasData) {
        const uniqueCategories = [...new Set(categoriasData.map(item => item.categoria))]
          .filter(Boolean)
          .map(categoria => ({ id: categoria, nome: categoria }))
        setCategories(uniqueCategories)
      }

      // Carregar centros de custo
      const { data: centrosCustoData } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('ativo', true)
        .order('codigo')

      if (centrosCustoData) {
        setCentrosCusto(centrosCustoData)
      }

      // Carregar materiais (apenas ativos)
      const { data: materiaisData } = await supabase
        .from('materiais_equipamentos')
        .select('id, codigo, nome')
        .eq('ativo', true)
        .order('codigo')
        .limit(100) // Limitar para performance

      if (materiaisData) {
        setMateriais(materiaisData)
      }

      // Carregar usuários (responsáveis)
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .order('nome')
        .limit(100) // Limitar para performance

      if (usuariosData) {
        setColaboradores(usuariosData)
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
      } else {
        options?.onError?.(response.error || 'Erro desconhecido')
        return false
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro interno do servidor'
      options?.onError?.(errorMessage)
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  const validateFilters = (reportId: string, filters: Record<string, any>): string | null => {
    // Validações específicas por tipo de relatório
    switch (reportId) {
      case 'inventario-geral':
        if (!filters.agruparPor) {
          return 'Critério de agrupamento é obrigatório'
        }
        break

      case 'movimentacao':
      case 'consumo-centro-custo':
      case 'analise-abc-xyz':
        if (!filters.dataInicio || !filters.dataFim) {
          return 'Data de início e fim são obrigatórias para este relatório'
        }
        if (new Date(filters.dataInicio) > new Date(filters.dataFim)) {
          return 'Data de início deve ser anterior à data fim'
        }
        break

      case 'vencimento-validade':
        // tipoMaterial não é mais obrigatório, pode usar valor padrão
        if (filters.diasAlerta && (filters.diasAlerta < 1 || filters.diasAlerta > 365)) {
          return 'Dias de alerta deve estar entre 1 e 365'
        }
        break

      case 'fornecedores':
        // ordenarPor não é mais obrigatório, pode usar valor padrão
        break

      case 'requisicoes-pendentes':
        // aging não é mais obrigatório, pode usar valor padrão
        break

      case 'analise-abc-xyz':
        if (!filters.criterioABC) {
          return 'Critério ABC é obrigatório'
        }
        if (!filters.criterioXYZ) {
          return 'Critério XYZ é obrigatório'
        }
        break

      case 'inventario-rotativo':
        if (!filters.ciclo) {
          return 'Ciclo de inventário é obrigatório'
        }
        break
    }

    return null
  }

  const getFilterOptions = () => ({
    categories,
    centrosCusto,
    materiais,
    colaboradores,
    refreshFilterData: loadFilterData
  })

  return {
    isGenerating,
    generateReport,
    validateFilters,
    filterOptions: getFilterOptions()
  }
}