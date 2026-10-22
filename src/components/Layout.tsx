import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'
import { PaletaComandos } from '@/components/ds/PaletaComandos'

/**
 * Casca do sistema: barra lateral fixa e conteúdo que rola sozinho.
 *
 * Antes a altura da página era ditada pela barra lateral (`min-h-screen` no
 * contêiner): mesmo uma tela quase vazia ficava com ~1030px de altura num
 * notebook de 768px, dava rolagem sem conteúdo, o rodapé da barra ("Sair") só
 * aparecia rolando a página inteira e a barra subia junto com a tabela.
 *
 * Agora a janela não rola: a barra tem a altura da tela e quem rola é só a
 * área de conteúdo. O `min-w-0` é o que impede uma tabela larga de empurrar o
 * layout para fora da tela.
 */
export default function Layout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />

      {/* Paleta de comandos (Ctrl+K), disponível em toda a área autenticada */}
      <PaletaComandos />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Header />
        {/* Padding de página do design system: 16px mobile, 24px desktop */}
        <main className="relative flex-1 p-ds-page-mobile md:p-ds-page">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
