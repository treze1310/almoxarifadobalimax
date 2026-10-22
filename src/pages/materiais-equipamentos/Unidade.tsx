import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { Button } from '@/components/ui/button'
import { buscarTodasAsPaginas } from '@/lib/consultaPaginada'

const data = (valor?: string | null) => valor ? new Date(valor).toLocaleString('pt-BR') : 'Não informado'
const status: Record<string, string> = { disponivel: 'Disponível', em_uso: 'Em uso', manutencao: 'Em manutenção', baixado: 'Baixado', extraviado: 'Extraviado' }

export default function UnidadePage() {
  const { codigo } = useParams()
  const { can } = usePermissoes()
  const [unidade, setUnidade] = useState<any>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const podeRomaneios = can('romaneios')
  const podeNfe = can('nfe')
  const podeColaboradores = can('colaboradores')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    setUnidade(null)
    setHistorico([])
    void (async () => {
      try {
        const campos = `id, codigo, status, numero_serie, patrimonio_anterior, data_aquisicao, observacoes,
          material:material_equipamento_id(id, nome), localizacao:localizacao_id(codigo, nome)
          ${podeColaboradores ? ', colaborador:colaborador_id(nome)' : ''}
          ${podeNfe ? ', nota:nfe_id(id, numero_nfe)' : ''}`
        const resposta = await supabase.from('material_unidades').select(campos).eq('codigo', codigo ?? '').maybeSingle()
        if (resposta.error) throw resposta.error
        if (!ativo) return
        setUnidade(resposta.data)
        if (resposta.data && podeRomaneios) {
          const resultado = await buscarTodasAsPaginas<any>((de, ate) => supabase.from('romaneios_itens')
            .select(`id, data_devolucao, romaneio:romaneio_id(id, numero, tipo, status, data_romaneio, responsavel_nome${podeColaboradores ? ', colaborador:colaborador_id(nome)' : ''})`)
            .eq('material_unidade_id', (resposta.data as any).id).order('id').range(de, ate))
          if (resultado.error) throw resultado.error
          if (ativo) setHistorico(resultado.data.sort((a, b) => (b.romaneio?.data_romaneio ?? '').localeCompare(a.romaneio?.data_romaneio ?? '')))
        }
      } catch {
        if (ativo) setErro('Não foi possível carregar os dados da unidade. Tente novamente.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => { ativo = false }
  }, [codigo, podeRomaneios, podeNfe, podeColaboradores])

  return <main className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-2xl font-bold">Unidade {codigo}</h1><p className="text-muted-foreground">Localização, origem e histórico da peça</p></div>
    {carregando ? <p role="status">Carregando unidade…</p> : <>
      {erro && <p role="alert">{erro}</p>}
      {!unidade && !erro && <p>Unidade não encontrada. Confira o código da etiqueta.</p>}
      {unidade && <>
        <section className="rounded-lg border p-4 space-y-2" aria-label="Situação atual">
          <Link className="text-primary underline" to={`/materiais-equipamentos?item=${unidade.material?.id}`}>{unidade.material?.nome ?? 'Material'}</Link>
          <p><strong>Situação:</strong> {status[unidade.status] ?? unidade.status}</p>
          <p><strong>Onde está:</strong> {unidade.localizacao ? `${unidade.localizacao.codigo} — ${unidade.localizacao.nome}` : 'Localização não informada'}</p>
          {podeColaboradores && <p><strong>Com quem:</strong> {unidade.colaborador?.nome ?? 'Sem responsável registrado'}</p>}
          <p><strong>Série:</strong> {unidade.numero_serie || 'Não informada'} · <strong>Patrimônio anterior:</strong> {unidade.patrimonio_anterior || 'Não informado'}</p>
          {unidade.observacoes && <p>{unidade.observacoes}</p>}
        </section>
        {podeNfe && <section className="rounded-lg border p-4 space-y-2" aria-label="Origem">
          <h2 className="font-semibold">Nota de origem</h2>
          {unidade.nota ? <Link className="text-primary underline" to={`/nfe/historico?item=${unidade.nota.id}`}>NF-e {unidade.nota.numero_nfe || 'sem número'}</Link> : <p>Sem nota de origem vinculada.</p>}
          <p>Aquisição: {data(unidade.data_aquisicao)}</p>
        </section>}
        {podeRomaneios && <section className="rounded-lg border p-4 space-y-3" aria-label="Histórico da unidade">
          <h2 className="font-semibold">Com quem esteve</h2>
          {!historico.length && !erro && <p>Nenhuma movimentação por unidade registrada.</p>}
          {historico.map(item => <div className="border-t pt-3" key={item.id}>
            <Link className="text-primary underline" to={`/romaneios?item=${item.romaneio?.id}`}>Romaneio {item.romaneio?.numero ?? 'indisponível'}</Link>
            <p>{item.romaneio?.tipo} · {item.romaneio?.status}</p>
            <p>{item.romaneio?.colaborador?.nome || item.romaneio?.responsavel_nome || 'Responsável não informado'} · {data(item.romaneio?.data_romaneio)}</p>
            <p>{item.data_devolucao ? `Devolução: ${data(item.data_devolucao)}` : 'Sem devolução registrada'}</p>
          </div>)}
        </section>}
      </>}
    </>}
    <Button variant="outline" asChild><Link to="/materiais-equipamentos">Materiais e equipamentos</Link></Button>
  </main>
}
