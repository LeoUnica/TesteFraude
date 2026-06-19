import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'
import Pagination from '../../components/ui/Pagination'

interface Proposal {
  id: string; code: string; cpf: string; client_name: string; status: string;
  antifraud_status: string; value?: number; installments?: number; proposal_date?: string;
  created_at: string; broker_name?: string; convenio_name?: string; bank_name?: string; product_name?: string;
  notes?: string; history?: any[];
}

const STATUS_OPTIONS = ['Pendente', 'Em Analise', 'Aprovada', 'Reprovada', 'Averbada', 'Suspeita de Antifraude']

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | 'history' | 'convenio' | 'broker' | null>(null)
  const [selected, setSelected] = useState<Proposal | null>(null)
  const [filters, setFilters] = useState({ cpf: '', broker_name: '', status: '', convenio_id: '', bank_id: '', date_from: '', date_to: '', date_type: 'created_at' })
  const [convenios, setConvenios] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [brokers, setBrokers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ cpf: '', client_name: '', broker_id: '', convenio_id: '', bank_id: '', product_id: '', product_fgts: '', value: '', installments: '', notes: '', proposal_date: '' })
  const [changeId, setChangeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
      const res = await api.get(`/proposals?${params}`)
      setProposals(res.data.data)
      setTotal(res.data.total)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filters])
  useEffect(() => {
    api.get('/convenios?status=ativo').then(r => setConvenios(r.data)).catch(() => {})
    api.get('/banks?status=ativo').then(r => setBanks(r.data)).catch(() => {})
    api.get('/brokers?status=ativo&limit=200').then(r => setBrokers(r.data.data || [])).catch(() => {})
    api.get('/products?status=ativo').then(r => setProducts(r.data)).catch(() => {})
  }, [])

  const openDetail = async (p: Proposal) => {
    const res = await api.get(`/proposals/${p.id}`)
    setSelected(res.data); setModal('detail')
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, value: form.value ? parseFloat(form.value) : null, installments: form.installments ? parseInt(form.installments) : null }
      if (modal === 'create') await api.post('/proposals', payload)
      else await api.put(`/proposals/${selected?.id}`, payload)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleEndorse = async (id: string) => {
    if (!confirm('Averbar esta proposta?')) return
    await api.patch(`/proposals/${id}/endorse`); load()
  }

  const handleChangeConvenio = async () => {
    try { await api.patch(`/proposals/${selected?.id}/change-convenio`, { convenio_id: changeId }); setModal(null); load() }
    catch (e: any) { alert(e.response?.data?.error) }
  }

  const handleChangeBroker = async () => {
    try { await api.patch(`/proposals/${selected?.id}/change-broker`, { broker_id: changeId }); setModal(null); load() }
    catch (e: any) { alert(e.response?.data?.error) }
  }

  const fmtCurrency = (v?: number) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propostas</h1>
          <p className="text-sm text-gray-500">{total} proposta(s)</p>
        </div>
        <button onClick={() => { setForm({ cpf: '', client_name: '', broker_id: '', convenio_id: '', bank_id: '', product_id: '', product_fgts: '', value: '', installments: '', notes: '', proposal_date: '' }); setError(''); setModal('create') }} className="btn-primary">+ Nova Proposta</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <input placeholder="CPF do cliente" value={filters.cpf} onChange={e => setFilters(f => ({ ...f, cpf: e.target.value }))} className="input-field text-xs" />
          <input placeholder="Nome do corretor" value={filters.broker_name} onChange={e => setFilters(f => ({ ...f, broker_name: e.target.value }))} className="input-field text-xs" />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.convenio_id} onChange={e => setFilters(f => ({ ...f, convenio_id: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os convênios</option>
            {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={filters.bank_id} onChange={e => setFilters(f => ({ ...f, bank_id: e.target.value }))} className="input-field text-xs">
            <option value="">Todos os bancos</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filters.date_type} onChange={e => setFilters(f => ({ ...f, date_type: e.target.value }))} className="input-field text-xs">
            <option value="created_at">Data de Cadastro</option>
            <option value="proposal_date">Data da Proposta</option>
            <option value="import_date">Data de Importação</option>
            <option value="endorsement_date">Data de Averbação</option>
          </select>
          <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="input-field text-xs" />
          <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="input-field text-xs" />
        </div>
        <button onClick={() => setFilters({ cpf: '', broker_name: '', status: '', convenio_id: '', bank_id: '', date_from: '', date_to: '', date_type: 'created_at' })} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Limpar filtros</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header text-left">Código</th>
                  <th className="table-header text-left">Cliente / CPF</th>
                  <th className="table-header text-left">Corretor</th>
                  <th className="table-header text-left">Convênio</th>
                  <th className="table-header text-left">Banco</th>
                  <th className="table-header text-right">Valor</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-center">Antifraude</th>
                  <th className="table-header text-left">Data</th>
                  <th className="table-header text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {proposals.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Nenhuma proposta encontrada</td></tr>
                ) : proposals.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-xs text-blue-700">{p.code}</td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">{p.client_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.cpf}</div>
                    </td>
                    <td className="table-cell text-gray-600">{p.broker_name || '—'}</td>
                    <td className="table-cell text-gray-600 max-w-24 truncate">{p.convenio_name || '—'}</td>
                    <td className="table-cell text-gray-600">{p.bank_name || '—'}</td>
                    <td className="table-cell text-right font-medium">{fmtCurrency(p.value)}</td>
                    <td className="table-cell text-center">{statusBadge(p.status)}</td>
                    <td className="table-cell text-center">{statusBadge(p.antifraud_status || 'Nao Analisado')}</td>
                    <td className="table-cell text-xs text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={() => openDetail(p)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ver</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => { setSelected(p); setForm({ cpf: p.cpf, client_name: p.client_name, broker_id: '', convenio_id: '', bank_id: '', product_id: '', product_fgts: '', value: String(p.value || ''), installments: String(p.installments || ''), notes: p.notes || '', proposal_date: p.proposal_date || '' }); setError(''); setModal('edit') }} className="text-xs text-gray-600 hover:text-gray-800 font-medium">Editar</button>
                        {p.status !== 'Averbada' && <><span className="text-gray-300">|</span><button onClick={() => handleEndorse(p.id)} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Averbar</button></>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} limit={20} onPage={setPage} />
      </div>

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Nova Proposta' : 'Editar Proposta'} size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">CPF *</label><input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} className="input-field" placeholder="000.000.000-00" required /></div>
          <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nome do Cliente *</label><input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Corretor</label>
            <select value={form.broker_id} onChange={e => setForm(f => ({ ...f, broker_id: e.target.value }))} className="input-field">
              <option value="">Sem corretor</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Convênio</label>
            <select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))} className="input-field">
              <option value="">Selecione</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
            <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))} className="input-field">
              <option value="">Selecione</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="input-field">
              <option value="">Selecione</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Produto FGTS</label><input value={form.product_fgts} onChange={e => setForm(f => ({ ...f, product_fgts: e.target.value }))} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label><input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Parcelas</label><input type="number" value={form.installments} onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Data da Proposta</label><input type="date" value={form.proposal_date} onChange={e => setForm(f => ({ ...f, proposal_date: e.target.value }))} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Observações</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field h-20 resize-none" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Proposta: ${selected?.code}`} size="xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <InfoField label="CPF" value={selected.cpf} />
              <InfoField label="Cliente" value={selected.client_name} />
              <InfoField label="Status" value={<>{statusBadge(selected.status)}</>} />
              <InfoField label="Convênio" value={selected.convenio_name || '—'} />
              <InfoField label="Banco" value={selected.bank_name || '—'} />
              <InfoField label="Antifraude" value={<>{statusBadge(selected.antifraud_status || 'Nao Analisado')}</>} />
              <InfoField label="Corretor" value={selected.broker_name || '—'} />
              <InfoField label="Produto" value={selected.product_name || '—'} />
              <InfoField label="Valor" value={selected.value ? selected.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'} />
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => { setChangeId(''); setModal('convenio') }} className="btn-secondary text-xs py-1.5">Alterar Convênio</button>
              <button onClick={() => { setChangeId(''); setModal('broker') }} className="btn-secondary text-xs py-1.5">Alterar Corretor</button>
              {selected.status !== 'Averbada' && <button onClick={() => { handleEndorse(selected.id); setModal(null) }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 px-3 rounded-lg font-medium">Averbar</button>}
            </div>
            {selected.history && selected.history.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Histórico</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selected.history.map((h: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-gray-700">{h.action}</div>
                        <div className="text-xs text-gray-400">{h.user} · {new Date(h.date).toLocaleString('pt-BR')}</div>
                        {h.notes && <div className="text-xs text-gray-500 mt-0.5">{h.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={modal === 'convenio'} onClose={() => setModal('detail')} title="Alterar Convênio" size="sm">
        <div className="space-y-4">
          <select value={changeId} onChange={e => setChangeId(e.target.value)} className="input-field">
            <option value="">Selecione o novo convênio</option>
            {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setModal('detail')} className="btn-secondary">Cancelar</button>
            <button onClick={handleChangeConvenio} disabled={!changeId} className="btn-primary">Confirmar</button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'broker'} onClose={() => setModal('detail')} title="Alterar Corretor" size="sm">
        <div className="space-y-4">
          <select value={changeId} onChange={e => setChangeId(e.target.value)} className="input-field">
            <option value="">Sem corretor</option>
            {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setModal('detail')} className="btn-secondary">Cancelar</button>
            <button onClick={handleChangeBroker} className="btn-primary">Confirmar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  )
}
