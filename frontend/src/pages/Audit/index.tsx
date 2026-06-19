import { useEffect, useState } from 'react'
import api from '../../services/api'
import Pagination from '../../components/ui/Pagination'

const MODULES = ['AUTH', 'USUARIOS', 'CORRETORES', 'GRUPOS', 'PROPOSTAS', 'ANTIFRAUDE', 'CONVENIOS', 'BANCOS', 'INTEGRACOES']
const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'badge-success', LOGOUT: 'badge-gray', LOGIN_FALHA: 'badge-danger',
  CRIAR_USUARIO: 'badge-info', EDITAR_USUARIO: 'badge-info', EXCLUIR_USUARIO: 'badge-danger',
  BLOQUEAR_USUARIO: 'badge-warning', DESBLOQUEAR_USUARIO: 'badge-success',
  CRIAR_PROPOSTA: 'badge-info', EDITAR_PROPOSTA: 'badge-info', ANALISE_ANTIFRAUDE: 'badge-purple',
  CRIAR_CORRETOR: 'badge-info', EDITAR_CORRETOR: 'badge-info',
  TROCA_SENHA: 'badge-warning', REDEFINIR_SENHA: 'badge-warning',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', module: '', user_id: '' })
  const [users, setUsers] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
      const res = await api.get(`/reports/audit?${params}`)
      setLogs(res.data.data)
      setTotal(res.data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filters])
  useEffect(() => { api.get('/users').then(r => setUsers(r.data)).catch(() => {}) }, [])

  const exportLogs = () => {
    const csv = ['Data,Usuario,Módulo,Ação,Entidade', ...logs.map(l => `"${l.created_at}","${l.user_name || 'Sistema'}","${l.module}","${l.action}","${l.entity_id || ''}"`)].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `auditoria_${Date.now()}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoria do Sistema</h1>
          <p className="text-sm text-gray-500">{total} registro(s) no log</p>
        </div>
        <button onClick={exportLogs} disabled={logs.length === 0} className="btn-secondary disabled:opacity-40">📥 Exportar CSV</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data inicial</label>
            <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="input-field text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data final</label>
            <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="input-field text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Módulo</label>
            <select value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))} className="input-field text-xs">
              <option value="">Todos</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuário</label>
            <select value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))} className="input-field text-xs">
              <option value="">Todos</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setFilters({ date_from: '', date_to: '', module: '', user_id: '' })} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Limpar filtros</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Data/Hora</th>
                <th className="table-header text-left">Usuário</th>
                <th className="table-header text-center">Módulo</th>
                <th className="table-header text-left">Ação</th>
                <th className="table-header text-left">Entidade</th>
                <th className="table-header text-center">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum registro encontrado</td></tr>
              ) : logs.map(log => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-xs font-mono text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="table-cell">
                      <div className="font-medium">{log.user_name || <span className="italic text-gray-400">Sistema</span>}</div>
                    </td>
                    <td className="table-cell text-center"><span className="badge-gray text-xs font-mono">{log.module}</span></td>
                    <td className="table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'badge-gray'}`}>{log.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-400 font-mono">{log.entity_id ? `${log.entity_type}:${log.entity_id.slice(0, 8)}...` : '—'}</td>
                    <td className="table-cell text-center">
                      {(log.old_value || log.new_value) && (
                        <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs text-blue-600 hover:text-blue-800">
                          {expanded === log.id ? 'Ocultar' : 'Ver'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={6} className="px-4 pb-3 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.old_value && <div><div className="font-semibold text-gray-500 mb-1">Antes:</div><pre className="bg-white border rounded p-2 text-gray-600 overflow-auto max-h-32">{JSON.stringify(JSON.parse(log.old_value), null, 2)}</pre></div>}
                          {log.new_value && <div><div className="font-semibold text-gray-500 mb-1">Depois:</div><pre className="bg-white border rounded p-2 text-gray-600 overflow-auto max-h-32">{JSON.stringify(JSON.parse(log.new_value), null, 2)}</pre></div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={total} limit={50} onPage={setPage} />
      </div>
    </div>
  )
}
