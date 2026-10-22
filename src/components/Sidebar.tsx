import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  ChevronDown,
  Home,
  FileText,
  FileSymlink,
  ShoppingCart,
  BookUser,
  Building,
  Truck,
  Landmark,
  Tag,
  Layers,
  MapPin,
  BarChart2,
  SidebarIcon,
  Wrench,
  PlusSquare,
  Search,
  History,
  Upload,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LogOut,
  User,
  Settings,
  HardHat,
  ScanLine,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissoes } from '@/contexts/PermissionsContext'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'

/**
 * Menu agrupado por área, conforme o AppShell do PRD: Operação, Compras,
 * Cadastros e Gestão. Cada item declara o módulo (e a ação, quando não for
 * leitura) que o perfil precisa ter para vê-lo.
 */
const gruposDeMenu = [
  {
    grupo: 'Operação',
    itens: [
      { title: 'Dashboard', href: '/dashboard', icon: Home, modulo: 'dashboard' },
      { title: 'Romaneios', href: '/romaneios', icon: FileText, modulo: 'romaneios' },
      {
        title: 'Nova retirada',
        href: '/romaneios/retirada',
        icon: ScanLine,
        modulo: 'romaneios',
        acao: 'create',
      },
      {
        title: 'Materiais e Equipamentos',
        href: '/materiais-equipamentos',
        icon: Wrench,
        modulo: 'materiais',
      },
      { title: 'Controle de EPI', href: '/epi', icon: HardHat, modulo: 'epi' },
      { title: 'Localização', href: '/localizacao', icon: MapPin, modulo: 'localizacao' },
    ],
  },
  {
    grupo: 'Compras',
    itens: [
      {
        title: 'Nova Solicitação',
        href: '/solicitacoes/nova',
        icon: PlusSquare,
        modulo: 'solicitacoes',
        acao: 'create' as const,
      },
      { title: 'Solicitações', href: '/solicitacoes', icon: ShoppingCart, modulo: 'solicitacoes' },
      {
        title: 'Importar NF-e',
        href: '/nfe/importacao',
        icon: Upload,
        modulo: 'nfe',
        acao: 'create' as const,
      },
      { title: 'Histórico de NF-e', href: '/nfe/historico', icon: History, modulo: 'nfe' },
    ],
  },
  {
    grupo: 'Cadastros',
    itens: [
      { title: 'Colaboradores', href: '/cadastros/colaboradores', icon: BookUser, modulo: 'colaboradores' },
      { title: 'Empresas', href: '/cadastros/empresas', icon: Building, modulo: 'empresas' },
      { title: 'Fornecedores', href: '/cadastros/fornecedores', icon: Truck, modulo: 'fornecedores' },
      { title: 'Centros de Custo', href: '/cadastros/centros-custo', icon: Landmark, modulo: 'centros_custo' },
      { title: 'Marcas', href: '/cadastros/marcas', icon: Tag, modulo: 'marcas' },
      { title: 'Categorias', href: '/cadastros/categorias', icon: Layers, modulo: 'materiais' },
    ],
  },
  {
    grupo: 'Gestão',
    itens: [
      { title: 'Relatórios', href: '/relatorios', icon: BarChart2, modulo: 'relatorios' },
      { title: 'Configurações', href: '/configuracoes', icon: Settings, modulo: 'configuracoes' },
    ],
  },
]

