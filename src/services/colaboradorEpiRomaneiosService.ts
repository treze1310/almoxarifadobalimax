import { supabase } from '@/lib/supabase'

export interface ColaboradorReferencia {
  id: string
  nome: string
  matricula?: string | null
}

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const isResponsavelTextForColaborador = (
  responsavel: string | null | undefined,
  colaborador: ColaboradorReferencia,
) => {
  const responsavelNormalizado = normalizeText(responsavel)
  const nomeNormalizado = normalizeText(colaborador.nome)
  const matriculaNormalizada = normalizeText(colaborador.matricula)

  if (!responsavelNormalizado || !nomeNormalizado) return false
  if (responsavelNormalizado === nomeNormalizado) return true

  if (matriculaNormalizada) {
    const nomeComMatricula = `${nomeNormalizado} (${matriculaNormalizada})`
    return (
      responsavelNormalizado === nomeComMatricula ||
      (responsavelNormalizado.includes(nomeNormalizado) &&
        responsavelNormalizado.includes(`(${matriculaNormalizada})`))
    )
  }

  return false
}

export const isRomaneioDoColaborador = (
  romaneio: {
    colaborador_id?: string | null
    responsavel_nome?: string | null
    responsavel_retirada?: string | null
  },
  colaborador: ColaboradorReferencia,
) => {
  if (romaneio.colaborador_id === colaborador.id) return true

  return (
    isResponsavelTextForColaborador(romaneio.responsavel_nome, colaborador) ||
    isResponsavelTextForColaborador(romaneio.responsavel_retirada, colaborador)
  )
}

const getColaboradorReferencia = async (colaboradorId: string) => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, matricula')
    .eq('id', colaboradorId)
    .single()

  if (error) throw error
  return data as ColaboradorReferencia
}

export const fetchRomaneiosRetiradaDoColaborador = async <
  T extends {
    colaborador_id?: string | null
    responsavel_nome?: string | null
    responsavel_retirada?: string | null
  },
>(
  colaboradorOrId: ColaboradorReferencia | string,
  select: string,
): Promise<{ data: T[]; error: null } | { data: null; error: unknown }> => {
  try {
    const colaborador =
      typeof colaboradorOrId === 'string'
        ? await getColaboradorReferencia(colaboradorOrId)
        : colaboradorOrId

    const { data, error } = await supabase
      .from('romaneios')
      .select(select)
      .eq('tipo', 'retirada')
      .order('data_romaneio', { ascending: false })

    if (error) throw error

    return {
      data: ((data || []) as T[]).filter((romaneio) =>
        isRomaneioDoColaborador(romaneio, colaborador),
      ),
      error: null,
    }
  } catch (error) {
    return { data: null, error }
  }
}
