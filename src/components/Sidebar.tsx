import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  ChevronDown,
  Home,
  FileText,
  FilePlus,
  FileSymlink,
  ShoppingCart,
  Users,
  UserCheck,
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
  ArrowLeftRight,
  Search,
  History,
  Upload,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ScrollArea } from './ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    title: 'Usuários e Permissões',
    icon: Users,
    subItems: [
      { title: 'Usuários', href: '/usuarios', icon: UserCheck },
      { title: 'Perfis de Acesso', href: '/permissoes', icon: UserCheck },
    ],
  },
  {
    title: 'Cadastros Auxiliares',
    icon: BookUser,
    subItems: [
      { title: 'Colaboradores', href: '/cadastros/colaboradores', icon: Users },
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

// 📱 Componente de Menu (usado tanto na sidebar desktop quanto mobile)
const MenuContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation()
  const { usuario, signOut } = useAuth()
  const { toast } = useToast()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast({
        title: 'Erro ao sair',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      })
    }
  }

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

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
      
      {/* 📱 Footer com notificações e usuário */}
      <div className="border-t p-3 space-y-2">
        {/* Notificações */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="w-full justify-start relative text-sm py-2 h-auto">
              <Bell className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">Notificações</span>
              <Badge
                variant="destructive"
                className="ml-auto h-4 w-4 justify-center rounded-full p-0 text-xs shrink-0"
              >
                3
              </Badge>
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Notificações</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-2">
              <p className="text-sm">Estoque mínimo atingido para "Produto A".</p>
              <p className="text-sm">Solicitação de compra #123 aguardando aprovação.</p>
              <p className="text-sm">Nova devolução registrada.</p>
            </div>
          </SheetContent>
        </Sheet>

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto">
              <Avatar className="mr-2 h-6 w-6 shrink-0">
                <AvatarImage
                  src={usuario?.foto_url || undefined}
                  alt="Avatar do usuário"
                />
                <AvatarFallback className="text-xs">
                  {usuario ? getInitials(usuario.nome) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <p className="text-sm font-medium truncate w-full">
                  {usuario?.nome || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground truncate w-full">
                  {usuario?.email || ''}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{usuario?.nome}</p>
                <p className="text-xs text-muted-foreground">{usuario?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
