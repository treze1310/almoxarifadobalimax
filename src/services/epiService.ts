import { supabase } from '@/lib/supabase'
import { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type EPIAtribuicao = Tables<'epi_atribuicoes'>
export type EPIAtribuicaoInsert = TablesInsert<'epi_atribuicoes'>
export type EPIAtribuicaoUpdate = TablesUpdate<'epi_atribuicoes'>

export type EPIComAtribuicao = Tables<'epi_com_atribuicoes'>

export interface EPIFicha {
  colaborador: {
    nome: string
    matricula: string | null
    cargo: string | null
    setor: string | null
    cpf: string | null
  }
  empresa: {
    nome: string
    cnpj: string | null
    logo_url: string | null
  }
  epi: {
    nome: string
    codigo: string
    numero_ca: string | null
    marca?: string
  }
  atribuicao: {
    data_atribuicao: string
    data_vencimento: string | null
    quantidade_atribuida: number
    observacoes: string | null
    atribuido_por_nome: string | null
  }
}

export const epiService = {
  async getEPIsByColaborador(colaboradorId: string): Promise<EPIComAtribuicao[]> {
    const { data, error } = await supabase
      .from('epi_com_atribuicoes')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('status_atribuicao', 'ativo')

    if (error) throw error
    return data || []
  },

  async getAllEPIsAtribuidos(): Promise<EPIComAtribuicao[]> {
    const { data, error } = await supabase
      .from('epi_com_atribuicoes')
      .select('*')
      .not('colaborador_id', 'is', null)
      .order('data_atribuicao', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getEPIsVencendoBreve(diasAntecedencia = 30): Promise<EPIComAtribuicao[]> {
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() + diasAntecedencia)

    const { data, error } = await supabase
      .from('epi_com_atribuicoes')
      .select('*')
      .eq('status_atribuicao', 'ativo')
      .not('data_vencimento', 'is', null)
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])

    if (error) throw error
    return data || []
  },

  async atribuirEPI(atribuicao: EPIAtribuicaoInsert): Promise<EPIAtribuicao> {
    const { data, error } = await supabase
      .from('epi_atribuicoes')
      .insert([atribuicao])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async atualizarAtribuicao(id: string, updates: EPIAtribuicaoUpdate): Promise<EPIAtribuicao> {
    const { data, error } = await supabase
      .from('epi_atribuicoes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async devolverEPI(atribuicaoId: string, observacoes?: string): Promise<EPIAtribuicao> {
    const { data, error } = await supabase
      .from('epi_atribuicoes')
      .update({ 
        status: 'devolvido', 
        observacoes: observacoes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', atribuicaoId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async substituirEPI(atribuicaoAntigaId: string, novaAtribuicao: EPIAtribuicaoInsert): Promise<{ antiga: EPIAtribuicao, nova: EPIAtribuicao }> {
    // Marcar a atribuição antiga como substituída
    const { data: antiga, error: erroAntiga } = await supabase
      .from('epi_atribuicoes')
      .update({ 
        status: 'substituido',
        updated_at: new Date().toISOString()
      })
      .eq('id', atribuicaoAntigaId)
      .select()
      .single()

    if (erroAntiga) throw erroAntiga

    // Criar nova atribuição
    const { data: nova, error: erroNova } = await supabase
      .from('epi_atribuicoes')
      .insert([{ ...novaAtribuicao, status: 'ativo' }])
      .select()
      .single()

    if (erroNova) throw erroNova

    return { antiga, nova }
  },

  async getFichaEPI(atribuicaoId: string): Promise<EPIFicha> {
    const { data, error } = await supabase
      .from('epi_com_atribuicoes')
      .select(`
        *,
        colaboradores!inner(nome, matricula, cargo, setor, cpf, empresa_id),
        empresas!inner(nome, cnpj, logo_url),
        marcas(nome)
      `)
      .eq('atribuicao_id', atribuicaoId)
      .single()

    if (error) throw error

    return {
      colaborador: {
        nome: data.colaborador_nome || '',
        matricula: data.colaborador_matricula,
        cargo: data.colaborador_cargo,
        setor: data.colaborador_setor,
        cpf: data.colaboradores?.cpf || null
      },
      empresa: {
        nome: data.empresas?.nome || '',
        cnpj: data.empresas?.cnpj,
        logo_url: data.empresas?.logo_url
      },
      epi: {
        nome: data.nome || '',
        codigo: data.codigo || '',
        numero_ca: data.numero_ca,
        marca: data.marcas?.nome
      },
      atribuicao: {
        data_atribuicao: data.data_atribuicao || '',
        data_vencimento: data.data_vencimento,
        quantidade_atribuida: data.quantidade_atribuida || 1,
        observacoes: data.observacoes_atribuicao,
        atribuido_por_nome: data.atribuido_por_nome
      }
    }
  },

  async getHistoricoEPIColaborador(colaboradorId: string): Promise<EPIAtribuicao[]> {
    const { data, error } = await supabase
      .from('epi_atribuicoes')
      .select(`
        *,
        materiais_equipamentos(nome, codigo, numero_ca),
        usuarios(nome)
      `)
      .eq('colaborador_id', colaboradorId)
      .order('data_atribuicao', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getEstatisticasEPI(): Promise<{
    total_epis: number
    epis_atribuidos: number
    epis_vencendo: number
    epis_vencidos: number
  }> {
    // Total de EPIs
    const { count: totalEpis } = await supabase
      .from('materiais_equipamentos')
      .select('*', { count: 'exact', head: true })
      .eq('is_epi', true)

    // EPIs atribuídos (ativos)
    const { count: episAtribuidos } = await supabase
      .from('epi_atribuicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')

    // EPIs vencendo (próximos 30 dias)
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() + 30)

    const { count: episVencendo } = await supabase
      .from('epi_atribuicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
      .not('data_vencimento', 'is', null)
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
      .gte('data_vencimento', new Date().toISOString().split('T')[0])

    // EPIs vencidos
    const { count: episVencidos } = await supabase
      .from('epi_atribuicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
      .not('data_vencimento', 'is', null)
      .lt('data_vencimento', new Date().toISOString().split('T')[0])

    return {
      total_epis: totalEpis || 0,
      epis_atribuidos: episAtribuidos || 0,
      epis_vencendo: episVencendo || 0,
      epis_vencidos: episVencidos || 0
    }
  }
}