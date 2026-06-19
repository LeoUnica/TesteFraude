import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'
import Pagination from '../../components/ui/Pagination'

const TYPES = ['Externo', 'Interno', 'Balcão']

interface Broker {
  id: string; code: string; name: string; cpf_cnpj: string; type: string;
  status: string; group_id: string; group_name?: string; email?: string;
  phone?: string; created_at: string;
}
interface Group { id: string; name: string }

const EMPTY_FORM = { code: '', name: '', cpf_cnpj: '', type: 'Externo', group_id: '', email: '', phone: '', address: '', city: '', state: '' }

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Broker | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [filters, setFilters] = useState({ name: '', cpf_cnpj: '', type: '', status: '', group_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
      const res = await api.get(`/brokers?${params}`)
      setBrokers(res.data.data)
      setTotal(res.data.total)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filters])
  useEffect(() => { api.get('/broker-groups').then(r => setGroups(r.data)).catch(() => {}) }, [])

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setError(''); setModal('create') }
  const openEdit = (b: Broker) => { setSelected(b); setForm({ code: b.code, name: b.name, cpf_cnpj: b.cpf_cnpj, type: b.type, group_id: b.group_id || '', email: b.email || '', phone: b.phone || '', address: '', city: '', state: '' }); setError(''); setModal('edit') }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await api.post('/brokers', form)
      else await api.put(`/brokers/${selected?.id}`, form)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const toggleStatus = async (b: Broker) => {
    await api.patch(`/brokers/${b.id}/toggle-status`); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Corretores</h1>
          <p className="text-sm text-gray-500">{total} corretor(es) encontrado(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Novo Corretor</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input placeholder="Nome" value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} className="input-field text-xs" />
          <input placeholder="CPF/CNPJ" value={filters.cpf_cnpj} onChange={e => setFilters(f => ({ ...f, cpf_cnpj: e.target.value }))} className="input-field text-xs" />
          <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os tipos</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          <select value={filters.group_id} onChange={e => setFilters(f => ({ ...f, group_id: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os grupos</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <button onClick={() => setFilters({ name: '', cpf_cnpj: '', type: '', status: '', group_id: '' })} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Limpar filtros</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Código</th>
                <th className="table-header text-left">Nome</th>
                <th className="table-header text-left">CPF/CNPJ</th>
                <th className="table-header text-left">Tipo</th>
                <th className="table-header text-left">Grupo</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Cadastro</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {brokers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Nenhum corretor encontrado</td></tr>
              ) : brokers.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono text-xs text-blue-700">{b.code}</td>
                  <td className="table-cell font-medium">{b.name}</td>
                  <td className="table-cell font-mono text-xs">{b.cpf_cnpj}</td>
                  <td className="table-cell"><span className="badge-gray text-xs px-2 py-0.5 rounded">{b.type}</span></td>
                  <td className="table-cell text-gray-500">{b.group_name || '—'}</td>
                  <td className="table-cell">{statusBadge(b.status)}</td>
                  <td className="table-cell text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(b)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Editar</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => toggleStatus(b)} className={`text-xs font-medium ${b.status === 'ativo' ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                        {b.status === 'ativo' ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={total} limit={20} onPage={setPage} />
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Corretor' : 'Editar Corretor'}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="Auto gerado" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Nome completo" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CPF/CNPJ *</label>
            <input value={form.cpf_cnpj} onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))} className="input-field" placeholder="000.000.000-00" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Grupo</label>
            <select value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))} className="input-field">
              <option value="">Sem grupo</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="(11) 99999-9999" />
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
