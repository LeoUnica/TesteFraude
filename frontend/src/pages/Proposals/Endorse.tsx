import { useEffect, useState } from 'react'
import api from '../../services/api'
import { statusBadge } from '../../components/ui/Badge'

interface Proposal {
  id: string; code: string; cpf: string; client_name: string;
  status: string; value?: number; broker_name?: string;
  convenio_name?: string; bank_name?: string; created_at: string;
}
interface Endorsement { id: string; proposal_code: string; client_name: string; endorsed_at: string; user?: string }

export default function ProposalEndorsePage() {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<Proposal | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)
  const [endorseDate, setEndorseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endorsing, setEndorsing] = useState(false)
  const [endorseError, setEndorseError] = useState('')
  const [endorseSuccess, setEndorseSuccess] = useState(false)
  const [history, setHistory] = useState<Endorsement[]>([])

  const loadTodayHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await api.get(`/proposals?date_type=endorsement_date&date_from=${today}&date_to=${today}&status=Averbada&limit=20`)
      const data = res.data.data || []
      setHistory(data.map((p: any) => ({
        id: p.id, proposal_code: p.code, client_name: p.client_name,
        endorsed_at: p.endorsement_date || today, user: p.endorsed_by
      })))
    } catch {
      setHistory([])
    }
  }

  useEffect(() => { loadTodayHistory() }, [])

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true); setFound(null); setNotFound(false); setEndorseSuccess(false)
    try {
      const params = search.replace(/\D/g, '').length === 11
        ? `cpf=${search.replace(/\D/g, '')}`
        : `code=${search.trim()}`
      const res = await api.get(`/proposals?${params}&limit=1`)
      const data = res.data.data || []
      if (data.length > 0) { setFound(data[0]) }
      else setNotFound(true)
    } catch { setNotFound(true) }
    finally { setSearching(false) }
  }

  const handleEndorse = async () => {
    if (!found) return
    setEndorseError(''); setEndorsing(true)
    try {
      await api.patch(`/proposals/${found.id}/endorse`, { endorsement_date: endorseDate })
      setEndorseSuccess(true)
      setFound(null); setSearch('')
      loadTodayHistory()
    } catch (e: any) {
      setEndorseError(e.response?.data?.error || 'Erro ao averbar proposta')
    } finally { setEndorsing(false) }
  }

  const fmtCurrency = (v?: number) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Averbar Proposta</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Busque e averbe propostas pelo codigo ou CPF do cliente</p>
      </div>

      {/* Search */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Buscar Proposta</h2>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="input-field flex-1"
            placeholder="Digite o codigo da proposta ou CPF do cliente..."
          />
          <button onClick={handleSearch} disabled={searching || !search.trim()} className="btn-primary px-6">
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {notFound && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">Proposta nao encontrada. Verifique o codigo ou CPF informado.</p>
        )}
      </div>

      {/* Success Banner */}
      {endorseSuccess && (
        <div className="card bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
          <div className="text-2xl">✅</div>
          <div>
            <div className="font-medium text-emerald-800 dark:text-emerald-400">Proposta averbada com sucesso!</div>
            <div className="text-sm text-emerald-600 dark:text-emerald-500">O status foi atualizado para "Averbada".</div>
          </div>
          <button onClick={() => setEndorseSuccess(false)} className="ml-auto text-emerald-700 hover:text-emerald-900 text-xs font-medium">Fechar</button>
        </div>
      )}

      {/* Proposal Details */}
      {found && (
        <div className="card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Proposta Encontrada
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            {[
              { label: 'Codigo', value: found.code },
              { label: 'CPF', value: found.cpf },
              { label: 'Status', value: statusBadge(found.status) },
              { label: 'Cliente', value: found.client_name },
              { label: 'Corretor', value: found.broker_name || '—' },
              { label: 'Convenio', value: found.convenio_name || '—' },
              { label: 'Banco', value: found.bank_name || '—' },
              { label: 'Valor', value: fmtCurrency(found.value) },
              { label: 'Cadastro', value: new Date(found.created_at).toLocaleDateString('pt-BR') },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</div>
              </div>
            ))}
          </div>

          {found.status === 'Averbada' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
              Esta proposta ja foi averbada anteriormente.
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Averbacao</h3>
              {endorseError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  {endorseError}
                </div>
              )}
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Averbacao *</label>
                  <input
                    type="date" value={endorseDate}
                    onChange={e => setEndorseDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button onClick={handleEndorse} disabled={endorsing} className="btn-primary">
                  {endorsing ? 'Averbando...' : 'Averbar Proposta'}
                </button>
                <button onClick={() => setFound(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's History */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Averbacoes de Hoje</span>
        </div>
        {history.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Nenhuma averbacao registrada hoje</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <th className="table-header text-left">Codigo</th>
                <th className="table-header text-left">Cliente</th>
                <th className="table-header text-left">Data de Averbacao</th>
                <th className="table-header text-left">Operador</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="table-cell font-mono text-xs text-blue-700 dark:text-blue-400">{h.proposal_code}</td>
                  <td className="table-cell font-medium">{h.client_name}</td>
                  <td className="table-cell text-gray-500">{new Date(h.endorsed_at).toLocaleDateString('pt-BR')}</td>
                  <td className="table-cell text-gray-400">{h.user || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
