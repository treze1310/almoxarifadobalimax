import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTema, type Tema } from '@/contexts/ThemeContext'

const opcoes: Array<{ valor: Tema; rotulo: string; icone: React.ElementType }> = [
  { valor: 'claro', rotulo: 'Claro', icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
  { valor: 'sistema', rotulo: 'Do sistema', icone: Monitor },
]

/** Alternador de tema; a escolha fica salva por usuário */
export const ThemeToggle = () => {
  const { tema, temaEfetivo, definirTema } = useTema()
  const Icone = temaEfetivo === 'escuro' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alternar tema">
          <Icone className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {opcoes.map((opcao) => (
          <DropdownMenuItem
            key={opcao.valor}
            onClick={() => definirTema(opcao.valor)}
            className={tema === opcao.valor ? 'bg-accent' : undefined}
          >
            <opcao.icone className="mr-2 h-4 w-4" />
            {opcao.rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ThemeToggle
