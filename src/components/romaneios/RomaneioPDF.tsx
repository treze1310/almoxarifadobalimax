import { Tables } from '@/types/database'
import { CompanyWithLogo } from '@/services/companyService'

type Romaneio = Tables<'romaneios'> & {
  colaboradores?: { nome: string; matricula: string } | null
  centro_custo_origem?: { codigo: string; nome: string } | null
  centro_custo_destino?: { codigo: string; nome: string } | null
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
    } | null
  }>
}

interface RomaneioePDFProps {
  romaneio: Romaneio
  company?: CompanyWithLogo | null
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Data não informada'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

export const generateRomaneoPDFContent = (romaneio: Romaneio, company?: CompanyWithLogo | null): string => {
  const totalItens = romaneio.romaneios_itens?.length || 0
  const valorTotal = romaneio.valor_total || 0
  
  // Calcular valor total se não estiver definido
  const calculatedTotal = romaneio.romaneios_itens?.reduce((sum, item) => {
    return sum + (item.valor_total || (item.quantidade * (item.valor_unitario || 0)))
  }, 0) || 0

  const finalTotal = valorTotal || calculatedTotal

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Romaneio ${romaneio.numero}</title>
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
          
          .total-section {
            margin-top: 15px;
            text-align: right;
            font-weight: bold;
            font-size: 14px;
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
              <h1 class="title">${romaneio.tipo === 'devolucao' ? 'ROMANEIO DE DEVOLUÇÃO' : 'ROMANEIO'}</h1>
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
                <span class="info-label">No. da OS:</span>
                <span class="info-value">${romaneio.numero}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Data da OS:</span>
                <span class="info-value">${formatDate(romaneio.data_romaneio || romaneio.created_at)}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Responsável:</span>
                <span class="info-value">${romaneio.colaboradores?.nome || romaneio.responsavel_retirada || 'N/A'}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Matrícula:</span>
                <span class="info-value">${romaneio.colaboradores?.matricula || 'N/A'}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Centro de Custo:</span>
                <span class="info-value">${romaneio.centro_custo_origem?.codigo || 'N/A'}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Cliente:</span>
                <span class="info-value">${romaneio.centro_custo_destino?.nome || romaneio.fornecedores?.nome || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Material Section -->
          <div class="material-section">
            <h2 class="section-title">${romaneio.tipo === 'devolucao' ? 'Lista de Material Devolvido' : 'Lista de Material'}</h2>
            
            <table class="material-table">
              <thead>
                <tr>
                  <th style="width: 60px;">Cod.</th>
                  <th style="width: 200px;">Descrição</th>
                  <th style="width: 80px;">Marca</th>
                  <th style="width: 80px;">Num. Série</th>
                  <th style="width: 40px;">Qt.</th>
                  <th style="width: 60px;">Valor</th>
                  <th style="width: 80px;">NCM</th>
                  <th style="width: 80px;">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                ${romaneio.romaneios_itens?.map(item => `
                  <tr>
                    <td>${item.materiais_equipamentos?.codigo || 'N/C'}</td>
                    <td style="text-align: left; padding-left: 8px;">
                      ${item.materiais_equipamentos?.nome || 'N/A'}
                    </td>
                    <td>GENÉRICA</td>
                    <td>${item.numero_serie || 'N/C'}</td>
                    <td><strong>${item.quantidade}</strong></td>
                    <td>${item.valor_unitario ? `R$ ${item.valor_unitario.toFixed(2)}` : 'N/C'}</td>
                    <td><strong>${item.materiais_equipamentos?.codigo_ncm || 'N/C'}</strong></td>
                    <td><strong>${item.valor_total ? `R$ ${item.valor_total.toFixed(2)}` : 'N/C'}</strong></td>
                  </tr>
                `).join('') || ''}
                
                ${Array.from({ length: Math.max(0, 15 - (romaneio.romaneios_itens?.length || 0)) }, (_, i) => `
                  <tr class="empty-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
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

          <div class="total-section">
            R$ ${finalTotal > 0 ? finalTotal.toFixed(2) : '-'}
          </div>

          <!-- Verification Section -->
          <div class="verification-section">
            ${romaneio.tipo === 'devolucao' ? 'MATERIAL DEVOLVIDO E VERIFICADO POR:' : 'MATERIAL VERIFICADO E LIBERADO POR:'}
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <div>${romaneio.tipo === 'devolucao' ? 'RECEBIMENTO' : 'EXPEDIÇÃO'}</div>
              <div class="signature-line"></div>
              <div class="signature-title">${romaneio.tipo === 'devolucao' ? 'Responsável pelo Recebimento' : 'Responsável pela Expedição'}</div>
            </div>
            <div class="signature-box">
              <div>RESPONSÁVEL</div>
              <div class="signature-line"></div>
              <div class="signature-title">${romaneio.tipo === 'devolucao' ? 'Responsável pela Devolução' : 'Responsável pelo Recebimento'}</div>
            </div>
            <div class="signature-box">
              <div>FISCALIZAÇÃO</div>
              <div class="signature-line"></div>
              <div class="signature-title">Fiscalização / Aprovação</div>
            </div>
          </div>

          ${romaneio.observacoes ? `
            <div style="margin-top: 20px; padding: 10px; border: 1px solid #333;">
              <strong>Observações:</strong> ${romaneio.observacoes}
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `
}

export default function RomaneoPDF({ romaneio, company }: RomaneioePDFProps) {
  return (
    <div
      id="romaneio-pdf-content"
      dangerouslySetInnerHTML={{
        __html: generateRomaneoPDFContent(romaneio, company)
      }}
    />
  )
}