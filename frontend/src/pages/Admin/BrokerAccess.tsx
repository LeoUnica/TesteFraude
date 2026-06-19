import { useState } from 'react'

interface AccessRecord {
  id: string; broker: string; lastAccess: string; ip: string; actions: number; status: 'Ativo' | 'Inativo' | 'Bloqueado'
}

const STATUS_STYLES: Record<string, string> = {
  Ativo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Inativo: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  Bloqueado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const MOCK: AccessRecord[] = [
  { id: '1', broker: 'Maria Silva Santos', lastAccess: '2026-06-19T14:30:00', ip: '192.168.1.50', actions: 23, status: 'Ativo' },
  { id: '2', broker: 'Joao Carlos Pereira', lastAccess: '2026-06-19T10:15:00', ip: '177.84.22.101', actions: 8, status: 'Ativo' },
  { id: '3', broker: 'Ana Paula Costa', lastAccess: '2026-06-18T16:45:00', ip: '189.55.77.42', actions: 45, status: 'Inativo' },
  { id: '4', broker: 'Carlos Eduardo Lima', lastAccess: '2026-06-17T09:00:00', ip: '200.100.50.25', actions: 0, status: 'Bloqueado' },
  { id: '5', broker: 'Fernanda Oliveira', lastAccess: '2026-06-19T08:20:00', ip: '10.0.0.15', actions: 12, status: 'Ativo' },
]

export default function BrokerAccessPage() {
  const [records] = useState<AccessRecord[]>(MOCK)
  const [brokerFilter, setBrokerFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filtered = records.filter(r => {
    if (brokerFilter && !r.broker.toLowerCase().includes(brokerFilter.toLowerCase())) return false
    if (dateFilter && !r.lastAccess.startsWith(dateFilter)) return false
    return true
  })

  const handleExport = () => {
    const csv = [
      'Corretor,Ultimo Acesso,IP,Acoes,Status',
      ...filtered.map(r =>
        `"${r.broker}","${new Date(r.lastAccess).toLocaleString('pt-BR')}","${r.ip}","${r.actions}","${r.status}"`
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'acessos_corretores.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Acessos de Corretores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} registro(s)</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">Exportar CSV</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Buscar por corretor..."
            value={brokerFilter} onChange={e => setBrokerFilter(e.target.value)}
            className="input-field text-xs"
          />
          <input
            type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="input-field text-xs"
          />
        </div>
        <button onClick={() => { setBrokerFilter(''); setDateFilter('') }} className="mt-2 text-xs text-gray-500 hover:text-gray-700">
          Limpar filtros
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Corretor</th>
              <th className="table-header text-left">Ultimo Acesso</th>
              <th className="table-header text-left">IP</th>
              <th className="table-header text-right">Acoes Realizadas</th>
              <th className="table-header text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum acesso encontrado</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="table-cell font-medium">{r.broker}</td>
                <td className="table-cell text-xs text-gray-500">
                  {new Date(r.lastAccess).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="table-cell font-mono text-xs text-gray-500">{r.ip}</td>
                <td className="table-cell text-right font-medium text-blue-600">{r.actions}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
