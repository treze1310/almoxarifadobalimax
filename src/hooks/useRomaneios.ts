import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { estoqueService } from '@/services/estoqueService'
import { devolucaoService } from '@/services/devolucaoService'
import { romaneioNumberService } from '@/services/romaneioNumberService'

import type { Tables } from '@/types/database'
import type { RomaneioFormData } from '@/lib/validations'

type Romaneio = Tables<'romaneios'> & {
  colaboradores?: { nome: string; matricula: string } | null
  centro_custo_origem?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
  centro_custo_destino?: { codigo: string; descricao: string; empresas?: { nome: string } | null } | null
  fornecedores?: { nome: string } | null
  romaneios_itens?: Array<{
    id: string
    quantidade: number
    valor_unitario: number | null
    valor_total: number | null
    numero_serie: string | null
    codigo_patrimonial: string | null
    observacoes: string | null
    materiais_equipamentos?: {
      codigo: string
      nome: string
      unidade_medida: string
      codigo_ncm: string | null
      centros_custo?: {
        codigo: string
        nome: string
      } | null
    } | null
  }>
}

type RomaneioItem = Tables<'romaneios_itens'>

export function useRomaneios() {
  const [romaneios, setRomaneios] = useState<Romaneio[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  // TODO: Implementar sistema de usuário simplificado
  const usuario = { id: 'temp-user-id' }

  // Função auxiliar para gerar número do romaneio
  const generateRomaneioNumber = useCallback(async (
    tipo: string, 
    centroCustoOrigemId?: string, 
    centroCustoDestinoId?: string
  ) => {
    try {
      // Mapear tipo do romaneio para o serviço
      let tipoServico: 'entrada' | 'retirada' | 'devolucao'
      switch (tipo) {
        case 'entrada':
          tipoServico = 'entrada'
          break
        case 'retirada':
          tipoServico = 'retirada'
          break
        case 'devolucao':
          tipoServico = 'devolucao'
          break
        default:
          tipoServico = 'entrada' // fallback
      }

      const numeroRomaneio = await romaneioNumberService.gerarNumeroRomaneio({
        centroCustoOrigemId,
        centroCustoDestinoId,
        tipo: tipoServico
      })

      return numeroRomaneio
    } catch (error) {
      console.error('Erro ao gerar número do romaneio:', error)
      // Fallback para o sistema antigo em caso de erro
      const now = new Date()
      return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
    }
  }, [])

  const fetchRomaneios = useCallback(async (options?: {
    tipo?: string
    status?: string
    includeItens?: boolean
  }) => {
    setLoading(true)
    try {
      let query = supabase
        .from('romaneios')
        .select(`
          *,
          colaboradores:colaborador_id (nome, matricula),
          centro_custo_origem:centro_custo_origem_id (codigo, descricao, empresas:empresa_id(nome)),
          centro_custo_destino:centro_custo_destino_id (codigo, descricao, empresas:empresa_id(nome)),
          fornecedores:fornecedor_id (nome)
          ${options?.includeItens ? `, romaneios_itens (
            id, quantidade, valor_unitario, valor_total, 
            numero_serie, codigo_patrimonial, observacoes,
            materiais_equipamentos:material_equipamento_id (id, codigo, nome, unidade_medida, codigo_ncm, centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome)))
          )` : ''}
        `)
        .order('created_at', { ascending: false })

      if (options?.tipo) {
        query = query.eq('tipo', options.tipo)
      }

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      const { data, error } = await query

      if (error) throw error

      setRomaneios((data as any) || [])
      return { data: data || [], error: null }
    } catch (error: any) {
      console.error('Erro ao buscar romaneios:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar romaneios',
        variant: 'destructive',
      })
      return { data: [], error }
    } finally {
      setLoading(false)
    }
  }, [toast])

  const getRomaneioById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('romaneios')
        .select(`
          *,
          colaboradores:colaborador_id (nome, matricula),
          centro_custo_origem:centro_custo_origem_id (codigo, descricao, empresas:empresa_id(nome)),
          centro_custo_destino:centro_custo_destino_id (codigo, descricao, empresas:empresa_id(nome)),
          fornecedores:fornecedor_id (nome),
          romaneios_itens (
            id, quantidade, valor_unitario, valor_total,
            numero_serie, codigo_patrimonial, observacoes,
            materiais_equipamentos:material_equipamento_id (id, codigo, nome, unidade_medida, codigo_ncm, centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome)))
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao buscar romaneio:', error)
      return { data: null, error }
    }
  }, [])

  const createRomaneio = useCallback(async (romaneioData: RomaneioFormData) => {
    setLoading(true)
    try {
      const { itens, ...romaneioBase } = romaneioData

      // Gerar número seguindo novo padrão
      const numeroData = await generateRomaneioNumber(
        romaneioBase.tipo, 
        romaneioBase.centro_custo_origem_id || undefined,
        romaneioBase.centro_custo_destino_id || undefined
      )

      const insertData: any = {
        ...romaneioBase,
        numero: numeroData,
      }

      // Handle UUID fields - convert empty strings to null
      if (romaneioBase.centro_custo_origem_id === '' || !romaneioBase.centro_custo_origem_id) {
        delete insertData.centro_custo_origem_id
      }
      if (romaneioBase.centro_custo_destino_id === '' || !romaneioBase.centro_custo_destino_id) {
        delete insertData.centro_custo_destino_id
      }
      if (romaneioBase.colaborador_id && romaneioBase.colaborador_id !== '') {
        insertData.colaborador_id = romaneioBase.colaborador_id
      }
      if (romaneioBase.fornecedor_id && romaneioBase.fornecedor_id !== '') {
        insertData.fornecedor_id = romaneioBase.fornecedor_id
      }

      // Salvar flag para saber se deve aprovar depois
      const shouldApprove = romaneioBase.status === 'aprovado'
      // Sempre criar como pendente primeiro
      insertData.status = 'pendente'
      
      // Create romaneio
      const { data: romaneio, error: romaneioError } = await supabase
        .from('romaneios')
        .insert(insertData)
        .select()
        .single()

      if (romaneioError) throw romaneioError

      // Create romaneio items
      const romaneioItens = itens.map(item => ({
        romaneio_id: romaneio.id,
        ...item,
      }))

      const { error: itensError } = await supabase
        .from('romaneios_itens')
        .insert(romaneioItens)

      if (itensError) throw itensError

      // Se deve aprovar automaticamente, processar aprovação
      if (shouldApprove && usuario?.id) {
        try {
          // Primeiro aprovar o romaneio
          const resultado = await estoqueService.processarAprovacaoRomaneio(romaneio.id, usuario.id)
          if (!resultado.success) {
            console.warn('Falha na aprovação automática:', resultado.message)
            toast({
              title: 'Aviso',
              description: `Romaneio criado como rascunho. ${resultado.message}`,
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'Sucesso',
              description: `Romaneio ${numeroData} criado e aprovado com sucesso! Estoque atualizado.`,
            })
          }
        } catch (error) {
          console.error('Erro ao processar aprovação automática:', error)
          toast({
            title: 'Aviso',
            description: `Romaneio ${numeroData} criado como rascunho. Erro na aprovação automática.`,
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Sucesso',
          description: `Romaneio ${numeroData} criado com sucesso!`,
        })
      }

      await fetchRomaneios()
      return { data: romaneio, error: null }
    } catch (error: any) {
      console.error('Erro ao criar romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar romaneio',
        variant: 'destructive',
      })
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchRomaneios])

  // Nova função de aprovação com controle de estoque
  const approveRomaneio = useCallback(async (id: string) => {
    if (!usuario?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado',
        variant: 'destructive',
      })
      return { error: 'No user' }
    }

    setLoading(true)
    try {
      // Usar o serviço de estoque para processar a aprovação
      const resultado = await estoqueService.processarAprovacaoRomaneio(id, usuario.id)
      
      if (resultado.success) {
        toast({
          title: 'Sucesso',
          description: resultado.message,
        })
        
        await fetchRomaneios()
        return { error: null }
      } else {
        toast({
          title: 'Erro',
          description: resultado.message,
          variant: 'destructive',
        })
        return { error: resultado.message }
      }
    } catch (error: any) {
      console.error('Erro ao aprovar romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro interno ao aprovar romaneio',
        variant: 'destructive',
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchRomaneios, usuario?.id, generateRomaneioNumber])

  const updateRomaneioStatus = useCallback(async (id: string, status: string) => {
    try {
      const { data, error } = await supabase
        .from('romaneios')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Status do romaneio atualizado com sucesso!',
      })

      await fetchRomaneios()
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status do romaneio',
        variant: 'destructive',
      })
      return { data: null, error }
    }
  }, [toast, fetchRomaneios])

  const cancelRomaneio = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('romaneios')
        .update({ status: 'cancelado' })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Romaneio cancelado com sucesso!',
      })

      await fetchRomaneios()
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao cancelar romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar romaneio',
        variant: 'destructive',
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchRomaneios])

  // Função para reverter o centro de custo quando um romaneio é excluído
  const revertCentroCusto = async (romaneio: any) => {
    if (!romaneio || !romaneio.romaneios_itens) return

    const isRetirada = romaneio.tipo === 'retirada'
    const isDevolucao = romaneio.tipo === 'devolucao'
    const isTransferencia = romaneio.tipo === 'transferencia'

    // Buscar centro de custo do almoxarifado para usar como padrão
    const { data: almoxarifadoCC } = await supabase
      .from('centros_custo')
      .select('id')
      .or('nome.ilike.%almoxarifado%,codigo.ilike.%almox%')
      .eq('ativo', true)
      .limit(1)
      .single()

    const almoxarifadoCentroCustoId = almoxarifadoCC?.id

    for (const item of romaneio.romaneios_itens) {
      let centroCustoAnterior = null

      if (isRetirada || isTransferencia) {
        // Para retiradas e transferências, voltar para centro de custo origem
        centroCustoAnterior = romaneio.centro_custo_origem_id || almoxarifadoCentroCustoId
      } else if (isDevolucao) {
        // Para devoluções, usar centro de custo origem ou almoxarifado
        // TODO: Implementar busca do romaneio original adequadamente
        centroCustoAnterior = romaneio.centro_custo_origem_id || almoxarifadoCentroCustoId
      }

      // Atualizar o centro de custo do material
      if (centroCustoAnterior) {
        const { error: updateError } = await supabase
          .from('materiais_equipamentos')
          .update({ centro_custo_id: centroCustoAnterior })
          .eq('id', item.material_equipamento_id)

        if (updateError) {
          console.error('Erro ao reverter centro de custo do material:', updateError)
        }
      }
    }
  }

  const deleteRomaneio = useCallback(async (id: string) => {
    setLoading(true)
    try {
      // Buscar dados completos do romaneio antes de excluir
      const { data: romaneio, error: romaneioFetchError } = await supabase
        .from('romaneios')
        .select(`
          *,
          romaneios_itens (
            id,
            material_equipamento_id,
            materiais_equipamentos (
              id,
              centro_custo_id
            )
          )
        `)
        .eq('id', id)
        .single()

      if (romaneioFetchError) {
        console.error('Erro ao buscar romaneio:', romaneioFetchError)
        throw romaneioFetchError
      }

      // Verificar se o romaneio foi aprovado (tem movimentações de estoque)
      const { data: movimentacoes, error: movError } = await supabase
        .from('movimentacao_estoque')
        .select('id, quantidade, material_equipamento_id, quantidade_anterior')
        .eq('romaneio_id', id)

      if (movError) {
        console.error('Erro ao verificar movimentações:', movError)
      }

      // Se há movimentações, reverter o estoque antes de deletar
      if (movimentacoes && movimentacoes.length > 0) {
        toast({
          title: 'Atenção',
          description: 'Este romaneio possui movimentações de estoque. O estoque e centro de custo serão revertidos.',
          variant: 'default',
        })

        // Reverter cada movimentação de estoque
        for (const mov of movimentacoes) {
          const { error: revertError } = await supabase
            .from('materiais_equipamentos')
            .update({ estoque_atual: mov.quantidade_anterior })
            .eq('id', mov.material_equipamento_id)

          if (revertError) {
            console.error('Erro ao reverter estoque:', revertError)
            toast({
              title: 'Aviso',
              description: `Erro ao reverter estoque do material ${mov.material_equipamento_id}`,
              variant: 'destructive',
            })
          }
        }

        // Deletar movimentações de estoque
        const { error: delMovError } = await supabase
          .from('movimentacao_estoque')
          .delete()
          .eq('romaneio_id', id)

        if (delMovError) throw delMovError

        // Reverter centro de custo dos materiais
        await revertCentroCusto(romaneio)
      }

      // Delete items
      const { error: itensError } = await supabase
        .from('romaneios_itens')
        .delete()
        .eq('romaneio_id', id)

      if (itensError) throw itensError

      // Finally delete romaneio
      const { error: romaneioError } = await supabase
        .from('romaneios')
        .delete()
        .eq('id', id)

      if (romaneioError) throw romaneioError

      toast({
        title: 'Sucesso',
        description: 'Romaneio excluído com sucesso! O estoque e centro de custo foram revertidos se necessário.',
      })

      await fetchRomaneios()
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao excluir romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir romaneio',
        variant: 'destructive',
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchRomaneios])

  const getRomaneiosForReturn = useCallback(async () => {
    try {
      // Primeiro, buscar todos os romaneios de retirada aprovados/retirados
      const { data, error } = await supabase
        .from('romaneios')
        .select(`
          *,
          colaboradores:colaborador_id (nome, matricula),
          centro_custo_origem:centro_custo_origem_id (codigo, descricao, empresas:empresa_id(nome)),
          centro_custo_destino:centro_custo_destino_id (codigo, descricao, empresas:empresa_id(nome)),
          romaneios_itens (
            id, quantidade, valor_unitario, valor_total,
            numero_serie, codigo_patrimonial, observacoes,
            materiais_equipamentos:material_equipamento_id (id, codigo, nome, unidade_medida, codigo_ncm, centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome)))
          )
        `)
        .eq('tipo', 'retirada')
        .in('status', ['aprovado', 'retirado'])
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filtrar romaneios que ainda podem ser devolvidos
      const romaneiosDisponiveis = []
      
      for (const romaneio of data || []) {
        // Verificar se tem devoluções pendentes
        const temDevolucoesPendentes = await devolucaoService.verificarDevolucoesPendentes(romaneio.id)
        
        // Se tem devoluções pendentes, não permitir nova devolução
        if (temDevolucoesPendentes) {
          continue
        }

        // Calcular status de devolução
        const statusDevolucao = await devolucaoService.calcularStatusDevolucao(romaneio.id)
        
        // Só incluir se não foi totalmente devolvido
        if (statusDevolucao.status !== 'totalmente_devolvido') {
          romaneiosDisponiveis.push(romaneio)
        }
      }

      return { data: romaneiosDisponiveis, error: null }
    } catch (error: any) {
      console.error('Erro ao buscar romaneios para devolução:', error)
      return { data: [], error }
    }
  }, [])

  const updateRomaneio = useCallback(async (id: string, data: Partial<RomaneioFormData>) => {
    setLoading(true)
    try {
      // Prepare update data, converting empty strings to null for UUID fields
      const updateData: any = {
        data_romaneio: data.data_romaneio,
        responsavel_retirada: data.responsavel_retirada,
        centro_custo_origem_id: data.centro_custo_origem_id && data.centro_custo_origem_id !== '' ? data.centro_custo_origem_id : null,
        centro_custo_destino_id: data.centro_custo_destino_id && data.centro_custo_destino_id !== '' ? data.centro_custo_destino_id : null,
        observacoes: data.observacoes,
      }

      // Update romaneio
      const { error: romaneioError } = await supabase
        .from('romaneios')
        .update(updateData)
        .eq('id', id)

      if (romaneioError) throw romaneioError

      // Update items if provided
      if (data.itens) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('romaneios_itens')
          .delete()
          .eq('romaneio_id', id)

        if (deleteError) throw deleteError

        // Insert new items
        const romaneioItens = data.itens.map(item => ({
          romaneio_id: id,
          ...item,
        }))

        const { error: itensError } = await supabase
          .from('romaneios_itens')
          .insert(romaneioItens)

        if (itensError) throw itensError
      }

      toast({
        title: 'Sucesso',
        description: 'Romaneio atualizado com sucesso!',
      })

      await fetchRomaneios()
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao atualizar romaneio:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar romaneio',
        variant: 'destructive',
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }, [toast, fetchRomaneios])

  return {
    romaneios,
    loading,
    fetchRomaneios,
    getRomaneioById,
    createRomaneio,
    updateRomaneio,
    updateRomaneioStatus,
    approveRomaneio,
    cancelRomaneio,
    deleteRomaneio,
    getRomaneiosForReturn,
  }
}