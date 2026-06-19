import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { FileText, Eye, Clock, AlertTriangle } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase()
  let cls = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  if (s.includes('aprovad') || s.includes('pago')) cls = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  else if (s.includes('recusad') || s.includes('cancelad')) cls = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  else if (s.includes('analise') || s.includes('análise') || s.includes('pendente')) cls = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
  else if (s.includes('digitad') || s.includes('enviad')) cls = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  )
}

const fmt = (v: any) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

export default function StormContratosPage() {
  const navigate = useNavigate()
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stormError, setStormError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  const [filters, setFilters] = useState({ cpf: '', ff: '', status: '', banco: '', dataInicio: '', dataFim: '' })
  const [trackModal, setTrackModal] = useState(false)
  const [histModal, setHistModal] = useState(false)
  const [selectedContrato, setSelectedContrato] = useState<any>(null)
  const [trackData, setTrackData] = useState<any>(null)
  const [histData, setHistData] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = async (p = page) => {
    setLoading(true)
    setStormError('')
    try {
      const params: any = { page: p, limit: LIMIT }
      if (filters.cpf) params.cpf = filters.cpf
      if (filters.ff) params.ff = filters.ff
      if (filters.status) params.status = filters.status
      if (filters.banco) params.banco = filters.banco
      if (filters.dataInicio) params.data_inicio = filters.dataInicio
      if (filters.dataFim) params.data_fim = filters.dataFim
      const res = await api.get('/stormfin/contratos', { params })
      const data = res.data
      if (Array.isArray(data)) {
        setContratos(data)
        setTotal(data.length)
      } else {
        setContratos(data.items ?? data.data ?? [])
        setTotal(data.total ?? data.count ?? 0)
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message || ''
      if (msg.toLowerCase().includes('configur') || msg.toLowerCase().includes('credencial') || e.response?.status === 503 || e.response?.status === 401) {
        setStormError('Integração Storm não configurada. Configure as credenciais em Integrações.')
      } else {
        setStormError(msg || 'Erro ao carregar contratos Storm.')
      }
      setContratos([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPage(1) }, [filters])

  const handlePage = (p: number) => { setPage(p); load(p) }
  const setFilter = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }))

  const openTrack = async (c: any) => {
    setSelectedContrato(c)
    setTrackModal(true)
    setTrackData(null)
    setLoadingDetail(true)
    try {
      const res = await api.get(`/stormfin/contratos/${c.ff ?? c.id}/acompanhamento`)
      setTrackData(res.data)
    } catch { setTrackData(null) }
    finally { setLoadingDetail(false) }
  }

  const openHist = async (c: any) => {
    setSelectedContrato(c)
    setHistModal(true)
    setHistData([])
    setLoadingDetail(true)
    try {
      const res = await api.get(`/stormfin/contratos/${c.ff ?? c.id}/historico`)
      const d = res.data
      setHistData(Array.isArray(d) ? d : d.items ?? d.data ?? [])
    } catch { setHistData([]) }
    finally { setLoadingDetail(false) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-red-700 dark:text-red-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contratos Storm</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Visualização e acompanhamento de contratos via Storm Fin</p>
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

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input value={filters.cpf} onChange={e => setFilter('cpf', e.target.value)} className="input-field w-44" placeholder="CPF" />
          <input value={filters.ff} onChange={e => setFilter('ff', e.target.value)} className="input-field w-32" placeholder="FF" />
          <input value={filters.banco} onChange={e => setFilter('banco', e.target.value)} className="input-field w-40" placeholder="Banco" />
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="input-field w-44">
            <option value="">Todos os status</option>
            <option value="Digitado">Digitado</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Pago">Pago</option>
            <option value="Recusado">Recusado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">De:</label>
            <input type="date" value={filters.dataInicio} onChange={e => setFilter('dataInicio', e.target.value)} className="input-field w-40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">Até:</label>
            <input type="date" value={filters.dataFim} onChange={e => setFilter('dataFim', e.target.value)} className="input-field w-40" />
          </div>
          <button onClick={() => setFilters({ cpf: '', ff: '', status: '', banco: '', dataInicio: '', dataFim: '' })} className="btn-secondary text-xs">Limpar Filtros</button>
          <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">{total} contrato{total !== 1 ? 's' : ''}</span>
        </div>
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
                    <th className="table-header text-left">Operação</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-right">Valor</th>
                    <th className="table-header text-center">Parcelas</th>
                    <th className="table-header text-center">Data</th>
                    <th className="table-header text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-400 dark:text-gray-500">
                        {stormError ? 'Não foi possível carregar os contratos.' : 'Nenhum contrato encontrado.'}
                      </td>
                    </tr>
                  ) : contratos.map((c, i) => (
                    <tr key={c.ff ?? c.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <td className="table-cell font-mono text-xs font-medium">{c.ff ?? '—'}</td>
                      <td className="table-cell font-mono text-xs text-gray-500 dark:text-gray-400">{c.cpf ?? '—'}</td>
                      <td className="table-cell text-gray-900 dark:text-gray-100 max-w-[150px] truncate">{c.cliente ?? c.client_name ?? c.nome ?? '—'}</td>
                      <td className="table-cell text-gray-600 dark:text-gray-300">{c.banco ?? c.bank ?? '—'}</td>
                      <td className="table-cell text-gray-600 dark:text-gray-300 text-xs">{c.operacao ?? c.operação ?? c.tipo ?? '—'}</td>
                      <td className="table-cell text-center"><StatusBadge status={c.status ?? ''} /></td>
                      <td className="table-cell text-right font-medium">{fmt(c.valor ?? c.value)}</td>
                      <td className="table-cell text-center text-gray-600 dark:text-gray-300">{c.parcelas ?? c.installments ?? '—'}</td>
                      <td className="table-cell text-center text-xs text-gray-500 dark:text-gray-400">{fmtDate(c.data ?? c.data_contrato ?? c.created_at)}</td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openTrack(c)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                            <Eye size={13} />
                            Acompanhamento
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button onClick={() => openHist(c)} className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 font-medium">
                            <Clock size={13} />
                            Histórico
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

      {/* Modal Acompanhamento */}
      <Modal open={trackModal} onClose={() => setTrackModal(false)} title={`Acompanhamento — FF ${selectedContrato?.ff ?? ''}`} size="lg">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" /></div>
        ) : trackData ? (
          <div className="space-y-3">
            {Object.entries(trackData).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-40 flex-shrink-0">{k}</span>
                <span className="text-gray-900 dark:text-gray-100 break-all">{String(v ?? '—')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">Nenhum dado de acompanhamento disponível.</div>
        )}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setTrackModal(false)} className="btn-secondary">Fechar</button>
        </div>
      </Modal>

      {/* Modal Histórico */}
      <Modal open={histModal} onClose={() => setHistModal(false)} title={`Histórico — FF ${selectedContrato?.ff ?? ''}`} size="xl">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" /></div>
        ) : histData.length > 0 ? (
          <div className="space-y-2">
            {histData.map((h, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
                {Object.entries(h).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32 flex-shrink-0">{k}</span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs break-all">{String(v ?? '—')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">Nenhum histórico disponível.</div>
        )}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setHistModal(false)} className="btn-secondary">Fechar</button>
        </div>
      </Modal>
    </div>
  )
}
