import { supabase } from '@/lib/supabase'
import { devolucaoService } from './devolucaoService'

export interface MovimentacaoEstoque {
  material_equipamento_id: string
  quantidade: number
  motivo: string
  romaneio_id?: string
  observacoes?: string
  usuario_id: string
}

export interface ValidationResult {
  valid: boolean
  message?: string
  disponivel?: number
}

class EstoqueService {
  // Validar se há quantidade suficiente em estoque
  async validarQuantidadeDisponivel(materialId: string, quantidadeSolicitada: number): Promise<ValidationResult> {
    try {
      const { data: material, error } = await supabase
        .from('materiais_equipamentos')
        .select('estoque_atual, nome, codigo')
        .eq('id', materialId)
        .single()

      if (error) {
        return {
          valid: false,
          message: 'Erro ao consultar material no estoque'
        }
      }

      if (!material) {
        return {
          valid: false,
          message: 'Material não encontrado'
        }
      }

      const estoqueAtual = material.estoque_atual || 0
      
      if (estoqueAtual < quantidadeSolicitada) {
        return {
          valid: false,
          message: `Quantidade insuficiente em estoque. Disponível: ${estoqueAtual}, Solicitado: ${quantidadeSolicitada}`,
          disponivel: estoqueAtual
        }
      }

      return {
        valid: true,
        disponivel: estoqueAtual
      }
    } catch (error) {
      console.error('Erro ao validar quantidade em estoque:', error)
      return {
        valid: false,
        message: 'Erro interno ao validar estoque'
      }
    }
  }

  // Validar todos os itens de um romaneio
  async validarItensRomaneio(itens: Array<{ material_equipamento_id: string, quantidade: number, nome?: string }>): Promise<ValidationResult> {
    try {
      const validacoes = await Promise.all(
        itens.map(async (item) => {
          const resultado = await this.validarQuantidadeDisponivel(item.material_equipamento_id, item.quantidade)
          return {
            ...resultado,
            item: item.nome || item.material_equipamento_id
          }
        })
      )

      const itemsInvalidos = validacoes.filter(v => !v.valid)
      
      if (itemsInvalidos.length > 0) {
        const mensagens = itemsInvalidos.map(item => 
          `${item.item}: ${item.message}`
        )
        
        return {
          valid: false,
          message: `Itens com estoque insuficiente:\n${mensagens.join('\n')}`
        }
      }

      return { valid: true }
    } catch (error) {
      console.error('Erro ao validar itens do romaneio:', error)
      return {
        valid: false,
        message: 'Erro interno ao validar itens'
      }
    }
  }

