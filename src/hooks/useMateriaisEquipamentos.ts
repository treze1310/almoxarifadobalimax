import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/types/database'
import type { MaterialEquipamentoFormData } from '@/lib/validations'
import { materialDependencyService } from '@/services/materialDependencyService'

type MaterialEquipamento = Tables<'materiais_equipamentos'> & {
  marcas?: { nome: string } | null
  fornecedores?: { nome: string; cnpj: string } | null
  localizacao?: { codigo: string; nome: string } | null
  centros_custo?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
}

type MovimentacaoEstoque = Tables<'movimentacao_estoque'> & {
  materiais_equipamentos?: {
    codigo: string
    nome: string
    unidade_medida: string
  } | null
  usuarios?: { nome: string } | null
}

export function useMateriaisEquipamentos() {
  const [materiaisEquipamentos, setMateriaisEquipamentos] = useState<MaterialEquipamento[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Buscar centro de custo do almoxarifado (padrão)
  const getAlmoxarifadoCentroCusto = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('id')
        .or('nome.ilike.%almoxarifado%,codigo.ilike.%almox%')
        .eq('ativo', true)
        .limit(1)
        .single()

      if (error || !data) {
        console.warn('Centro de custo do almoxarifado não encontrado, usando null')
        return null
      }

      return data.id
    } catch (error) {
      console.warn('Erro ao buscar centro de custo do almoxarifado:', error)
      return null
    }
  }, [])

  const fetchMateriais = useCallback(async (options?: {
    search?: string
    tipo?: 'material' | 'equipamento'
    categoria?: string
    status?: string
    includeInactive?: boolean
  }) => {
    setLoading(true)
    try {
      console.log('🔍 Buscando materiais com opções:', options)
      
      let query = supabase
        .from('materiais_equipamentos')
        .select(`
          *,
          marcas:marca_id (nome),
          fornecedores:fornecedor_id (nome, cnpj),
          localizacao:localizacao_id (codigo, nome),
          centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome))
        `)
        .order('codigo', { ascending: true })

      // Filtrar por ativo apenas se não foi solicitado incluir inativos
      if (!options?.includeInactive) {
        console.log('📋 Filtrando apenas materiais ativos')
        query = query.eq('ativo', true)
      } else {
        console.log('📋 Incluindo materiais inativos')
      }

      if (options?.tipo) {
        query = query.eq('tipo', options.tipo)
      }

      if (options?.categoria) {
        query = query.ilike('categoria', `%${options.categoria}%`)
      }

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.search) {
        query = query.or(`codigo.ilike.%${options.search}%,nome.ilike.%${options.search}%,descricao.ilike.%${options.search}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro na consulta:', error)
        throw error
      }

      console.log(`✅ Materiais encontrados: ${data?.length || 0}`)
      console.log('📊 Primeiros 3 materiais:', data?.slice(0, 3))

      setMateriaisEquipamentos(data || [])
      return { data: data || [], error: null }
    } catch (error: any) {
      console.error('Erro ao buscar materiais/equipamentos:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar materiais/equipamentos',
        variant: 'destructive',
      })
      return { data: [], error }
    } finally {
      setLoading(false)
    }
  }, [toast])

  const getMaterialById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .select(`
          *,
          marcas:marca_id (nome),
          fornecedores:fornecedor_id (nome, cnpj),
          localizacao:localizacao_id (codigo, nome),
          centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome))
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao buscar material/equipamento:', error)
      return { data: null, error }
    }
  }, [])

  const createMaterial = useCallback(async (materialData: MaterialEquipamentoFormData) => {
    setLoading(true)
    try {
      // Verificar se o código já existe
      const { data: existing } = await supabase
        .from('materiais_equipamentos')
        .select('codigo')
        .eq('codigo', materialData.codigo)
        .single()

      if (existing) {
        throw new Error('Código já existe no sistema')
      }

      // Se não foi especificado centro de custo, usar o do almoxarifado como padrão
      const finalMaterialData = { ...materialData }
      if (!finalMaterialData.centro_custo_id) {
        const almoxarifadoCentroCustoId = await getAlmoxarifadoCentroCusto()
        if (almoxarifadoCentroCustoId) {
          finalMaterialData.centro_custo_id = almoxarifadoCentroCustoId
        }
      }

      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .insert(finalMaterialData)
        .select()
        .single()

      if (error) throw error

      // Criar movimentação inicial de estoque se houver estoque_atual > 0
      if (materialData.estoque_atual && materialData.estoque_atual > 0) {
        await createMovimentacaoEstoque({
          material_equipamento_id: data.id,
          tipo_movimentacao: 'entrada',
          quantidade: materialData.estoque_atual,
          quantidade_anterior: 0,
          quantidade_atual: materialData.estoque_atual,
          motivo: 'Cadastro inicial',
          valor_unitario: materialData.valor_unitario || 0,
        })
      }

      toast({
        title: 'Sucesso',
        description: `${materialData.tipo === 'material' ? 'Material' : 'Equipamento'} "${materialData.nome}" cadastrado com sucesso!`,
      })

      await fetchMateriais()
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao criar material/equipamento:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cadastrar material/equipamento',
        variant: 'destructive',
      })
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchMateriais, getAlmoxarifadoCentroCusto])

  const updateMaterial = useCallback(async (id: string, materialData: MaterialEquipamentoFormData) => {
    setLoading(true)
    try {
      // Buscar dados atuais para comparar estoque
      const { data: currentData } = await supabase
        .from('materiais_equipamentos')
        .select('estoque_atual, codigo')
        .eq('id', id)
        .single()

      if (!currentData) {
        throw new Error('Material/equipamento não encontrado')
      }

      // Verificar se o código já existe em outro registro
      if (materialData.codigo !== currentData.codigo) {
        const { data: existing } = await supabase
          .from('materiais_equipamentos')
          .select('codigo')
          .eq('codigo', materialData.codigo)
          .neq('id', id)
          .single()

        if (existing) {
          throw new Error('Código já existe no sistema')
        }
      }

      const { data, error } = await supabase
        .from('materiais_equipamentos')
        .update(materialData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Se o estoque foi alterado, criar movimentação
      if (currentData.estoque_atual !== materialData.estoque_atual) {
        const diferencaEstoque = materialData.estoque_atual - currentData.estoque_atual
        await createMovimentacaoEstoque({
          material_equipamento_id: id,
          tipo_movimentacao: diferencaEstoque > 0 ? 'entrada' : 'saida',
          quantidade: Math.abs(diferencaEstoque),
          quantidade_anterior: currentData.estoque_atual,
          quantidade_atual: materialData.estoque_atual,
          motivo: 'Ajuste manual',
          valor_unitario: materialData.valor_unitario || 0,
        })
      }

      toast({
        title: 'Sucesso',
        description: `${materialData.tipo === 'material' ? 'Material' : 'Equipamento'} atualizado com sucesso!`,
      })

      await fetchMateriais()
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao atualizar material/equipamento:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar material/equipamento',
        variant: 'destructive',
      })
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchMateriais])

  const deleteMaterial = useCallback(async (id: string) => {
    try {
      // Verificar se há movimentações relacionadas
      const { data: movimentacoes } = await supabase
        .from('movimentacao_estoque')
        .select('id')
        .eq('material_equipamento_id', id)
        .limit(1)

      if (movimentacoes && movimentacoes.length > 0) {
        // Inativar ao invés de deletar se há movimentações
        const { error } = await supabase
          .from('materiais_equipamentos')
          .update({ ativo: false })
          .eq('id', id)

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Material/equipamento inativado com sucesso! (Possui movimentações relacionadas)',
        })
      } else {
        // Deletar se não há movimentações
        const { error } = await supabase
          .from('materiais_equipamentos')
          .delete()
          .eq('id', id)

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Material/equipamento excluído com sucesso!',
        })
      }

      await fetchMateriais()
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao excluir material/equipamento:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir material/equipamento',
        variant: 'destructive',
      })
      return { error }
    }
  }, [toast, fetchMateriais])

  const createMovimentacaoEstoque = useCallback(async (movimentacao: {
    material_equipamento_id: string
    tipo_movimentacao: string
    quantidade: number
    quantidade_anterior: number
    quantidade_atual: number
    motivo?: string
    valor_unitario?: number
    romaneio_id?: string
    nfe_id?: string
    usuario_id?: string
  }) => {
    try {
      const { error } = await supabase
        .from('movimentacao_estoque')
        .insert({
          ...movimentacao,
          data_movimentacao: new Date().toISOString(),
        })

      if (error) throw error
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao criar movimentação de estoque:', error)
      return { error }
    }
  }, [])

  const fetchMovimentacoes = useCallback(async (materialId?: string) => {
    try {
      let query = supabase
        .from('movimentacao_estoque')
        .select(`
          *,
          materiais_equipamentos:material_equipamento_id (codigo, nome, unidade_medida),
          usuarios:usuario_id (nome)
        `)
        .order('data_movimentacao', { ascending: false })

      if (materialId) {
        query = query.eq('material_equipamento_id', materialId)
      }

      const { data, error } = await query

      if (error) throw error

      setMovimentacoes(data || [])
      return { data: data || [], error: null }
    } catch (error: any) {
      console.error('Erro ao buscar movimentações:', error)
      return { data: [], error }
    }
  }, [])

  const adjustStock = useCallback(async (
    materialId: string,
    novaQuantidade: number,
    motivo: string = 'Ajuste manual'
  ) => {
    try {
      // Buscar dados atuais
      const { data: material } = await supabase
        .from('materiais_equipamentos')
        .select('estoque_atual, codigo, nome')
        .eq('id', materialId)
        .single()

      if (!material) {
        throw new Error('Material/equipamento não encontrado')
      }

      // Atualizar estoque
      const { error: updateError } = await supabase
        .from('materiais_equipamentos')
        .update({ estoque_atual: novaQuantidade })
        .eq('id', materialId)

      if (updateError) throw updateError

      // Criar movimentação
      const diferenca = novaQuantidade - material.estoque_atual
      await createMovimentacaoEstoque({
        material_equipamento_id: materialId,
        tipo_movimentacao: diferenca > 0 ? 'entrada' : 'saida',
        quantidade: Math.abs(diferenca),
        quantidade_anterior: material.estoque_atual,
        quantidade_atual: novaQuantidade,
        motivo,
      })

      toast({
        title: 'Sucesso',
        description: `Estoque de "${material.nome}" ajustado para ${novaQuantidade} unidades`,
      })

      await fetchMateriais()
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao ajustar estoque:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao ajustar estoque',
        variant: 'destructive',
      })
      return { error }
    }
  }, [toast, fetchMateriais, createMovimentacaoEstoque])

  // Função específica para criar materiais a partir de NFe (usando apenas campos existentes)
  const createMaterialFromNFe = useCallback(async (nfeItem: {
    codigo_produto: string
    descricao_produto: string
    ncm?: string
    cest?: string
    codigo_ean?: string
    unidade?: string
    valor_unitario: number
    quantidade?: number
    categoria?: string
    fornecedor?: string
    aplicacao?: string
    data_emissao?: string
  }) => {
    try {
      // Criar descrição detalhada incluindo informações que não cabem em campos específicos
      let descricaoCompleta = `Material importado via NFe - ${nfeItem.descricao_produto}`
      if (nfeItem.fornecedor) descricaoCompleta += ` (Fornecedor: ${nfeItem.fornecedor})`
      if (nfeItem.cest) descricaoCompleta += ` - CEST: ${nfeItem.cest}`
      if (nfeItem.aplicacao) descricaoCompleta += ` - Aplicação: ${nfeItem.aplicacao}`

      // Buscar centro de custo do almoxarifado como padrão
      const almoxarifadoCentroCustoId = await getAlmoxarifadoCentroCusto()

      const materialData = {
        codigo: nfeItem.codigo_produto,
        nome: nfeItem.descricao_produto,
        descricao: descricaoCompleta,
        tipo: 'material' as const,
        categoria: nfeItem.categoria || 'MATERIAL DE CONSUMO',
        unidade_medida: nfeItem.unidade || 'UN',
        estoque_atual: Math.floor(nfeItem.quantidade || 0), // ✅ Usar quantidade da NFe
        estoque_minimo: 0,
        valor_unitario: nfeItem.valor_unitario,
        codigo_ncm: nfeItem.ncm, // ✅ NCM da NFe
        codigo_barras: nfeItem.codigo_ean, // Usar campo existente codigo_barras para EAN
        data_aquisicao: nfeItem.data_emissao, // ✅ Data de emissão da NFe
        centro_custo_id: almoxarifadoCentroCustoId, // Centro de custo padrão do almoxarifado
        ativo: true, // IMPORTANTE: Materiais de NFe devem ser ativos por padrão
        status: 'ativo' as const,
      }

      const result = await createMaterial(materialData)
      return result
    } catch (error: any) {
      console.error('Erro ao criar material da NFe:', error)
      return { data: null, error }
    }
  }, [createMaterial, getAlmoxarifadoCentroCusto])

  // Verificar dependências antes da exclusão
  const checkMaterialDependencies = useCallback(async (materialId: string) => {
    try {
      const { data, error } = await materialDependencyService.checkDependencies(materialId)
      return { data, error }
    } catch (error: any) {
      console.error('Erro ao verificar dependências:', error)
      return { data: null, error }
    }
  }, [])

  // Excluir material removendo vínculos NFe primeiro
  const deleteMaterialWithDependencies = useCallback(async (materialId: string) => {
    setLoading(true)
    try {
      const { success, error, warnings } = await materialDependencyService.forceDelete(materialId)
      
      if (!success) {
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao excluir material',
          variant: 'destructive',
        })
        return { error }
      }

      // Mostrar avisos se houver
      if (warnings.length > 0) {
        toast({
          title: 'Material Excluído',
          description: `Material excluído com avisos: ${warnings.join(', ')}`,
        })
      } else {
        toast({
          title: 'Sucesso',
          description: 'Material excluído com sucesso',
        })
      }

      await fetchMateriais()
      return { error: null }

    } catch (error: any) {
      console.error('Erro ao excluir material:', error)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao excluir material',
        variant: 'destructive',
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchMateriais])

  // Buscar romaneio que moveu o material para o centro de custo atual
  const findRomaneioEntrada = useCallback(async (materialId: string) => {
    try {
      // Primeiro, buscar o centro de custo atual do material
      const { data: material, error: materialError } = await supabase
        .from('materiais_equipamentos')
        .select('centro_custo_id, centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome))')
        .eq('id', materialId)
        .single()

      if (materialError || !material) {
        console.error('Erro ao buscar material:', materialError)
        return { data: null, error: materialError }
      }

      // Buscar movimentações relacionadas a romaneios que afetaram este material
      const { data: movimentacoes, error } = await supabase
        .from('movimentacao_estoque')
        .select(`
          *,
          romaneios:romaneio_id (
            id,
            numero,
            tipo,
            data_romaneio,
            status,
            colaboradores:colaborador_id (nome, matricula),
            centro_custo_origem:centro_custo_origem_id (codigo, descricao, empresas:empresa_id(nome)),
            centro_custo_destino:centro_custo_destino_id (codigo, descricao, empresas:empresa_id(nome))
          )
        `)
        .eq('material_equipamento_id', materialId)
        .not('romaneio_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar movimentações:', error)
        return { data: null, error }
      }

      if (!movimentacoes || movimentacoes.length === 0) {
        return { data: null, error: null }
      }

      // Encontrar o romaneio mais recente que colocou o material no centro de custo atual
      for (const mov of movimentacoes) {
        const romaneio = mov.romaneios
        if (!romaneio) continue

        // Para retiradas e transferências: o centro de custo destino deve coincidir
        if ((romaneio.tipo === 'retirada' || romaneio.tipo === 'transferencia') && 
            romaneio.centro_custo_destino_id === material.centro_custo_id) {
          return { data: romaneio, error: null }
        }

        // Para devoluções: o centro de custo destino da devolução deve coincidir
        if (romaneio.tipo === 'devolucao' && 
            romaneio.centro_custo_destino_id === material.centro_custo_id) {
          return { data: romaneio, error: null }
        }
      }

      // Se não encontrou um romaneio específico que colocou no centro atual,
      // retornar o mais recente
      return { data: movimentacoes[0]?.romaneios || null, error: null }
    } catch (error: any) {
      console.error('Erro ao buscar romaneio de entrada:', error)
      return { data: null, error }
    }
  }, [])

  return {
    materiaisEquipamentos,
    movimentacoes,
    loading,
    fetchMateriais,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    fetchMovimentacoes,
    adjustStock,
    createMovimentacaoEstoque,
    createMaterialFromNFe,
    checkMaterialDependencies,
    deleteMaterialWithDependencies,
    findRomaneioEntrada,
  }
}