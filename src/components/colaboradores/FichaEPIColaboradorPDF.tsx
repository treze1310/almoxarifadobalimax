import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EPIComAtribuicao } from '@/services/epiService'
import { Tables } from '@/types/database'

interface ColaboradorDetalhado extends Tables<'colaboradores'> {
  empresa?: { nome: string; cnpj: string | null; logo_url: string | null }
  centro_custo?: { codigo: string; descricao: string | null }
}

interface FichaEPIColaboradorPDFProps {
  colaborador: ColaboradorDetalhado
  episVinculados: EPIComAtribuicao[]
}

export function FichaEPIColaboradorPDF({ colaborador, episVinculados }: FichaEPIColaboradorPDFProps) {
  const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  
  const episAtivos = episVinculados.filter(epi => epi.status_atribuicao === 'ativo')
  const episVencidos = episVinculados.filter(epi => {
    if (!epi.data_vencimento) return false
    return new Date(epi.data_vencimento) < new Date()
  })
  const episVencendoBreve = episVinculados.filter(epi => {
    if (!epi.data_vencimento) return false
    const vencimento = new Date(epi.data_vencimento)
    const hoje = new Date()
    const em30Dias = new Date()
    em30Dias.setDate(hoje.getDate() + 30)
    return vencimento >= hoje && vencimento <= em30Dias
  })

  return (
    <div className="w-full bg-white p-8 font-sans text-black" style={{ minHeight: '297mm', width: '210mm' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-blue-600 pb-6 mb-6">
        <div className="flex items-center gap-4">
          {colaborador.empresa?.logo_url && (
            <img 
              src={colaborador.empresa.logo_url} 
              alt="Logo da empresa" 
              className="w-20 h-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-blue-800">
              {colaborador.empresa?.nome || 'Sistema de Almoxarifado'}
            </h1>
            {colaborador.empresa?.cnpj && (
              <p className="text-gray-600 text-lg">CNPJ: {colaborador.empresa.cnpj}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-blue-700">CONTROLE DE EPIs</h2>
          <p className="text-gray-600 text-lg">Equipamentos de Proteção Individual</p>
          <p className="text-sm text-gray-500 mt-2">Gerado em: {dataGeracao}</p>
        </div>
      </div>

      {/* Dados do Colaborador */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-300 pb-2">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">👤</span>
          DADOS DO COLABORADOR
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Nome Completo</p>
              <p className="text-lg font-bold text-gray-900">{colaborador.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Matrícula</p>
              <p className="text-base text-gray-800">{colaborador.matricula || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Cargo</p>
              <p className="text-base text-gray-800">{colaborador.cargo || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Setor</p>
              <p className="text-base text-gray-800">{colaborador.setor || 'Não informado'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">CPF</p>
              <p className="text-base text-gray-800">{colaborador.cpf || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">E-mail</p>
              <p className="text-base text-gray-800">{colaborador.email || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Telefone</p>
              <p className="text-base text-gray-800">{colaborador.telefone || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Centro de Custo</p>
              <p className="text-base text-gray-800">
                {colaborador.centro_custo ? 
                  `${colaborador.centro_custo.codigo} - ${colaborador.centro_custo.descricao}` : 
                  'Não informado'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo dos EPIs */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{episVinculados.length}</div>
          <div className="text-sm text-blue-600 font-medium">Total EPIs</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{episAtivos.length}</div>
          <div className="text-sm text-green-600 font-medium">Ativos</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{episVencendoBreve.length}</div>
          <div className="text-sm text-yellow-600 font-medium">Vencendo</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{episVencidos.length}</div>
          <div className="text-sm text-red-600 font-medium">Vencidos</div>
        </div>
      </div>

      {/* Lista de EPIs */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-300 pb-2">
          <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">🛡️</span>
          EPIs ATRIBUÍDOS
        </h3>
        
        {episVinculados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">Nenhum EPI atribuído a este colaborador</p>
          </div>
        ) : (
          <div className="space-y-4">
            {episVinculados.map((epi, index) => {
              const isVencido = epi.data_vencimento && new Date(epi.data_vencimento) < new Date()
              const isVencendoBreve = epi.data_vencimento && !isVencido && new Date(epi.data_vencimento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              
              let statusClass = 'bg-green-100 border-green-300 text-green-800'
              let statusText = 'ATIVO'
              
              if (isVencido) {
                statusClass = 'bg-red-100 border-red-300 text-red-800'
                statusText = 'VENCIDO'
              } else if (isVencendoBreve) {
                statusClass = 'bg-yellow-100 border-yellow-300 text-yellow-800'
                statusText = 'VENCE BREVE'
              }

              return (
                <div key={epi.atribuicao_id} className={`p-4 border-2 rounded-lg ${statusClass}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900">{epi.nome}</h4>
                      <p className="text-sm text-gray-700">Código: {epi.codigo}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-600">CA</p>
                      <p className="text-gray-800">{epi.numero_ca || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">Data Atribuição</p>
                      <p className="text-gray-800">
                        {epi.data_atribuicao ? format(new Date(epi.data_atribuicao), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">Data Vencimento</p>
                      <p className="text-gray-800">
                        {epi.data_vencimento ? format(new Date(epi.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">Quantidade</p>
                      <p className="text-gray-800">{epi.quantidade_atribuida || 1}</p>
                    </div>
                  </div>
                  
                  {epi.observacoes_atribuicao && (
                    <div className="mt-3 p-2 bg-white bg-opacity-50 rounded">
                      <p className="text-sm"><span className="font-semibold">Observações:</span> {epi.observacoes_atribuicao}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Termo de Responsabilidade */}
      <div className="mb-8 p-6 border-2 border-red-400 bg-red-50 rounded-lg">
        <h3 className="text-lg font-bold text-red-800 mb-4 text-center">TERMO DE RESPONSABILIDADE</h3>
        <div className="text-sm text-gray-700 space-y-3 leading-relaxed">
          <p className="text-justify">
            <strong>{colaborador.nome}</strong>, portador do CPF {colaborador.cpf || 'não informado'}, 
            matrícula {colaborador.matricula || 'não informada'}, declara ter recebido os Equipamentos de Proteção 
            Individual (EPIs) relacionados neste documento, em perfeitas condições de uso, e se compromete a:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-justify">
            <li>Usar os EPIs apenas para as finalidades a que se destinam;</li>
            <li>Responsabilizar-se pela guarda e conservação dos EPIs;</li>
            <li>Comunicar ao empregador qualquer alteração que torne os EPIs impróprios para uso;</li>
            <li>Cumprir as determinações do empregador sobre o uso adequado dos EPIs;</li>
            <li>Substituir os EPIs danificados ou extraviados, conforme normas da empresa;</li>
            <li>Devolver os EPIs quando solicitado ou ao término do contrato de trabalho.</li>
          </ul>
          <p className="text-justify font-medium mt-4">
            Estou ciente de que o não cumprimento das normas de segurança pode resultar em medidas disciplinares, 
            conforme previsto na legislação trabalhista e nas normas internas da empresa.
          </p>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="mt-12 flex justify-between items-end">
        <div className="text-center">
          <div className="w-72 border-t-2 border-gray-600 pt-2">
            <p className="font-bold text-lg">{colaborador.nome}</p>
            <p className="text-sm text-gray-600">Assinatura do Colaborador</p>
            <p className="text-sm text-gray-600 mt-1">Data: ___/___/______</p>
          </div>
        </div>
        
        <div className="text-center">
          <div className="w-72 border-t-2 border-gray-600 pt-2">
            <p className="font-bold text-lg">Responsável pelo Almoxarifado</p>
            <p className="text-sm text-gray-600">Assinatura do Responsável</p>
            <p className="text-sm text-gray-600 mt-1">Data: ___/___/______</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Este documento foi gerado automaticamente pelo Sistema de Almoxarifado em {dataGeracao}
        </p>
        <p className="text-xs text-gray-500">
          {colaborador.empresa?.nome || 'Sistema de Almoxarifado'} - Controle de EPIs
        </p>
      </div>
    </div>
  )
}