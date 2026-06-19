import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'

const EMPTY_FORM = { code: '', name: '', api_url: '', api_key: '', username: '', password: '', has_import_phase: false, has_analysis_phase: false, has_checklist_phase: false, has_approval_phase: false, has_rejection_phase: false, import_user: '', approval_user: '' }

export default function BanksPage() {
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try { const res = await api.get('/banks'); setBanks(res.data) } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await api.post('/banks', form)
      else await api.put(`/banks/${selected?.id}`, form)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleToggle = async (b: any) => { await api.patch(`/banks/${b.id}/toggle-status`); load() }

  const openEdit = (b: any) => {
    setSelected(b)
    setForm({ code: b.code, name: b.name, api_url: b.api_url || '', api_key: b.api_key || '', username: b.username || '', password: '', has_import_phase: !!b.has_import_phase, has_analysis_phase: !!b.has_analysis_phase, has_checklist_phase: !!b.has_checklist_phase, has_approval_phase: !!b.has_approval_phase, has_rejection_phase: !!b.has_rejection_phase, import_user: b.import_user || '', approval_user: b.approval_user || '' })
    setError('')
    setModal('edit')
  }

  const PHASES = [
    { key: 'has_import_phase', label: 'Importação' },
    { key: 'has_analysis_phase', label: 'Análise' },
    { key: 'has_checklist_phase', label: 'Checklist' },
    { key: 'has_approval_phase', label: 'Aprovação' },
    { key: 'has_rejection_phase', label: 'Reprovação' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bancos</h1>
          <p className="text-sm text-gray-500">{banks.length} banco(s)</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setError(''); setSelected(null); setModal('create') }} className="btn-primary">+ Novo Banco</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Código</th>
                <th className="table-header text-left">Nome</th>
                <th className="table-header text-center">Importação</th>
                <th className="table-header text-center">Análise</th>
                <th className="table-header text-center">Checklist</th>
                <th className="table-header text-center">Aprovação</th>
                <th className="table-header text-center">Reprovação</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {banks.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Nenhum banco cadastrado</td></tr>
              ) : banks.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs font-bold text-blue-700">{b.code}</td>
                  <td className="table-cell font-medium">{b.name}</td>
                  {['has_import_phase', 'has_analysis_phase', 'has_checklist_phase', 'has_approval_phase', 'has_rejection_phase'].map(k => (
                    <td key={k} className="table-cell text-center">{(b as any)[k] ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  ))}
                  <td className="table-cell text-center">{statusBadge(b.status)}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(b)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleToggle(b)} className={`text-xs font-medium ${b.status === 'ativo' ? 'text-red-500' : 'text-emerald-600'}`}>{b.status === 'ativo' ? 'Inativar' : 'Ativar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Banco' : 'Editar Banco'} size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Código *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="Ex: BMG" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">URL da API</label><input value={form.api_url} onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))} className="input-field" placeholder="https://api.banco.com" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Chave de API</label><input value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} className="input-field" type="password" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Usuário Importação</label><input value={form.import_user} onChange={e => setForm(f => ({ ...f, import_user: e.target.value }))} className="input-field" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Usuário Aprovação</label><input value={form.approval_user} onChange={e => setForm(f => ({ ...f, approval_user: e.target.value }))} className="input-field" /></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Fases da Esteira</label>
            <div className="flex gap-4 flex-wrap">
              {PHASES.map(p => (
                <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(form as any)[p.key]} onChange={e => setForm(f => ({ ...f, [p.key]: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>
    </div>
  )
}
