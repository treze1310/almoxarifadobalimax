/* 🔐 App Component - WITH AUTHENTICATION */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import ErrorBoundary from '@/components/ErrorBoundary'
import RequirePermission from '@/components/RequirePermission'
import { PermissionsProvider } from '@/contexts/PermissionsContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import LoginPage from './pages/Login'

// 📱 Pages carregadas sob demanda (code-splitting por rota)
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const NovoRomaneioPage = lazy(() => import('./pages/romaneios/NovoRomaneio'))
const RomaneiosPage = lazy(() => import('./pages/romaneios/Romaneios'))
const RetiradaAssistidaPage = lazy(() => import('./pages/romaneios/RetiradaAssistida'))
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
const EPIPage = lazy(() => import('./pages/epi/EPIGerenciamento'))

const PageFallback = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
)

const App = () => (
  <BrowserRouter basename="/sistema">
    <AuthProvider>
      <PermissionsProvider>
      <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
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
          <Route path="dashboard" element={<RequirePermission modulo="dashboard" acao="read"><DashboardPage /></RequirePermission>} />

          {/* 📦 Gestão de Romaneios */}
          <Route path="romaneios" element={<RequirePermission modulo="romaneios" acao="read"><RomaneiosPage /></RequirePermission>} />
          <Route path="novo-romaneio" element={<RequirePermission modulo="romaneios" acao="create"><NovoRomaneioPage /></RequirePermission>} />
          <Route path="romaneios/novo" element={<RequirePermission modulo="romaneios" acao="create"><NovoRomaneioPage /></RequirePermission>} />
          <Route path="romaneios/retirada" element={<RequirePermission modulo="romaneios" acao="create"><RetiradaAssistidaPage /></RequirePermission>} />
          <Route path="romaneios/:id" element={<RequirePermission modulo="romaneios" acao="read"><RomaneiosPage /></RequirePermission>} />

          {/* 📄 Integração NF-e */}
          <Route path="nfe/importacao" element={<RequirePermission modulo="nfe" acao="create"><ImportacaoNFePage /></RequirePermission>} />
          <Route path="nfe/historico" element={<RequirePermission modulo="nfe" acao="read"><HistoricoPage /></RequirePermission>} />

          {/* 📦 Materiais e Equipamentos */}
          <Route path="materiais-equipamentos" element={<RequirePermission modulo="materiais" acao="read"><MateriaisEquipamentosPage /></RequirePermission>} />

          {/* 🛒 Solicitações de Compra */}
          <Route path="solicitacoes" element={<RequirePermission modulo="solicitacoes" acao="read"><SolicitacoesPage /></RequirePermission>} />
          <Route path="solicitacoes/nova" element={<RequirePermission modulo="solicitacoes" acao="create"><NovaSolicitacaoPage /></RequirePermission>} />
          <Route path="solicitacoes/:id/print" element={<SolicitacaoPrintPage />} />

          {/* 👥 Cadastros Auxiliares */}
          <Route path="cadastros/colaboradores" element={<RequirePermission modulo="colaboradores" acao="read"><ColaboradoresPage /></RequirePermission>} />
          <Route path="cadastros/empresas" element={<RequirePermission modulo="empresas" acao="read"><EmpresasPage /></RequirePermission>} />
          <Route path="cadastros/fornecedores" element={<RequirePermission modulo="fornecedores" acao="read"><FornecedoresPage /></RequirePermission>} />
          <Route path="cadastros/centros-custo" element={<RequirePermission modulo="centros_custo" acao="read"><CentrosCustoPage /></RequirePermission>} />
          <Route path="cadastros/marcas" element={<RequirePermission modulo="marcas" acao="read"><MarcasPage /></RequirePermission>} />
          <Route path="cadastros/categorias" element={<RequirePermission modulo="materiais" acao="read"><CategoriasPage /></RequirePermission>} />
          <Route path="cadastros/localizacao" element={<RequirePermission modulo="localizacao" acao="read"><LocalizacaoCadastroPage /></RequirePermission>} />

          {/* 📍 Gestão de Localização */}
          <Route path="localizacao" element={<RequirePermission modulo="localizacao" acao="read"><LocalizacaoPage /></RequirePermission>} />
          <Route path="localizacao/mapa" element={<RequirePermission modulo="localizacao" acao="read"><MapaPage /></RequirePermission>} />

          {/* 🦺 Controle de EPI */}
          <Route path="epi" element={<RequirePermission modulo="epi" acao="read"><EPIPage /></RequirePermission>} />

          {/* 📊 Relatórios */}
          <Route path="relatorios" element={<RequirePermission modulo="relatorios" acao="read"><RelatoriosPage /></RequirePermission>} />

          {/* ⚙️ Configurações */}
          <Route path="configuracoes" element={<RequirePermission modulo="configuracoes" acao="read"><ConfiguracoesPage /></RequirePermission>} />
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
        </ErrorBoundary>
      </TooltipProvider>
      </ThemeProvider>
      </PermissionsProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
