import { useState, useRef } from 'react'
import api from '../../services/api'

const STATUS_STYLES: Record<string, string> = {
  Processando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Processado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Erro: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const BANKS = ['Bradesco', 'Itau', 'Caixa Economica', 'Banco do Brasil', 'Santander']

interface ReturnRecord {
  id: string; date: string; bank: string; filename: string;
  status: string; records: number
}

const MOCK: ReturnRecord[] = [
  { id: '1', date: '2026-06-19', bank: 'Bradesco', filename: 'retorno_brad_190626.txt', status: 'Processado', records: 142 },
  { id: '2', date: '2026-06-18', bank: 'Itau', filename: 'retorno_itau_180626.txt', status: 'Processado', records: 89 },
  { id: '3', date: '2026-06-18', bank: 'Caixa Economica', filename: 'cef_ret_18062026.rem', status: 'Erro', records: 0 },
  { id: '4', date: '2026-06-17', bank: 'Banco do Brasil', filename: 'bb_retorno_170626.txt', status: 'Pendente', records: 0 },
]

export default function BankReturnsPage() {
  const [records, setRecords] = useState<ReturnRecord[]>(MOCK)
  const [filterBank, setFilterBank] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = records.filter(r => {
    if (filterBank && r.bank !== filterBank) return false
    if (filterStatus && r.status !== filterStatus) return false
    if (filterDateFrom && r.date < filterDateFrom) return false
    if (filterDateTo && r.date > filterDateTo) return false
    return true
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/imports/bank-returns', formData)
      const newRecord: ReturnRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        bank: '—',
        filename: file.name,
        status: 'Processando',
        records: 0,
      }
      setRecords(prev => [newRecord, ...prev])
    } catch {
      const newRecord: ReturnRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        bank: 'Desconhecido',
        filename: file.name,
        status: 'Processando',
        records: 0,
      }
      setRecords(prev => [newRecord, ...prev])
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Retornos de Banco</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} retorno(s)</p>
        </div>
        <div className="flex gap-3">
          <input ref={inputRef} type="file" accept=".txt,.rem,.ret" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
          <button onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-primary">
            {uploading ? 'Importando...' : '+ Importar Retorno'}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={filterBank} onChange={e => setFilterBank(e.target.value)} className="input-field text-xs">
            <option value="">Todos os bancos</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-xs">
            <option value="">Todos os status</option>
            <option value="Processando">Processando</option>
            <option value="Processado">Processado</option>
            <option value="Pendente">Pendente</option>
            <option value="Erro">Erro</option>
          </select>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-field text-xs" />
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-field text-xs" />
        </div>
        <button onClick={() => { setFilterBank(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo('') }} className="mt-2 text-xs text-gray-500 hover:text-gray-700">
          Limpar filtros
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Data</th>
              <th className="table-header text-left">Banco</th>
              <th className="table-header text-left">Arquivo</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-right">Registros</th>
              <th className="table-header text-center">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum retorno encontrado</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="table-cell text-xs text-gray-500">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                <td className="table-cell font-medium">{r.bank}</td>
                <td className="table-cell font-mono text-xs text-blue-700 dark:text-blue-400">{r.filename}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                </td>
                <td className="table-cell text-right text-gray-700 dark:text-gray-300">{r.records > 0 ? r.records : '—'}</td>
                <td className="table-cell text-center">
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">Detalhes</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
