import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'

const ACTIONS = [
  { value: 'aprovar', label: '✅ Aprovar Automaticamente' },
  { value: 'reprovar', label: '❌ Reprovar Automaticamente' },
  { value: 'sinalizar', label: '⚠ Apenas Sinalizar' },
  { value: 'encaminhar', label: '🔀 Encaminhar para Análise' },
]

const ACTION_COLORS: Record<string, string> = {
  aprovar: 'text-emerald-600 bg-emerald-50',
  reprovar: 'text-red-600 bg-red-50',
  sinalizar: 'text-amber-600 bg-amber-50',
  encaminhar: 'text-blue-600 bg-blue-50',
}

export default function AntifraudRulesPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [banks, setBanks] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [convenios, setConvenios] = useState<any[]>([])
  const [filters, setFilters] = useState({ pending_type: '', bank_id: '', group_id: '', status: '' })
  const [form, setForm] = useState({ priority: '1', pending_type: '', bank_id: '', group_id: '', convenio_id: '', product_id: '', action: 'encaminhar', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
      const res = await api.get(`/antifraud/rules?${params}`)
      setRules(res.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])
  useEffect(() => {
    api.get('/banks').then(r => setBanks(r.data)).catch(() => {})
    api.get('/broker-groups').then(r => setGroups(r.data)).catch(() => {})
    api.get('/convenios').then(r => setConvenios(r.data)).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, priority: parseInt(form.priority) }
      if (modal === 'create') await api.post('/antifraud/rules', payload)
      else await api.put(`/antifraud/rules/${selected?.id}`, payload)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleToggle = async (rule: any) => {
    await api.patch(`/antifraud/rules/${rule.id}/toggle`); load()
  }

  const handleDuplicate = async (rule: any) => {
    await api.post(`/antifraud/rules/${rule.id}/duplicate`); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return
    await api.delete(`/antifraud/rules/${id}`); load()
  }

  const openEdit = (r: any) => {
    setSelected(r)
    setForm({ priority: String(r.priority), pending_type: r.pending_type, bank_id: r.bank_id || '', group_id: r.group_id || '', convenio_id: r.convenio_id || '', product_id: r.product_id || '', action: r.action, description: r.description || '' })
    setError('')
    setModal('edit')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motor de Regras Antifraude</h1>
          <p className="text-sm text-gray-500">{rules.length} regra(s) configurada(s)</p>
        </div>
        <button onClick={() => { setForm({ priority: String(rules.length + 1), pending_type: '', bank_id: '', group_id: '', convenio_id: '', product_id: '', action: 'encaminhar', description: '' }); setError(''); setSelected(null); setModal('create') }} className="btn-primary">+ Nova Regra</button>
      </div>

      <div className="card p-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
          <strong>⚙️ Como funciona:</strong> O motor avalia as propostas em ordem de prioridade (menor número = maior prioridade). A primeira regra correspondente é aplicada. Blacklists sempre passam por análise manual.
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input placeholder="Tipo de pendência" value={filters.pending_type} onChange={e => setFilters(f => ({ ...f, pending_type: e.target.value }))} className="input-field text-xs" />
          <select value={filters.bank_id} onChange={e => setFilters(f => ({ ...f, bank_id: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os bancos</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filters.group_id} onChange={e => setFilters(f => ({ ...f, group_id: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os grupos</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
            <option value="">Todos</option>
            <option value="ativo">Ativas</option>
            <option value="inativo">Inativas</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-center w-16">Prioridade</th>
                <th className="table-header text-left">Tipo de Pendência</th>
                <th className="table-header text-left">Banco</th>
                <th className="table-header text-left">Grupo</th>
                <th className="table-header text-left">Convênio</th>
                <th className="table-header text-left">Ação Automática</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Nenhuma regra configurada</td></tr>
              ) : rules.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.status === 'inativo' ? 'opacity-50' : ''}`}>
                  <td className="table-cell text-center">
                    <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">{r.priority}</span>
                  </td>
                  <td className="table-cell font-medium">{r.pending_type}</td>
                  <td className="table-cell text-gray-500">{r.bank_name || <span className="text-gray-300 italic">Todos</span>}</td>
                  <td className="table-cell text-gray-500">{r.group_name || <span className="text-gray-300 italic">Todos</span>}</td>
                  <td className="table-cell text-gray-500">{r.convenio_name || <span className="text-gray-300 italic">Todos</span>}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ACTION_COLORS[r.action] || 'text-gray-600 bg-gray-100'}`}>
                      {ACTIONS.find(a => a.value === r.action)?.label || r.action}
                    </span>
                  </td>
                  <td className="table-cell text-center">{statusBadge(r.status)}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleToggle(r)} className={`text-xs font-medium ${r.status === 'ativo' ? 'text-gray-500 hover:text-gray-700' : 'text-emerald-600 hover:text-emerald-800'}`}>{r.status === 'ativo' ? 'Desativar' : 'Ativar'}</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleDuplicate(r)} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Duplicar</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Nova Regra Antifraude' : 'Editar Regra'} size="md">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prioridade *</label>
              <input type="number" min="1" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ação Automática *</label>
              <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} className="input-field">
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Pendência *</label>
            <input value={form.pending_type} onChange={e => setForm(f => ({ ...f, pending_type: e.target.value }))} className="input-field" placeholder="Ex: Blacklist CPF, Duplicidade, Score Baixo..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Banco (opcional)</label>
              <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))} className="input-field">
                <option value="">Todos os bancos</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Grupo (opcional)</label>
              <select value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))} className="input-field">
                <option value="">Todos os grupos</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Convênio (opcional)</label>
              <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className="input-field">
                <option value="">Todos os convênios</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field h-20 resize-none" placeholder="Descreva o objetivo desta regra..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar Regra'}</button>
        </div>
      </Modal>
    </div>
  )
}
