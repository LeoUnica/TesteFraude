import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  LayoutGrid,
  Zap,
  Plug,
} from 'lucide-react'

interface NavChild {
  label: string
  path?: string
  children?: { label: string; path: string }[]
}

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  permission: string
  exact?: boolean
  children?: NavChild[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    permission: 'dashboard',
    exact: true,
  },
  {
    label: 'Corretores',
    icon: Users,
    permission: 'corretores',
    children: [
      { label: 'Buscar/Cadastrar', path: '/corretores' },
      { label: 'Importacao', path: '/corretores/importacao' },
      {
        label: 'Grupos',
        children: [
          { label: 'Buscar/Cadastrar', path: '/grupos' },
          { label: 'Importar', path: '/grupos/importar' },
        ],
      },
    ],
  },
  {
    label: 'Propostas',
    icon: FileText,
    permission: 'propostas',
    children: [
      { label: 'Manutencao', path: '/propostas' },
      { label: 'Buscar Proposta', path: '/propostas/buscar' },
      { label: 'Cadastrar Proposta', path: '/propostas/cadastrar' },
      { label: 'Averbar Proposta', path: '/propostas/averbar' },
    ],
  },
  {
    label: 'Antifraude',
    icon: Shield,
    permission: 'antifraude',
    children: [
      { label: 'Mesa de Credito', path: '/antifraude' },
      {
        label: 'Regras',
        children: [
          { label: 'Filtros', path: '/antifraude/filtros' },
          { label: 'Motor de Regras', path: '/antifraude/regras' },
        ],
      },
    ],
  },
  {
    label: 'Integracoes',
    icon: Plug,
    path: '/integracoes',
    permission: 'configuracoes',
  },
  {
    label: 'Storm',
    icon: Zap,
    permission: 'antifraude',
    children: [
      { label: 'Colaboradores', path: '/storm/colaboradores' },
      { label: 'Contratos', path: '/storm/contratos' },
      { label: 'Antifraude Storm', path: '/storm/antifraude' },
      { label: 'Simulacao', path: '/storm/simulacao' },
    ],
  },
  {
    label: 'Importacao de Propostas',
    icon: Upload,
    permission: 'importacoes',
    children: [
      { label: 'Acompanhamento', path: '/importacoes' },
      { label: 'Importar', path: '/importacoes/importar' },
      { label: 'Mapeamento de Layout', path: '/importacoes/layout' },
      { label: 'Mapeamento de Dados', path: '/importacoes/dados' },
      { label: 'Retornos de Banco', path: '/importacoes/retornos' },
      { label: 'Painel de Pendencias', path: '/importacoes/pendencias' },
    ],
  },
  {
    label: 'Administracao',
    icon: Settings,
    permission: 'configuracoes',
    children: [
      { label: 'Usuarios', path: '/admin/usuarios' },
      { label: 'Perfis de Acesso', path: '/admin/perfis' },
      { label: 'Convenios', path: '/admin/convenios' },
      { label: 'Bancos', path: '/admin/bancos' },
      { label: 'Produtos', path: '/admin/produtos' },
      { label: 'Logs de Acesso', path: '/admin/logs' },
      { label: 'Acessos Corretores', path: '/admin/acessos-corretores' },
    ],
  },
  {
    label: 'Configuracao Dashboard',
    icon: LayoutGrid,
    path: '/configuracao-dashboard',
    permission: 'dashboard',
  },
  {
    label: 'Relatorios',
    icon: BarChart3,
    path: '/relatorios',
    permission: 'relatorios',
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  const allPathsOf = (item: NavItem): string[] => {
    const paths: string[] = []
    if (item.path) paths.push(item.path)
    if (item.children) {
      item.children.forEach(c => {
        if ('path' in c && c.path) paths.push(c.path)
        if ('children' in c && c.children) {
          c.children.forEach(gc => { if (gc.path) paths.push(gc.path) })
        }
      })
    }
    return paths
  }

  const defaultOpen = NAV_ITEMS.filter(item => {
    if (!item.children) return false
    return allPathsOf(item).some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
  }).map(i => i.label)

  const [openMenus, setOpenMenus] = useState<string[]>(defaultOpen.length ? defaultOpen : ['Corretores', 'Propostas', 'Antifraude', 'Administracao'])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    )
  }

  const isMenuOpen = (label: string) => openMenus.includes(label)

  return (
    <div
      className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen flex-shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 h-16">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Unica Promotora</div>
              <div className="text-xs text-slate-400">Gestao de Credito</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-red-900 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto">
            U
          </div>
        )}
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
          <div className="text-xs text-slate-400">Logado como</div>
          <div className="text-sm font-medium text-white truncate">{user.name}</div>
          <div className="text-xs text-red-400">{user.role}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null

          const Icon = item.icon

          if (item.children) {
            const isOpen = isMenuOpen(item.label)
            const allPaths = allPathsOf(item)
            const isActive = allPaths.some(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p + '/')))

            return (
              <div key={item.label}>
                {/* Level-1 parent button */}
                <button
                  onClick={() => !collapsed && toggleMenu(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'text-red-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    isOpen
                      ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
                      : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
                  )}
                </button>

                {/* Level-1 children */}
                {!collapsed && isOpen && (
                  <div className="bg-slate-950 border-l-2 border-red-900 ml-4">
                    {item.children.map((child) => {
                      // Level-2 group (has its own children)
                      if ('children' in child && child.children) {
                        const groupOpen = isMenuOpen(child.label)
                        const groupActive = child.children.some(gc => location.pathname === gc.path)
                        return (
                          <div key={child.label}>
                            <button
                              onClick={() => toggleMenu(child.label)}
                              className={`w-full flex items-center justify-between px-6 py-2 text-sm transition-colors ${
                                groupActive
                                  ? 'text-red-400 bg-slate-800'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              <span>{child.label}</span>
                              {groupOpen
                                ? <ChevronUp size={12} className="text-slate-500" />
                                : <ChevronDown size={12} className="text-slate-500" />
                              }
                            </button>
                            {/* Level-3 grandchildren */}
                            {groupOpen && (
                              <div className="bg-slate-900 border-l border-red-900/50 ml-4">
                                {child.children.map((gc) => (
                                  <NavLink
                                    key={gc.path}
                                    to={gc.path}
                                    className={({ isActive }) =>
                                      `block px-6 py-1.5 text-xs transition-colors ${
                                        isActive
                                          ? 'text-red-400 bg-slate-800 font-medium'
                                          : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                      }`
                                    }
                                  >
                                    {gc.label}
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      }

                      // Level-2 leaf (direct path)
                      if ('path' in child && child.path) {
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            end={child.path === '/'}
                            className={({ isActive }) =>
                              `block px-6 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'text-red-400 bg-slate-800 font-medium'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        )
                      }

                      return null
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Top-level leaf (no children)
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-red-400 bg-slate-800 border-r-2 border-red-700'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </div>
  )
}
