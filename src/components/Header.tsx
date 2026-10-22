import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  PackageSearch,
  Search,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { ThemeToggle } from '@/components/ds/ThemeToggle'
import { CentralNotificacoes } from '@/components/ds/CentralNotificacoes'

export const Header = () => {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 md:h-16 items-center px-3 md:px-6">
        {/* A marca fica na barra lateral; aqui só o ícone, e o nome apenas
            onde não há barra lateral (telas estreitas) — os dois lado a lado
            repetiam a mesma palavra e comiam largura. */}
        <Link to="/dashboard" className="mr-3 flex shrink-0 items-center space-x-2 md:mr-6">
          <PackageSearch className="h-5 w-5 text-primary md:h-6 md:w-6" />
          <span className="font-bold text-sm sm:inline-block md:text-base lg:hidden">
            Almoxarifado
          </span>
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
            {/* A busca é a paleta de comandos (Ctrl+K); o campo apenas a abre */}
            <button
              type="button"
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
                )
              }
              className="flex w-full max-w-sm items-center gap-2 rounded-full border bg-background px-3 py-2 text-left text-ds-body text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Buscar materiais, romaneios, pessoas…</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                Ctrl K
              </kbd>
            </button>
          </div>
        </div>

        <form className="ml-2 w-32 md:w-44" onSubmit={e => {
          e.preventDefault()
          if (/^\d+-\d+$/.test(codigo.trim())) {
            navigate(`/unidades/${encodeURIComponent(codigo.trim())}`)
            setCodigo('')
          }
        }}>
          <Input aria-label="Bipar unidade" placeholder="Bipar unidade" value={codigo} onChange={e => setCodigo(e.target.value)} />
        </form>
        {/* Ações do topo, alinhadas à direita */}
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          <CentralNotificacoes />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
