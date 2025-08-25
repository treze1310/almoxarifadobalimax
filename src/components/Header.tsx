import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  PackageSearch,
  Search,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConnectionIndicator } from '@/components/ui/connection-status'

export const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 md:h-16 items-center px-3 md:px-6">
        {/* 📱 Logo e título - ajustado para mobile */}
        <Link to="/dashboard" className="flex items-center space-x-2 mr-3 md:mr-6 shrink-0">
          <PackageSearch className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span className="hidden sm:inline-block font-bold text-sm md:text-base">Almoxarifado</span>
        </Link>
        
        {/* 📱 Search - responsivo para mobile */}
        <div className="flex-1 max-w-full">
          {/* 📱 MOBILE: Busca compacta ou expandida */}
          <div className="flex lg:hidden">
            {!searchOpen ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="h-8 w-8 ml-auto"
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center w-full space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-3 h-8 text-sm rounded-full"
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(false)}
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* 📱 DESKTOP: Busca tradicional */}
          <div className="hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos, romaneios, usuários..."
                className="w-full max-w-sm pl-9 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Indicador de conexão */}
        <div className="ml-2 shrink-0">
          <ConnectionIndicator />
        </div>
      </div>
    </header>
  )
}
