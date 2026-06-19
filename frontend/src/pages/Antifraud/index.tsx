import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'
import Pagination from '../../components/ui/Pagination'

const ANALYSIS_STATUSES = [
  'Aprovada no Banco',
  'Reprovar no Banco',
  'Suspeita de Antifraude',
  'Em Analise',
  'Nao Mapeada',
  'Agendar para acompanhamento',
]

export default function AntifraudPage() {
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<'analysis' | 'detail' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [analysisForm, setAnalysisForm] = useState({ status: '', notes: '', schedule_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<any>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/antifraud/queue?page=${page}&limit=20`)
      setProposals(res.data)
    } catch {} finally { setLoading(false) }
  }

  const loadStats = async () => {
    try {
      const res = await api.get('/dashboard')
      setStats(res.data.stats)
    } catch {}
  }

  useEffect(() => { load(); loadStats() }, [page])

  const openAnalysis = (p: any) => {
    setSelected(p)
    setAnalysisForm({ status: '', notes: '', schedule_date: '' })
    setError('')
    setModal('analysis')
  }

  const handleSaveAnalysis = async () => {
    if (!analysisForm.status) { setError('Selecione um status'); return }
    setSaving(true); setError('')
    try {
      await api.post('/antifraud/analyses', { proposal_id: selected.id, ...analysisForm })
      setModal(null); load(); loadStats()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const quickAction = (status: string) =>
    setAnalysisForm((f) => ({ ...f, status }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mesa de Crédito — Antifraude</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Análise e validação de propostas suspeitas</p>
      </div>

      {/* 6-card stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-600">{stats.fraudSuspect || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Suspeitas</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.inAnalysis || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Em Análise</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.approvedBank || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Aprovadas no Banco</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-600">{stats.rejectedBank || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Reprovadas no Banco</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-500">{stats.notMapped || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Não Mapeadas</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.scheduled || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Agendadas</div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-bold">⚠</span>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Fila de análise — {proposals.length} proposta(s) aguardando revisão
            </span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <th className="table-header text-left">Código</th>
                <th className="table-header text-left">Cliente / CPF</th>
                <th className="table-header text-left">Corretor</th>
                <th className="table-header text-left">Convênio</th>
                <th className="table-header text-left">Banco</th>
                <th className="table-header text-center">Status Proposta</th>
                <th className="table-header text-center">Status AF</th>
                <th className="table-header text-left">Cadastro</th>
                <th className="table-header text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-gray-500">Nenhuma proposta pendente de análise</div>
                  </td>
                </tr>
              ) : proposals.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="table-cell font-mono text-xs text-blue-700 dark:text-blue-400">{p.code}</td>
                  <td className="table-cell">
                    <div className="font-medium">{p.client_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{p.cpf}</div>
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-400">{p.broker_name || '—'}</td>
                  <td className="table-cell text-gray-600 dark:text-gray-400">{p.convenio_name || '—'}</td>
                  <td className="table-cell text-gray-600 dark:text-gray-400">{p.bank_name || '—'}</td>
                  <td className="table-cell text-center">{statusBadge(p.status)}</td>
                  <td className="table-cell text-center">{statusBadge(p.antifraud_status || 'Nao Analisado')}</td>
                  <td className="table-cell text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="table-cell text-center">
                    <button onClick={() => openAnalysis(p)} className="btn-primary py-1.5 text-xs">Analisar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal === 'analysis'} onClose={() => setModal(null)} title="Análise Antifraude" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Código:</span> <span className="font-medium">{selected.code}</span></div>
                <div><span className="text-gray-400">CPF:</span> <span className="font-mono">{selected.cpf}</span></div>
                <div><span className="text-gray-400">Cliente:</span> <span className="font-medium">{selected.client_name}</span></div>
                <div><span className="text-gray-400">Status AF:</span> {statusBadge(selected.antifraud_status || 'Nao Analisado')}</div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Decisão *</label>
              <select
                value={analysisForm.status}
                onChange={(e) => setAnalysisForm((f) => ({ ...f, status: e.target.value }))}
                className="input-field"
              >
                <option value="">Selecione a decisão...</option>
                {ANALYSIS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Quick-action buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => quickAction('Aprovada no Banco')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  analysisForm.status === 'Aprovada no Banco'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
                }`}
              >
                ✅ Aprovar
              </button>
              <button
                onClick={() => quickAction('Reprovar no Banco')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  analysisForm.status === 'Reprovar no Banco'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                }`}
              >
                ❌ Reprovar
              </button>
              <button
                onClick={() => quickAction('Suspeita de Antifraude')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  analysisForm.status === 'Suspeita de Antifraude'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20'
                }`}
              >
                ⚠ Sinalizar
              </button>
              <button
                onClick={() => quickAction('Agendar para acompanhamento')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  analysisForm.status === 'Agendar para acompanhamento'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20'
                }`}
              >
                📅 Agendar
              </button>
              <button
                onClick={() => quickAction('Nao Mapeada')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  analysisForm.status === 'Nao Mapeada'
                    ? 'bg-gray-600 text-white border-gray-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                ❓ Não Mapeada
              </button>
            </div>

            {analysisForm.status === 'Agendar para acompanhamento' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Acompanhamento</label>
                <input
                  type="datetime-local"
                  value={analysisForm.schedule_date}
                  onChange={(e) => setAnalysisForm((f) => ({ ...f, schedule_date: e.target.value }))}
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
              <textarea
                value={analysisForm.notes}
                onChange={(e) => setAnalysisForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field h-24 resize-none"
                placeholder="Descreva os motivos da decisão..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleSaveAnalysis}
                disabled={saving || !analysisForm.status}
                className="btn-primary"
              >
                {saving ? 'Salvando...' : 'Confirmar Análise'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
