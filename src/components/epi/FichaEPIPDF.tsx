import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EPIFicha } from '@/services/epiService'

interface FichaEPIPDFProps {
  ficha: EPIFicha
}

export function FichaEPIPDF({ ficha }: FichaEPIPDFProps) {
  const dataAtribuicao = ficha.atribuicao.data_atribuicao ? 
    format(new Date(ficha.atribuicao.data_atribuicao), 'dd/MM/yyyy', { locale: ptBR }) : '-'
  
  const dataVencimento = ficha.atribuicao.data_vencimento ? 
    format(new Date(ficha.atribuicao.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'

  return (
    <div className="w-full bg-white p-8 font-sans text-black" style={{ minHeight: '297mm', width: '210mm' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-gray-300 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {ficha.empresa.logo_url && (
            <img 
              src={ficha.empresa.logo_url} 
              alt="Logo da empresa" 
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{ficha.empresa.nome}</h1>
            {ficha.empresa.cnpj && (
              <p className="text-gray-600">CNPJ: {ficha.empresa.cnpj}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-700">FICHA DE EPI</h2>
          <p className="text-gray-600">Equipamento de Proteção Individual</p>
        </div>
      </div>

      {/* Dados do Colaborador */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">👤</span>
          DADOS DO COLABORADOR
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Nome:</p>
            <p className="text-base font-semibold">{ficha.colaborador.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Matrícula:</p>
            <p className="text-base">{ficha.colaborador.matricula || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Cargo:</p>
            <p className="text-base">{ficha.colaborador.cargo || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Setor:</p>
            <p className="text-base">{ficha.colaborador.setor || '-'}</p>
          </div>
          {ficha.colaborador.cpf && (
            <div>
              <p className="text-sm text-gray-600 font-medium">CPF:</p>
              <p className="text-base">{ficha.colaborador.cpf}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dados do EPI */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">🛡️</span>
          DADOS DO EPI
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Nome/Descrição:</p>
            <p className="text-base font-semibold">{ficha.epi.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Código:</p>
            <p className="text-base">{ficha.epi.codigo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Certificado de Aprovação (CA):</p>
            <p className="text-base font-semibold">{ficha.epi.numero_ca || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Marca:</p>
            <p className="text-base">{ficha.epi.marca || '-'}</p>
          </div>
        </div>
      </div>

      {/* Dados da Atribuição */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">📋</span>
          DADOS DA ATRIBUIÇÃO
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Data de Entrega:</p>
            <p className="text-base font-semibold">{dataAtribuicao}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Data de Vencimento/Troca:</p>
            <p className="text-base font-semibold text-red-600">{dataVencimento}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Quantidade:</p>
            <p className="text-base">{ficha.atribuicao.quantidade_atribuida}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Atribuído por:</p>
            <p className="text-base">{ficha.atribuicao.atribuido_por_nome || '-'}</p>
          </div>
        </div>
        {ficha.atribuicao.observacoes && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 font-medium">Observações:</p>
            <p className="text-base">{ficha.atribuicao.observacoes}</p>
          </div>
        )}
      </div>

      {/* Termo de Responsabilidade */}
      <div className="mb-6 p-4 border-2 border-red-300 bg-red-50 rounded-lg">
        <h3 className="text-lg font-bold text-red-800 mb-3">TERMO DE RESPONSABILIDADE</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            Declaro que recebi o(s) Equipamento(s) de Proteção Individual descrito(s) acima, em perfeitas condições de uso, 
            e me comprometo a:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Usar o EPI apenas para a finalidade a que se destina;</li>
            <li>Responsabilizar-me pela guarda e conservação do EPI;</li>
            <li>Comunicar ao empregador qualquer alteração que o torne impróprio para uso;</li>
            <li>Cumprir as determinações do empregador sobre o uso adequado do EPI;</li>
            <li>Substituir o EPI quando danificado ou extraviado, conforme normas da empresa.</li>
          </ul>
          <p className="mt-4 font-medium">
            Estou ciente de que o não cumprimento das normas de segurança pode resultar em medidas disciplinares, 
            conforme previsto na legislação trabalhista.
          </p>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="mt-8 flex justify-between items-end">
        <div className="text-center">
          <div className="w-64 border-t border-gray-400 pt-2">
            <p className="text-sm font-medium">{ficha.colaborador.nome}</p>
            <p className="text-xs text-gray-600">Assinatura do Colaborador</p>
            <p className="text-xs text-gray-600 mt-1">Data: {dataAtribuicao}</p>
          </div>
        </div>
        
        <div className="text-center">
          <div className="w-64 border-t border-gray-400 pt-2">
            <p className="text-sm font-medium">{ficha.atribuicao.atribuido_por_nome || 'Responsável'}</p>
            <p className="text-xs text-gray-600">Assinatura do Responsável</p>
            <p className="text-xs text-gray-600 mt-1">Data: {dataAtribuicao}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Este documento foi gerado automaticamente pelo Sistema de Almoxarifado em {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </p>
      </div>
    </div>
  )
}