import { supabase } from '@/lib/supabase'
import { companyService, type CompanyWithLogo } from '@/services/companyService'

interface ColaboradorDetalhado {
  id: string
  nome: string
  cpf?: string | null
  matricula?: string | null
  cargo?: string | null
  setor?: string | null
  data_admissao?: string | null
  data_demissao?: string | null
  empresas?: { nome: string } | null
  centros_custo?: { codigo: string; descricao: string | null } | null
}

interface EPIVinculadoRomaneio {
  romaneio_id: string
  romaneio_numero: string
  romaneio_data: string
  item_id: string
  quantidade: number
  material_nome: string
  material_codigo: string
  numero_ca?: string | null
  data_devolucao?: string | null
  status: 'retirado' | 'devolvido' | 'parcialmente_devolvido'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

export const generateFichaEPIPDFContent = (
  colaborador: ColaboradorDetalhado, 
  episVinculados: EPIVinculadoRomaneio[], 
  company?: CompanyWithLogo | null,
  totalRows?: number
): string => {
  // Calcular número ideal de linhas se não fornecido
  const calculateOptimalRows = (episCount: number): number => {
    // Altura disponível estimada em mm (A4 landscape = 210mm altura)
    const pageHeight = 210
    const margins = 40 // margens superior e inferior (20px cada)
    const headerHeight = 50 // cabeçalho estimado
    const textHeight = 40 // texto do compromisso estimado
    const fieldsHeight = 25 // campos de dados do colaborador
    const signatureHeight = 35 // campos de assinatura
    const footerMargin = 20 // margem do rodapé
    
    const availableHeight = pageHeight - margins - headerHeight - textHeight - fieldsHeight - signatureHeight - footerMargin
    const rowHeight = 5.5 // altura estimada de cada linha da tabela
    const headerTableHeight = 8 // altura do cabeçalho da tabela
    
    const maxRows = Math.floor((availableHeight - headerTableHeight) / rowHeight)
    
    // Mínimo de 10 linhas, máximo baseado no espaço disponível
    const minRows = 10
    const optimalRows = Math.max(minRows, Math.min(maxRows, episCount + 3))
    
    return optimalRows
  }
  
  const finalTotalRows = totalRows || calculateOptimalRows(episVinculados.length)
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Termo de Compromisso - EPI - ${colaborador.nome}</title>
        <style>
          @page {
            margin: 15mm;
            size: A4 landscape;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
            font-size: 10px;
            line-height: 1.2;
            color: #000;
          }
          
                     .container {
             width: 100%;
             max-width: 267mm;
             margin: 20px auto;
             padding: 0 20px;
           }
          
                     .header {
             display: flex;
             align-items: center;
             margin-bottom: 30px;
             border: 2px solid #000;
             padding: 15px;
           }
          
                     .company-logo {
             width: 100px;
             height: 50px;
             border-radius: 25px;
             text-align: center;
             line-height: 50px;
             font-weight: bold;
             font-size: 12px;
             margin-right: 20px;
             flex-shrink: 0;
           }
          
          .header-content {
            flex: 1;
            text-align: center;
          }
          
          .company-info {
            margin-bottom: 8px;
          }
          
          .company-name {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 3px;
          }
          
          .title {
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin: 5px 0;
            border: 1px solid #000;
            padding: 4px;
            background: #f0f0f0;
          }
          
          .header-spacer {
            width: 70px;
            flex-shrink: 0;
          }
          
          .form-section {
            margin-bottom: 15px;
          }
          
          .form-row {
            display: flex;
            margin-bottom: 8px;
            align-items: center;
          }
          
          .form-label {
            font-weight: bold;
            margin-right: 5px;
            min-width: fit-content;
          }
          
          .form-field {
            border-bottom: 1px solid #000;
            flex: 1;
            padding: 2px 5px;
            margin-right: 15px;
          }
          
                     .commitment-text {
             margin: 20px 0;
             padding: 12px;
             border: 2px solid #000;
             font-size: 8px;
             line-height: 1.2;
           }
          
                     .epi-table {
             width: 100%;
             border-collapse: collapse;
             margin: 15px 0;
             border: 2px solid #000;
             page-break-inside: avoid;
           }
          
          .epi-table th {
            border: 1px solid #000;
            padding: 5px 3px;
            font-weight: bold;
            font-size: 8px;
            text-align: center;
            background: #f0f0f0;
          }
          
          .epi-table td {
            border: 1px solid #000;
            padding: 5px 3px;
            font-size: 8px;
            text-align: center;
            height: 20px;
            vertical-align: middle;
          }
          
          .epi-table td:nth-child(2) {
            text-align: left;
            padding-left: 5px;
          }
          
                     .signature-fields {
             margin-top: 20px;
             margin-bottom: 30px;
           }
           
           .signature-field-row {
             display: flex;
             align-items: center;
             margin-bottom: 8px;
           }
           
           .signature-label {
             font-weight: bold;
             font-size: 9px;
             margin-right: 10px;
             min-width: fit-content;
           }
           
           .signature-field-input {
             border-bottom: 1px solid #000;
             flex: 1;
             height: 20px;
             margin-right: 20px;
           }
           
           .signature-section {
             margin-top: 40px;
             margin-bottom: 20px;
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 40px;
           }
           
           .signature-box {
             text-align: center;
           }
           
           .signature-line {
             border-top: 1px solid #000;
             margin: 60px 0 5px 0;
           }
           
           .signature-title {
             font-size: 9px;
             font-weight: bold;
           }
           
           .date-section {
             margin-top: 20px;
             text-align: right;
           }
          
          
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header com Logo e Empresa -->
          <div class="header">
                         <div class="company-logo">
               ${company?.logo_url 
                 ? `<img src="${company.logo_url}" alt="Logo" style="width: 90px; height: 45px; border-radius: 25px;" />` 
                 : (company?.nome ? company.nome.split(' ').map(word => word[0]).join('').substring(0, 3).toUpperCase() : 'LOGO')
               }
             </div>
            <div class="header-content">
              <div class="company-info">
                <div class="company-name">${company?.nome || 'EMPRESA'}</div>
                ${company?.cnpj ? `<div>CNPJ: ${company.cnpj}</div>` : ''}
                ${company?.endereco ? `<div>${company.endereco}</div>` : ''}
              </div>
              <div class="title">TERMO DE COMPROMISSO</div>
            </div>
            <div class="header-spacer"></div>
          </div>

                     <!-- Dados do Colaborador -->
           <div class="form-section">
             <div class="form-row">
               <span class="form-label">NOME:</span>
               <span class="form-field">${colaborador.nome}</span>
             </div>
             
             <div class="form-row">
               <span class="form-label">DATA DE ADMISSÃO:</span>
               <span class="form-field" style="max-width: 150px;">${colaborador.data_admissao ? formatDate(colaborador.data_admissao) : ''}</span>
               <span class="form-label">DATA DE DEMISSÃO:</span>
               <span class="form-field" style="max-width: 150px;">${colaborador.data_demissao ? formatDate(colaborador.data_demissao) : ''}</span>
             </div>
             
             <div class="form-row">
               <span class="form-label">CPF:</span>
               <span class="form-field" style="max-width: 150px;">${colaborador.cpf || ''}</span>
               <span class="form-label">MATRÍCULA:</span>
               <span class="form-field" style="max-width: 100px;">${colaborador.matricula || ''}</span>
             </div>
             
             <div class="form-row">
               <span class="form-label">FUNÇÃO:</span>
               <span class="form-field" style="max-width: 200px;">${colaborador.cargo || ''}</span>
               <span class="form-label">SETOR:</span>
               <span class="form-field" style="max-width: 200px;">${colaborador.setor || ''}</span>
             </div>
           </div>

                     <!-- Texto do Compromisso -->
           <div class="commitment-text">
             <p style="text-align: justify; margin: 0; line-height: 1.1;">
               <strong>Declaro que recebi orientação sobre o uso correto de EPI, fornecido pela empresa e que estou ciente da legislação abaixo discriminada, comprometendo-me a cumpri-la.</strong>
               <br/>
               <strong>Portaria n° 3.214/78 da Lei 6.514/77 do Ministério do Trabalho e Emprego</strong>
               <br/>
               <strong>NR-01 - Item 1.8 - Cabe ao Empregado:</strong>
               <br/>
               <strong>A) Cumprir as Disposições e Regulamentares sobre Segurança e Medicina do Trabalho, Inclusive as Ordens de Serviço Expedidas Pelo Empregador;</strong>
               <br/>
               <strong>B) Usar o EPI Fornecido Pelo Empregador</strong>
               <br/>
               <strong>C) Usá-lo Para a Finalidade Que Se Destina;</strong>
               <br/>
               <strong>D) Responsabilizar-se Por Sua Guarda e Conservação;</strong>
               <br/>
               <strong>E) Comunicar ao empregador qualquer alteração que o torne impróprio para uso.</strong>
               <br/>
               <strong>Nr-01 - Subitem 1.8.1 - constitui ato faltoso e a recusa injustificada do empregado ao cumprimento do disposto do item anterior.</strong>
               <br/>
               <strong>CLT-Art. 462 -1° Em caso de dano causado pelo empregado, o desconto será lícito, desde que essa possibilidade tenha sido acordada, ou na ocorrência de dolo do empregado.</strong>
             </p>
           </div>

          

          <!-- Tabela de EPIs -->
          <table class="epi-table">
            <thead>
              <tr>
                <th style="width: 40px;">ITEM</th>
                <th style="width: 70px;">EPI'S</th>
                <th style="width: 200px;">DESCRIÇÃO</th>
                <th style="width: 120px;">NOME/TIPO/COR/TAMANHO</th>
                <th style="width: 50px;">QUANT.</th>
                <th style="width: 80px;">DATA ENTREGA</th>
                <th style="width: 80px;">DATA DEVOLUÇÃO</th>
                <th style="width: 120px;">ASSINATURA</th>
              </tr>
            </thead>
            <tbody>
              ${episVinculados.map((epi, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${epi.material_codigo}</td>
                  <td style="text-align: left;">${epi.material_nome}</td>
                  <td>${epi.numero_ca ? `CA: ${epi.numero_ca}` : ''}</td>
                  <td>${epi.quantidade}</td>
                  <td>${formatDate(epi.romaneio_data)}</td>
                  <td>${epi.data_devolucao ? formatDate(epi.data_devolucao) : ''}</td>
                  <td></td>
                </tr>
              `).join('')}
              
              ${Array.from({ length: Math.max(0, finalTotalRows - episVinculados.length) }, (_, i) => `
                <tr>
                  <td>${episVinculados.length + i + 1}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

                     <!-- Campos de Assinatura Abaixo dos EPIs -->
           <div class="signature-fields">
             <div class="signature-field-row">
               <span class="signature-label">DATA DE ENTREGA:</span>
               <span class="signature-field-input">${new Date().toLocaleDateString('pt-BR')}</span>
               <span class="signature-label" style="margin-left: 40px;">ASSINATURA DO FUNCIONÁRIO:</span>
               <span class="signature-field-input" style="flex: 2;"></span>
             </div>
             
             <div class="signature-field-row" style="margin-top: 15px;">
               <span class="signature-label">RESPONSÁVEL PELA ENTREGA:</span>
               <span class="signature-field-input" style="flex: 2;"></span>
             </div>
           </div>
 
           <!-- Assinaturas Finais -->
           <div class="signature-section">
             <div class="signature-box">
               <div class="signature-line"></div>
               <div class="signature-title">ASSINATURA DO EMPREGADO</div>
             </div>
             <div class="signature-box">
               <div class="signature-line"></div>
               <div class="signature-title">RESPONSÁVEL PELA ENTREGA</div>
             </div>
           </div>

        </div>
      </body>
    </html>
  `
}

export const generateFichaEPIPDF = async (colaboradorId: string) => {
  try {
    console.log('🚀 Iniciando geração de PDF para colaborador:', colaboradorId)
    
    // Importação dinâmica com fallback para commonjs
    const jsPDFModule = await import('jspdf')
    const html2canvasModule = await import('html2canvas')
    
    const jsPDF = jsPDFModule.default || jsPDFModule
    const html2canvas = html2canvasModule.default || html2canvasModule

    console.log('📦 Bibliotecas PDF carregadas')

    // Buscar todos os dados em paralelo com timeout para evitar perda de sessão
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout nas consultas do banco de dados')), 10000)
    )

    const [colaboradorResult, romaneiosResult, companyResult] = await Promise.race([
      Promise.all([
        supabase
          .from('colaboradores')
          .select(`
            *,
            empresas:empresa_id (nome),
            centros_custo:centro_custo_id (codigo, descricao)
          `)
          .eq('id', colaboradorId)
          .single(),
        
        supabase
          .from('romaneios')
          .select(`
            id,
            numero,
            data_romaneio,
            tipo,
            romaneios_itens (
              id,
              quantidade,
              data_devolucao,
              materiais_equipamentos:material_equipamento_id (
                id,
                codigo,
                nome,
                numero_ca,
                is_epi
              )
            )
          `)
          .eq('colaborador_id', colaboradorId)
          .eq('tipo', 'retirada')
          .order('data_romaneio', { ascending: false }),
        
        companyService.getActiveCompany().catch(error => {
          console.warn('⚠️ Erro ao buscar empresa, continuando sem:', error)
          return null
        })
      ]),
      timeoutPromise
    ]) as [any, any, any]

    console.log('📊 Dados carregados do banco')

    // Verificar erros nas consultas principais
    if (colaboradorResult.error) {
      console.error('❌ Erro ao buscar colaborador:', colaboradorResult.error)
      throw colaboradorResult.error
    }

    if (romaneiosResult.error) {
      console.error('❌ Erro ao buscar romaneios:', romaneiosResult.error)
      throw romaneiosResult.error
    }

    const colaborador = colaboradorResult.data
    const romaneiosData = romaneiosResult.data
    const company = companyResult

    // Formatar EPIs
    const episFormatados: EPIVinculadoRomaneio[] = []
    romaneiosData?.forEach(romaneio => {
      romaneio.romaneios_itens?.forEach(item => {
        if (item.materiais_equipamentos?.is_epi) {
          episFormatados.push({
            romaneio_id: romaneio.id,
            romaneio_numero: romaneio.numero,
            romaneio_data: romaneio.data_romaneio,
            item_id: item.id,
            quantidade: item.quantidade,
            material_nome: item.materiais_equipamentos.nome,
            material_codigo: item.materiais_equipamentos.codigo,
            numero_ca: item.materiais_equipamentos.numero_ca,
            data_devolucao: item.data_devolucao,
            status: item.data_devolucao ? 'devolvido' : 'retirado'
          })
        }
      })
    })

    console.log(`📝 EPIs formatados: ${episFormatados.length} itens`)

    // Calcular número otimizado de linhas para a tabela
    const calculateOptimalRows = (episCount: number): number => {
      // Altura disponível estimada em mm (A4 landscape = 210mm altura)
      const pageHeight = 210
      const margins = 40 // margens superior e inferior (20px cada)
      const headerHeight = 50 // cabeçalho estimado
      const textHeight = 40 // texto do compromisso estimado
      const fieldsHeight = 25 // campos de dados do colaborador
      const signatureHeight = 35 // campos de assinatura
      const footerMargin = 20 // margem do rodapé
      
      const availableHeight = pageHeight - margins - headerHeight - textHeight - fieldsHeight - signatureHeight - footerMargin
      const rowHeight = 5.5 // altura estimada de cada linha da tabela
      const headerTableHeight = 8 // altura do cabeçalho da tabela
      
      const maxRows = Math.floor((availableHeight - headerTableHeight) / rowHeight)
      
      // Mínimo de 10 linhas, máximo baseado no espaço disponível
      const minRows = 10
      const optimalRows = Math.max(minRows, Math.min(maxRows, episCount + 3))
      
      return optimalRows
    }

    const totalRows = calculateOptimalRows(episFormatados.length)

    console.log('📊 Calculando layout do PDF:', {
      episCount: episFormatados.length,
      totalRows: totalRows,
      emptyRows: totalRows - episFormatados.length
    })

    // Criar elemento temporário para PDF
    const printElement = document.createElement('div')
    printElement.innerHTML = generateFichaEPIPDFContent(colaborador, episFormatados, company, totalRows)
    printElement.style.position = 'absolute'
    printElement.style.left = '-9999px'
    printElement.style.top = '0'
    printElement.style.width = '297mm'
    printElement.style.height = '210mm'
    printElement.style.backgroundColor = 'white'
    printElement.style.zIndex = '-1000'
    document.body.appendChild(printElement)

    // Aguardar renderização
    console.log('⏳ Aguardando renderização...')
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log('🖼️ Convertendo HTML para canvas...')
    // Converter para canvas e PDF
    const canvas = await html2canvas(printElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'white',
      logging: false,
      removeContainer: false
    })
    
    console.log('🎨 Canvas criado, gerando PDF...')
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('landscape') // Orientação horizontal
    const imgWidth = 297 // A4 landscape width in mm
    const pageHeight = 210 // A4 landscape height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Limpar elemento temporário
    console.log('🧹 Limpando elementos temporários...')
    if (document.body.contains(printElement)) {
      document.body.removeChild(printElement)
    }

    // Salvar PDF
    const fileName = `termo-compromisso-epi-${colaborador.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`
    console.log('💾 Salvando PDF:', fileName)
    pdf.save(fileName)

    console.log('✅ PDF gerado com sucesso!')
    return { success: true }
  } catch (error) {
    console.error('❌ Erro crítico ao gerar PDF da ficha de EPI:', error)
    
    // Limpar elemento temporário em caso de erro
    const printElements = document.querySelectorAll('div[style*="-9999px"]')
    printElements.forEach(el => {
      if (document.body.contains(el)) {
        document.body.removeChild(el)
      }
    })
    
    // Verificar se é erro de autenticação
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message
      if (errorMessage.includes('JWT') || errorMessage.includes('session') || errorMessage.includes('auth')) {
        console.error('🔒 Erro de autenticação detectado durante geração de PDF')
        throw new Error('Erro de autenticação. Faça login novamente e tente baixar a ficha.')
      }
    }
    
    throw new Error('Erro interno ao gerar PDF. Tente novamente em alguns instantes.')
  }
}
