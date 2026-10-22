import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookUser,
  FileText,
  Loader2,
  Package,
  ScanLine,
  Settings,
  ShoppingCart,
  Wrench,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { supabase } from '@/lib/supabase'
import { usePermissoes } from '@/contexts/PermissionsContext'
import { mascararCPF } from '@/lib/dadosPessoais'

interface Resultado {
  id: string
  titulo: string
  detalhe?: string
  destino: string
}

interface Grupos {
  unidades: Resultado[]
  materiais: Resultado[]
  romaneios: Resultado[]
  solicitacoes: Resultado[]
  colaboradores: Resultado[]
}

const vazio: Grupos = { unidades: [], materiais: [], romaneios: [], solicitacoes: [], colaboradores: [] }

const ATALHOS = [
  { titulo: 'Nova retirada (bipar e assinar)', destino: '/romaneios/retirada', modulo: 'romaneios', acao: 'create' as const, icone: ScanLine },
  { titulo: 'Retirada avançada (formulário completo)', destino: '/romaneios/novo?tipo=retirada', modulo: 'romaneios', acao: 'create' as const, icone: FileText },
  { titulo: 'Nova solicitação de compra', destino: '/solicitacoes/nova', modulo: 'solicitacoes', acao: 'create' as const, icone: ShoppingCart },
  { titulo: 'Materiais e equipamentos', destino: '/materiais-equipamentos', modulo: 'materiais', acao: 'read' as const, icone: Wrench },
  { titulo: 'Colaboradores', destino: '/cadastros/colaboradores', modulo: 'colaboradores', acao: 'read' as const, icone: BookUser },
  { titulo: 'Estoque crítico', destino: '/materiais-equipamentos?estoque=critico', modulo: 'materiais', acao: 'read' as const, icone: Package },
  { titulo: 'Configurações', destino: '/configuracoes', modulo: 'configuracoes', acao: 'read' as const, icone: Settings },
]

/**
 * Paleta de comandos (RF-12). Abre com Ctrl+K ou ⌘K e busca materiais,
 * romaneios, solicitações e colaboradores, com os resultados agrupados.
 *
 * A busca respeita as permissões: só consulta os módulos que o perfil pode ler,
 * e a RLS do banco garante o resto.
 */
