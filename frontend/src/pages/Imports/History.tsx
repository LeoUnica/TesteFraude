import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface ImportRecord {
  id: string; date: string; filename: string; type: string;
  status: 'Processando' | 'Concluido' | 'Erro'; total: number; imported: number; errors: number
}

const STATUS_STYLES: Record<string, string> = {
  Processando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Concluido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Erro: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const MOCK: ImportRecord[] = [
  { id: '1', date: '2026-06-19T14:32:00', filename: 'propostas_junho.csv', type: 'Propostas', status: 'Concluido', total: 250, imported: 245, errors: 5 },
  { id: '2', date: '2026-06-19T10:15:00', filename: 'corretores_ativos.xlsx', type: 'Corretores', status: 'Concluido', total: 80, imported: 80, errors: 0 },
  { id: '3', date: '2026-06-18T16:45:00', filename: 'retorno_bradesco.txt', type: 'Retorno Banco', status: 'Erro', total: 0, imported: 0, errors: 1 },
  { id: '4', date: '2026-06-18T09:00:00', filename: 'propostas_semana.csv', type: 'Propostas', status: 'Concluido', total: 120, imported: 119, errors: 1 },
  { id: '5', date: '2026-06-17T15:20:00', filename: 'grupos_corretores.csv', type: 'Grupos', status: 'Processando', total: 30, imported: 18, errors: 0 },
]

export default function ImportHistoryPage() {
  const navigate = useNavigate()
  const [records] = useState<ImportRecord[]>(MOCK)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const filtered = records.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false
    if (filterDateFrom && r.date.split('T')[0] < filterDateFrom) return false
    if (filterDateTo && r.date.split('T')[0] > filterDateTo) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Acompanhamento de Importacoes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} importacao(oes) encontrada(s)</p>
        </div>
        <button onClick={() => navigate('/importacoes/importar')} className="btn-primary">+ Nova Importacao</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-xs">
            <option value="">Todos os status</option>
            <option value="Processando">Processando</option>
            <option value="Concluido">Concluido</option>
            <option value="Erro">Erro</option>
          </select>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-field text-xs" placeholder="Data inicial" />
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-field text-xs" placeholder="Data final" />
        </div>
        <button onClick={() => { setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo('') }} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Limpar filtros</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Data</th>
              <th className="table-header text-left">Arquivo</th>
              <th className="table-header text-left">Tipo</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-right">Total</th>
              <th className="table-header text-right">Importados</th>
              <th className="table-header text-right">Erros</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhuma importacao encontrada</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="table-cell text-xs text-gray-500">
                  {new Date(r.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="table-cell font-medium text-blue-700 dark:text-blue-400 font-mono text-xs">{r.filename}</td>
                <td className="table-cell text-gray-600 dark:text-gray-400">{r.type}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </td>
                <td className="table-cell text-right text-gray-700 dark:text-gray-300">{r.total}</td>
                <td className="table-cell text-right text-emerald-600 font-medium">{r.imported}</td>
                <td className="table-cell text-right">
                  <span className={r.errors > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>{r.errors}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
