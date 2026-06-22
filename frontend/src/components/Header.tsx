import { useAuthStore } from '../store/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Menu, Sun, Moon, ChevronDown, LogOut, Zap } from 'lucide-react'
import api from '../services/api'

const BREADCRUMBS: Record<string, string> = {
  '/': 'Dashboard',
  '/corretores': 'Corretores / Manutenção',
  '/grupos': 'Corretores / Grupos',
  '/propostas': 'Propostas',
  '/antifraude': 'Antifraude / Mesa de Crédito',
  '/antifraude/regras': 'Antifraude / Motor de Regras',
  '/integracoes': 'Integrações Bancárias',
  '/relatorios': 'Relatórios',
  '/auditoria': 'Auditoria do Sistema',
  '/admin/usuarios': 'Administração / Usuários',
  '/admin/convenios': 'Administração / Convênios',
  '/admin/bancos': 'Administração / Bancos',
  '/admin/produtos': 'Administração / Produtos',
}

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [stormUser, setStormUser] = useState<string | null>(null)

  useEffect(() => {
    api.get('/stormfin/status').then(r => {
      if (r.data?.connected || r.data?.ok) setStormUser(r.data.username ?? null)
    }).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const breadcrumb = BREADCRUMBS[location.pathname] || 'Unica Promotora'

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu size={20} />
        </button>
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className="text-red-900 dark:text-red-400 font-medium">
              {breadcrumb.split(' / ')[0]}
            </span>
            {breadcrumb.includes(' / ') && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {breadcrumb.split(' / ')[1]}
                </span>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {stormUser && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg">
            <Zap size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Storm:</span>
            <span className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold">{stormUser}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>

        <button
          onClick={toggleTheme}
          title={dark ? 'Modo Dia' : 'Modo Noite'}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {dark ? (
            <Sun size={20} className="text-yellow-400" />
          ) : (
            <Moon size={20} />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 bg-red-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                {user?.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</div>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {user?.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    handleLogout()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
