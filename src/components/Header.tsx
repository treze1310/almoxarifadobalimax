import { Link } from 'react-router-dom'
import {
  PackageSearch,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

export const Header = () => {

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link to="/dashboard" className="mr-6 flex items-center space-x-2">
          <PackageSearch className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block">Almoxarifado</span>
        </Link>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos, romaneios, usuários..."
              className="w-full max-w-sm pl-9 rounded-full"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
