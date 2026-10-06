import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'
import { PaletaComandos } from '@/components/ds/PaletaComandos'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* 📱 Sidebar - agora responsiva */}
      <Sidebar />

      {/* Paleta de comandos (Ctrl+K), disponível em toda a área autenticada */}
      <PaletaComandos />
      
      {/* 📱 Main content - otimizado para mobile */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        {/* Padding de página do design system: 16px mobile, 24px desktop */}
        <main className="flex-1 p-ds-page-mobile md:p-ds-page relative">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
