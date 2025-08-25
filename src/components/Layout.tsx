import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="sidebar">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 relative">
          <div className="table-container">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