  // Processar movimentação de estoque (retirada ou devolução)
  async processarMovimentacao(movimentacao: MovimentacaoEstoque): Promise<boolean> {
    try {
      // Primeiro, vamos consultar registros existentes para ver quais tipos são usados
      const { data: exemplos, error: exemploError } = await supabase
        .from('movimentacao_estoque')
        .select('tipo_movimentacao')
        .limit(10)

      if (!exemploError && exemplos && exemplos.length > 0) {
        console.log('Tipos de movimentação existentes no banco:', exemplos.map(e => e.tipo_movimentacao))
      } else {
        console.log('Nenhum registro encontrado ou erro:', exemploError)
      }

      // Validar dados de entrada
      if (!movimentacao.material_equipamento_id) {
        throw new Error('ID do material é obrigatório')
      }
      
      if (!movimentacao.usuario_id) {
        throw new Error('ID do usuário é obrigatório')
      }
      
      if (typeof movimentacao.quantidade !== 'number' || isNaN(movimentacao.quantidade)) {
        throw new Error('Quantidade deve ser um número válido')
      }

      console.log('Processando movimentação:', {
        material_id: movimentacao.material_equipamento_id,
        usuario_id: movimentacao.usuario_id,
        quantidade: movimentacao.quantidade
      })

      // Começar transação
      const { data: materialAtual, error: materialError } = await supabase
        .from('materiais_equipamentos')
        .select('estoque_atual')
        .eq('id', movimentacao.material_equipamento_id)
        .single()

      if (materialError || !materialAtual) {
        console.error('Erro ao buscar material:', materialError)
        throw new Error('Material não encontrado')
      }

      const quantidadeAnterior = materialAtual.estoque_atual || 0
      const novaQuantidade = quantidadeAnterior + movimentacao.quantidade // quantidade negativa para retirada, positiva para devolução

      // Validar se não vai ficar negativo (só para retiradas)
      if (movimentacao.quantidade < 0 && novaQuantidade < 0) {
        throw new Error('Operação resultaria em estoque negativo')
      }

      // Atualizar estoque do material
      const { error: updateError } = await supabase
        .from('materiais_equipamentos')
        .update({ estoque_atual: novaQuantidade })
        .eq('id', movimentacao.material_equipamento_id)

      if (updateError) {
        throw new Error('Erro ao atualizar estoque do material')
      }

      // Registrar movimentação
      const movimentacaoData = {
        material_equipamento_id: movimentacao.material_equipamento_id,
        quantidade: movimentacao.quantidade,
        quantidade_anterior: quantidadeAnterior,
        quantidade_atual: novaQuantidade,
        motivo: movimentacao.motivo || null,
        romaneio_id: movimentacao.romaneio_id || null,
        observacoes: movimentacao.observacoes || null,
        usuario_id: movimentacao.usuario_id,
        data_movimentacao: new Date().toISOString(),
        tipo_movimentacao: movimentacao.quantidade < 0 ? 'saida' : 'entrada',
        valor_unitario: null, // Campo obrigatório na estrutura
        nfe_id: null // Campo obrigatório na estrutura
      }
      
      console.log('Dados da movimentação a ser inserida:', movimentacaoData)
      
      // Tentar diferentes valores de tipo_movimentacao até encontrar o correto
      const tiposPossiveis = [
        movimentacao.quantidade < 0 ? 'saida' : 'entrada',
        movimentacao.quantidade < 0 ? 'retirada' : 'entrada', 
        movimentacao.quantidade < 0 ? 'consumo' : 'entrada',
        movimentacao.quantidade < 0 ? 'baixa' : 'entrada',
        movimentacao.quantidade < 0 ? 'out' : 'in'
      ]
      
      let movError = null
      let sucessoInsercao = false
      
      for (const tipo of tiposPossiveis) {
        const tentativaData = { ...movimentacaoData, tipo_movimentacao: tipo }
        console.log(`Tentando inserir com tipo_movimentacao: '${tipo}'`)
        
        const { error } = await supabase
          .from('movimentacao_estoque')
          .insert(tentativaData)
        
        if (!error) {
          console.log(`✅ Sucesso com tipo_movimentacao: '${tipo}'`)
          sucessoInsercao = true
          break
        } else {
          console.log(`❌ Falhou com tipo '${tipo}':`, error.message)
          movError = error
        }
      }
      
      if (!sucessoInsercao) {
        console.error('Todas as tentativas falharam. Último erro:', movError)
      }

      if (!sucessoInsercao && movError) {
        console.error('Erro detalhado ao registrar movimentação:', movError)
        // Reverter atualização do estoque
        await supabase
          .from('materiais_equipamentos')
          .update({ estoque_atual: quantidadeAnterior })
          .eq('id', movimentacao.material_equipamento_id)
        
        throw new Error(`Erro ao registrar movimentação: ${movError.message}`)
      }

      return true
    } catch (error) {
      console.error('Erro ao processar movimentação:', error)
      return false
    }
  }

