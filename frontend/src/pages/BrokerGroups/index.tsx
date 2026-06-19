import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'

interface Group {
  id: string; code: string; name: string; description?: string;
  status: string; broker_count: number; created_at: string;
}

export default function BrokerGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null)
  const [selected, setSelected] = useState<Group | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [filters, setFilters] = useState({ name: '', status: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
      const res = await api.get(`/broker-groups?${params}`)
      setGroups(res.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const openDetail = async (g: Group) => {
    const res = await api.get(`/broker-groups/${g.id}`)
    setDetail(res.data); setModal('detail')
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await api.post('/broker-groups', form)
      else await api.put(`/broker-groups/${selected?.id}`, form)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este grupo?')) return
    try { await api.delete(`/broker-groups/${id}`); load() } catch (e: any) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos de Corretores</h1>
          <p className="text-sm text-gray-500">{groups.length} grupo(s)</p>
        </div>
        <button onClick={() => { setForm({ code: '', name: '', description: '' }); setError(''); setSelected(null); setModal('create') }} className="btn-primary">+ Novo Grupo</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <input placeholder="Nome do grupo" value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} className="input-field text-xs" />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.length === 0 ? (
            <div className="col-span-3 card text-center py-10 text-gray-400">Nenhum grupo encontrado</div>
          ) : groups.map(g => (
            <div key={g.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-400 font-mono">{g.code}</div>
                  <div className="font-semibold text-gray-900">{g.name}</div>
                  {g.description && <div className="text-xs text-gray-500 mt-1">{g.description}</div>}
                </div>
                {statusBadge(g.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="text-lg">👥</span>
                <span>{g.broker_count} corretor(es)</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString('pt-BR')}</span>
                <div className="flex gap-2">
                  <button onClick={() => openDetail(g)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ver</button>
                  <button onClick={() => { setSelected(g); setForm({ code: g.code, name: g.name, description: g.description || '' }); setError(''); setModal('edit') }} className="text-xs text-gray-600 hover:text-gray-800 font-medium">Editar</button>
                  <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Grupo' : 'Editar Grupo'} size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Código</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="Auto gerado" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field h-20 resize-none" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Grupo: ${detail?.name || ''}`} size="lg">
        {detail && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{detail.brokers?.length || 0}</div>
                <div className="text-xs text-blue-600">Corretores</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{detail.brokers?.filter((b: any) => b.status === 'ativo').length || 0}</div>
                <div className="text-xs text-emerald-600">Ativos</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{detail.brokers?.filter((b: any) => b.status === 'inativo').length || 0}</div>
                <div className="text-xs text-red-600">Inativos</div>
              </div>
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Corretores do Grupo</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detail.brokers?.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Nenhum corretor neste grupo</p> :
                detail.brokers?.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{b.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{b.cpf_cnpj}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-gray text-xs px-1.5 py-0.5 rounded">{b.type}</span>
                      {statusBadge(b.status)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
