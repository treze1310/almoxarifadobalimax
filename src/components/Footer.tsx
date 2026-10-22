import { APP_VERSION } from '@/lib/versao'

export const Footer = () => {
  const currentYear = new Date().getFullYear()
  return (
    <footer className="shrink-0 border-t py-3">
      <div className="px-4 text-center text-xs text-muted-foreground">
        <p>
          &copy; {currentYear} Sistema de Almoxarifado. Todos os direitos
          reservados. Versão {APP_VERSION}
        </p>
      </div>
    </footer>
  )
}
