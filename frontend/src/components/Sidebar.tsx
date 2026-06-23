import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'
import {
  LayoutDashboard, Users, FileText, Shield, BarChart3, Settings,
  ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, LayoutGrid, Zap, Plug,
} from 'lucide-react'

interface NavLeaf { label: string; path: string }
interface NavLevel3 { label: string; path?: string; children?: NavLeaf[] }
interface NavLevel2 { label: string; path?: string; children?: NavLevel3[] }
interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  permission: string
  exact?: boolean
  children?: NavLevel2[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', permission: 'dashboard', exact: true },
  {
    label: 'Corretores', icon: Users, permission: 'corretores',
    children: [
      { label: 'Buscar/Cadastrar', path: '/corretores' },
      {
        label: 'Importação',
        children: [
          { label: 'Corretores', path: '/corretores/importacao' },
          { label: 'E-mails/Telefones', path: '/corretores/importacao/emails-telefones' },
        ],
      },
      {
        label: 'Grupos Corretores',
        children: [
          { label: 'Buscar/Cadastrar', path: '/grupos' },
          { label: 'Importar', path: '/grupos/importar' },
        ],
      },
    ],
  },
  {
    label: 'Propostas', icon: FileText, permission: 'propostas',
    children: [
      {
        label: 'Manutenção de Propostas',
        children: [
          { label: 'Buscar', path: '/propostas/buscar' },
          { label: 'Cadastrar', path: '/propostas/cadastrar' },
          { label: 'Averbar', path: '/propostas/averbar' },
        ],
      },
      {
        label: 'Importações',
        children: [
          {
            label: 'Propostas',
            children: [
              { label: 'Importar', path: '/importacoes/importar' },
              { label: 'Cancelar', path: '/importacoes/cancelar' },
              { label: 'Mapeamento de Layout', path: '/importacoes/layout' },
              { label: 'Mapeamento de Dados', path: '/importacoes/dados' },
              { label: 'Man. Map. Dados', path: '/importacoes/man-map-dados' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'Antifraude', icon: Shield, permission: 'antifraude',
    children: [
      { label: 'Mesa de Crédito', path: '/antifraude' },
      {
        label: 'Regras',
        children: [
          { label: 'Filtros', path: '/antifraude/filtros' },
          { label: 'Motor de Regras', path: '/antifraude/regras' },
        ],
      },
      {
        label: 'Importação de Propostas',
        children: [
          { label: 'Acomp. Imp. Propostas', path: '/importacoes' },
          { label: 'Importar', path: '/importacoes/importar' },
          { label: 'Mapeamento de Layout', path: '/importacoes/layout' },
          { label: 'Mapeamento de Dados', path: '/importacoes/dados' },
        ],
      },
    ],
  },
  { label: 'Integracoes', icon: Plug, path: '/integracoes', permission: 'configuracoes' },
  {
    label: 'Storm', icon: Zap, permission: 'antifraude',
    children: [
      { label: 'Colaboradores', path: '/storm/colaboradores' },
      { label: 'Contratos', path: '/storm/contratos' },
      { label: 'Antifraude Storm', path: '/storm/antifraude' },
      { label: 'Simulacao', path: '/storm/simulacao' },
    ],
  },
  {
    label: 'Administracao', icon: Settings, permission: 'configuracoes',
    children: [
      {
        label: 'Cadastros',
        children: [
          { label: 'Usuarios', path: '/admin/usuarios' },
          { label: 'Perfil de Usuário', path: '/admin/perfis' },
          { label: 'Banco', path: '/admin/bancos' },
          { label: 'Convenio', path: '/admin/convenios' },
          {
            label: 'Produtos',
            children: [
              { label: 'Buscar/Cadastrar', path: '/admin/produtos' },
              { label: 'Importar', path: '/admin/produtos/importar' },
              { label: 'Cancelar', path: '/admin/produtos/cancelar' },
            ],
          },
          {
            label: 'CPF/CNPJ Restritos',
            children: [
              { label: 'Buscar/Cadastrar', path: '/admin/cpf-cnpj-restritos' },
              { label: 'Importar', path: '/admin/cpf-cnpj-restritos/importar' },
              { label: 'Cancelar', path: '/admin/cpf-cnpj-restritos/cancelar' },
            ],
          },
        ],
      },
      {
        label: 'Operações',
        children: [
          { label: 'Buscar/Cadastrar', path: '/admin/operacoes' },
          { label: 'Importar', path: '/admin/operacoes/importar' },
          { label: 'Cancelar', path: '/admin/operacoes/cancelar' },
        ],
      },
      {
        label: 'Logs',
        children: [
          { label: 'Acessos', path: '/admin/logs' },
          { label: 'Acessos dos Corretores', path: '/admin/acessos-corretores' },
          { label: 'Ações', path: '/admin/logs/acoes' },
        ],
      },
      { label: 'Backup dados', path: '/admin/backup' },
      {
        label: 'BlackList',
        children: [
          { label: 'Por CPF', path: '/admin/blacklist/cpf' },
          { label: 'Por Telefone', path: '/admin/blacklist/telefone' },
          { label: 'Importar Telefone', path: '/admin/blacklist/importar-telefone' },
        ],
      },
    ],
  },
  { label: 'Configuracao Dashboard', icon: LayoutGrid, path: '/configuracao-dashboard', permission: 'dashboard' },
  { label: 'Relatorios', icon: BarChart3, path: '/relatorios', permission: 'relatorios' },
]

interface SidebarProps { collapsed: boolean; onToggle: () => void }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => new Set<string>())

  const toggle = (key: string) => {
    setOpenMenus(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Fecha este e todos os descendentes
        for (const k of [...next]) {
          if (k === key || k.startsWith(key + '::')) next.delete(k)
        }
      } else {
        // Fecha todos os irmãos (mesmo nível, mesmo pai) e seus descendentes
        const parts = key.split('::')
        const depth = parts.length
        const parentPrefix = parts.slice(0, -1).join('::')
        for (const k of [...next]) {
          const kParts = k.split('::')
          if (kParts.length === depth && kParts.slice(0, -1).join('::') === parentPrefix) {
            for (const dk of [...next]) {
              if (dk === k || dk.startsWith(k + '::')) next.delete(dk)
            }
          }
        }
        next.add(key)
      }
      return next
    })
  }
  const isOpen = (key: string) => openMenus.has(key)

  const isPathActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'))

  const allPathsOf = (item: NavItem): string[] => {
    const paths: string[] = []
    if (item.path) paths.push(item.path)
    item.children?.forEach(c => {
      if (c.path) paths.push(c.path)
      c.children?.forEach(gc => {
        if (gc.path) paths.push(gc.path)
        gc.children?.forEach(ggc => paths.push(ggc.path))
      })
    })
    return paths
  }

  const chevron = (open: boolean, size = 14) =>
    open ? <ChevronUp size={size} className="text-slate-500 flex-shrink-0" />
         : <ChevronDown size={size} className="text-slate-500 flex-shrink-0" />

  return (
    <div className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 h-16">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img src="/Unica.png" alt="Unica Promotora" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <div className="text-sm font-bold text-white leading-tight">Unica Promotora</div>
              <div className="text-xs text-slate-400">Gestao de Credito</div>
            </div>
          </div>
        ) : (
          <img src="/Unica.png" alt="Unica Promotora" className="w-8 h-8 object-contain rounded-lg mx-auto" />
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

          // Top-level leaf (no children)
          if (!item.children) {
            return (
              <NavLink
                key={item.path}
                to={item.path!}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive
                    ? 'text-red-400 bg-slate-800 border-r-2 border-red-700'
                    : 'text-white hover:text-red-400 hover:bg-slate-800'}`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            )
          }

          // Top-level group (has children)
          const itemKey = item.label
          const itemActive = allPathsOf(item).some(p => isPathActive(p))

          return (
            <div key={item.label}>
              {/* Level 1 button */}
              <button
                onClick={() => !collapsed && toggle(itemKey)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  itemActive ? 'text-red-400 bg-slate-800' : 'text-white hover:text-red-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </div>
                {!collapsed && chevron(isOpen(itemKey))}
              </button>

              {/* Level 2 */}
              {!collapsed && isOpen(itemKey) && (
                <div className="bg-slate-950 border-l-2 border-red-900 ml-4">
                  {item.children.map((child) => {
                    // Level 2 leaf
                    if (!child.children) {
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path!}
                          className={({ isActive }) =>
                            `block px-6 py-2 text-sm transition-colors ${isActive
                              ? 'text-red-400 bg-slate-800 font-medium'
                              : 'text-white hover:text-red-400 hover:bg-slate-800'}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      )
                    }

                    // Level 2 group
                    const childKey = `${itemKey}::${child.label}`
                    const childActive = child.children.some(gc =>
                      gc.path ? isPathActive(gc.path) : gc.children?.some(ggc => isPathActive(ggc.path)) ?? false
                    )

                    return (
                      <div key={child.label}>
                        <button
                          onClick={() => toggle(childKey)}
                          className={`w-full flex items-center justify-between px-6 py-2 text-sm transition-colors ${
                            childActive ? 'text-red-400 bg-slate-800' : 'text-white hover:text-red-400 hover:bg-slate-800'
                          }`}
                        >
                          <span>{child.label}</span>
                          {chevron(isOpen(childKey), 12)}
                        </button>

                        {/* Level 3 */}
                        {isOpen(childKey) && (
                          <div className="bg-slate-900 border-l border-red-900/50 ml-4">
                            {child.children.map((gc) => {
                              // Level 3 leaf
                              if (!gc.children) {
                                return (
                                  <NavLink
                                    key={gc.path}
                                    to={gc.path!}
                                    className={({ isActive }) =>
                                      `block px-6 py-1.5 text-xs transition-colors ${isActive
                                        ? 'text-red-400 bg-slate-800 font-medium'
                                        : 'text-white hover:text-red-400 hover:bg-slate-800'}`
                                    }
                                  >
                                    {gc.label}
                                  </NavLink>
                                )
                              }

                              // Level 3 group
                              const gcKey = `${childKey}::${gc.label}`
                              const gcActive = gc.children.some(ggc => isPathActive(ggc.path))

                              return (
                                <div key={gc.label}>
                                  <button
                                    onClick={() => toggle(gcKey)}
                                    className={`w-full flex items-center justify-between px-6 py-1.5 text-xs transition-colors ${
                                      gcActive ? 'text-red-400 bg-slate-800' : 'text-white hover:text-red-400 hover:bg-slate-800'
                                    }`}
                                  >
                                    <span>{gc.label}</span>
                                    {chevron(isOpen(gcKey), 10)}
                                  </button>

                                  {/* Level 4 */}
                                  {isOpen(gcKey) && (
                                    <div className="bg-slate-800/50 border-l border-red-900/30 ml-4">
                                      {gc.children.map((ggc) => (
                                        <NavLink
                                          key={ggc.path}
                                          to={ggc.path}
                                          className={({ isActive }) =>
                                            `block px-5 py-1 text-xs transition-colors ${isActive
                                              ? 'text-red-400 bg-slate-800 font-medium'
                                              : 'text-white hover:text-red-400 hover:bg-slate-800'}`
                                          }
                                        >
                                          {ggc.label}
                                        </NavLink>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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
