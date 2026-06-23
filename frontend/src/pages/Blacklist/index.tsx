import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Upload, Search, RefreshCw } from 'lucide-react'
import api from '../../services/api'

interface BlacklistEntry {
  id: string
  type: string
  value: string
  reason: string
  source: string
  status: string
  created_at: string
}

const TYPE_LABELS: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', phone: 'Telefone', email: 'E-mail' }
const TYPE_COLORS: Record<string, string> = {
  cpf: 'bg-red-100 text-red-700',
  cnpj: 'bg-orange-100 text-orange-700',
  phone: 'bg-purple-100 text-purple-700',
  email: 'bg-blue-100 text-blue-700',
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ type: 'cpf', value: '', reason: '', source: '' })
  const [saving, setSaving] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, per_page: 20 }
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      const res = await api.get('/blacklist/', { params })
      setEntries(res.data.data)
      setTotal(res.data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search, typeFilter])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/blacklist/', form)
      setShowModal(false)
      setForm({ type: 'cpf', value: '', reason: '', source: '' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover da blacklist?')) return
    await api.delete(`/blacklist/${id}`)
    load()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/blacklist/import', fd)
      setImportResult({ inserted: res.data.inserted, skipped: res.data.skipped })
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao importar')
    } finally { setImportLoading(false); e.target.value = '' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield size={24} className="text-red-600" /> Blacklist
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">CPF, CNPJ, telefones e e-mails bloqueados</p>
        </div>
        <div className="flex gap-2">
          <label className={`btn-secondary flex items-center gap-2 cursor-pointer ${importLoading ? 'opacity-60' : ''}`}>
            <Upload size={16} /> {importLoading ? 'Importando...' : 'Importar'}
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} disabled={importLoading} />
          </label>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {importResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center justify-between">
          <span>✅ {importResult.inserted} inserido(s), {importResult.skipped} ignorado(s)</span>
          <button onClick={() => setImportResult(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar valor..." className="input-field pl-9"
          />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="input-field w-40">
          <option value="">Todos os tipos</option>
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="phone">Telefone</option>
          <option value="email">E-mail</option>
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-1">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{total} registro(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                {['Tipo', 'Valor', 'Motivo', 'Fonte', 'Adicionado em', 'Ações'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">Carregando...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">Nenhum registro encontrado</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[e.type] || 'bg-gray-100 text-gray-700'}`}>
                      {TYPE_LABELS[e.type] || e.type}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs">{e.value}</td>
                  <td className="table-cell text-gray-600 dark:text-gray-400">{e.reason || '—'}</td>
                  <td className="table-cell text-gray-600 dark:text-gray-400">{e.source || '—'}</td>
                  <td className="table-cell text-gray-500">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="table-cell">
                    <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs">Anterior</button>
            <span className="text-xs text-gray-500">Página {page} de {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary text-xs">Próxima</button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Adicionar à Blacklist</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field" required>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="phone">Telefone</option>
                  <option value="email">E-mail</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                <input type="text" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="input-field" placeholder="CPF, CNPJ, telefone ou e-mail" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="input-field" placeholder="Ex: Fraude comprovada" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonte</label>
                <input type="text" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="input-field" placeholder="Ex: Análise interna, SERASA" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Adicionar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
