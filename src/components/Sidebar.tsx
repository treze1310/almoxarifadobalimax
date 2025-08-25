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
  MapPin,
  BarChart2,
  SidebarIcon,
  Wrench,
  PlusSquare,
  Search,
  History,
  Upload,
  Menu,
  X,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ScrollArea } from './ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Gestão de Romaneios',
    href: '/romaneios',
    icon: FileText,
  },
  {
    title: 'Integração NF-e',
    icon: FileSymlink,
    subItems: [
      {
        title: 'Importar NF-e',
        href: '/nfe/importacao',
        icon: Upload,
      },
      {
        title: 'Histórico',
        href: '/nfe/historico',
        icon: History,
      },
    ],
  },
  {
    title: 'Materiais e Equipamentos',
    href: '/materiais-equipamentos',
    icon: Wrench,
  },
  {
    title: 'Solicitações de Compra',
    icon: ShoppingCart,
    subItems: [
      {
        title: 'Nova Solicitação',
        href: '/solicitacoes/nova',
        icon: PlusSquare,
      },
      {
        title: 'Consultar Solicitações',
        href: '/solicitacoes',
        icon: Search,
      },
    ],
  },

  {
    title: 'Cadastros Auxiliares',
    icon: BookUser,
    subItems: [
      { title: 'Colaboradores', href: '/cadastros/colaboradores', icon: BookUser },
      { title: 'Empresas', href: '/cadastros/empresas', icon: Building },
      { title: 'Fornecedores', href: '/cadastros/fornecedores', icon: Truck },
      {
        title: 'Centros de Custo',
        href: '/cadastros/centros-custo',
        icon: Landmark,
      },
      {
        title: 'Marcas',
        href: '/cadastros/marcas',
        icon: Tag,
      },
    ],
  },
  {
    title: 'Gestão de Localização',
    href: '/localizacao',
    icon: MapPin,
  },
  {
    title: 'Relatórios',
    href: '/relatorios',
    icon: BarChart2,
  },
]

// 📱 Componente de Menu Simplificado (sem autenticação)
const MenuContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation()

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

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          {menuItems.map((item) =>
            item.subItems ? (
              <Collapsible
                key={item.title}
                defaultOpen={isParentActive(item.subItems)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-sm py-2 h-auto">
                    <item.icon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-3">
                  {item.subItems.map((subItem) => (
                    <Link to={subItem.href} key={subItem.title} onClick={handleNavClick}>
                      <Button
                        variant={isActive(subItem.href) ? 'secondary' : 'ghost'}
                        className="w-full justify-start mt-1 text-sm py-2 h-auto"
                      >
                        <subItem.icon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{subItem.title}</span>
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Link to={item.href!} key={item.title} onClick={handleNavClick}>
                <Button
                  variant={isActive(item.href!) ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-sm py-2 h-auto"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Button>
              </Link>
            ),
          )}
        </nav>
      </ScrollArea>
      
      {/* 📱 Footer simples */}
      <div className="border-t p-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Sistema de Almoxarifado
          </p>
          <p className="text-xs text-muted-foreground">
            v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}

export const Sidebar = () => {
  const [open, setOpen] = useState(false)

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

      {/* 📱 DESKTOP: Sidebar tradicional */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card">
        <div className="flex items-center h-16 border-b px-6">
          <SidebarIcon className="h-6 w-6 mr-2" />
          <h2 className="font-bold text-lg">Almoxarifado</h2>
        </div>
        <MenuContent />
      </aside>
    </>
  )
}
