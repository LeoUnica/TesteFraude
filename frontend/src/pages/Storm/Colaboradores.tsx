import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { Users, Eye, AlertTriangle, Zap, CheckCircle } from 'lucide-react'

const PRIVILEGE_LABELS: Record<string, { label: string; color: string }> = {
  'Corretor Interno': { label: 'Corretor Interno', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  'Coordenador': { label: 'Coordenador', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  'Administrador': { label: 'Administrador', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  'Externo': { label: 'Externo', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

function PrivilegeBadge({ privilege }: { privilege: string }) {
  const cfg = PRIVILEGE_LABELS[privilege] ?? { label: privilege || '—', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status?.toLowerCase() === 'ativo' || status === '1' || status === 'active'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export default function StormColaboradoresPage() {
  const navigate = useNavigate()
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stormError, setStormError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20
  const [stormUsername, setStormUsername] = useState<string | null>(null)

  const [selected, setSelected] = useState<any>(null)
  const [detailModal, setDetailModal] = useState(false)

  useEffect(() => {
    api.get('/stormfin/status').then(r => {
      if (r.data?.connected || r.data?.ok) setStormUsername(r.data.username ?? null)
    }).catch(() => {})
  }, [])

  const load = async (p = page) => {
    setLoading(true)
    setStormError('')
    try {
      const params: any = { pagina: p }
      if (search) params.usuario = search
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/stormfin/colaboradores', { params })
      const data = res.data
      if (Array.isArray(data)) {
        setColaboradores(data)
        setTotal(data.length)
      } else {
        setColaboradores(data.items ?? data.data ?? [])
        setTotal(data.total ?? data.count ?? 0)
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message || ''
      if (msg.toLowerCase().includes('configur') || msg.toLowerCase().includes('credencial') || e.response?.status === 503 || e.response?.status === 401) {
        setStormError('Integração Storm não configurada. Configure as credenciais em Integrações.')
      } else {
        setStormError(msg || 'Erro ao carregar colaboradores Storm.')
      }
      setColaboradores([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPage(1) }, [search, filterStatus])

  const handlePage = (p: number) => { setPage(p); load(p) }

  const openDetail = (c: any) => { setSelected(c); setDetailModal(true) }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-red-700 dark:text-red-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Colaboradores Storm</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Lista de colaboradores cadastrados na plataforma Storm Fin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stormUsername && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
              <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
              <Zap size={13} className="text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Storm conectado como</span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{stormUsername}</span>
            </div>
          )}
          <button onClick={() => load(page)} className="btn-secondary text-sm">Atualizar</button>
        </div>
      </div>

      {/* Banner de erro Storm */}
      {stormError && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="flex-1">{stormError}</span>
          <button
            onClick={() => navigate('/integracoes')}
            className="ml-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Configurar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-64"
          placeholder="Buscar por nome ou usuário..."
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-40">
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">{total} colaborador{total !== 1 ? 'es' : ''}</span>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="table-header text-left">ID</th>
                    <th className="table-header text-left">Nome</th>
                    <th className="table-header text-left">Usuário</th>
                    <th className="table-header text-left">Privilégio</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">
                        {stormError ? 'Não foi possível carregar os colaboradores.' : 'Nenhum colaborador encontrado.'}
                      </td>
                    </tr>
                  ) : colaboradores.map((c, i) => (
                    <tr key={c.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <td className="table-cell font-mono text-xs text-gray-500 dark:text-gray-400">{c.id ?? '—'}</td>
                      <td className="table-cell font-medium text-gray-900 dark:text-gray-100">{c.nome ?? c.name ?? '—'}</td>
                      <td className="table-cell text-gray-600 dark:text-gray-300">{c.usuario ?? c.username ?? '—'}</td>
                      <td className="table-cell"><PrivilegeBadge privilege={c.privilegio ?? c.privilege ?? c.tipo ?? ''} /></td>
                      <td className="table-cell text-center"><StatusBadge status={c.status ?? ''} /></td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => openDetail(c)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                        >
                          <Eye size={14} />
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > LIMIT && (
              <Pagination page={page} total={total} limit={LIMIT} onPage={handlePage} />
            )}
          </>
        )}
      </div>

      {/* Modal de detalhes */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Detalhes do Colaborador" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <Users size={20} className="text-red-700 dark:text-red-400" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.nome ?? selected.name ?? '—'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{selected.usuario ?? selected.username ?? ''}</div>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <PrivilegeBadge privilege={selected.privilegio ?? selected.privilege ?? selected.tipo ?? ''} />
                <StatusBadge status={selected.status ?? ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(selected).map(([key, val]) => (
                <div key={key} className="space-y-0.5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{key}</div>
                  <div className="text-gray-900 dark:text-gray-100 break-all">{String(val ?? '—')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setDetailModal(false)} className="btn-secondary">Fechar</button>
        </div>
      </Modal>
    </div>
  )
}