export const PaletaComandos = () => {
  const navigate = useNavigate()
  const { can } = usePermissoes()
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Grupos>(vazio)
  const [buscando, setBuscando] = useState(false)
  const buscaAtual = useRef(0)

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key.toLowerCase() === 'k' && (evento.metaKey || evento.ctrlKey)) {
        evento.preventDefault()
        setAberta((valor) => !valor)
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  const buscar = useCallback(
    async (texto: string) => {
      const termoLimpo = texto.trim()
      if (termoLimpo.length < 2) {
        setResultados(vazio)
        return
      }

      const requisicao = ++buscaAtual.current
      setBuscando(true)
      const padrao = `%${termoLimpo}%`

      try {
        const [uni, mat, rom, sol, col] = await Promise.all([
          can('materiais') ? supabase.from('material_unidades').select('id, codigo, status').ilike('codigo', padrao).limit(5) : Promise.resolve({ data: [] }),
          can('materiais')
            ? supabase
                .from('materiais_equipamentos')
                .select('id, codigo, nome')
                .or(`codigo.ilike.${padrao},nome.ilike.${padrao}`)
                .limit(5)
            : Promise.resolve({ data: [] }),
          can('romaneios')
            ? supabase
                .from('romaneios')
                .select('id, numero, tipo, status')
                .ilike('numero', padrao)
                .limit(5)
            : Promise.resolve({ data: [] }),
          can('solicitacoes')
            ? supabase
                .from('solicitacoes')
                .select('id, numero, status')
                .ilike('numero', padrao)
                .limit(5)
            : Promise.resolve({ data: [] }),
          can('colaboradores')
            ? supabase
                .from('colaboradores')
                .select('id, nome, matricula, cpf')
                .or(`nome.ilike.${padrao},matricula.ilike.${padrao}`)
                .limit(5)
            : Promise.resolve({ data: [] }),
        ])

        // Descarta respostas de buscas antigas que chegaram fora de ordem
        if (requisicao !== buscaAtual.current) return

        setResultados({
          unidades: (uni.data ?? []).map((u: any) => ({ id: u.id, titulo: u.codigo, detalhe: 'Unidade individual', destino: `/unidades/${encodeURIComponent(u.codigo)}` })),
          materiais: (mat.data ?? []).map((m: any) => ({
            id: m.id,
            titulo: m.nome,
            detalhe: m.codigo,
            destino: `/materiais-equipamentos?item=${m.id}`,
          })),
          romaneios: (rom.data ?? []).map((r: any) => ({
            id: r.id,
            titulo: r.numero,
            detalhe: `${r.tipo ?? ''} · ${r.status ?? ''}`,
            destino: `/romaneios?item=${r.id}`,
          })),
          solicitacoes: (sol.data ?? []).map((s: any) => ({
            id: s.id,
            titulo: s.numero,
            detalhe: s.status ?? '',
            destino: `/solicitacoes?item=${s.numero}`,
          })),
          colaboradores: (col.data ?? []).map((c: any) => ({
            id: c.id,
            titulo: c.nome,
            detalhe: [c.matricula && `Matrícula ${c.matricula}`, mascararCPF(c.cpf)]
              .filter(Boolean)
              .join(' · '),
            destino: `/cadastros/colaboradores?item=${c.id}`,
          })),
        })
      } finally {
        if (requisicao === buscaAtual.current) setBuscando(false)
      }
    },
    [can],
  )

  // Espera o usuário parar de digitar antes de consultar o banco
  useEffect(() => {
    const id = setTimeout(() => buscar(termo), 250)
    return () => clearTimeout(id)
  }, [termo, buscar])

  const ir = (destino: string) => {
    setAberta(false)
    setTermo('')
    setResultados(vazio)
    navigate(destino)
  }

  const atalhosPermitidos = ATALHOS.filter((a) => can(a.modulo, a.acao))
  const temResultado = Object.values(resultados).some((lista) => lista.length > 0)

  // shouldFilter={false}: a filtragem acontece no banco, e não na lista
  return (
    <CommandDialog open={aberta} onOpenChange={setAberta} shouldFilter={false}>
      <CommandInput
        placeholder="Buscar materiais, romaneios, solicitações, colaboradores..."
        value={termo}
        onValueChange={setTermo}
      />
      <CommandList>
        {buscando && (
          <div className="flex items-center justify-center gap-2 py-6 text-ds-body text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando…
          </div>
        )}

        {!buscando && termo.trim().length >= 2 && !temResultado && (
          <CommandEmpty>Nenhum resultado para “{termo}”.</CommandEmpty>
        )}

        {termo.trim().length < 2 && atalhosPermitidos.length > 0 && (
          <CommandGroup heading="Ir para">
            {atalhosPermitidos.map((atalho) => (
              <CommandItem key={atalho.destino} onSelect={() => ir(atalho.destino)}>
                <atalho.icone className="mr-2 h-4 w-4" />
                {atalho.titulo}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {resultados.unidades.length > 0 && <CommandGroup heading="Unidades individuais">
          {resultados.unidades.map(r => <CommandItem key={r.id} value={`uni-${r.id}`} onSelect={() => ir(r.destino)}><ScanLine className="mr-2 h-4 w-4" />{r.titulo}<span className="ml-auto text-xs text-muted-foreground">{r.detalhe}</span></CommandItem>)}
        </CommandGroup>}
        {resultados.materiais.length > 0 && (
          <>
            <CommandGroup heading="Materiais">
              {resultados.materiais.map((r) => (
                <CommandItem key={r.id} value={`mat-${r.id}`} onSelect={() => ir(r.destino)}>
                  <Wrench className="mr-2 h-4 w-4" />
                  <span className="truncate">{r.titulo}</span>
                  {r.detalhe && (
                    <span className="ml-auto text-xs text-muted-foreground">{r.detalhe}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {resultados.romaneios.length > 0 && (
          <>
            <CommandGroup heading="Romaneios">
              {resultados.romaneios.map((r) => (
                <CommandItem key={r.id} value={`rom-${r.id}`} onSelect={() => ir(r.destino)}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="truncate">{r.titulo}</span>
                  {r.detalhe && (
                    <span className="ml-auto text-xs text-muted-foreground">{r.detalhe}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {resultados.solicitacoes.length > 0 && (
          <>
            <CommandGroup heading="Solicitações">
              {resultados.solicitacoes.map((r) => (
                <CommandItem key={r.id} value={`sol-${r.id}`} onSelect={() => ir(r.destino)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span className="truncate">{r.titulo}</span>
                  {r.detalhe && (
                    <span className="ml-auto text-xs text-muted-foreground">{r.detalhe}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {resultados.colaboradores.length > 0 && (
          <CommandGroup heading="Colaboradores">
            {resultados.colaboradores.map((r) => (
              <CommandItem key={r.id} value={`col-${r.id}`} onSelect={() => ir(r.destino)}>
                <BookUser className="mr-2 h-4 w-4" />
                <span className="truncate">{r.titulo}</span>
                {r.detalhe && (
                  <span className="ml-auto text-xs text-muted-foreground">{r.detalhe}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

export default PaletaComandos
