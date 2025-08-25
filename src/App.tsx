/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'

// Pages
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import ProfilePage from './pages/Profile'
import NovoRomaneioPage from './pages/romaneios/NovoRomaneio'
import RomaneiosPage from './pages/romaneios/Romaneios'
import ImportacaoNFePage from './pages/nfe/Importacao'
import HistoricoPage from './pages/nfe/Historico'
import MateriaisEquipamentosPage from './pages/materiais-equipamentos/MateriaisEquipamentos'
import SolicitacoesPage from './pages/solicitacoes/Solicitacoes'
import NovaSolicitacaoPage from './pages/solicitacoes/NovaSolicitacao'
import SolicitacaoPrintPage from './pages/solicitacoes/SolicitacaoPrint'
import UsuariosPage from './pages/usuarios/Usuarios'
import PerfisAcessoPage from './pages/permissoes/PerfisAcesso'
import ColaboradoresPage from './pages/cadastros/Colaboradores'
import FichaPrintPage from './pages/cadastros/colaboradores/FichaPrintPage'
import EmpresasPage from './pages/cadastros/Empresas'
import FornecedoresPage from './pages/cadastros/Fornecedores'
import CentrosCustoPage from './pages/cadastros/CentrosCusto'
import MarcasPage from './pages/cadastros/Marcas'
import LocalizacaoPage from './pages/localizacao/Localizacao'
import MapaPage from './pages/localizacao/Mapa'
import RelatoriosPage from './pages/relatorios/Relatorios'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* Gestão de Romaneios */}
            <Route path="romaneios" element={<RomaneiosPage />} />
            <Route path="novo-romaneio" element={<NovoRomaneioPage />} />
            <Route path="romaneios/novo" element={<NovoRomaneioPage />} />
            <Route path="romaneios/:id" element={<RomaneiosPage />} />

            {/* Integração NF-e */}
            <Route path="nfe/importacao" element={<ImportacaoNFePage />} />
            <Route path="nfe/historico" element={<HistoricoPage />} />

            {/* Materiais e Equipamentos */}
            <Route
              path="materiais-equipamentos"
              element={<MateriaisEquipamentosPage />}
            />

            {/* Solicitações de Compra */}
            <Route path="solicitacoes" element={<SolicitacoesPage />} />
            <Route path="solicitacoes/nova" element={<NovaSolicitacaoPage />} />
            <Route
              path="solicitacoes/:id/print"
              element={<SolicitacaoPrintPage />}
            />

            {/* Usuários e Permissões */}
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="permissoes" element={<PerfisAcessoPage />} />

            {/* Cadastros Auxiliares */}
            <Route
              path="cadastros/colaboradores"
              element={<ColaboradoresPage />}
            />
            <Route path="cadastros/empresas" element={<EmpresasPage />} />
            <Route path="cadastros/fornecedores" element={<FornecedoresPage />} />
            <Route
              path="cadastros/centros-custo"
              element={<CentrosCustoPage />}
            />
            <Route path="cadastros/marcas" element={<MarcasPage />} />

            {/* Gestão de Localização */}
            <Route path="localizacao" element={<LocalizacaoPage />} />
            <Route path="localizacao/mapa" element={<MapaPage />} />

            {/* Relatórios */}
            <Route path="relatorios" element={<RelatoriosPage />} />
          </Route>
          <Route
            path="/cadastros/colaboradores/:id/ficha"
            element={
              <ProtectedRoute>
                <FichaPrintPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
