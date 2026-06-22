import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Corretores
import BrokersPage from './pages/Brokers'
import BrokersImportPage from './pages/Brokers/Import'
import BrokersImportEmailsPhonesPage from './pages/Brokers/ImportEmailsPhones'

// Grupos de Corretores
import BrokerGroupsPage from './pages/BrokerGroups'
import BrokerGroupsImportPage from './pages/BrokerGroups/Import'

// Propostas
import ProposalsPage from './pages/Proposals'
import ProposalFormPage from './pages/Proposals/Form'
import ProposalEndorsePage from './pages/Proposals/Endorse'

// Antifraude
import AntifraudPage from './pages/Antifraud'
import AntifraudFiltersPage from './pages/Antifraud/Filters'
import AntifraudRulesPage from './pages/Antifraud/Rules'

// Importacoes
import ImportHistoryPage from './pages/Imports/History'
import ImportPage from './pages/Imports/Import'
import ImportLayoutPage from './pages/Imports/Layout'
import ImportDataMapPage from './pages/Imports/DataMap'
import BankReturnsPage from './pages/Imports/BankReturns'
import PendenciesPage from './pages/Imports/Pendencies'
import CancelImportPage from './pages/Imports/Cancel'
import ManMapDadosPage from './pages/Imports/ManMapDados'

// Admin
import UsersPage from './pages/Admin/Users'
import ProfilesPage from './pages/Admin/Profiles'
import ConveniosPage from './pages/Admin/Convenios'
import BanksPage from './pages/Admin/Banks'
import ProductsPage from './pages/Admin/Products'
import AuditPage from './pages/Audit'
import BrokerAccessPage from './pages/Admin/BrokerAccess'

// Integracoes
import IntegrationsPage from './pages/Integrations'

// Storm
import StormColaboradoresPage from './pages/Storm/Colaboradores'
import StormContratosPage from './pages/Storm/Contratos'
import StormAntifraudePage from './pages/Storm/AntifraudeStorm'
import StormSimulacaoPage from './pages/Storm/Simulacao'

// Config / Reports
import DashboardConfigPage from './pages/Config/Dashboard'
import ReportsPage from './pages/Reports'
import PlaceholderPage from './components/ui/PlaceholderPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const user = useAuthStore((s) => s.user)
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />

        {/* Corretores */}
        <Route path="corretores" element={<BrokersPage />} />
        <Route path="corretores/importacao" element={<BrokersImportPage />} />
        <Route path="corretores/importacao/emails-telefones" element={<BrokersImportEmailsPhonesPage />} />

        {/* Grupos de Corretores */}
        <Route path="grupos" element={<BrokerGroupsPage />} />
        <Route path="grupos/importar" element={<BrokerGroupsImportPage />} />

        {/* Propostas */}
        <Route path="propostas" element={<ProposalsPage />} />
        <Route path="propostas/buscar" element={<ProposalsPage />} />
        <Route path="propostas/cadastrar" element={<ProposalFormPage />} />
        <Route path="propostas/averbar" element={<ProposalEndorsePage />} />

        {/* Antifraude */}
        <Route path="antifraude" element={<AntifraudPage />} />
        <Route path="antifraude/filtros" element={<AntifraudFiltersPage />} />
        <Route path="antifraude/regras" element={<AntifraudRulesPage />} />

        {/* Integracoes */}
        <Route path="integracoes" element={<IntegrationsPage />} />

        {/* Storm */}
        <Route path="storm/colaboradores" element={<StormColaboradoresPage />} />
        <Route path="storm/contratos" element={<StormContratosPage />} />
        <Route path="storm/antifraude" element={<StormAntifraudePage />} />
        <Route path="storm/simulacao" element={<StormSimulacaoPage />} />

        {/* Importacoes */}
        <Route path="importacoes" element={<ImportHistoryPage />} />
        <Route path="importacoes/importar" element={<ImportPage />} />
        <Route path="importacoes/cancelar" element={<CancelImportPage />} />
        <Route path="importacoes/layout" element={<ImportLayoutPage />} />
        <Route path="importacoes/dados" element={<ImportDataMapPage />} />
        <Route path="importacoes/man-map-dados" element={<ManMapDadosPage />} />
        <Route path="importacoes/retornos" element={<BankReturnsPage />} />
        <Route path="importacoes/pendencias" element={<PendenciesPage />} />

        {/* Admin — Cadastros */}
        <Route path="admin/usuarios" element={<UsersPage />} />
        <Route path="admin/perfis" element={<ProfilesPage />} />
        <Route path="admin/convenios" element={<ConveniosPage />} />
        <Route path="admin/bancos" element={<BanksPage />} />
        <Route path="admin/produtos" element={<ProductsPage />} />
        <Route path="admin/produtos/importar" element={<PlaceholderPage title="Importar Produtos" />} />
        <Route path="admin/produtos/cancelar" element={<PlaceholderPage title="Cancelar Importação de Produtos" />} />
        <Route path="admin/cpf-cnpj-restritos" element={<PlaceholderPage title="CPF/CNPJ Restritos" description="Busca e cadastro de CPFs e CNPJs restritos" />} />
        <Route path="admin/cpf-cnpj-restritos/importar" element={<PlaceholderPage title="Importar CPF/CNPJ Restritos" />} />
        <Route path="admin/cpf-cnpj-restritos/cancelar" element={<PlaceholderPage title="Cancelar Importação de CPF/CNPJ" />} />

        {/* Admin — Operações */}
        <Route path="admin/operacoes" element={<PlaceholderPage title="Operações" description="Busca e cadastro de operações" />} />
        <Route path="admin/operacoes/importar" element={<PlaceholderPage title="Importar Operações" />} />
        <Route path="admin/operacoes/cancelar" element={<PlaceholderPage title="Cancelar Importação de Operações" />} />

        {/* Admin — Logs */}
        <Route path="admin/logs" element={<AuditPage />} />
        <Route path="admin/acessos-corretores" element={<BrokerAccessPage />} />
        <Route path="admin/logs/acoes" element={<PlaceholderPage title="Log de Ações" description="Histórico de ações realizadas no sistema" />} />

        {/* Admin — Backup / BlackList */}
        <Route path="admin/backup" element={<PlaceholderPage title="Backup de Dados" description="Exportação e backup dos dados do sistema" />} />
        <Route path="admin/blacklist/cpf" element={<PlaceholderPage title="BlackList — Por CPF" description="Gerenciamento de CPFs na blacklist" />} />
        <Route path="admin/blacklist/telefone" element={<PlaceholderPage title="BlackList — Por Telefone" description="Gerenciamento de telefones na blacklist" />} />
        <Route path="admin/blacklist/importar-telefone" element={<PlaceholderPage title="BlackList — Importar Telefone" />} />

        {/* Config / Reports */}
        <Route path="configuracao-dashboard" element={<DashboardConfigPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="auditoria" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  )
}
