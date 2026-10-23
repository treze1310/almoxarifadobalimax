import { restaurarItensHistoricos } from '@/lib/romaneioHistorico'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { registrarAuditoria } from '@/services/auditoriaService'
import { useToast } from '@/components/ui/use-toast'
import { estoqueService } from '@/services/estoqueService'
import { devolucaoService } from '@/services/devolucaoService'
import { romaneioNumberService } from '@/services/romaneioNumberService'
import { useAuth } from '@/contexts/AuthContext'

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
    material_unidade_id?: string | null
    /** Peça individual desta linha, quando o item é acompanhado peça a peça */
    material_unidades?: { codigo: string; status: string } | null
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
  const { user } = useAuth()
  // Usuário autenticado (id é UUID válido do Supabase Auth)
  const usuario = user ? { id: user.id } : null

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
      // Recarga mantém o que já está na tela: `loading` só na primeira vez.
      // Pondo `loading` a cada recarga, voltar para uma listagem já visitada
      // mostrava a tela de carregando de novo e piscava tudo.
    setRomaneios((atuais) => {
      if (atuais.length === 0) setLoading(true)
      return atuais
    })
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
            id, material_excluido, quantidade, valor_unitario, valor_total,
            numero_serie, codigo_patrimonial, observacoes, material_unidade_id,
            material_unidades:material_unidade_id (codigo, status),
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

      const documentos = (data || []).map(item => restaurarItensHistoricos(item as any))
      setRomaneios(documentos)
      return { data: documentos, error: null }
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
            id, material_excluido, quantidade, valor_unitario, valor_total,
            numero_serie, codigo_patrimonial, observacoes, material_unidade_id,
            material_unidades:material_unidade_id (codigo, status),
            materiais_equipamentos:material_equipamento_id (id, codigo, nome, unidade_medida, codigo_ncm, centros_custo:centro_custo_id (codigo, descricao, empresas:empresa_id(nome)))
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return { data: restaurarItensHistoricos(data), error: null }
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

      // Se deve aprovar automaticamente, processar aprovação.
      // Não depender de usuário autenticado: o estoqueService trata usuario_id inválido como null.
      if (shouldApprove) {
        try {
          // Primeiro aprovar o romaneio
          const resultado = await estoqueService.processarAprovacaoRomaneio(romaneio.id, usuario?.id || '')
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
    setLoading(true)
    try {
      // Usar o serviço de estoque para processar a aprovação
      // (usuario_id inválido/ausente é tratado como null pelo estoqueService)
      const resultado = await estoqueService.processarAprovacaoRomaneio(id, usuario?.id || '')
      
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

  /**
   * RF-04: cancelar exige motivo. O banco rejeita o cancelamento de um romaneio
   * aprovado sem justificativa, e o motivo fica registrado em `observacoes`
   * junto com a trilha de auditoria.
   */
  const cancelRomaneio = useCallback(async (id: string, motivo: string) => {
    setLoading(true)
    try {
      if (!motivo?.trim()) {
        throw new Error('Informe o motivo do cancelamento.')
      }

      const { data: atual } = await supabase
        .from('romaneios')
        .select('numero, observacoes, status')
        .eq('id', id)
        .maybeSingle()

      const historico = atual?.observacoes ? `${atual.observacoes}

` : ''
      const { error } = await supabase
        .from('romaneios')
        .update({
          status: 'cancelado',
          observacoes: `${historico}[Cancelado] ${motivo.trim()}`,
        })
        .eq('id', id)

      if (error) throw error

      await registrarAuditoria({
        acao: 'romaneio.cancelar',
        tabela: 'romaneios',
        registroId: id,
        dadosAnteriores: { status: atual?.status },
        dadosNovos: { numero: atual?.numero, status: 'cancelado', motivo: motivo.trim() },
      })

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

  const deleteRomaneio = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('excluir_romaneio', { p_romaneio_id: id })
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Romaneio excluído e movimentações revertidas com sucesso.' })
      await fetchRomaneios()
      return { error: null }
    } catch (error: any) {
      toast({ title: 'Erro ao excluir romaneio', description: error?.message || 'Não foi possível excluir o romaneio.', variant: 'destructive' })
      return { error }
    } finally { setLoading(false) }
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
            id, material_equipamento_id, material_excluido, quantidade, valor_unitario, valor_total,
            numero_serie, codigo_patrimonial, observacoes, material_unidade_id,
            material_unidades:material_unidade_id (codigo, status),
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
        responsavel_nome: data.responsavel_nome ?? null,
        colaborador_id: data.colaborador_id && data.colaborador_id !== '' ? data.colaborador_id : null,
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