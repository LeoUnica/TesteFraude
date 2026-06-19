import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'

export default function ConveniosPage() {
  const [convenios, setConvenios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [filters, setFilters] = useState({ name: '', status: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
      const res = await api.get(`/convenios?${params}`)
      setConvenios(res.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await api.post('/convenios', form)
      else await api.put(`/convenios/${selected?.id}`, form)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleToggle = async (c: any) => { await api.patch(`/convenios/${c.id}/toggle-status`); load() }
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este convênio?')) return
    try { await api.delete(`/convenios/${id}`); load() } catch (e: any) { alert(e.response?.data?.error) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convênios</h1>
          <p className="text-sm text-gray-500">{convenios.length} convênio(s)</p>
        </div>
        <button onClick={() => { setForm({ code: '', name: '', description: '' }); setError(''); setSelected(null); setModal('create') }} className="btn-primary">+ Novo Convênio</button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <strong>⚠ Atenção:</strong> Apenas convênios ativos podem ser selecionados nas propostas. Convênios inativos não aparecem nos demais módulos.
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <input placeholder="Nome do convênio" value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} className="input-field text-xs" />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Código</th>
                <th className="table-header text-left">Nome</th>
                <th className="table-header text-left">Descrição</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {convenios.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum convênio encontrado</td></tr>
              ) : convenios.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono text-xs font-bold text-blue-700">{c.code}</td>
                  <td className="table-cell font-medium">{c.name}</td>
                  <td className="table-cell text-gray-500 max-w-xs truncate">{c.description || '—'}</td>
                  <td className="table-cell text-center">{statusBadge(c.status)}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelected(c); setForm({ code: c.code, name: c.name, description: c.description || '' }); setError(''); setModal('edit') }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleToggle(c)} className={`text-xs font-medium ${c.status === 'ativo' ? 'text-red-500' : 'text-emerald-600'}`}>{c.status === 'ativo' ? 'Inativar' : 'Ativar'}</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Convênio' : 'Editar Convênio'} size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Código *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="Ex: INSS" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field h-20 resize-none" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>
    </div>
  )
}