  // Processar aprovação de romaneio (retirada ou devolução)
  async processarAprovacaoRomaneio(romaneioId: string, usuarioId: string): Promise<{ success: boolean, message: string }> {
    try {
      // Buscar detalhes do romaneio
      const { data: romaneio, error: romaneioError } = await supabase
        .from('romaneios')
        .select(`
          *,
          romaneios_itens (
            id,
            quantidade,
            material_equipamento_id,
            materiais_equipamentos (
              nome,
              codigo,
              centro_custo_id
            )
          )
        `)
        .eq('id', romaneioId)
        .single()

      if (romaneioError || !romaneio) {
        return {
          success: false,
          message: 'Romaneio não encontrado'
        }
      }

      if (romaneio.status !== 'pendente') {
        return {
          success: false,
          message: 'Apenas romaneios pendentes podem ser aprovados'
        }
      }

      // Verificação especial para romaneios de devolução
      if (romaneio.tipo === 'devolucao') {
        const validacao = await devolucaoService.validarFinalizacaoDevolucao(romaneioId)
        if (!validacao.valido) {
          return {
            success: false,
            message: validacao.motivo || 'Romaneio de devolução não pode ser finalizado'
          }
        }
      }

      const isRetirada = romaneio.tipo === 'retirada'
      const isDevolucao = romaneio.tipo === 'devolucao'
      const isTransferencia = romaneio.tipo === 'transferencia'

      // Para retiradas, validar estoque antes de processar
      if (isRetirada) {
        const validacao = await this.validarItensRomaneio(
          romaneio.romaneios_itens.map(item => ({
            material_equipamento_id: item.material_equipamento_id,
            quantidade: item.quantidade,
            nome: item.materiais_equipamentos?.nome
          }))
        )

        if (!validacao.valid) {
          return {
            success: false,
            message: validacao.message || 'Estoque insuficiente'
          }
        }
      }

      // Processar cada item
      for (const item of romaneio.romaneios_itens) {
        const quantidade = isRetirada ? -item.quantidade : item.quantidade // Retirada: negativo, Devolução: positivo
        const motivo = isRetirada 
          ? `Retirada - Romaneio ${romaneio.numero}`
          : isDevolucao
          ? `Devolução - Romaneio ${romaneio.numero}`
          : `Transferência - Romaneio ${romaneio.numero}`

        const sucesso = await this.processarMovimentacao({
          material_equipamento_id: item.material_equipamento_id,
          quantidade,
          motivo,
          romaneio_id: romaneioId,
          observacoes: `Aprovação automática do romaneio ${romaneio.numero}`,
          usuario_id: usuarioId
        })

        if (!sucesso) {
          return {
            success: false,
            message: `Erro ao processar movimentação do item: ${item.materiais_equipamentos?.nome}`
          }
        }

        // Para retiradas e transferências, atualizar centro de custo do item
        if (isRetirada && romaneio.centro_custo_destino_id) {
          const { error: updateCentroCustoError } = await supabase
            .from('materiais_equipamentos')
            .update({ centro_custo_id: romaneio.centro_custo_destino_id })
            .eq('id', item.material_equipamento_id)

          if (updateCentroCustoError) {
            console.error('Erro ao atualizar centro de custo do item:', updateCentroCustoError)
            return {
              success: false,
              message: `Erro ao transferir item ${item.materiais_equipamentos?.nome} para novo centro de custo`
            }
          }
        }

        // Para transferências entre centros de custo
        if (isTransferencia && romaneio.centro_custo_destino_id) {
          const { error: updateCentroCustoError } = await supabase
            .from('materiais_equipamentos')
            .update({ centro_custo_id: romaneio.centro_custo_destino_id })
            .eq('id', item.material_equipamento_id)

          if (updateCentroCustoError) {
            console.error('Erro ao atualizar centro de custo do item:', updateCentroCustoError)
            return {
              success: false,
              message: `Erro ao transferir item ${item.materiais_equipamentos?.nome} para novo centro de custo`
            }
          }
        }

        // Para devoluções, atualizar para centro de custo de destino da devolução
        if (isDevolucao && romaneio.centro_custo_destino_id) {
          const { error: updateCentroCustoError } = await supabase
            .from('materiais_equipamentos')
            .update({ centro_custo_id: romaneio.centro_custo_destino_id })
            .eq('id', item.material_equipamento_id)

          if (updateCentroCustoError) {
            console.error('Erro ao atualizar centro de custo do item:', updateCentroCustoError)
            return {
              success: false,
              message: `Erro ao devolver item ${item.materiais_equipamentos?.nome} para centro de custo de destino`
            }
          }
        }
      }

      // Atualizar status do romaneio
      const { error: updateError } = await supabase
        .from('romaneios')
        .update({ 
          status: 'aprovado'
        })
        .eq('id', romaneioId)

      if (updateError) {
        return {
          success: false,
          message: 'Erro ao atualizar status do romaneio'
        }
      }

      return {
        success: true,
        message: `Romaneio ${romaneio.numero} aprovado e estoque atualizado com sucesso`
      }

    } catch (error) {
      console.error('Erro ao processar aprovação do romaneio:', error)
      return {
        success: false,
        message: 'Erro interno ao processar aprovação'
      }
    }
  }

  // Consultar histórico de movimentações
  async consultarHistoricoMovimentacao(materialId?: string, romaneioId?: string) {
    try {
      let query = supabase
        .from('movimentacao_estoque')
        .select(`
          *,
          materiais_equipamentos (nome, codigo),
          romaneios (numero),
          usuarios (nome)
        `)
        .order('created_at', { ascending: false })

      if (materialId) {
        query = query.eq('material_equipamento_id', materialId)
      }

      if (romaneioId) {
        query = query.eq('romaneio_id', romaneioId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Erro ao consultar histórico:', error)
      return []
    }
  }
}

export const estoqueService = new EstoqueService()