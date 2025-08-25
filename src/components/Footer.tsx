export const Footer = () => {
  const currentYear = new Date().getFullYear()
  return (
    <footer className="border-t py-4">
      <div className="container text-center text-sm text-muted-foreground">
        <p>
          &copy; {currentYear} Sistema de Almoxarifado. Todos os direitos
          reservados. Versão 0.0.1
        </p>
      </div>
    </footer>
  )
}
