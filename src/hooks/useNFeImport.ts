import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useMateriaisEquipamentos } from './useMateriaisEquipamentos'
import { CodeGenerationService } from '@/services/codeGenerationService'
import type { Tables, TablesInsert } from '@/types/database'
import type { NFe, NFeItem } from '@/types'

type NFeImportacao = Tables<'nfe_importacao'> & {
  fornecedores?: { nome: string; cnpj: string } | null
  nfe_itens?: Array<{
    id: string
    codigo_produto: string | null
    descricao_produto: string
    ncm: string | null
    unidade: string | null
    quantidade: number
    valor_unitario: number
    valor_total: number
    material_equipamento_id: string | null
  }>
}

type NFeProcessResult = {
  success: boolean
  nfeId?: string
  materialsCreated: number
  materialsLinked: number
  errors: string[]
  message: string
}

export function useNFeImport() {
  const [loading, setLoading] = useState(false)
  const [importHistory, setImportHistory] = useState<NFeImportacao[]>([])
  const { toast } = useToast()
  const { createMaterialFromNFe } = useMateriaisEquipamentos()

  // Buscar histórico de importações
  const fetchImportHistory = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('nfe_importacao')
        .select(`
          *,
          fornecedores:fornecedor_id (nome, cnpj),
          nfe_itens (
            id, codigo_produto, descricao_produto, ncm, unidade,
            quantidade, valor_unitario, valor_total, material_equipamento_id
          )
        `)
        .order('data_importacao', { ascending: false })

      if (error) throw error

      setImportHistory(data || [])
      return { data: data || [], error: null }
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico de importações',
        variant: 'destructive',
      })
      return { data: [], error }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Esta função agora é redundante pois o parsing é feito na página de importação
  // Mantida apenas para compatibilidade, mas não é mais usada
  const parseNFeXML = useCallback(async (file: File): Promise<NFe | null> => {
    console.warn('parseNFeXML deprecated: Use the parser in Importacao.tsx instead')
    return null
  }, [])

  // Importar e processar NFe com dados já parseados
  const importNFe = useCallback(async (nfeDataArray: NFe[], originalFileNames?: string[]): Promise<NFeProcessResult[]> => {
    setLoading(true)
    const results: NFeProcessResult[] = []

    try {
      for (let i = 0; i < nfeDataArray.length; i++) {
        const nfeData = nfeDataArray[i]
        const fileName = originalFileNames?.[i] || `NFe-${nfeData.number}`
        
        const result: NFeProcessResult = {
          success: false,
          materialsCreated: 0,
          materialsLinked: 0,
          errors: [],
          message: `Processando ${fileName}...`
        }

        try {

          // 2. Verificar se NFe já foi importada
          const { data: existingNfe } = await supabase
            .from('nfe_importacao')
            .select('id')
            .eq('chave_nfe', nfeData.key)
            .single()

          if (existingNfe) {
            result.errors.push('NFe já foi importada anteriormente')
            result.message = `${fileName}: NFe já importada`
            results.push(result)
            continue
          }

          // 3. Buscar ou criar fornecedor com dados completos
          let fornecedorId: string | null = null
          if (nfeData.emitter.cnpj) {
            const { data: fornecedor } = await supabase
              .from('fornecedores')
              .select('id')
              .eq('cnpj', nfeData.emitter.cnpj)
              .single()

            if (!fornecedor) {
              // Criar fornecedor automaticamente (apenas campos existentes na tabela)
              const endereco = `${nfeData.emitter.address.street}, ${nfeData.emitter.address.number} - ${nfeData.emitter.address.neighborhood}, ${nfeData.emitter.address.city}/${nfeData.emitter.address.state} - CEP: ${nfeData.emitter.address.zipCode}`.trim()
              
              const { data: newFornecedor, error: fornecedorError } = await supabase
                .from('fornecedores')
                .insert({
                  nome: nfeData.emitter.name,
                  cnpj: nfeData.emitter.cnpj,
                  endereco: endereco,
                  telefone: nfeData.emitter.address.phone,
                  ativo: true
                })
                .select('id')
                .single()

              if (fornecedorError) {
                console.error('Erro ao criar fornecedor:', fornecedorError)
              } else {
                fornecedorId = newFornecedor.id
              }
            } else {
              fornecedorId = fornecedor.id
            }
          }

          // 4. Criar registro da NFe (apenas campos existentes na tabela)
          const nfeImportData: TablesInsert<'nfe_importacao'> = {
            numero_nfe: nfeData.number,
            serie_nfe: nfeData.series,
            chave_nfe: nfeData.key,
            fornecedor_id: fornecedorId,
            data_emissao: nfeData.issueDate.toISOString().split('T')[0],
            valor_total: nfeData.totalValue,
            valor_produtos: nfeData.totals.vProd,
            valor_icms: nfeData.totals.vICMS || 0,
            valor_ipi: nfeData.totals.vIPI || 0,
            valor_pis: nfeData.totals.vPIS || 0,
            valor_cofins: nfeData.totals.vCOFINS || 0,
            status: 'importado'
          }

          const { data: nfeImport, error: nfeError } = await supabase
            .from('nfe_importacao')
            .insert(nfeImportData)
            .select('id')
            .single()

          if (nfeError) throw nfeError

          result.nfeId = nfeImport.id

          // 5. Gerar códigos sequenciais para os itens que serão criados
          const itemsToCreate: typeof nfeData.items = []
          const itemsToLink: Array<{ item: typeof nfeData.items[0], materialId: string }> = []
          
          for (const item of nfeData.items) {
            // Verificar se material já existe pelo código original da NFe
            const { data: existingMaterial } = await supabase
              .from('materiais_equipamentos')
              .select('id')
              .eq('codigo', item.code)
              .single()

            if (existingMaterial) {
              itemsToLink.push({ item, materialId: existingMaterial.id })
            } else {
              itemsToCreate.push(item)
            }
          }

          // Gerar códigos sequenciais para itens novos
          let sequentialCodes: string[] = []
          if (itemsToCreate.length > 0) {
            sequentialCodes = await CodeGenerationService.getMultipleSequentialCodes(itemsToCreate.length)
            console.log(`📋 Códigos gerados: ${sequentialCodes.join(', ')}`)
          }

          // 6. Criar materiais novos com códigos sequenciais
          for (let index = 0; index < itemsToCreate.length; index++) {
            const item = itemsToCreate[index]
            const newCode = sequentialCodes[index]
            
            try {
              const materialResult = await createMaterialFromNFe({
                codigo_produto: newCode, // ✅ Usar código sequencial gerado
                descricao_produto: item.description,
                ncm: item.ncm,
                cest: item.cest,
                codigo_ean: item.ean,
                unidade: item.unit || 'UN',
                valor_unitario: item.unitValue,
                quantidade: item.quantity,
                categoria: 'MATERIAL DE CONSUMO',
                fornecedor: nfeData.emitter.name,
                aplicacao: 'Diversos',
                data_emissao: nfeData.issueDate.toISOString().split('T')[0],
                codigo_original_nfe: item.code // ✅ Guardar código original da NFe
              })

              if (materialResult.data) {
                itemsToLink.push({ item, materialId: materialResult.data.id })
                result.materialsCreated++
              } else {
                result.errors.push(`Erro ao criar material ${item.code}: ${materialResult.error}`)
                continue
              }
            } catch (error) {
              result.errors.push(`Erro ao criar material ${item.code}: ${error}`)
              continue
            }
          }

          // 7. Processar itens (tanto novos quanto existentes)
          for (const { item, materialId } of itemsToLink) {
            try {
              result.materialsLinked++

              // Criar item da NFe (apenas campos existentes na tabela)
              const nfeItemData: TablesInsert<'nfe_itens'> = {
                nfe_id: nfeImport.id,
                codigo_produto: item.code,
                descricao_produto: item.description,
                ncm: item.ncm,
                cfop: item.cfop,
                unidade: item.unit,
                quantidade: item.quantity,
                valor_unitario: item.unitValue,
                valor_total: item.totalValue,
                material_equipamento_id: materialId
              }

              const { error: itemError } = await supabase
                .from('nfe_itens')
                .insert(nfeItemData)

              if (itemError) {
                result.errors.push(`Erro ao salvar item ${item.code}: ${itemError.message}`)
              }

            } catch (itemError: any) {
              result.errors.push(`Erro ao processar item ${item.code}: ${itemError.message}`)
            }
          }

          result.success = result.errors.length === 0
          result.message = result.success 
            ? `${fileName}: ${result.materialsCreated} materiais criados, ${result.materialsLinked} vinculados`
            : `${fileName}: Processado com ${result.errors.length} erro(s)`

        } catch (fileError: any) {
          result.errors.push(fileError.message)
          result.message = `${fileName}: Erro - ${fileError.message}`
        }

        results.push(result)
      }

      // Atualizar histórico
      await fetchImportHistory()

      // Mostrar toast com resumo
      const totalSuccess = results.filter(r => r.success).length
      const totalErrors = results.filter(r => !r.success).length
      const totalMaterialsCreated = results.reduce((sum, r) => sum + r.materialsCreated, 0)

      toast({
        title: 'Importação Concluída',
        description: `${totalSuccess} arquivo(s) processado(s), ${totalErrors} erro(s), ${totalMaterialsCreated} material(is) criado(s)`,
        variant: totalErrors > 0 ? 'destructive' : 'default'
      })

    } catch (error: any) {
      console.error('Erro geral na importação:', error)
      toast({
        title: 'Erro na Importação',
        description: error.message || 'Erro desconhecido durante a importação',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }

    return results
  }, [createMaterialFromNFe, fetchImportHistory, parseNFeXML, toast])

  return {
    loading,
    importHistory,
    fetchImportHistory,
    importNFe,
    parseNFeXML
  }
}