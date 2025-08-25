import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SolicitacaoCompra } from '@/types'
import { format } from 'date-fns'
import { ArrowLeft, Printer, Download } from 'lucide-react'
// Dynamic imports para jsPDF e html2canvas
import { supabase } from '@/lib/supabase'
import { companyService, CompanyWithLogo } from '@/services/companyService'
import { useRobustSupabase } from '@/hooks/useRobustSupabase'

const SolicitacaoPrintPage = () => {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const requestData: SolicitacaoCompra | null = state
  const { query } = useRobustSupabase()
  
  const [centroCustoOrigem, setCentroCustoOrigem] = useState<string>('')
  const [centroCustoDestino, setCentroCustoDestino] = useState<string>('')
  const [materiaisInfo, setMateriaisInfo] = useState<{ [key: string]: { nome: string; unidade_medida: string } }>({})
  const [company, setCompany] = useState<CompanyWithLogo | null>(null)
  const [colaboradorInfo, setColaboradorInfo] = useState<string>('')

  useEffect(() => {
    if (requestData) {
      setTimeout(() => window.print(), 500)
    }
  }, [requestData])

  // Buscar dados da empresa
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const companyData = await companyService.getActiveCompany(query)
        setCompany(companyData)
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error)
      }
    }
    fetchCompany()
  }, [])

  // Buscar nomes dos centros de custo
  useEffect(() => {
    const fetchCentrosCusto = async () => {
      if (!requestData?.centroCustoOrigemId && !requestData?.centroCustoDestinoId) return

      try {
        const promises = []
        
        if (requestData.centroCustoOrigemId) {
          promises.push(
            supabase
              .from('centros_custo')
              .select('codigo, descricao')
              .eq('id', requestData.centroCustoOrigemId)
              .single()
          )
        }

        if (requestData.centroCustoDestinoId) {
          promises.push(
            supabase
              .from('centros_custo')
              .select('codigo, descricao')
              .eq('id', requestData.centroCustoDestinoId)
              .single()
          )
        }

        const results = await Promise.all(promises)

        if (requestData.centroCustoOrigemId && results[0]?.data) {
          setCentroCustoOrigem(`${results[0].data.codigo} - ${results[0].data.descricao}`)
        }

        const destinoIndex = requestData.centroCustoOrigemId ? 1 : 0
        if (requestData.centroCustoDestinoId && results[destinoIndex]?.data) {
          setCentroCustoDestino(`${results[destinoIndex].data.codigo} - ${results[destinoIndex].data.descricao}`)
        }

      } catch (error) {
        console.error('Erro ao buscar centros de custo:', error)
      }
    }

    fetchCentrosCusto()
  }, [requestData])

  // Buscar informações dos materiais
  useEffect(() => {
    const fetchMateriaisInfo = async () => {
      if (!requestData?.itens) return

      try {
        // Filtrar apenas IDs válidos (não null) para evitar erro de UUID
        const materialIds = requestData.itens
          .map(item => item.material_equipamento_id)
          .filter(id => id !== null && id !== undefined) as string[]
        
        let materiais: any[] = []
        
        // Só fazer a query se houver IDs válidos
        if (materialIds.length > 0) {
          const { data, error } = await supabase
            .from('materiais_equipamentos')
            .select('id, nome, unidade_medida')
            .in('id', materialIds)
          
          if (error) throw error
          materiais = data || []
        }

        const materiaisMap: { [key: string]: { nome: string; unidade_medida: string } } = {}
        materiais?.forEach(material => {
          materiaisMap[material.id] = {
            nome: material.nome,
            unidade_medida: material.unidade_medida
          }
        })

        setMateriaisInfo(materiaisMap)
      } catch (error) {
        console.error('Erro ao buscar informações dos materiais:', error)
      }
    }

    fetchMateriaisInfo()
  }, [requestData])

  // Buscar informações do colaborador
  useEffect(() => {
    const fetchColaboradorInfo = async () => {
      if (!requestData?.colaborador_id) {
        // Se não há colaborador_id, usar o solicitante_nome
        setColaboradorInfo(requestData?.solicitante_nome || 'N/A')
        return
      }

      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('nome')
          .eq('id', requestData.colaborador_id)
          .single()

        if (error) throw error

        setColaboradorInfo(data?.nome || 'Colaborador não encontrado')
      } catch (error) {
        console.error('Erro ao buscar informações do colaborador:', error)
        setColaboradorInfo('Erro ao carregar colaborador')
      }
    }

    fetchColaboradorInfo()
  }, [requestData])

  const handleDownloadPDF = async () => {
    if (!requestData) return

    try {
      // Importação dinâmica com fallback para commonjs
      const jsPDFModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      
      const jsPDF = jsPDFModule.default || jsPDFModule
      const html2canvas = html2canvasModule.default || html2canvasModule
      // Create a completely isolated container for PDF generation
      const pdfContainer = document.createElement('div')
      pdfContainer.style.position = 'absolute'
      pdfContainer.style.left = '-9999px'
      pdfContainer.style.top = '0'
      pdfContainer.style.width = '210mm'
      pdfContainer.style.minHeight = '297mm'
      pdfContainer.style.backgroundColor = 'white'
      pdfContainer.style.fontFamily = 'Arial, sans-serif'
      pdfContainer.style.fontSize = '12px'
      pdfContainer.style.lineHeight = '1.3'
      pdfContainer.style.margin = '0'
      pdfContainer.style.padding = '0'
      pdfContainer.style.zIndex = '9999'
      
      // Generate clean HTML content
      const pdfContent = generateSolicitacaoPDFContent(requestData, company, centroCustoOrigem, centroCustoDestino, materiaisInfo, colaboradorInfo)
      pdfContainer.innerHTML = pdfContent
      
      // Append to body temporarily
      document.body.appendChild(pdfContainer)

      // Wait for content to fully render
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Capture only the isolated container
      const canvas = await html2canvas(pdfContainer, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        width: pdfContainer.scrollWidth,
        height: pdfContainer.scrollHeight,
        logging: false,
        removeContainer: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure the cloned document only contains our content
          const clonedContainer = clonedDoc.querySelector('div')
          if (clonedContainer) {
            clonedContainer.style.position = 'relative'
            clonedContainer.style.left = '0'
            clonedContainer.style.top = '0'
          }
        }
      })
      
      // Generate PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = 297 // A4 height in mm
      const imgWidth = 190 // Content width with margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let yPosition = 10
      let remainingHeight = imgHeight
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight)
      remainingHeight -= (pdfHeight - 20) // Account for margins
      
      // Add additional pages if needed
      while (remainingHeight > 0) {
        pdf.addPage()
        yPosition = -(imgHeight - remainingHeight) + 10
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight)
        remainingHeight -= (pdfHeight - 20)
      }
      
      // Save the PDF
      pdf.save(`requisicao-compra-${requestData.id}.pdf`)
      
      // Clean up
      document.body.removeChild(pdfContainer)
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    }
  }

  if (!requestData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Dados de requisição não encontrados</h1>
        <Button onClick={() => navigate('/solicitacoes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Botões de ação (apenas na tela) */}
      <div className="no-print fixed top-4 right-4 z-10 flex gap-2">
        <Button onClick={() => navigate('/solicitacoes')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={handleDownloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Conteúdo para impressão - Hidden from screen, visible only for print */}
      <div 
        id="solicitacao-print-content"
        className="print-content"
        style={{ position: 'relative', zIndex: 1 }}
        dangerouslySetInnerHTML={{
          __html: generateSolicitacaoPDFContent(requestData, company, centroCustoOrigem, centroCustoDestino, materiaisInfo)
        }}
      />

      {/* Estilos para impressão */}
      <style jsx>{`
        @media screen {
          .print-content {
            display: block;
            margin: 20px auto;
            max-width: 210mm;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 10mm;
          }
        }
        
        @media print {
          .no-print { 
            display: none !important; 
            visibility: hidden !important;
          }
          body { 
            margin: 0; 
            padding: 0; 
            background: white;
          }
          * { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
          }
          .print-content {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            width: 100% !important;
          }
          
          /* Hide everything except print content */
          body > *:not(.print-content) {
            display: none !important;
          }
          
          /* Ensure only our content shows */
          #root > *:not(.print-content) {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

const formatDate = (dateString: string | Date) => {
  if (!dateString) return 'Data não informada'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const generateSolicitacaoPDFContent = (
  requestData: SolicitacaoCompra,
  company: CompanyWithLogo | null,
  centroCustoOrigem: string,
  centroCustoDestino: string,
  materiaisInfo: { [key: string]: { nome: string; unidade_medida: string } },
  colaboradorInfo: string
): string => {
  const totalItens = requestData.itens?.length || 0

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Requisição de Compra ${requestData.id}</title>
        <style>
          @page {
            margin: 10mm;
            size: A4;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.3;
          }
          
          .container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #4a90e2;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .logo {
            height: 35px;
            width: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: white;
            font-weight: bold;
            font-size: 16px;
            overflow: hidden;
          }

          .logo img {
            height: 35px;
            width: auto;
            object-fit: contain;
            background: transparent;
          }
          
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 0;
            line-height: 35px;
            display: flex;
            align-items: center;
          }
          
          .company-info {
            text-align: right;
            font-size: 9px;
            line-height: 1.2;
            color: #666;
            max-width: 200px;
          }
          
          .company-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
            font-size: 10px;
          }
          
          .info-section {
            border: 2px solid #333;
            margin-bottom: 15px;
          }
          
          .info-header {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #333;
          }
          
          .info-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #333;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .info-cell {
            padding: 8px 12px;
            border-right: 1px solid #333;
            display: flex;
            align-items: center;
          }
          
          .info-cell:last-child {
            border-right: none;
          }
          
          .info-label {
            font-weight: bold;
            margin-right: 8px;
            min-width: 80px;
          }
          
          .info-value {
            flex: 1;
          }
          
          .material-section {
            margin-bottom: 20px;
          }
          
          .section-title {
            background: #4a90e2;
            color: white;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            margin: 0 0 2px 0;
            text-align: center;
          }
          
          .material-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #333;
          }
          
          .material-table th {
            background: #4a90e2;
            color: white;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            border: 1px solid #333;
          }
          
          .material-table td {
            padding: 8px 6px;
            border: 1px solid #333;
            text-align: center;
            font-size: 10px;
            vertical-align: middle;
          }
          
          .material-table td:nth-child(2) {
            text-align: left;
            max-width: 200px;
            word-wrap: break-word;
          }
          
          .material-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .empty-row td {
            height: 25px;
            border: 1px solid #333;
          }
          
          .verification-section {
            margin-top: 30px;
            padding: 10px;
            border: 1px solid #333;
            text-align: center;
            font-weight: bold;
          }
          
          .signature-section {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
          }
          
          .signature-box {
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 130px;
          }
          
          .signature-line {
            width: 100%;
            height: 1px;
            background-color: #333;
            margin: 80px 0 8px 0;
          }
          
          .signature-title {
            font-size: 9px;
            color: #666;
            text-align: center;
            font-weight: normal;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                ${company?.logo_url 
                  ? `<img src="${company.logo_url}" alt="Logo da Empresa" />` 
                  : 'LOGO'
                }
              </div>
              <h1 class="title">REQUISIÇÃO DE COMPRA</h1>
            </div>
            <div class="company-info">
              <div class="company-name">${company?.nome || 'SISTEMA DE ALMOXARIFADO'}</div>
              ${company?.cnpj ? `<div>${company.cnpj}</div>` : '<div>08.296.443/0001-83</div>'}
              ${company?.endereco ? `<div>${company.endereco}</div>` : '<div>Sistema de Gestão de Materiais</div>'}
              ${company?.telefone ? `<div>${company.telefone}</div>` : '<div>Controle de Estoque e Movimentação</div>'}
              ${company?.email ? `<div>${company.email}</div>` : '<div>190</div>'}
            </div>
          </div>

          <!-- Info Section -->
          <div class="info-section">
            <div class="info-header">
              <div class="info-cell">
                <span class="info-label">No. da Solicitação:</span>
                <span class="info-value">${requestData.id}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Data da Solicitação:</span>
                <span class="info-value">${formatDate(requestData.data)}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Solicitante:</span>
                <span class="info-value">${colaboradorInfo}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Prazo de Entrega:</span>
                <span class="info-value">${requestData.prazoEntrega}${requestData.prazoEntrega === 'Customizada (especificar data)' && requestData.dataCustomizada ? ` - ${formatDate(requestData.dataCustomizada)}` : ''}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Centro de Custo Origem:</span>
                <span class="info-value">${centroCustoOrigem || 'Carregando...'}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Centro de Custo Destino:</span>
                <span class="info-value">${centroCustoDestino || 'Carregando...'}</span>
              </div>
            </div>
          </div>

          <!-- Material Section -->
          <div class="material-section">
            <h2 class="section-title">Lista de Materiais/Equipamentos Solicitados</h2>
            
            <table class="material-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Item</th>
                  <th style="width: 250px;">Descrição</th>
                  <th style="width: 80px;">Unidade</th>
                  <th style="width: 60px;">Quantidade</th>
                  <th style="width: 150px;">Observações</th>
                </tr>
              </thead>
              <tbody>
                ${requestData.itens?.map((item, index) => `
                  <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td style="text-align: left; padding-left: 8px;">
                      ${item.item_avulso ? 
                        `${item.item_avulso.descricao} <small>(Item Avulso)</small>` : 
                        (materiaisInfo[item.material_equipamento_id]?.nome || 'Material não encontrado')
                      }
                    </td>
                    <td>${item.item_avulso ? 
                        (item.item_avulso.unidade_medida || 'N/A') : 
                        (materiaisInfo[item.material_equipamento_id]?.unidade_medida || 'N/A')
                      }</td>
                    <td><strong>${item.quantidade}</strong></td>
                    <td style="text-align: left; padding-left: 8px;">${item.observacoes || '-'}</td>
                  </tr>
                `).join('') || ''}
                
                ${Array.from({ length: Math.max(0, 10 - (requestData.itens?.length || 0)) }, (_, i) => `
                  <tr class="empty-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Verification Section -->
          <div class="verification-section">
            SOLICITAÇÃO VERIFICADA E APROVADA POR:
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <div>SOLICITANTE</div>
              <div class="signature-line"></div>
              <div class="signature-title">Responsável pela Solicitação</div>
            </div>
            <div class="signature-box">
              <div>GESTOR</div>
              <div class="signature-line"></div>
              <div class="signature-title">Aprovação do Gestor</div>
            </div>
            <div class="signature-box">
              <div>COMPRAS</div>
              <div class="signature-line"></div>
              <div class="signature-title">Departamento de Compras</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export default SolicitacaoPrintPage