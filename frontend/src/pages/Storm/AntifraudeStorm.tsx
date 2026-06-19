import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { Shield, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'

type AcaoType = 'aprovar' | 'recusar' | 'pendenciar' | 'reanalisar'

function AntifraudeStatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase()
  let cls = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  if (s.includes('aprovad')) cls = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  else if (s.includes('recusad') || s.includes('negad')) cls = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  else if (s.includes('pendente') || s.includes('pendenci')) cls = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
  else if (s.includes('analise') || s.includes('análise')) cls = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  )
}

const fmt = (v: any) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

export default function StormAntifraudePage() {
  const navigate = useNavigate()
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stormError, setStormError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  // Stats
  const [stats, setStats] = useState({ pendentes: 0, aprovados: 0, recusados: 0, em_analise: 0 })

  // Modais de ação
  const [acao, setAcao] = useState<AcaoType | null>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [tiposRecusa, setTiposRecusa] = useState<any[]>([])
  const [tiposPendencia, setTiposPendencia] = useState<any[]>([])
  const [selectedTipo, setSelectedTipo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = async (p = page) => {
    setLoading(true)
    setStormError('')
    try {
      const res = await api.get('/stormfin/antifraude', { params: { page: p, limit: LIMIT } })
      const data = res.data
      if (Array.isArray(data)) {
        setContratos(data)
        setTotal(data.length)
      } else {
        setContratos(data.items ?? data.data ?? [])
        setTotal(data.total ?? data.count ?? 0)
        if (data.stats) setStats(data.stats)
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message || ''
      if (msg.toLowerCase().includes('configur') || msg.toLowerCase().includes('credencial') || e.response?.status === 503 || e.response?.status === 401) {
        setStormError('Integração Storm não configurada. Configure as credenciais em Integrações.')
      } else {
        setStormError(msg || 'Erro ao carregar dados de antifraude Storm.')
      }
      setContratos([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadTipos = async () => {
    try {
      const [r, p] = await Promise.allSettled([
        api.get('/stormfin/antifraude/tipos-recusa'),
        api.get('/stormfin/antifraude/tipos-pendencia'),
      ])
      if (r.status === 'fulfilled') {
        const d = r.value.data
        setTiposRecusa(Array.isArray(d) ? d : d.items ?? d.data ?? [])
      }
      if (p.status === 'fulfilled') {
        const d = p.value.data
        setTiposPendencia(Array.isArray(d) ? d : d.items ?? d.data ?? [])
      }
    } catch {}
  }

  useEffect(() => { load(1); loadTipos() }, [])

  const handlePage = (p: number) => { setPage(p); load(p) }

  const openAcao = (item: any, tipo: AcaoType) => {
    setSelectedItem(item)
    setAcao(tipo)
    setSelectedTipo('')
    setActionError('')
    setConfirmando(false)
  }

  const confirmarAcao = async () => {
    if (!selectedItem || !acao) return
    setConfirmando(true)
    setActionError('')
    try {
      const id = selectedItem.ff ?? selectedItem.id
      if (acao === 'aprovar') {
        await api.post(`/stormfin/antifraude/${id}/aprovar`)
      } else if (acao === 'recusar') {
        await api.post(`/stormfin/antifraude/${id}/recusar`, { tipo_recusa: selectedTipo })
      } else if (acao === 'pendenciar') {
        await api.post(`/stormfin/antifraude/${id}/pendenciar`, { tipo_pendencia: selectedTipo })
      } else if (acao === 'reanalisar') {
        await api.post(`/stormfin/antifraude/${id}/reanalisar`)
      }
      setAcao(null)
      setSelectedItem(null)
      load(page)
    } catch (e: any) {
      setActionError(e.response?.data?.detail || e.response?.data?.error || 'Erro ao executar ação.')
    } finally {
      setConfirmando(false)
    }
  }

  const ACAO_LABELS: Record<AcaoType, string> = {
    aprovar: 'Aprovar',
    recusar: 'Recusar',
    pendenciar: 'Pendenciar',
    reanalisar: 'Reanalisar',
  }

  const statsCards = [
    { label: 'Pendentes', value: stats.pendentes, color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700', textColor: 'text-yellow-700 dark:text-yellow-300', icon: Clock },
    { label: 'Aprovados Hoje', value: stats.aprovados, color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700', textColor: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
    { label: 'Recusados Hoje', value: stats.recusados, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700', textColor: 'text-red-700 dark:text-red-300', icon: XCircle },
    { label: 'Em Análise', value: stats.em_analise, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700', textColor: 'text-blue-700 dark:text-blue-300', icon: RefreshCw },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-red-700 dark:text-red-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mesa de Crédito — Storm</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Antifraude integrado com a plataforma Storm Fin</p>
          </div>
        </div>
        <button onClick={() => load(page)} className="btn-secondary text-sm">Atualizar</button>
      </div>

      {/* Banner Storm Error */}
      {stormError && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="flex-1">{stormError}</span>
          <button onClick={() => navigate('/integracoes')} className="ml-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors">
            Configurar
          </button>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, color, textColor, icon: Icon }) => (
          <div key={label} className={`card border p-4 ${color}`}>
            <div className="flex items-center gap-3">
              <Icon size={20} className={textColor} />
              <div>
                <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="table-header text-left">FF</th>
                    <th className="table-header text-left">CPF</th>
                    <th className="table-header text-left">Cliente</th>
                    <th className="table-header text-left">Banco</th>
                    <th className="table-header text-right">Valor</th>
                    <th className="table-header text-center">Status Antifraude</th>
                    <th className="table-header text-center">Data Entrada</th>
                    <th className="table-header text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400 dark:text-gray-500">
                        {stormError ? 'Não foi possível carregar os dados.' : 'Nenhum contrato aguardando antifraude.'}
                      </td>
                    </tr>
                  ) : contratos.map((c, idx) => (
                    <tr key={c.ff ?? c.id ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <td className="table-cell font-mono text-xs font-medium">{c.ff ?? '—'}</td>
                      <td className="table-cell font-mono text-xs text-gray-500 dark:text-gray-400">{c.cpf ?? '—'}</td>
                      <td className="table-cell text-gray-900 dark:text-gray-100 max-w-[140px] truncate">{c.cliente ?? c.client_name ?? c.nome ?? '—'}</td>
                      <td className="table-cell text-gray-600 dark:text-gray-300">{c.banco ?? c.bank ?? '—'}</td>
                      <td className="table-cell text-right font-medium">{fmt(c.valor ?? c.value)}</td>
                      <td className="table-cell text-center"><AntifraudeStatusBadge status={c.status_antifraude ?? c.status ?? ''} /></td>
                      <td className="table-cell text-center text-xs text-gray-500 dark:text-gray-400">{fmtDate(c.data_entrada ?? c.created_at ?? c.data)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => openAcao(c, 'aprovar')}
                            title="Aprovar"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded text-xs font-medium transition-colors"
                          >
                            <CheckCircle size={12} /> Aprovar
                          </button>
                          <button
                            onClick={() => openAcao(c, 'recusar')}
                            title="Recusar"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded text-xs font-medium transition-colors"
                          >
                            <XCircle size={12} /> Recusar
                          </button>
                          <button
                            onClick={() => openAcao(c, 'pendenciar')}
                            title="Pendenciar"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 text-yellow-700 dark:text-yellow-300 rounded text-xs font-medium transition-colors"
                          >
                            <Clock size={12} /> Pendenciar
                          </button>
                          <button
                            onClick={() => openAcao(c, 'reanalisar')}
                            title="Reanalisar"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded text-xs font-medium transition-colors"
                          >
                            <RefreshCw size={12} /> Reanalisar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > LIMIT && (
              <Pagination page={page} total={total} limit={LIMIT} onPage={handlePage} />
            )}
          </>
        )}
      </div>

      {/* Modal de ação */}
      <Modal
        open={!!acao}
        onClose={() => { setAcao(null); setSelectedItem(null) }}
        title={acao ? `Confirmar: ${ACAO_LABELS[acao]}` : ''}
        size="sm"
      >
        {selectedItem && acao && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
              <div><span className="text-gray-500 dark:text-gray-400">FF:</span> <span className="font-medium">{selectedItem.ff ?? '—'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">CPF:</span> <span className="font-medium">{selectedItem.cpf ?? '—'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Cliente:</span> <span className="font-medium">{selectedItem.cliente ?? selectedItem.client_name ?? '—'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Valor:</span> <span className="font-medium">{fmt(selectedItem.valor ?? selectedItem.value)}</span></div>
            </div>

            {acao === 'recusar' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Recusa *</label>
                <select value={selectedTipo} onChange={e => setSelectedTipo(e.target.value)} className="input-field">
                  <option value="">Selecione o motivo...</option>
                  {tiposRecusa.map((t, i) => (
                    <option key={t.id ?? i} value={t.id ?? t.codigo ?? t.tipo}>{t.descricao ?? t.label ?? t.tipo ?? t}</option>
                  ))}
                  {tiposRecusa.length === 0 && <option disabled>Carregando tipos...</option>}
                </select>
              </div>
            )}

            {acao === 'pendenciar' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Pendência *</label>
                <select value={selectedTipo} onChange={e => setSelectedTipo(e.target.value)} className="input-field">
                  <option value="">Selecione o tipo...</option>
                  {tiposPendencia.map((t, i) => (
                    <option key={t.id ?? i} value={t.id ?? t.codigo ?? t.tipo}>{t.descricao ?? t.label ?? t.tipo ?? t}</option>
                  ))}
                  {tiposPendencia.length === 0 && <option disabled>Carregando tipos...</option>}
                </select>
              </div>
            )}

            <div className={`p-3 rounded-lg text-sm border ${
              acao === 'aprovar' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' :
              acao === 'recusar' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' :
              acao === 'pendenciar' ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300' :
              'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
            }`}>
              Tem certeza que deseja <strong>{ACAO_LABELS[acao].toLowerCase()}</strong> este contrato? Esta ação será enviada ao Storm Fin.
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => { setAcao(null); setSelectedItem(null) }} className="btn-secondary" disabled={confirmando}>Cancelar</button>
          <button
            onClick={confirmarAcao}
            disabled={confirmando || ((acao === 'recusar' || acao === 'pendenciar') && !selectedTipo)}
            className="btn-primary"
          >
            {confirmando ? 'Processando...' : `Confirmar ${acao ? ACAO_LABELS[acao] : ''}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
