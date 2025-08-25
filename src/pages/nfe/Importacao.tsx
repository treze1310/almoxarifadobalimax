import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadCloud, FileText, History } from 'lucide-react'
import { NFe, NFeItem, UploadedNFeFile } from '@/types'
import { NfPreviewTable } from '@/components/nfe/NfPreviewTable'
import { NfImportDialog } from '@/components/nfe/NfImportDialog'
import { NfImportResult } from '@/components/nfe/NfImportResult'
import { useNFeImport } from '@/hooks/useNFeImport'
import { Link } from 'react-router-dom'

type ImportStage = 'upload' | 'preview' | 'result'

// Função para extrair texto de um elemento XML
const getXMLText = (element: Element | null, defaultValue: string = ''): string => {
  return element?.textContent?.trim() || defaultValue
}

// Função para extrair número de um elemento XML
const getXMLNumber = (element: Element | null, defaultValue: number = 0): number => {
  const text = getXMLText(element)
  return text ? parseFloat(text) : defaultValue
}

// Função para converter data ISO para Date
const parseXMLDate = (dateString: string): Date => {
  try {
    return new Date(dateString)
  } catch {
    return new Date()
  }
}

// Função completa para fazer parsing do XML da NFe
const parseAndValidateNFe = (file: File): Promise<Partial<UploadedNFeFile>> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const xmlContent = e.target?.result as string
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

        // Verificar se há erros de parsing
        const parseError = xmlDoc.querySelector('parsererror')
        if (parseError) {
          resolve({
            status: 'error',
            message: `Erro ao fazer parsing do arquivo ${file.name}: XML inválido`,
          })
          return
        }

        // Buscar elementos principais
        const infNFe = xmlDoc.querySelector('infNFe')
        const ide = xmlDoc.querySelector('ide')
        const emit = xmlDoc.querySelector('emit')
        const dest = xmlDoc.querySelector('dest')
        const entrega = xmlDoc.querySelector('entrega')
        const total = xmlDoc.querySelector('total ICMSTot')
        const transp = xmlDoc.querySelector('transp')
        const pag = xmlDoc.querySelector('pag')
        const infAdic = xmlDoc.querySelector('infAdic')
        const protNFe = xmlDoc.querySelector('protNFe')

        if (!infNFe || !ide || !emit || !dest) {
          resolve({
            status: 'error',
            message: `Arquivo ${file.name} não contém uma estrutura NFe válida`,
          })
          return
        }

        // Extrair chave de acesso
        const chaveAcesso = infNFe.getAttribute('Id')?.replace('NFe', '') || ''

        // Extrair dados de identificação
        const identification: NFeIdentification = {
          uf: getXMLText(ide.querySelector('cUF')),
          nf: getXMLText(ide.querySelector('cNF')),
          natOp: getXMLText(ide.querySelector('natOp')),
          model: getXMLText(ide.querySelector('mod')),
          series: getXMLText(ide.querySelector('serie')),
          number: getXMLText(ide.querySelector('nNF')),
          dhEmi: getXMLText(ide.querySelector('dhEmi')),
          dhSaiEnt: getXMLText(ide.querySelector('dhSaiEnt')),
          tpNF: getXMLText(ide.querySelector('tpNF')),
          idDest: getXMLText(ide.querySelector('idDest')),
          cMunFG: getXMLText(ide.querySelector('cMunFG')),
          tpImp: getXMLText(ide.querySelector('tpImp')),
          tpEmis: getXMLText(ide.querySelector('tpEmis')),
          cdv: getXMLText(ide.querySelector('cDV')),
          tpAmb: getXMLText(ide.querySelector('tpAmb')),
          finNFe: getXMLText(ide.querySelector('finNFe')),
          indFinal: getXMLText(ide.querySelector('indFinal')),
          indPres: getXMLText(ide.querySelector('indPres')),
          procEmi: getXMLText(ide.querySelector('procEmi')),
          verProc: getXMLText(ide.querySelector('verProc')),
          refNFe: getXMLText(ide.querySelector('NFref refNFe'))
        }

        // Extrair dados do emitente
        const enderEmit = emit.querySelector('enderEmit')
        const emitter: NFeEmitter = {
          cnpj: getXMLText(emit.querySelector('CNPJ')),
          name: getXMLText(emit.querySelector('xNome')),
          fantasyName: getXMLText(emit.querySelector('xFant')),
          ie: getXMLText(emit.querySelector('IE')),
          crt: getXMLText(emit.querySelector('CRT')),
          address: {
            street: getXMLText(enderEmit?.querySelector('xLgr')),
            number: getXMLText(enderEmit?.querySelector('nro')),
            neighborhood: getXMLText(enderEmit?.querySelector('xBairro')),
            city: getXMLText(enderEmit?.querySelector('xMun')),
            cityCode: getXMLText(enderEmit?.querySelector('cMun')),
            state: getXMLText(enderEmit?.querySelector('UF')),
            zipCode: getXMLText(enderEmit?.querySelector('CEP')),
            country: getXMLText(enderEmit?.querySelector('xPais')),
            countryCode: getXMLText(enderEmit?.querySelector('cPais')),
            phone: getXMLText(enderEmit?.querySelector('fone'))
          }
        }

        // Extrair dados do destinatário
        const enderDest = dest.querySelector('enderDest')
        const recipient: NFeRecipient = {
          cnpj: getXMLText(dest.querySelector('CNPJ')),
          cpf: getXMLText(dest.querySelector('CPF')),
          name: getXMLText(dest.querySelector('xNome')),
          ie: getXMLText(dest.querySelector('IE')),
          indIEDest: getXMLText(dest.querySelector('indIEDest')),
          email: getXMLText(dest.querySelector('email')),
          address: {
            street: getXMLText(enderDest?.querySelector('xLgr')),
            number: getXMLText(enderDest?.querySelector('nro')),
            complement: getXMLText(enderDest?.querySelector('xCpl')),
            neighborhood: getXMLText(enderDest?.querySelector('xBairro')),
            city: getXMLText(enderDest?.querySelector('xMun')),
            cityCode: getXMLText(enderDest?.querySelector('cMun')),
            state: getXMLText(enderDest?.querySelector('UF')),
            zipCode: getXMLText(enderDest?.querySelector('CEP')),
            country: getXMLText(enderDest?.querySelector('xPais')),
            countryCode: getXMLText(enderDest?.querySelector('cPais')),
            phone: getXMLText(enderDest?.querySelector('fone'))
          }
        }

        // Extrair dados de entrega (opcional)
        let delivery: NFeDelivery | undefined
        if (entrega) {
          delivery = {
            cnpj: getXMLText(entrega.querySelector('CNPJ')),
            cpf: getXMLText(entrega.querySelector('CPF')),
            name: getXMLText(entrega.querySelector('xNome')),
            address: {
              street: getXMLText(entrega.querySelector('xLgr')),
              number: getXMLText(entrega.querySelector('nro')),
              complement: getXMLText(entrega.querySelector('xCpl')),
              neighborhood: getXMLText(entrega.querySelector('xBairro')),
              city: getXMLText(entrega.querySelector('xMun')),
              cityCode: getXMLText(entrega.querySelector('cMun')),
              state: getXMLText(entrega.querySelector('UF')),
              zipCode: getXMLText(entrega.querySelector('CEP')),
              country: getXMLText(entrega.querySelector('xPais')),
              countryCode: getXMLText(entrega.querySelector('cPais'))
            }
          }
        }

        // Extrair totais
        const totals: NFeTotal = {
          vBC: getXMLNumber(total?.querySelector('vBC')),
          vICMS: getXMLNumber(total?.querySelector('vICMS')),
          vICMSDeson: getXMLNumber(total?.querySelector('vICMSDeson')),
          vFCP: getXMLNumber(total?.querySelector('vFCP')),
          vBCST: getXMLNumber(total?.querySelector('vBCST')),
          vST: getXMLNumber(total?.querySelector('vST')),
          vFCPST: getXMLNumber(total?.querySelector('vFCPST')),
          vFCPSTRet: getXMLNumber(total?.querySelector('vFCPSTRet')),
          vProd: getXMLNumber(total?.querySelector('vProd')),
          vFrete: getXMLNumber(total?.querySelector('vFrete')),
          vSeg: getXMLNumber(total?.querySelector('vSeg')),
          vDesc: getXMLNumber(total?.querySelector('vDesc')),
          vII: getXMLNumber(total?.querySelector('vII')),
          vIPI: getXMLNumber(total?.querySelector('vIPI')),
          vIPIDevol: getXMLNumber(total?.querySelector('vIPIDevol')),
          vPIS: getXMLNumber(total?.querySelector('vPIS')),
          vCOFINS: getXMLNumber(total?.querySelector('vCOFINS')),
          vOutro: getXMLNumber(total?.querySelector('vOutro')),
          vNF: getXMLNumber(total?.querySelector('vNF')),
          vTotTrib: getXMLNumber(total?.querySelector('vTotTrib'))
        }

        // Extrair itens/produtos
        const detElements = xmlDoc.querySelectorAll('det')
        const items: NFeItem[] = Array.from(detElements).map(det => {
          const prod = det.querySelector('prod')
          const imposto = det.querySelector('imposto')
          
          return {
            code: getXMLText(prod?.querySelector('cProd')),
            description: getXMLText(prod?.querySelector('xProd')),
            ncm: getXMLText(prod?.querySelector('NCM')),
            cfop: getXMLText(prod?.querySelector('CFOP')),
            ean: getXMLText(prod?.querySelector('cEAN')),
            eanTrib: getXMLText(prod?.querySelector('cEANTrib')),
            unit: getXMLText(prod?.querySelector('uCom')),
            unitTrib: getXMLText(prod?.querySelector('uTrib')),
            quantity: getXMLNumber(prod?.querySelector('qCom')),
            quantityTrib: getXMLNumber(prod?.querySelector('qTrib')),
            unitValue: getXMLNumber(prod?.querySelector('vUnCom')),
            unitValueTrib: getXMLNumber(prod?.querySelector('vUnTrib')),
            totalValue: getXMLNumber(prod?.querySelector('vProd')),
            orderNumber: getXMLText(prod?.querySelector('xPed')),
            itemOrder: getXMLNumber(prod?.querySelector('nItemPed')),
            cest: getXMLText(prod?.querySelector('CEST')),
            indEscala: getXMLText(prod?.querySelector('indEscala')),
            indTot: getXMLText(prod?.querySelector('indTot')),
            totalTrib: getXMLNumber(imposto?.querySelector('vTotTrib'))
          }
        })

        // Extrair transporte (opcional)
        let transport: NFeTransport | undefined
        if (transp) {
          const vol = transp.querySelector('vol')
          transport = {
            modFrete: getXMLText(transp.querySelector('modFrete')),
            volumes: vol ? {
              qVol: getXMLNumber(vol.querySelector('qVol')),
              nVol: getXMLText(vol.querySelector('nVol')),
              pesoL: getXMLNumber(vol.querySelector('pesoL')),
              pesoB: getXMLNumber(vol.querySelector('pesoB'))
            } : undefined
          }
        }

        // Extrair pagamento (opcional)
        let payment: NFePayment | undefined
        if (pag) {
          const detPagElements = pag.querySelectorAll('detPag')
          payment = {
            payments: Array.from(detPagElements).map(detPag => ({
              indPag: getXMLText(detPag.querySelector('indPag')),
              tPag: getXMLText(detPag.querySelector('tPag')),
              vPag: getXMLNumber(detPag.querySelector('vPag'))
            }))
          }
        }

        // Extrair informações adicionais (opcional)
        let additionalInfo: NFeAdditionalInfo | undefined
        if (infAdic) {
          additionalInfo = {
            infAdFisco: getXMLText(infAdic.querySelector('infAdFisco')),
            infCpl: getXMLText(infAdic.querySelector('infCpl'))
          }
        }

        // Extrair autorização (opcional)
        let authorization
        if (protNFe) {
          const infProt = protNFe.querySelector('infProt')
          authorization = {
            protocol: getXMLText(infProt?.querySelector('nProt')),
            authDate: parseXMLDate(getXMLText(infProt?.querySelector('dhRecbto'))),
            status: getXMLText(infProt?.querySelector('cStat')),
            reason: getXMLText(infProt?.querySelector('xMotivo'))
          }
        }

        // Montar objeto NFe completo
        const nfeData: NFe = {
          key: chaveAcesso,
          number: identification.number,
          series: identification.series,
          identification,
          emitter,
          recipient,
          delivery,
          issueDate: parseXMLDate(identification.dhEmi),
          exitDate: identification.dhSaiEnt ? parseXMLDate(identification.dhSaiEnt) : undefined,
          totalValue: totals.vNF,
          totals,
          items,
          transport,
          payment,
          additionalInfo,
          authorization
        }

        // Validações básicas
        if (!emitter.cnpj) {
          resolve({
            status: 'error',
            message: `CNPJ do emissor não encontrado no arquivo ${file.name}`,
          })
          return
        }

        if (items.length === 0) {
          resolve({
            status: 'error',
            message: `Nenhum item encontrado no arquivo ${file.name}`,
          })
          return
        }

        // Verificar se há produtos sem NCM
        const itemsSemNcm = items.filter(item => !item.ncm)
        if (itemsSemNcm.length > 0) {
          resolve({
            status: 'warning',
            data: nfeData,
            message: `${itemsSemNcm.length} produto(s) sem código NCM foram encontrados`,
          })
          return
        }

        resolve({ status: 'success', data: nfeData })

      } catch (error) {
        console.error('Erro ao processar XML:', error)
        resolve({
          status: 'error',
          message: `Erro ao processar arquivo ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        })
      }
    }

    reader.onerror = () => {
      resolve({
        status: 'error',
        message: `Erro ao ler arquivo ${file.name}`,
      })
    }

    reader.readAsText(file, 'UTF-8')
  })
}

const ImportacaoNFePage = () => {
  const [files, setFiles] = useState<UploadedNFeFile[]>([])
  const [stage, setStage] = useState<ImportStage>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importResult, setImportResult] = useState({
    successCount: 0,
    errorCount: 0,
    totalFiles: 0,
  })
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({})
  
  const { loading: importLoading, importNFe } = useNFeImport()

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    const newFiles = Array.from(selectedFiles)
      .filter((file) => file.type === 'text/xml' || file.name.endsWith('.xml'))
      .map(
        (file): UploadedNFeFile => ({
          id: `${file.name}-${file.lastModified}`,
          file,
          status: 'pending',
          progress: 0,
        }),
      )

    setFiles((prev) => [...prev, ...newFiles])
    setStage('preview')
    newFiles.forEach(processFile)
  }

  const processFile = async (fileToProcess: UploadedNFeFile) => {
    const updateFileState = (update: Partial<UploadedNFeFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileToProcess.id ? { ...f, ...update } : f)),
      )
    }
    
    updateFileState({ status: 'parsing' })
    const result = await parseAndValidateNFe(fileToProcess.file)
    updateFileState({ ...result, progress: 100 })
    
    // Auto-selecionar todos os itens por padrão quando o parsing for bem-sucedido
    if (result.status === 'success' && result.data && result.data.items.length > 0) {
      const itemCodes = result.data.items.map(item => item.code)
      console.log(`🔄 Auto-selecionando ${itemCodes.length} itens para o arquivo ${fileToProcess.id}`)
      console.log('📋 Códigos dos itens:', itemCodes)
      
      // Atualizar o estado imediatamente após o processamento
      setSelectedItems(prev => {
        const updated = {
          ...prev,
          [fileToProcess.id]: itemCodes
        }
        console.log('📊 Estado de seleção atualizado:', updated)
        return updated
      })
      
      // Também forçar uma segunda atualização para garantir
      setTimeout(() => {
        setSelectedItems(prev => {
          if (!prev[fileToProcess.id] || prev[fileToProcess.id].length !== itemCodes.length) {
            console.log('🔄 Forçando segunda atualização de seleção')
            return {
              ...prev,
              [fileToProcess.id]: itemCodes
            }
          }
          return prev
        })
      }, 300)
    }
  }

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    // Remover seleções do arquivo removido
    setSelectedItems(prev => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  const handleItemSelectionChange = (fileId: string, itemCode: string, selected: boolean) => {
    console.log(`🔀 Alterando seleção: Arquivo ${fileId}, Item ${itemCode}, Selecionado: ${selected}`)
    
    setSelectedItems(prev => {
      const fileItems = prev[fileId] || []
      console.log(`📝 Itens atuais do arquivo: ${fileItems.length} itens`)
      
      let updated
      if (selected) {
        // Adicionar item se não estiver selecionado
        if (!fileItems.includes(itemCode)) {
          updated = {
            ...prev,
            [fileId]: [...fileItems, itemCode]
          }
          console.log(`➕ Item ${itemCode} adicionado. Total: ${updated[fileId].length}`)
        } else {
          updated = prev
          console.log(`⚠️ Item ${itemCode} já estava selecionado`)
        }
      } else {
        // Remover item
        updated = {
          ...prev,
          [fileId]: fileItems.filter(code => code !== itemCode)
        }
        console.log(`➖ Item ${itemCode} removido. Total: ${updated[fileId].length}`)
      }
      
      return updated
    })
  }

  const importCounts = useMemo(() => {
    const counts = files.reduce(
      (acc, file) => {
        if (file.status === 'success') acc.success++
        if (file.status === 'warning') acc.warning++
        if (file.status === 'error') acc.error++
        return acc
      },
      { success: 0, warning: 0, error: 0, selectedItems: 0 },
    )
    
    // Contar itens selecionados
    const totalSelectedItems = Object.values(selectedItems).reduce((total, items) => total + items.length, 0)
    counts.selectedItems = totalSelectedItems
    
    // console.log(`📊 Recalculando contadores:`)
    // console.log(`   - Arquivos com sucesso: ${counts.success}`)
    // console.log(`   - Items selecionados: ${totalSelectedItems}`)
    // console.log(`   - Estado selectedItems:`, selectedItems)
    
    return counts
  }, [files, selectedItems])

  const handleImport = async () => {
    const filesToImport = files.filter(f => f.status === 'success' || f.status === 'warning')

    if (filesToImport.length === 0) {
      return
    }

    setDialogOpen(false)
    
    try {
      // Filtrar apenas itens selecionados para cada NFe
      const nfeDataArray = filesToImport
        .map(f => {
          if (!f.data) return undefined
          
          const selectedItemsForFile = selectedItems[f.id] || []
          if (selectedItemsForFile.length === 0) return undefined
          
          // Filtrar apenas os itens selecionados
          const filteredItems = f.data.items.filter(item => 
            selectedItemsForFile.includes(item.code)
          )
          
          return {
            ...f.data,
            items: filteredItems
          }
        })
        .filter(data => data !== undefined) as NFe[]
      
      const fileNames = filesToImport.map(f => f.file.name)
      
      console.log(`🔄 Importando ${nfeDataArray.length} NFe(s) com itens selecionados`)
      
      const results = await importNFe(nfeDataArray, fileNames)
      
      const result = {
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length,
        totalFiles: results.length,
        results: results // Adicionar resultados detalhados
      }
      
      setImportResult(result)
      setStage('result')
    } catch (error) {
      console.error('Erro na importação:', error)
      setImportResult({
        successCount: 0,
        errorCount: filesToImport.length,
        totalFiles: filesToImport.length,
      })
      setStage('result')
    }
  }

  const handleStartNewImport = () => {
    setFiles([])
    setSelectedItems({})
    setStage('upload')
  }

  if (stage === 'result') {
    return (
      <NfImportResult
        result={importResult}
        onStartNewImport={handleStartNewImport}
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Importação de NF-e</h1>
          <Button variant="outline" asChild>
            <Link to="/nfe/historico">
              <History className="mr-2 h-4 w-4" />
              Ver Histórico
            </Link>
          </Button>
        </div>
        <Card
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFileChange(e.dataTransfer.files)
          }}
          className={isDragging ? 'border-primary' : ''}
        >
          <CardHeader>
            <CardTitle>Upload de Arquivos XML</CardTitle>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="file-upload"
              className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors block"
            >
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                Arraste e solte os arquivos XML aqui ou{' '}
                <span className="text-primary font-semibold">
                  clique para selecionar
                </span>
              </p>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                multiple
                accept=".xml"
                onChange={(e) => handleFileChange(e.target.files)}
              />
            </label>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização da Importação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center p-4 border-b text-sm font-semibold text-muted-foreground">
                <div className="flex-1">Arquivo</div>
                <div className="w-1/4">Status</div>
                <div className="w-1/4">Nº NF-e</div>
                <div className="w-1/4 text-right">Valor Total</div>
              </div>
              {files.length > 0 ? (
                <NfPreviewTable 
                  files={files} 
                  onRemoveFile={handleRemoveFile}
                  selectedItems={selectedItems}
                  onItemSelectionChange={handleItemSelectionChange}
                />
              ) : (
                <div className="text-center p-10 text-muted-foreground">
                  <FileText className="mx-auto h-10 w-10 mb-4" />
                  Nenhum arquivo para pré-visualizar.
                </div>
              )}
              <div className="pt-6 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  📦 <strong>{importCounts.selectedItems}</strong> itens selecionados para importação
                </div>
                <Button
                  onClick={() => setDialogOpen(true)}
                  disabled={importCounts.selectedItems === 0}
                >
                  Importar {importCounts.selectedItems} Item(s)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <NfImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleImport}
        importCounts={importCounts}
        loading={importLoading}
      />
    </>
  )
}

export default ImportacaoNFePage
