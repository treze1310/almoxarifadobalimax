import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* 📱 Sidebar - agora responsiva */}
      <Sidebar />
      
      {/* 📱 Main content - otimizado para mobile */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-4 md:p-6 relative overflow-hidden">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