// 📱 Componente de Menu com Autenticação
const MenuContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { can, perfilNome, loading: carregandoPermissoes } = usePermissoes()

  // Esconde do menu o que o perfil de acesso do usuário não pode visualizar
  // Esconde do menu o que o perfil não pode ver; grupo sem item some junto
  const gruposVisiveis = gruposDeMenu
    .map((g) => ({
      ...g,
      itens: g.itens.filter((item: any) => can(item.modulo, item.acao ?? 'read')),
    }))
    .filter((g) => g.itens.length > 0)

  const isActive = (href: string) => {
    const [path] = href.split('?')
    const [locationPath] = location.pathname.split('?')
    if (path === locationPath) {
      if (path === '/romaneios/novo') {
        const hrefParams = new URLSearchParams(href.split('?')[1])
        const locationParams = new URLSearchParams(location.search)
        return hrefParams.get('tipo') === locationParams.get('tipo')
      }
      return true
    }
    return false
  }

  const isParentActive = (subItems: any[]) => {
    return subItems.some((sub) => isActive(sub.href))
  }

  const handleNavClick = () => {
    onNavigate?.()
  }

  const handleSignOut = async () => {
    await signOut()
    onNavigate?.()
  }

  return (
    // `min-h-0` é o que deixa a navegação rolar sem empurrar o rodapé da barra
    // (usuário e "Sair") para fora da tela num notebook de 768px
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-4 p-3 [@media(max-height:800px)]:space-y-3">
          {/* RF-07: enquanto as permissões carregam, mostra skeleton em vez de
              um menu vazio que faz o usuário parecer sem acesso */}
          {carregandoPermissoes
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))
            : gruposVisiveis.map((grupo) => (
                <div key={grupo.grupo} className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [@media(max-height:800px)]:pb-0.5">
                    {grupo.grupo}
                  </p>
                  {grupo.itens.map((item: any) => (
                    <Link to={item.href} key={item.href} onClick={handleNavClick}>
                      <Button
                        variant={isActive(item.href) ? 'secondary' : 'ghost'}
                        className="h-auto w-full justify-start py-2 text-ds-body [@media(max-height:800px)]:py-1.5"
                        title={item.title}
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              ))}
        </nav>
      </ScrollArea>
      
      {/* Rodapé do usuário: sempre visível, não rola com o menu */}
      <div className="shrink-0 border-t">
        <div className="space-y-2 p-3 [@media(max-height:800px)]:space-y-1 [@media(max-height:800px)]:p-2">
          {/* Informações do usuário */}
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="truncate text-xs text-muted-foreground" title={user?.email}>
                {user?.email}
              </p>
              <p className="text-xs text-primary truncate">
                {carregandoPermissoes ? 'Carregando permissões…' : perfilNome}
              </p>
            </div>
          </div>
          
          {/* Botão de logout */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
        
      </div>
    </div>
  )
}

const CHAVE_RECOLHIDA = 'balimax:sidebar-recolhida'

export const Sidebar = () => {
  const [open, setOpen] = useState(false)

  /**
   * Barra recolhida: em 1366px de largura, recolher libera ~200px para a
   * tabela, que é a diferença entre ver e não ver as colunas de Status, Valor
   * e Ações. A escolha fica guardada porque é preferência de quem usa, não de
   * cada visita.
   */
  const [recolhida, setRecolhida] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_RECOLHIDA) === '1'
    } catch {
      return false
    }
  })

  const alternarRecolhida = () => {
    setRecolhida((atual) => {
      const nova = !atual
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, nova ? '1' : '0')
      } catch {
        // Armazenamento bloqueado: vale só para esta visita
      }
      return nova
    })
  }

  return (
    <>
      {/* 📱 MOBILE: Botão do menu hambúrguer */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-background border shadow-md">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex items-center h-14 border-b px-4">
              <SidebarIcon className="h-5 w-5 mr-2" />
              <h2 className="font-bold text-base">Almoxarifado</h2>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
            <MenuContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* DESKTOP: barra com a altura da tela, para o rodapé ficar sempre à mão */}
      <aside
        className={`hidden h-dvh shrink-0 flex-col border-r bg-card lg:flex ${
          recolhida ? 'w-16' : 'w-60'
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b md:h-16 ${
            recolhida ? 'justify-center px-2' : 'px-4'
          }`}
        >
          {!recolhida && (
            <>
              <SidebarIcon className="mr-2 h-5 w-5 shrink-0" />
              <h2 className="truncate font-bold text-base">Almoxarifado</h2>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={alternarRecolhida}
            className={`h-8 w-8 shrink-0 ${recolhida ? '' : 'ml-auto'}`}
            title={recolhida ? 'Expandir o menu' : 'Recolher o menu (libera espaço para a tabela)'}
            aria-label={recolhida ? 'Expandir o menu' : 'Recolher o menu'}
          >
            {recolhida ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* Recolhida, a barra fica só com o botão de expandir: o menu inteiro
            em ícones exigiria repensar grupos e submenus, e meio caminho
            (ícones sem rótulo) é pior que um atalho claro para voltar. */}
        {!recolhida && <MenuContent />}
      </aside>
    </>
  )
}
