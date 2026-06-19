import { useState } from 'react'
import api from '../../services/api'
import { statusBadge } from '../../components/ui/Badge'

type ReportType = 'proposals' | 'brokers' | 'antifraud' | 'productivity'

const REPORT_TYPES = [
  { key: 'proposals', label: 'Relatório de Propostas', icon: '📋', description: 'Listagem completa de propostas com filtros avançados' },
  { key: 'brokers', label: 'Relatório de Corretores', icon: '👥', description: 'Desempenho e produtividade por corretor' },
  { key: 'antifraud', label: 'Relatório Antifraude', icon: '🛡️', description: 'Histórico de análises antifraude' },
  { key: 'productivity', label: 'Relatório de Produtividade', icon: '📈', description: 'Métricas por colaborador' },
] as const

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('proposals')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', status: '', bank_id: '', convenio_id: '' })
  const [generated, setGenerated] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
      const res = await api.get(`/reports/${activeReport}?${params}`)
      setData(res.data)
      setGenerated(true)
    } catch {} finally { setLoading(false) }
  }

  const exportToCSV = () => {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `relatorio_${activeReport}_${Date.now()}.csv`; a.click()
  }

  const printReport = () => window.print()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
        <p className="text-sm text-gray-500">Análises e exportações de dados operacionais</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {REPORT_TYPES.map(r => (
          <button key={r.key} onClick={() => { setActiveReport(r.key); setData([]); setGenerated(false) }} className={`card text-left hover:shadow-md transition-all ${activeReport === r.key ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
            <div className="text-2xl mb-1">{r.icon}</div>
            <div className="font-medium text-sm text-gray-900">{r.label}</div>
            <div className="text-xs text-gray-400 mt-1">{r.description}</div>
          </button>
        ))}
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data inicial</label>
            <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="input-field text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data final</label>
            <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="input-field text-xs" />
          </div>
          {activeReport === 'proposals' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
                <option value="">Todos</option>
                <option>Pendente</option><option>Aprovada</option><option>Reprovada</option><option>Averbada</option>
              </select>
            </div>
          )}
          {activeReport === 'antifraud' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Resultado</label>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-xs">
                <option value="">Todos</option>
                <option>Aprovada</option><option>Reprovada</option><option>Suspeita de Antifraude</option><option>Em Analise</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={loadReport} disabled={loading} className="btn-primary">{loading ? 'Gerando...' : '📊 Gerar Relatório'}</button>
          {generated && data.length > 0 && (
            <>
              <button onClick={exportToCSV} className="btn-secondary">📥 Exportar CSV</button>
              <button onClick={printReport} className="btn-secondary">🖨️ Imprimir</button>
            </>
          )}
        </div>
      </div>

      {generated && (
        <div className="card p-0 overflow-hidden" id="report-content">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{data.length} registro(s) encontrado(s)</span>
            <span className="text-xs text-gray-400">Gerado em {new Date().toLocaleString('pt-BR')}</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div>
          ) : data.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Nenhum dado encontrado para os filtros selecionados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {Object.keys(data[0]).map(k => (
                      <th key={k} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 border-b border-gray-100">
                      {Object.entries(row).map(([k, v]) => (
                        <td key={k} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {k === 'status' || k === 'antifraud_status' ? statusBadge(String(v || '')) :
                           k.includes('value') && typeof v === 'number' ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
                           k.includes('date') || k.includes('_at') ? (v ? new Date(String(v)).toLocaleString('pt-BR') : '—') :
                           String(v ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
