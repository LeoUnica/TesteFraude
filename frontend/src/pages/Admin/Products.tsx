import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [convenios, setConvenios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ code: '', name: '', bank_id: '', convenio_id: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try { const res = await api.get('/products'); setProducts(res.data) } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    api.get('/banks').then(r => setBanks(r.data)).catch(() => {})
    api.get('/convenios').then(r => setConvenios(r.data)).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await api.post('/products', form)
      else await api.put(`/products/${selected?.id}`, form)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return
    await api.delete(`/products/${id}`); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">{products.length} produto(s)</p>
        </div>
        <button onClick={() => { setForm({ code: '', name: '', bank_id: '', convenio_id: '', description: '' }); setError(''); setSelected(null); setModal('create') }} className="btn-primary">+ Novo Produto</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Código</th>
                <th className="table-header text-left">Nome</th>
                <th className="table-header text-left">Banco</th>
                <th className="table-header text-left">Convênio</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum produto cadastrado</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs font-bold text-blue-700">{p.code}</td>
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell text-gray-500">{p.bank_name || '—'}</td>
                  <td className="table-cell text-gray-500">{p.convenio_name || '—'}</td>
                  <td className="table-cell text-center">{statusBadge(p.status)}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelected(p); setForm({ code: p.code, name: p.name, bank_id: p.bank_id || '', convenio_id: p.convenio_id || '', description: p.description || '' }); setError(''); setModal('edit') }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Produto' : 'Editar Produto'} size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Código *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
            <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))} className="input-field">
              <option value="">Todos os bancos</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Convênio</label>
            <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className="input-field">
              <option value="">Todos os convênios</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
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
