import { Tables } from '@/types/database'
import { CompanyWithLogo } from '@/services/companyService'

type Solicitacao = Tables<'solicitacoes'> & {
  colaboradores?: { nome: string; matricula: string; foto_url?: string } | null
  centro_custo?: { codigo: string; nome: string } | null
  aprovado_por_usuario?: { nome: string; foto_url?: string } | null
  solicitacoes_itens?: Array<{
    id: string
    quantidade: number
    valor_unitario: number | null
    valor_total: number | null
    descricao_item: string
    observacoes: string | null
    materiais_equipamentos?: {
      codigo: string
      nome: string
      unidade_medida: string
    } | null
  }>
}

interface SolicitacaoPDFProps {
  solicitacao: Solicitacao
  company?: CompanyWithLogo | null
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

export const generateSolicitacaoPDFContent = (solicitacao: Solicitacao, company?: CompanyWithLogo | null): string => {
  const totalItens = solicitacao.solicitacoes_itens?.length || 0
  const valorTotal = solicitacao.valor_total || 0
  
  // Calcular valor total se não estiver definido
  const calculatedTotal = solicitacao.solicitacoes_itens?.reduce((sum, item) => {
    return sum + (item.valor_total || (item.quantidade * (item.valor_unitario || 0)))
  }, 0) || 0

  const finalTotal = valorTotal || calculatedTotal

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Solicitação ${solicitacao.numero}</title>
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
            border-bottom: 3px solid #e74c3c;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .logo {
            width: 80px;
            height: 60px;
            background: #e74c3c;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            overflow: hidden;
          }

          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 0;
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
            background: #e74c3c;
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
            background: #e74c3c;
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
            max-width: 250px;
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
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
          }
          
          .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 2px solid #333;
            font-weight: bold;
            font-size: 11px;
          }
          
          .signature-title {
            margin-top: 5px;
            font-size: 10px;
            color: #666;
          }

          .user-photo {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
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
              <h1 class="title">SOLICITAÇÃO DE COMPRA</h1>
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
                <span class="info-label">No. Solicit.:</span>
                <span class="info-value">${solicitacao.numero}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Data Solicit.:</span>
                <span class="info-value">${formatDate(solicitacao.data_solicitacao)}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Solicitante:</span>
                <span class="info-value">
                  ${solicitacao.colaboradores?.foto_url 
                    ? `<img src="${solicitacao.colaboradores.foto_url}" alt="Foto" class="user-photo" />` 
                    : ''
                  }
                  ${solicitacao.colaboradores?.nome || 'N/A'}
                </span>
              </div>
              <div class="info-cell">
                <span class="info-label">Matrícula:</span>
                <span class="info-value">${solicitacao.colaboradores?.matricula || 'N/A'}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Centro de Custo:</span>
                <span class="info-value">${solicitacao.centro_custo?.codigo || 'N/A'} - ${solicitacao.centro_custo?.nome || 'N/A'}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Urgência:</span>
                <span class="info-value">${solicitacao.urgencia || 'Normal'}</span>
              </div>
            </div>

            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Status:</span>
                <span class="info-value">${solicitacao.status || 'Pendente'}</span>
              </div>
              <div class="info-cell">
                <span class="info-label">Tipo:</span>
                <span class="info-value">${solicitacao.tipo || 'N/A'}</span>
              </div>
            </div>

            ${solicitacao.aprovado_por || solicitacao.data_aprovacao ? `
            <div class="info-row">
              <div class="info-cell">
                <span class="info-label">Aprovado por:</span>
                <span class="info-value">
                  ${solicitacao.aprovado_por_usuario?.foto_url 
                    ? `<img src="${solicitacao.aprovado_por_usuario.foto_url}" alt="Foto" class="user-photo" />` 
                    : ''
                  }
                  ${solicitacao.aprovado_por_usuario?.nome || 'N/A'}
                </span>
              </div>
              <div class="info-cell">
                <span class="info-label">Data Aprovação:</span>
                <span class="info-value">${formatDate(solicitacao.data_aprovacao)}</span>
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Material Section -->
          <div class="material-section">
            <h2 class="section-title">Itens Solicitados</h2>
            
            <table class="material-table">
              <thead>
                <tr>
                  <th style="width: 40px;">Item</th>
                  <th style="width: 250px;">Descrição</th>
                  <th style="width: 40px;">Qt.</th>
                  <th style="width: 60px;">Un.</th>
                  <th style="width: 60px;">Valor Unit.</th>
                  <th style="width: 80px;">Valor Total</th>
                  <th style="width: 120px;">Observações</th>
                </tr>
              </thead>
              <tbody>
                ${solicitacao.solicitacoes_itens?.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td style="text-align: left; padding-left: 8px;">
                      ${item.descricao_item || item.materiais_equipamentos?.nome || 'N/A'}
                    </td>
                    <td><strong>${item.quantidade}</strong></td>
                    <td>${item.materiais_equipamentos?.unidade_medida || 'UN'}</td>
                    <td>${item.valor_unitario ? `R$ ${item.valor_unitario.toFixed(2)}` : 'N/C'}</td>
                    <td><strong>${item.valor_total ? `R$ ${item.valor_total.toFixed(2)}` : 'N/C'}</strong></td>
                    <td style="font-size: 9px;">${item.observacoes || '-'}</td>
                  </tr>
                `).join('') || ''}
                
                ${Array.from({ length: Math.max(0, 10 - (solicitacao.solicitacoes_itens?.length || 0)) }, (_, i) => `
                  <tr class="empty-row">
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

          ${finalTotal > 0 ? `
          <div class="total-section">
            TOTAL: R$ ${finalTotal.toFixed(2)}
          </div>
          ` : ''}

          <!-- Justificativa -->
          ${solicitacao.justificativa ? `
            <div style="margin-top: 20px; padding: 10px; border: 1px solid #333;">
              <strong>Justificativa:</strong> ${solicitacao.justificativa}
            </div>
          ` : ''}

          <!-- Observações de Aprovação -->
          ${solicitacao.observacoes_aprovacao ? `
            <div style="margin-top: 10px; padding: 10px; border: 1px solid #333;">
              <strong>Observações da Aprovação:</strong> ${solicitacao.observacoes_aprovacao}
            </div>
          ` : ''}

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <div>SOLICITANTE</div>
              <div class="signature-title">Responsável pela Solicitação</div>
            </div>
            <div class="signature-box">
              <div>ALMOXARIFADO</div>
              <div class="signature-title">Controle de Estoque</div>
            </div>
            <div class="signature-box">
              <div>APROVAÇÃO</div>
              <div class="signature-title">Autorização / Aprovação</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export default function SolicitacaoPDF({ solicitacao, company }: SolicitacaoPDFProps) {
  return (
    <div
      id="solicitacao-pdf-content"
      dangerouslySetInnerHTML={{
        __html: generateSolicitacaoPDFContent(solicitacao, company)
      }}
    />
  )
}