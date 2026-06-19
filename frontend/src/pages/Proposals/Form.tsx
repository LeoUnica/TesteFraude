import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { CheckCircle } from 'lucide-react'

type StormClientStatus = 'idle' | 'loading' | 'found' | 'not_found'

export default function ProposalFormPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [brokers, setBrokers] = useState<any[]>([])
  const [convenios, setConvenios] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [brokerSearch, setBrokerSearch] = useState('')

  // Storm CPF lookup
  const [stormClientStatus, setStormClientStatus] = useState<StormClientStatus>('idle')
  const [stormAutoFilled, setStormAutoFilled] = useState(false)

  const [form, setForm] = useState({
    cpf: '',
    client_name: '',
    broker_id: '',
    convenio_id: '',
    bank_id: '',
    product_id: '',
    value: '',
    installments: '',
    proposal_date: '',
    notes: '',
  })

  useEffect(() => {
    api.get('/brokers?status=ativo&limit=200').then(r => setBrokers(r.data.data || [])).catch(() => {})
    api.get('/convenios?status=ativo').then(r => setConvenios(r.data)).catch(() => {})
    api.get('/banks?status=ativo').then(r => setBanks(r.data)).catch(() => {})
    api.get('/products?status=ativo').then(r => setProducts(r.data)).catch(() => {})
  }, [])

  const filteredBrokers = brokerSearch
    ? brokers.filter(b => b.name.toLowerCase().includes(brokerSearch.toLowerCase()) || b.code?.includes(brokerSearch))
    : brokers

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const buscarClienteStorm = async () => {
    const cpf = form.cpf.replace(/\D/g, '')
    if (cpf.length !== 11) return
    setStormClientStatus('loading')
    setStormAutoFilled(false)
    try {
      const res = await api.get(`/stormfin/clientes/cpf/${cpf}`)
      const nome = res.data?.nome ?? res.data?.name ?? res.data?.client_name ?? null
      if (nome) {
        set('client_name', nome)
        setStormAutoFilled(true)
        setStormClientStatus('found')
      } else {
        setStormClientStatus('not_found')
      }
    } catch {
      setStormClientStatus('not_found')
    }
  }

  const handleSave = async () => {
    setError('')
    if (!form.cpf || !form.client_name) { setError('CPF e Nome do Cliente sao obrigatorios'); return }
    setSaving(true)
    try {
      await api.post('/proposals', {
        ...form,
        value: form.value ? parseFloat(form.value) : null,
        installments: form.installments ? parseInt(form.installments) : null,
      })
      setSuccess(true)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao cadastrar proposta')
    } finally { setSaving(false) }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="card bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-8 flex flex-col items-center text-center gap-4">
          <div className="text-5xl">✅</div>
          <div>
            <div className="text-xl font-bold text-emerald-800 dark:text-emerald-400">Proposta cadastrada com sucesso!</div>
            <div className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">A proposta foi registrada e esta aguardando analise.</div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/propostas')} className="btn-primary">Ver Propostas</button>
            <button onClick={() => { setSuccess(false); setForm({ cpf: '', client_name: '', broker_id: '', convenio_id: '', bank_id: '', product_id: '', value: '', installments: '', proposal_date: '', notes: '' }) }} className="btn-secondary">Cadastrar Outra</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cadastrar Proposta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Preencha os dados para registrar uma nova proposta</p>
        </div>
        <button onClick={() => navigate('/propostas')} className="btn-secondary">Voltar</button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="card p-6 space-y-6">
        {/* Cliente */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            Dados do Cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
              <input
                value={form.cpf}
                onChange={e => {
                  set('cpf', e.target.value)
                  setStormClientStatus('idle')
                  setStormAutoFilled(false)
                }}
                onBlur={buscarClienteStorm}
                className="input-field"
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {stormClientStatus === 'loading' && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-500" />
                  Buscando no Storm...
                </div>
              )}
              {stormClientStatus === 'not_found' && (
                <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                  Cliente não encontrado no Storm.
                </div>
              )}
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Cliente *</label>
              <input
                value={form.client_name}
                onChange={e => { set('client_name', e.target.value); setStormAutoFilled(false) }}
                className="input-field"
                placeholder="Nome completo"
              />
              {stormAutoFilled && (
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={12} />
                  Dados preenchidos via Storm
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Corretor */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            Corretor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Corretor</label>
              <input
                value={brokerSearch}
                onChange={e => setBrokerSearch(e.target.value)}
                className="input-field mb-2"
                placeholder="Digite nome ou codigo..."
              />
              <select
                value={form.broker_id}
                onChange={e => set('broker_id', e.target.value)}
                className="input-field"
              >
                <option value="">Sem corretor</option>
                {filteredBrokers.map(b => (
                  <option key={b.id} value={b.id}>{b.code ? `[${b.code}] ` : ''}{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Produto */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            Produto e Financiamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Convenio</label>
              <select value={form.convenio_id} onChange={e => set('convenio_id', e.target.value)} className="input-field">
                <option value="">Selecione o convenio</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Banco</label>
              <select value={form.bank_id} onChange={e => set('bank_id', e.target.value)} className="input-field">
                <option value="">Selecione o banco</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Produto</label>
              <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className="input-field">
                <option value="">Selecione o produto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.value} onChange={e => set('value', e.target.value)}
                className="input-field" placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Parcelas</label>
              <input
                type="number" min="1"
                value={form.installments} onChange={e => set('installments', e.target.value)}
                className="input-field" placeholder="Ex: 60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Proposta</label>
              <input
                type="date"
                value={form.proposal_date} onChange={e => set('proposal_date', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Observacoes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observacoes</label>
          <textarea
            value={form.notes} onChange={e => set('notes', e.target.value)}
            className="input-field h-24 resize-none"
            placeholder="Informacoes adicionais sobre a proposta..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => navigate('/propostas')} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar Proposta'}
          </button>
        </div>
      </div>
    </div>
  )
}
