/* 🔐 App Component - WITH AUTHENTICATION */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import LoginPage from './pages/Login'

// 📱 Pages carregadas sob demanda (code-splitting por rota)
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const NovoRomaneioPage = lazy(() => import('./pages/romaneios/NovoRomaneio'))
const RomaneiosPage = lazy(() => import('./pages/romaneios/Romaneios'))
const ImportacaoNFePage = lazy(() => import('./pages/nfe/Importacao'))
const HistoricoPage = lazy(() => import('./pages/nfe/Historico'))
const MateriaisEquipamentosPage = lazy(() => import('./pages/materiais-equipamentos/MateriaisEquipamentos'))
const SolicitacoesPage = lazy(() => import('./pages/solicitacoes/Solicitacoes'))
const NovaSolicitacaoPage = lazy(() => import('./pages/solicitacoes/NovaSolicitacao'))
const SolicitacaoPrintPage = lazy(() => import('./pages/solicitacoes/SolicitacaoPrint'))
const ColaboradoresPage = lazy(() => import('./pages/cadastros/Colaboradores'))
const FichaPrintPage = lazy(() => import('./pages/cadastros/colaboradores/FichaPrintPage'))
const EmpresasPage = lazy(() => import('./pages/cadastros/Empresas'))
const FornecedoresPage = lazy(() => import('./pages/cadastros/Fornecedores'))
const CentrosCustoPage = lazy(() => import('./pages/cadastros/CentrosCusto'))
const MarcasPage = lazy(() => import('./pages/cadastros/Marcas'))
const CategoriasPage = lazy(() => import('./pages/cadastros/Categorias'))
const LocalizacaoPage = lazy(() => import('./pages/localizacao/Localizacao'))
const MapaPage = lazy(() => import('./pages/localizacao/Mapa'))
const LocalizacaoCadastroPage = lazy(() => import('./pages/cadastros/Localizacao'))
const RelatoriosPage = lazy(() => import('./pages/relatorios/Relatorios'))
const ConfiguracoesPage = lazy(() => import('./pages/configuracoes/Configuracoes'))

const PageFallback = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
)

const App = () => (
  <BrowserRouter basename="/sistema">
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* 🔓 Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* 🔐 Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* 📦 Gestão de Romaneios */}
          <Route path="romaneios" element={<RomaneiosPage />} />
          <Route path="novo-romaneio" element={<NovoRomaneioPage />} />
          <Route path="romaneios/novo" element={<NovoRomaneioPage />} />
          <Route path="romaneios/:id" element={<RomaneiosPage />} />

          {/* 📄 Integração NF-e */}
          <Route path="nfe/importacao" element={<ImportacaoNFePage />} />
          <Route path="nfe/historico" element={<HistoricoPage />} />

          {/* 📦 Materiais e Equipamentos */}
          <Route path="materiais-equipamentos" element={<MateriaisEquipamentosPage />} />

          {/* 🛒 Solicitações de Compra */}
          <Route path="solicitacoes" element={<SolicitacoesPage />} />
          <Route path="solicitacoes/nova" element={<NovaSolicitacaoPage />} />
          <Route path="solicitacoes/:id/print" element={<SolicitacaoPrintPage />} />

          {/* 👥 Cadastros Auxiliares */}
          <Route path="cadastros/colaboradores" element={<ColaboradoresPage />} />
          <Route path="cadastros/empresas" element={<EmpresasPage />} />
          <Route path="cadastros/fornecedores" element={<FornecedoresPage />} />
          <Route path="cadastros/centros-custo" element={<CentrosCustoPage />} />
          <Route path="cadastros/marcas" element={<MarcasPage />} />
          <Route path="cadastros/categorias" element={<CategoriasPage />} />
          <Route path="cadastros/localizacao" element={<LocalizacaoCadastroPage />} />

          {/* 📍 Gestão de Localização */}
          <Route path="localizacao" element={<LocalizacaoPage />} />
          <Route path="localizacao/mapa" element={<MapaPage />} />

          {/* 📊 Relatórios */}
          <Route path="relatorios" element={<RelatoriosPage />} />

          {/* ⚙️ Configurações */}
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>

          {/* 🖨️ Página de impressão (protegida) */}
          <Route path="/cadastros/colaboradores/:id/ficha" element={
            <ProtectedRoute>
              <FichaPrintPage />
            </ProtectedRoute>
          } />
          
          {/* ❌ Página não encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
